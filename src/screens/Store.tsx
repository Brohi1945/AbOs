import React, { useState, useRef, useEffect } from "react";
import {
  Bot, Plus, X, Sparkles, Send, ShoppingBag, Minus, ArrowLeft, CheckCircle2, PackageCheck, Loader2,
} from "lucide-react";
import { displayFont, bodyFont } from "../lib/theme";
import { CATEGORIES } from "../lib/seedData";
import { genId, money } from "../lib/utils";
import { callClaude, parseAssistantReply } from "../lib/aiHelpers";
import { Card, StatusBadge, Button, Drawer, Modal, Field, inputCls, EmptyState } from "../components/ui";

interface CustomerAssistantWidgetProps {
  products: any[];
  placedOrders: any[];
  onPlaceOrder: (order: any) => void;
}

function CustomerAssistantWidget({ products, placedOrders, onPlaceOrder }: CustomerAssistantWidgetProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "bot"; text: string }[]>([
    { role: "bot", text: "Hi! Ask me about products, specs, deals, or your order status — I can even take your order right here." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);
  const suggestions = ["Is Basmati Rice available?", "Track my order", "I want to order rice", "Payment options"];
  const endRef = useRef<HTMLDivElement>(null);
  const sendingRef = useRef(false);

  useEffect(() => { if (open) endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, open, loading]);

  const send = async (text?: string) => {
    const q = (text ?? input).trim();
    if (!q || sendingRef.current) return;
    sendingRef.current = true;
    const history = messages;
    setMessages((m) => [...m, { role: "user", text: q }]);
    setInput("");
    setLoading(true);

    const shopContext = {
      catalog: products.map((p) => ({ id: p.id, name: p.name, category: p.category, price: p.price, inStock: p.stock > 0, specs: p.specs })),
      customerOrders: placedOrders.map((o) => ({ id: o.id, status: o.status, total: o.total, items: o.items, date: o.date })),
      deliveryInfo: "Standard delivery takes 1-2 days within the city.",
      paymentInfo: "Cash on Delivery is accepted; bank transfer support is coming soon.",
      returnsInfo: "Report any order issue within 24 hours of delivery for support.",
    };

    const systemPrompt = `You are the friendly SALES + support assistant for AB Store, a small online grocery/essentials shop. You can do four things:
1. Answer questions about products, specs, prices, delivery, and payment using ONLY the catalog data below.
2. Proactively push sales: when a customer shows interest in a product, briefly mention one relevant add-on from the catalog (e.g. suggest Cooking Oil alongside Rice) — but never be pushy, one suggestion max per reply.
3. Track existing orders using the customerOrders data.
4. Take a NEW order end-to-end: when the customer wants to order something, figure out which product(s) and quantities from the conversation, then ask for their name, phone number, and delivery address ONE missing piece at a time if not yet given. Once you have product(s)+quantities AND name AND phone AND address, output the order action (see format below) so it gets placed for real — do not just say you placed it, you must include the action object.

Prices are in Pakistani Rupees (Rs). Never mention cost price, margins, or internal admin details.

Always write the "reply" text in Roman Urdu (Urdu written in plain English/Latin letters, e.g. "aapka order kal tak pahunch jayega"). Do not mix in English words unless it's a product name, number, or a term with no natural Urdu equivalent. Do not reply in Urdu script or in English.

CRITICAL OUTPUT FORMAT — you must ALWAYS respond with ONLY a raw JSON object (no markdown fences, no extra text), matching exactly this shape:
{"reply": "the message to show the customer in Roman Urdu", "action": null}

When you have everything needed to place an order (product ids + quantities + customer name + phone + address), instead set "action" to:
{"reply": "confirmation message in Roman Urdu mentioning what was ordered", "action": {"type": "place_order", "items": [{"productId": "P001", "qty": 2}], "customer": {"name": "...", "phone": "...", "address": "..."}}}

Only ever emit the place_order action ONCE you truly have all required fields — otherwise keep "action": null and ask for the missing piece in "reply".

Shop data:
${JSON.stringify(shopContext)}`;

    try {
      const raw = await callClaude(systemPrompt, history, q);
      const { reply, action } = parseAssistantReply(raw);
      setMessages((m) => [...m, { role: "bot", text: reply }]);

      if (action && action.type === "place_order" && Array.isArray(action.items) && action.items.length) {
        const lines = action.items
          .map((it: any) => {
            const product = products.find((p) => p.id === it.productId);
            return product ? { productId: product.id, name: product.name, qty: Number(it.qty) || 1, price: product.price } : null;
          })
          .filter(Boolean);
        if (lines.length) {
          const total = lines.reduce((s: number, l: any) => s + l.price * l.qty, 0);
          const order = {
            id: genId("ORD"),
            customer: action.customer?.name || "Website customer",
            phone: action.customer?.phone || "",
            address: action.customer?.address || "",
            channel: "AI Assistant",
            items: lines.map((l: any) => ({ productId: l.productId, name: l.name, qty: l.qty })),
            total,
            status: "pending",
            date: new Date().toLocaleString(),
          };
          onPlaceOrder(order);
          setLastOrderId(order.id);
        }
      }
    } catch (err) {
      setMessages((m) => [...m, { role: "bot", text: "Sorry, I'm having trouble replying right now — please try again in a moment." }]);
    } finally {
      setLoading(false);
      sendingRef.current = false;
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full bg-[#C9A44C] text-black shadow-lg shadow-black/40 flex items-center justify-center hover:bg-[#8A712F] transition"
      >
        {open ? <X size={22} /> : <Bot size={22} />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-40 w-[94%] max-w-md bg-[#14171F] rounded-2xl border border-[rgba(255,255,255,0.06)] shadow-2xl flex flex-col overflow-hidden" style={{ height: "78vh", maxHeight: 680 }}>
          <div className="flex items-center gap-2 px-4 py-3.5 border-b border-[rgba(255,255,255,0.06)] bg-[#0B0D12] text-[#E8E9ED] shrink-0">
            <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
              <Bot size={14} />
            </div>
            <div>
              <div className="text-sm font-bold" style={{ fontFamily: displayFont }}>Store Assistant</div>
              <div className="text-[10px] text-[#8B8F9C]">Usually replies instantly</div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[82%] px-3.5 py-2 text-sm rounded-2xl ${
                  m.role === "user" ? "bg-[#C9A44C] text-black rounded-br-md" : "bg-white/5 text-[#C7C9D1] border border-[rgba(255,255,255,0.06)] rounded-bl-md"
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-1 px-3.5 py-2 bg-white/5 border border-[rgba(255,255,255,0.06)] rounded-2xl rounded-bl-md w-fit">
                <Loader2 size={12} className="animate-spin text-indigo-400" />
                <span className="text-[10px] text-[#8B8F9C]">Typing…</span>
              </div>
            )}
            {lastOrderId && (
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-green-400 bg-green-500/10 border border-green-500/20 rounded-xl px-3 py-2 w-fit">
                <CheckCircle2 size={12} /> Order {lastOrderId} placed!
              </div>
            )}
            <div ref={endRef} />
          </div>
          <div className="px-4 pb-2.5 flex flex-wrap gap-1.5 shrink-0">
            {suggestions.map((s) => (
              <button key={s} disabled={loading} onClick={() => send(s)} className="text-[10px] px-2.5 py-1.5 rounded-full bg-white/5 border border-[rgba(255,255,255,0.06)] text-[#8B8F9C] hover:border-indigo-500/40 disabled:opacity-40">
                {s}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 px-4 py-3 border-t border-[rgba(255,255,255,0.06)] shrink-0">
            <input
              value={input}
              disabled={loading}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") send(); }}
              placeholder="Type a message…"
              className={`${inputCls} flex-1 rounded-full text-sm py-2.5 disabled:opacity-60`}
            />
            <Button size="sm" onClick={() => send()} disabled={loading}>
              {loading ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

interface StoreScreenProps {
  products: any[];
  onBack: () => void;
  onLogin?: () => void;
  placedOrders: any[];
  onPlaceOrder: (order: any) => void;
}

export default function StoreScreen({ products, onBack, onLogin, placedOrders, onPlaceOrder }: StoreScreenProps) {
  const [cart, setCart] = useState<{ productId: string; qty: number }[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [view, setView] = useState("browse");
  const [category, setCategory] = useState("All");
  const [placed, setPlaced] = useState<any>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", address: "" });

  const cats = ["All", ...CATEGORIES];
  const filtered = category === "All" ? products : products.filter((p) => p.category === category);

  const addToCart = (p: any) => {
    setCart((c) => {
      const existing = c.find((it) => it.productId === p.id);
      if (existing) return c.map((it) => (it.productId === p.id ? { ...it, qty: it.qty + 1 } : it));
      return [...c, { productId: p.id, qty: 1 }];
    });
  };
  const updateQty = (id: string, delta: number) => setCart((c) => c.map((it) => (it.productId === id ? { ...it, qty: it.qty + delta } : it)).filter((it) => it.qty > 0));

  const cartLines = cart.map((it) => ({ ...it, product: products.find((p) => p.id === it.productId) })).filter((l) => l.product);
  const total = cartLines.reduce((s, l) => s + l.product.price * l.qty, 0);
  const cartCount = cartLines.reduce((s, l) => s + l.qty, 0);

  const handlePlaceOrder = () => {
    const order = {
      id: genId("ORD"),
      customer: form.name || "Website customer",
      phone: form.phone || "",
      address: form.address || "",
      channel: "Website",
      items: cartLines.map((l) => ({ productId: l.product.id, name: l.product.name, qty: l.qty })),
      total,
      status: "pending",
      date: new Date().toLocaleString(),
    };
    onPlaceOrder(order);
    setPlaced(order);
    setCart([]);
    setCheckoutOpen(false);
    setCartOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#0B0D12]" style={{ fontFamily: bodyFont }}>
      <div className="sticky top-0 z-30 bg-[#14171F] border-b border-[rgba(255,255,255,0.06)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center gap-3">
          <button onClick={onBack} className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-[#8B8F9C] shrink-0">
            <ArrowLeft size={16} />
          </button>
          <div className="flex items-center gap-2 font-bold text-[#E8E9ED]" style={{ fontFamily: displayFont }}>
            <Sparkles size={16} className="text-[#C9A44C]" /> AB Store
          </div>
          <div className="flex-1" />
          <div className="flex gap-1.5 bg-white/5 p-1 rounded-xl">
            <button onClick={() => setView("browse")} className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition ${view === "browse" ? "bg-[#0B0D12] text-[#C9A44C] shadow-sm" : "text-[#8B8F9C]"}`}>Shop</button>
            <button onClick={() => setView("tracking")} className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition ${view === "tracking" ? "bg-[#0B0D12] text-[#C9A44C] shadow-sm" : "text-[#8B8F9C]"}`}>My Orders</button>
          </div>
          <button onClick={() => setCartOpen(true)} className="relative w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
            <ShoppingBag size={16} />
            {cartCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-500 text-white text-[9px] font-bold flex items-center justify-center">{cartCount}</span>}
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {view === "browse" ? (
          <>
            <div className="mb-5">
              <h1 className="text-2xl font-bold text-[#E8E9ED] mb-1" style={{ fontFamily: displayFont }}>Shop essentials, delivered fast.</h1>
              <p className="text-sm text-[#8B8F9C]">Fresh groceries and daily needs from your neighbourhood store.</p>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 mb-5">
              {cats.map((c) => (
                <button key={c} onClick={() => setCategory(c)} className={`text-xs font-semibold px-3.5 py-2 rounded-xl whitespace-nowrap transition ${category === c ? "bg-[#C9A44C] text-black" : "bg-[#14171F] border border-[rgba(255,255,255,0.06)] text-[#8B8F9C]"}`}>
                  {c}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filtered.map((p) => (
                <div key={p.id} className="bg-[#14171F] rounded-xl border border-[rgba(255,255,255,0.06)] shadow-sm p-4 flex flex-col">
                  <div className={`w-full aspect-square rounded-lg flex items-center justify-center text-2xl font-bold mb-3 ${p.color}`}>
                    {p.name.slice(0, 1)}
                  </div>
                  <div className="text-xs font-semibold text-[#E8E9ED] leading-snug mb-1 flex-1">{p.name}</div>
                  <div className="text-[11px] text-[#8B8F9C] mb-2">{p.category}</div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-indigo-400">{money(p.price)}</span>
                    {p.stock <= 0 ? (
                      <span className="text-[10px] font-semibold text-red-400">Sold out</span>
                    ) : (
                      <button onClick={() => addToCart(p)} className="w-7 h-7 rounded-lg bg-[#C9A44C] text-black flex items-center justify-center hover:bg-[#8A712F]">
                        <Plus size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="max-w-2xl">
            <h1 className="text-xl font-bold text-[#E8E9ED] mb-4" style={{ fontFamily: displayFont }}>Order tracking</h1>
            {placedOrders.length === 0 ? (
              <EmptyState icon={PackageCheck} title="No orders yet" note="Orders you place will show up here with live status." />
            ) : (
              <div className="space-y-3">
                {placedOrders.map((o) => (
                  <Card key={o.id}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-[#E8E9ED] text-sm">{o.id}</span>
                      <StatusBadge status={o.status} />
                    </div>
                    <div className="text-xs text-[#8B8F9C] mb-2">{o.items.map((it: any) => `${it.qty}x ${it.name}`).join(", ")}</div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#8B8F9C]">{o.date}</span>
                      <span className="font-bold text-indigo-400">{money(o.total)}</span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <Drawer open={cartOpen} onClose={() => setCartOpen(false)} title="Your cart">
        {cartLines.length === 0 ? (
          <EmptyState icon={ShoppingBag} title="Cart is empty" note="Add products to get started." />
        ) : (
          <div>
            <div className="space-y-3 mb-5">
              {cartLines.map((l) => (
                <div key={l.productId} className="flex items-center justify-between gap-2">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${l.product.color}`}>{l.product.name.slice(0, 1)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-[#E8E9ED] truncate">{l.product.name}</div>
                    <div className="text-[11px] text-[#8B8F9C]">{money(l.product.price)}</div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => updateQty(l.productId, -1)} className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center text-[#8B8F9C]"><Minus size={11} /></button>
                    <span className="text-xs font-semibold w-5 text-center text-[#E8E9ED]">{l.qty}</span>
                    <button onClick={() => updateQty(l.productId, 1)} className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center text-[#8B8F9C]"><Plus size={11} /></button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between text-sm font-bold pt-3 border-t border-[rgba(255,255,255,0.06)] mb-4">
              <span className="text-[#E8E9ED]">Total</span>
              <span className="text-indigo-400">{money(total)}</span>
            </div>
            <Button className="w-full" size="lg" onClick={() => setCheckoutOpen(true)}>Checkout</Button>
          </div>
        )}
      </Drawer>

      <Modal open={checkoutOpen} onClose={() => setCheckoutOpen(false)} title="Checkout" width={420}>
        <Field label="Full name">
          <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} placeholder="Your name" />
        </Field>
        <Field label="Phone number">
          <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className={inputCls} placeholder="03XX-XXXXXXX" />
        </Field>
        <Field label="Delivery address">
          <textarea value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} rows={3} className={inputCls} placeholder="House, street, area…" />
        </Field>
        <div className="flex items-center justify-between text-sm font-bold py-3 border-y border-[rgba(255,255,255,0.06)] mb-4">
          <span className="text-[#E8E9ED]">Order total</span>
          <span className="text-indigo-400">{money(total)}</span>
        </div>
        <Button className="w-full" size="lg" onClick={handlePlaceOrder} disabled={!form.name || !form.phone || !form.address}>
          Place order
        </Button>
      </Modal>

      <Modal open={!!placed} onClose={() => setPlaced(null)} title="Order placed" width={380}>
        {placed && (
          <div className="text-center py-2">
            <div className="w-14 h-14 rounded-full bg-green-500/10 text-green-400 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 size={26} />
            </div>
            <div className="font-bold text-[#E8E9ED] mb-1" style={{ fontFamily: displayFont }}>Thanks! Order {placed.id}</div>
            <p className="text-xs text-[#8B8F9C] mb-5">We've received your order and will confirm it shortly.</p>
            <Button className="w-full" onClick={() => { setPlaced(null); setView("tracking"); }}>Track my order</Button>
          </div>
        )}
      </Modal>

      <CustomerAssistantWidget products={products} placedOrders={placedOrders} onPlaceOrder={onPlaceOrder} />
    </div>
  );
}
