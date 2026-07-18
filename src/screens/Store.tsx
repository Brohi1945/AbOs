import React, { useState, useRef, useEffect } from "react";
import {
  Bot, Plus, X, Sparkles, Send, ShoppingBag, Minus, ArrowLeft, CheckCircle2, PackageCheck, Loader2,
} from "lucide-react";
import { displayFont, bodyFont } from "../theme";
import { CATEGORIES } from "../lib/seedData";
import { genId, money } from "../lib/utils";
import { availableStock } from "../lib/waitlist";
import { callClaude, parseAssistantReply } from "../lib/aiHelpers";
import { toastError } from "../lib/toast";
import { Card, StatusBadge, Button, Drawer, Modal, Field, inputCls, EmptyState } from "../components/ui";

interface CustomerAssistantWidgetProps {
  products: any[];
  placedOrders: any[];
  onPlaceOrder: (order: any) => void;
  onJoinWaitlist: (product: any, customerName: string, phone: string, qty?: number) => Promise<{ position: number } | null>;
}

// Change the storefront assistant's persona name in exactly one place.
const STORE_ASSISTANT_NAME = "Sana";

function CustomerAssistantWidget({ products, placedOrders, onPlaceOrder, onJoinWaitlist }: CustomerAssistantWidgetProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "bot"; text: string }[]>([
    { role: "bot", text: `Hi! Main ${STORE_ASSISTANT_NAME} hoon. Products, deals, ya order ke baare mein poochiye — main yahin se aapka order bhi le sakti hoon.` },
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
      catalog: products.map((p) => ({ id: p.id, name: p.name, category: p.category, price: p.price, inStock: availableStock(p) > 0, specs: p.specs })),
      customerOrders: placedOrders.map((o) => ({ id: o.id, status: o.status, total: o.total, items: o.items, date: o.date })),
      deliveryInfo: "Standard delivery takes 1-2 days within the city.",
      paymentInfo: "Cash on Delivery is accepted; bank transfer support is coming soon.",
      returnsInfo: "Report any order issue within 24 hours of delivery for support.",
    };

    const systemPrompt = `You are ${STORE_ASSISTANT_NAME}, the AI sales + support assistant for AB Store, a small online grocery/essentials shop. You are not a passive FAQ bot — you are a fully autonomous salesperson: your job is to close a sale or a waitlist signup on almost every conversation, end-to-end, without ever handing the customer off to a human or a form.

CORE BEHAVIOR — act like your best real-life shop salesman:
1. Answer questions about products, specs, prices, delivery, and payment using ONLY the catalog data below. Never invent a product, price, or spec that isn't in the data.
2. Guide, don't just answer: if a customer is vague ("mujhe kuch grocery chahiye", "kya hai aapke paas"), don't just ask "what do you need" — proactively suggest 2-3 popular/relevant items from the catalog based on what they've said so far, with prices, so they have something concrete to react to.
3. Upsell naturally: when a customer commits to a product, briefly mention ONE relevant add-on from the catalog (e.g. suggest Cooking Oil alongside Rice) — never more than one suggestion per reply, never pushy.
4. Track existing orders using the customerOrders data below.
5. CLOSE THE SALE — take a full order end-to-end whenever a customer wants something that is inStock:
   a. Lock in exactly which product(s) + quantities from the conversation (ask a clarifying question only if genuinely ambiguous, e.g. multiple similar products).
   b. Then collect name, phone number, and delivery address — ask for ONLY the one piece still missing, one at a time, never all three at once and never re-ask for something already given earlier in the conversation.
   c. The moment you have items + name + phone + address, immediately emit the place_order action in the SAME reply that confirms it — do not say "placing your order now" and wait for the next turn; the action and the confirmation happen together.
6. WAITLIST — if a customer asks when a product will be available/restocked ("kab tak milega", "available kab hoga", "stock kab aayega") OR wants a product that is OUT OF STOCK (inStock: false), treat this as strong buying intent, not a dead end. Warmly acknowledge it's currently unavailable, briefly highlight why they'd like it (using its specs), then proactively offer the waitlist — explain they'll be messaged the instant it's back and it'll be reserved for them for 48 hours. Collect name + phone (ONE missing piece at a time), then emit join_waitlist as soon as you have both — do not wait for an explicit "yes add me". Never invent a restock date.
7. If a customer wants to change quantity, swap a product, or cancel before checkout is final, handle it conversationally and re-confirm the updated order — don't restart the whole flow.

Prices are in Pakistani Rupees (Rs). Never mention cost price, margins, or any internal admin details.

Always write the "reply" text in Roman Urdu (Urdu written in plain English/Latin letters, e.g. "aapka order kal tak pahunch jayega"). Do not mix in English words unless it's a product name, number, or a term with no natural Urdu equivalent. Do not reply in Urdu script or in English. Keep replies warm but tight — 1-4 sentences, no filler, no repeating the whole catalog.

CRITICAL OUTPUT FORMAT — you must ALWAYS respond with ONLY a raw JSON object (no markdown fences, no extra text), matching exactly this shape:
{"reply": "the message to show the customer in Roman Urdu", "action": null}

When you have everything needed to place an order (product ids + quantities + customer name + phone + address), instead set "action" to:
{"reply": "confirmation message in Roman Urdu mentioning what was ordered and the total", "action": {"type": "place_order", "items": [{"productId": "P001", "qty": 2}], "customer": {"name": "...", "phone": "...", "address": "..."}}}

When you have name + phone for an out-of-stock product the customer wants, instead set "action" to:
{"reply": "confirmation message in Roman Urdu explaining they're on the waitlist and will be messaged within 48 hours of it being reserved for them", "action": {"type": "join_waitlist", "productId": "P001", "qty": 1, "customer": {"name": "...", "phone": "..."}}}

Only ever emit the place_order or join_waitlist action ONCE you truly have all required fields for that action — otherwise keep "action": null and ask for exactly the one missing piece in "reply". Match products by name to their id using the catalog below; never emit an action with a productId that isn't in the catalog.

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
            if (!product) return null;
            const maxQty = availableStock(product);
            if (maxQty <= 0) return null; // went out of stock mid-conversation — drop it, don't oversell
            const qty = Math.min(Math.max(1, Number(it.qty) || 1), maxQty);
            return { productId: product.id, name: product.name, qty, price: product.price };
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
        } else {
          // Everything in the action went out of stock between messages —
          // don't silently do nothing, tell the customer honestly.
          setMessages((m) => [...m, { role: "bot", text: "Maaf kijiye, yeh item abhi stock mein nahi raha — koi aur cheez dekhna chahenge?" }]);
        }
      } else if (action && action.type === "join_waitlist" && action.productId && action.customer?.name && action.customer?.phone) {
        const product = products.find((p) => p.id === action.productId);
        if (product) {
          const result = await onJoinWaitlist(product, action.customer.name, action.customer.phone, Number(action.qty) || 1);
          if (!result) {
            // Insert actually failed (e.g. Supabase table/columns missing) —
            // don't let the AI's confident "you're on the list" reply stand
            // uncontested when nothing was actually saved.
            setMessages((m) => [...m, { role: "bot", text: "Maaf kijiye, waitlist mein add karte waqt masla hua — dobara try karein ya thodi dair mein wapis aayein." }]);
          }
        }
      }
    } catch (err: any) {
      const status = err?.status;
      const text =
        status === 429
          ? "Abhi thora zyada traffic hai — 30 second baad dobara try karein."
          : "Maaf kijiye, is waqt jawab nahi de saka — dobara koshish karein.";
      setMessages((m) => [...m, { role: "bot", text }]);
    } finally {
      setLoading(false);
      sendingRef.current = false;
    }
  };

return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full bg-brand text-white shadow-lg shadow-black/40 flex items-center justify-center hover:opacity-90 transition"
      >
        {open ? <X size={22} /> : <Bot size={22} />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-40 w-[94%] max-w-md bg-app rounded-2xl border shadow-2xl flex flex-col overflow-hidden" style={{ height: "78vh", maxHeight: 680 }}>
          <div className="flex items-center gap-2 px-4 py-3.5 border-b border bg-app text-fg shrink-0">
            <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
              <Bot size={14} />
            </div>
            <div>
              <div className="text-sm font-bold" style={{ fontFamily: displayFont }}>{STORE_ASSISTANT_NAME} · AB Store</div>
              <div className="text-[10px] text-muted">Usually replies instantly</div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[82%] px-3.5 py-2 text-sm rounded-2xl ${
                  m.role === "user" ? "bg-brand text-white rounded-br-md" : "bg-white/5 text-muted border rounded-bl-md"
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-1 px-3.5 py-2 bg-white/5 border rounded-2xl rounded-bl-md w-fit">
                <Loader2 size={12} className="animate-spin text-indigo-400" />
                <span className="text-[10px] text-muted">Typing…</span>
              </div>
            )}
            {lastOrderId && (
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-green-400 bg-green-500/10 border-green-500/20 rounded-xl px-3 py-2 w-fit">
                <CheckCircle2 size={12} /> Order {lastOrderId} placed!
              </div>
            )}
            <div ref={endRef} />
          </div>
          <div className="px-4 pb-2.5 flex flex-wrap gap-1.5 shrink-0">
            {suggestions.map((s) => (
              <button key={s} disabled={loading} onClick={() => send(s)} className="text-[10px] px-2.5 py-1.5 rounded-full bg-white/5 border text-muted hover:border-indigo-500/40 disabled:opacity-40">
                {s}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 px-4 py-3 border-t border shrink-0">
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
  onJoinWaitlist: (product: any, customerName: string, phone: string, qty?: number) => Promise<{ position: number } | null>;
}

export default function StoreScreen({ products, onBack, onLogin, placedOrders, onPlaceOrder, onJoinWaitlist }: StoreScreenProps) {
  const [cart, setCart] = useState<{ productId: string; qty: number }[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [view, setView] = useState("browse");
  const [category, setCategory] = useState("All");
  const [placed, setPlaced] = useState<any>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", address: "" });
  const [waitlistModal, setWaitlistModal] = useState<any>(null);
  const [waitlistForm, setWaitlistForm] = useState({ name: "", phone: "" });
  const [waitlistJoined, setWaitlistJoined] = useState<any>(null);

  const cats = ["All", ...CATEGORIES];
  const filtered = category === "All" ? products : products.filter((p) => p.category === category);

  const addToCart = (p: any) => {
    setCart((c) => {
      const existing = c.find((it) => it.productId === p.id);
      const currentQty = existing?.qty || 0;
      if (currentQty >= availableStock(p)) return c; // already at max available stock
      if (existing) return c.map((it) => (it.productId === p.id ? { ...it, qty: it.qty + 1 } : it));
      return [...c, { productId: p.id, qty: 1 }];
    });
  };
  const updateQty = (id: string, delta: number) =>
    setCart((c) =>
      c
        .map((it) => {
          if (it.productId !== id) return it;
          const product = products.find((p) => p.id === id);
          const maxQty = product ? availableStock(product) : Infinity;
          return { ...it, qty: Math.min(maxQty, Math.max(1, it.qty + delta)) };
        })
        .filter((it) => it.qty > 0)
    );

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

  const handleJoinWaitlistSubmit = async () => {
    if (!waitlistModal || !waitlistForm.name || !waitlistForm.phone) return;
    const result = await onJoinWaitlist(waitlistModal, waitlistForm.name, waitlistForm.phone, 1);
    if (!result) {
      // Insert actually failed (e.g. Supabase table/columns missing) — don't
      // lie to the customer with a fake "you're on the list" confirmation.
      toastError("Waitlist mein add nahi ho saka — dobara koshish karein.");
      return;
    }
    setWaitlistJoined({ product: waitlistModal, position: result.position });
    setWaitlistModal(null);
    setWaitlistForm({ name: "", phone: "" });
  };

  return (
    <div className="min-h-screen bg-app" style={{ fontFamily: bodyFont }}>
      <div className="sticky top-0 z-30 bg-app border-b border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center gap-3">
          <button onClick={onBack} className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-muted shrink-0">
            <ArrowLeft size={16} />
          </button>
          <div className="flex items-center gap-2 font-bold text-fg" style={{ fontFamily: displayFont }}>
            <Sparkles size={16} className="text-brand" /> AB Store
          </div>
          <div className="flex-1" />
          <div className="flex gap-1.5 bg-white/5 p-1 rounded-xl">
            <button onClick={() => setView("browse")} className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition ${view === "browse" ? "bg-app text-brand shadow-sm" : "text-muted"}`}>Shop</button>
            <button onClick={() => setView("tracking")} className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition ${view === "tracking" ? "bg-app text-brand shadow-sm" : "text-muted"}`}>My Orders</button>
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
              <h1 className="text-2xl font-bold text-fg mb-1" style={{ fontFamily: displayFont }}>Shop essentials, delivered fast.</h1>
              <p className="text-sm text-muted">Fresh groceries and daily needs from your neighbourhood store.</p>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 mb-5">
              {cats.map((c) => (
                <button key={c} onClick={() => setCategory(c)} className={`text-xs font-semibold px-3.5 py-2 rounded-xl whitespace-nowrap transition ${category === c ? "bg-brand text-white" : "bg-app border text-muted"}`}>
                  {c}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filtered.map((p) => (
                <div key={p.id} className="bg-app rounded-xl border shadow-sm p-4 flex flex-col">
                  <div className={`w-full aspect-square rounded-lg flex items-center justify-center text-2xl font-bold mb-3 ${p.color}`}>
                    {p.name.slice(0, 1)}
                  </div>
                  <div className="text-xs font-semibold text-fg leading-snug mb-1 flex-1">{p.name}</div>
                  <div className="text-[11px] text-muted mb-2">{p.category}</div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-indigo-400">{money(p.price)}</span>
                    {availableStock(p) <= 0 ? (
                      <button
                        onClick={() => setWaitlistModal(p)}
                        className="text-[10px] font-semibold text-brand hover:underline"
                      >
                        Notify me
                      </button>
                    ) : (cart.find((it) => it.productId === p.id)?.qty || 0) >= availableStock(p) ? (
                      <span className="text-[10px] font-semibold text-muted">Max in cart</span>
                    ) : (
                      <button onClick={() => addToCart(p)} className="w-7 h-7 rounded-lg bg-brand text-white flex items-center justify-center hover:opacity-90">
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
            <h1 className="text-xl font-bold text-fg mb-4" style={{ fontFamily: displayFont }}>Order tracking</h1>
            {placedOrders.length === 0 ? (
              <EmptyState icon={PackageCheck} title="No orders yet" note="Orders you place will show up here with live status." />
            ) : (
              <div className="space-y-3">
                {placedOrders.map((o) => (
                  <Card key={o.id}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-fg text-sm">{o.id}</span>
                      <StatusBadge status={o.status} />
                    </div>
                    <div className="text-xs text-muted mb-2">{o.items.map((it: any) => `${it.qty}x ${it.name}`).join(", ")}</div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted">{o.date}</span>
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
                    <div className="text-xs font-semibold text-fg truncate">{l.product.name}</div>
                    <div className="text-[11px] text-muted">{money(l.product.price)}</div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => updateQty(l.productId, -1)} className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center text-muted"><Minus size={11} /></button>
                    <span className="text-xs font-semibold w-5 text-center text-fg">{l.qty}</span>
                    <button
                      onClick={() => updateQty(l.productId, 1)}
                      disabled={l.qty >= availableStock(l.product)}
                      className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center text-muted disabled:opacity-30"
                    ><Plus size={11} /></button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between text-sm font-bold pt-3 border-t border mb-4">
              <span className="text-fg">Total</span>
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
        <div className="flex items-center justify-between text-sm font-bold py-3 border-y border mb-4">
          <span className="text-fg">Order total</span>
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
            <div className="font-bold text-fg mb-1" style={{ fontFamily: displayFont }}>Thanks! Order {placed.id}</div>
            <p className="text-xs text-muted mb-5">We've received your order and will confirm it shortly.</p>
            <Button className="w-full" onClick={() => { setPlaced(null); setView("tracking"); }}>Track my order</Button>
          </div>
        )}
      </Modal>

      <Modal open={!!waitlistModal} onClose={() => setWaitlistModal(null)} title="Notify me when available" width={380}>
        {waitlistModal && (
          <div>
            <p className="text-xs text-muted mb-4">
              <span className="font-semibold text-fg">{waitlistModal.name}</span> is currently out of stock. Share your details and we'll message you the moment it's back — it'll be reserved for you for 48 hours.
            </p>
            <Field label="Full name">
              <input value={waitlistForm.name} onChange={(e) => setWaitlistForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} placeholder="Your name" />
            </Field>
            <Field label="Phone number">
              <input value={waitlistForm.phone} onChange={(e) => setWaitlistForm((f) => ({ ...f, phone: e.target.value }))} className={inputCls} placeholder="03XX-XXXXXXX" />
            </Field>
            <Button className="w-full" size="lg" onClick={handleJoinWaitlistSubmit} disabled={!waitlistForm.name || !waitlistForm.phone}>
              Join waitlist
            </Button>
          </div>
        )}
      </Modal>

      <Modal open={!!waitlistJoined} onClose={() => setWaitlistJoined(null)} title="You're on the list" width={380}>
        {waitlistJoined && (
          <div className="text-center py-2">
            <div className="w-14 h-14 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto mb-3">
              <PackageCheck size={26} />
            </div>
            <div className="font-bold text-fg mb-1" style={{ fontFamily: displayFont }}>
              Waitlisted for {waitlistJoined.product.name}
            </div>
            <p className="text-xs text-muted mb-1">
              {waitlistJoined.position ? `You're #${waitlistJoined.position} in line. ` : ""}
              We'll message you the moment it's back in stock — it'll be reserved for you for 48 hours.
            </p>
          </div>
        )}
      </Modal>

      <CustomerAssistantWidget products={products} placedOrders={placedOrders} onPlaceOrder={onPlaceOrder} onJoinWaitlist={onJoinWaitlist} />
    </div>
  );
}
