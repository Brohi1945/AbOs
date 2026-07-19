import React, { useState, useRef, useEffect } from "react";
import {
  Bot, Plus, X, Sparkles, Send, ShoppingBag, Minus, ArrowLeft, CheckCircle2, PackageCheck, Loader2, Mic, MicOff, Volume2, VolumeX, CreditCard,
} from "lucide-react";
import { displayFont, bodyFont } from "../theme";
import { CATEGORIES } from "../lib/seedData";
import { genId, money, Product } from "../lib/utils";
import { availableStock } from "../lib/waitlist";
import { callClaude, parseAssistantReply } from "../lib/aiHelpers";
import { toastError } from "../lib/toast";
import { useVoiceInput } from "../lib/useVoiceInput";
import { useVoiceOutput } from "../lib/useVoiceOutput";
import { detectVoiceToggleCommand } from "../lib/voiceCommands";
import { Card, StatusBadge, Button, Drawer, Modal, Field, inputCls, EmptyState } from "../components/ui";
import { AddressMap } from "../components/AddressMap";
import { STORE_ADDRESS } from "../config/app.config";

interface CustomerAssistantWidgetProps {
  products: Product[];
  placedOrders: any[];
  onPlaceOrder: (order: any) => Promise<{ success: boolean; order: any; checkoutUrl: string | null }>;
  onJoinWaitlist: (product: any, customerName: string, phone: string, qty?: number) => Promise<{ position: number } | null>;
}

// Change the storefront assistant's persona name in exactly one place.
const STORE_ASSISTANT_NAME = "ABI";

function CustomerAssistantWidget({ products, placedOrders, onPlaceOrder, onJoinWaitlist }: CustomerAssistantWidgetProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "bot"; text: string }[]>([
    { role: "bot", text: `Hi! Main ${STORE_ASSISTANT_NAME} hoon. Products, deals, ya order ke baare mein poochiye — main yahin se aapka order bhi le sakta hoon.` },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);
  const suggestions = ["Is Basmati Rice available?", "Track my order", "I want to order rice", "Payment options"];
  const endRef = useRef<HTMLDivElement>(null);
  const sendingRef = useRef(false);

  useEffect(() => { if (open) endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, open, loading]);

  // Voice command: customer bolke bhi order kar sakta hai — jo bhi bola,
  // seedha usi text ke saath send() call ho jata hai (jaise type karke Enter dabaya ho).
  // NOTE: lang is "en-US" (not "ur-PK") on purpose — the browser's Urdu
  // recognizer transcribes into Urdu SCRIPT, but our whole app is built
  // around Roman Urdu (Latin letters). The English recognizer, when it
  // hears Urdu/Hindi words, phonetically spells them out in Latin letters
  // instead — that's what actually gives us Roman Urdu text.
  // AI ka jawab bhi bola jaye — Siri/Alexa style. Off by default,
  // customer speaker icon se on karta hai; jab bhi on ho aur naya
  // bot reply aaye, wohi bola jaega.
  // NOTE: "en-IN" (Indian-English voice) reads Latin-script Roman Urdu
  // text far more naturally than a "ur-PK" voice would, since Urdu voices
  // expect Urdu SCRIPT input, not Latin transliteration.
  const { isSupported: ttsSupported, isSpeaking, voiceEnabled, toggleVoiceEnabled, speak, speakUnlocked } = useVoiceOutput({
    lang: "en-IN",
  });

  // BUG FIX: this hook didn't pass `pause: isSpeaking` (unlike the admin
  // AssistantView), so the mic kept listening while ABI was talking —
  // on speaker playback it could pick up ABI's own voice, fire a stray
  // onResult, and that new send() would cancel the reply mid-sentence.
  const { isSupported: voiceSupported, isListening, interimTranscript, toggleListening } = useVoiceInput({
    onResult: (transcript) => send(transcript),
    onError: (message) => toastError(message),
    lang: "en-US",
    pause: isSpeaking,
  });

  // Every bot reply goes through here so it's shown AND (if voice output
  // is enabled) spoken aloud — one place instead of repeating both calls
  // at every setMessages(...) call site below.
  const addBotMessage = (text: string) => {
    setMessages((m) => [...m, { role: "bot", text }]);
    speak(text);
  };

  const send = async (text?: string) => {
    const q = (text ?? input).trim();
    if (!q || sendingRef.current) return;

    // "voice mein baat karo" / "voice off karo" etc. are UI commands, not
    // questions for the AI — the model has no way to actually flip our
    // speaker toggle, so previously it just apologized in text ("main sirf
    // text mein jawab de sakta hoon"). Handle these locally instead of
    // sending them to the LLM.
    const voiceCommand = detectVoiceToggleCommand(q);
    if (voiceCommand) {
      setMessages((m) => [...m, { role: "user", text: q }]);
      setInput("");
      if (voiceCommand === "enable") {
        if (!ttsSupported) {
          setMessages((m) => [...m, { role: "bot", text: "Maaf kijiye, is browser mein voice output support nahi hai." }]);
        } else if (voiceEnabled) {
          addBotMessage("Voice pehle se hi on hai.");
        } else {
          // Called directly inside this click/enter-key gesture so it
          // "unlocks" audio on Android Chrome before any async gap.
          speakUnlocked("Voice on hai, ab main jawab bol kar dunga.");
          toggleVoiceEnabled();
          setMessages((m) => [...m, { role: "bot", text: "Voice on kar diya — ab main bol kar jawab dunga." }]);
        }
      } else {
        if (voiceEnabled) {
          toggleVoiceEnabled();
          setMessages((m) => [...m, { role: "bot", text: "Theek hai, voice off kar diya." }]);
        } else {
          addBotMessage("Voice pehle se hi off hai.");
        }
      }
      return;
    }

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
   b. Then collect name, phone number, email, and delivery address — ask for ONLY the one piece still missing, one at a time, never all four at once and never re-ask for something already given earlier in the conversation.
   c. HARD RULE: never emit place_order, and never say the order is confirmed, unless customer.name, customer.phone, customer.email, AND customer.address are all real, non-empty values actually given by the customer in this conversation. If even one is missing, keep "action": null and ask for exactly that missing piece — do not guess, do not leave a field blank, do not say "confirmed" while still waiting on something.
   d. The moment you truly have items + name + phone + email + address, immediately emit the place_order action in the SAME reply that confirms it — do not say "placing your order now" and wait for the next turn; the action and the confirmation happen together.
6. WAITLIST — if a customer asks when a product will be available/restocked ("kab tak milega", "available kab hoga", "stock kab aayega") OR wants a product that is OUT OF STOCK (inStock: false), treat this as strong buying intent, not a dead end. Warmly acknowledge it's currently unavailable, briefly highlight why they'd like it (using its specs), then proactively offer the waitlist — explain they'll be messaged the instant it's back and it'll be reserved for them for 48 hours. Collect name + phone (ONE missing piece at a time), then emit join_waitlist as soon as you have both — do not wait for an explicit "yes add me". Never invent a restock date.
7. If a customer wants to change quantity, swap a product, or cancel before checkout is final, handle it conversationally and re-confirm the updated order — don't restart the whole flow.

Prices are in Pakistani Rupees (Rs). Never mention cost price, margins, or any internal admin details.

Always write the "reply" text in Roman Urdu (Urdu written in plain English/Latin letters, e.g. "aapka order kal tak pahunch jayega"). Do not mix in English words unless it's a product name, number, or a term with no natural Urdu equivalent. Do not reply in Urdu script or in English. Keep replies warm but tight — 1-4 sentences, no filler, no repeating the whole catalog.

CRITICAL OUTPUT FORMAT — you must ALWAYS respond with ONLY a raw JSON object (no markdown fences, no extra text), matching exactly this shape:
{"reply": "the message to show the customer in Roman Urdu", "action": null}

When you have everything needed to place an order (product ids + quantities + customer name + phone + email + address), instead set "action" to:
{"reply": "confirmation message in Roman Urdu mentioning what was ordered and the total", "action": {"type": "place_order", "items": [{"productId": "P001", "qty": 2}], "customer": {"name": "...", "phone": "...", "email": "...", "address": "..."}}}

When you have name + phone for an out-of-stock product the customer wants, instead set "action" to:
{"reply": "confirmation message in Roman Urdu explaining they're on the waitlist and will be messaged within 48 hours of it being reserved for them", "action": {"type": "join_waitlist", "productId": "P001", "qty": 1, "customer": {"name": "...", "phone": "..."}}}

Only ever emit the place_order or join_waitlist action ONCE you truly have all required fields for that action — otherwise keep "action": null and ask for exactly the one missing piece in "reply". Match products by name to their id using the catalog below; never emit an action with a productId that isn't in the catalog.

Shop data:
${JSON.stringify(shopContext)}`;

    try {
      const raw = await callClaude(systemPrompt, history, q);
      const { reply, action } = parseAssistantReply(raw);

      if (action && action.type === "place_order" && Array.isArray(action.items) && action.items.length) {
        const customerName = (action.customer?.name || "").trim();
        const customerPhone = (action.customer?.phone || "").trim();
        const customerEmail = (action.customer?.email || "").trim();
        const customerAddress = (action.customer?.address || "").trim();

        if (!customerName || !customerPhone || !customerEmail || !customerAddress) {
          // The model claimed it had everything and its "reply" text likely
          // says "order confirmed" — never trust that self-report or show it
          // to the customer. Replace it with an honest ask for what's missing
          // so they never see a false confirmation followed by a contradiction.
          const missing = [!customerName && "naam", !customerPhone && "phone number", !customerEmail && "email", !customerAddress && "delivery address"].filter(Boolean).join(", ");
          addBotMessage(`Ek second — order confirm karne se pehle mujhe aapka ${missing} chahiye, tabhi delivery arrange ho sakegi.`);
        } else {
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
            addBotMessage(reply);
            const total = lines.reduce((s: number, l: any) => s + l.price * l.qty, 0);
            const order = {
              id: genId("ORD"),
              customer: customerName,
              phone: customerPhone,
              email: customerEmail,
              address: customerAddress,
              channel: "AI Assistant",
              items: lines.map((l: any) => ({ productId: l.productId, name: l.name, qty: l.qty })),
              total,
              status: "pending",
              date: new Date().toLocaleString(),
            };
            const result = await onPlaceOrder(order);
            // Server confirm karne ke baad hi asal order id pata chalti hai
            // (client wala id sirf optimistic tha) — chip isi se update karo.
            setLastOrderId(result.order?.id || order.id);
            // WhatsApp bot ki tarah — payment link bhi ek alag chat message
            // mein bhej dete hain, taake dono paths (web + WhatsApp) consistent rahein.
            if (result.checkoutUrl) {
              addBotMessage(`💳 Payment ke liye yeh link istemal karein:\n${result.checkoutUrl}\n\n(Ya Cash on Delivery bhi chalega — koi payment zaroori nahi.)`);
            }
          } else {
            // Everything in the action went out of stock between messages —
            // don't show the model's stale confirmation, tell the customer honestly instead.
            addBotMessage("Maaf kijiye, yeh item abhi stock mein nahi raha — koi aur cheez dekhna chahenge?");
          }
        }
      } else if (action && action.type === "join_waitlist" && action.productId && (action.customer?.name || "").trim() && (action.customer?.phone || "").trim()) {
        const product = products.find((p) => p.id === action.productId);
        if (product) {
          const result = await onJoinWaitlist(product, action.customer.name.trim(), action.customer.phone.trim(), Number(action.qty) || 1);
          if (result) {
            addBotMessage(reply);
          } else {
            // Insert actually failed (e.g. Supabase table/columns missing) —
            // don't let the AI's confident "you're on the list" reply stand
            // uncontested when nothing was actually saved.
            addBotMessage("Maaf kijiye, waitlist mein add karte waqt masla hua — dobara try karein ya thodi dair mein wapis aayein.");
          }
        } else {
          addBotMessage(reply);
        }
      } else {
        addBotMessage(reply);
      }
    } catch (err: any) {
      // Log the real error so it shows up in browser devtools / Vercel
      // function logs — helps diagnose a specific failure instead of
      // guessing from just the generic message the customer sees.
      console.error("[StoreAssistant] callClaude failed:", err);
      const status = err?.status;
      const text =
        status === 429
          ? "Abhi thora zyada traffic hai — 30 second baad dobara try karein."
          : "Maaf kijiye, is waqt jawab nahi de saka — dobara koshish karein.";
      addBotMessage(text);
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
            <div className="flex-1">
              <div className="text-sm font-bold" style={{ fontFamily: displayFont }}>{STORE_ASSISTANT_NAME} · AB Store</div>
              <div className="text-[10px] text-muted">Usually replies instantly</div>
            </div>
            {ttsSupported && (
              <button
                type="button"
                onClick={() => {
                  // Speaking directly inside this click (a real user gesture)
                  // "unlocks" audio on Android Chrome, which otherwise blocks
                  // speechSynthesis calls that happen later after an async
                  // fetch response — that's why AI replies wouldn't speak
                  // even with voiceEnabled turned on.
                  if (!voiceEnabled) speakUnlocked("Voice on hai, ab main jawab bol kar dunga.");
                  toggleVoiceEnabled();
                }}
                title={voiceEnabled ? "Voice replies on — tap to mute" : "Voice replies off — tap to enable"}
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition ${
                  voiceEnabled ? "bg-brand/20 text-brand" : "bg-white/5 text-muted"
                }`}
              >
                {voiceEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
              </button>
            )}
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
          {isListening && (
            <div className="px-4 pb-1.5 shrink-0">
              <div className="flex items-center gap-1.5 text-[11px] text-red-400">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                {interimTranscript || "Sun raha hoon…"}
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 px-4 py-3 border-t border shrink-0">
            {voiceSupported && (
              <button
                type="button"
                onClick={toggleListening}
                disabled={loading}
                title={isListening ? "Stop voice input" : "Bol kar order karein"}
                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition disabled:opacity-40 ${
                  isListening ? "bg-red-500 text-white" : "bg-white/5 border text-muted hover:border-indigo-500/40"
                }`}
              >
                {isListening ? <MicOff size={14} /> : <Mic size={14} />}
              </button>
            )}
            <input
              value={input}
              disabled={loading}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") send(); }}
              placeholder={isListening ? "Bol rahe hain…" : "Type a message…"}
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
  products: Product[];
  onBack: () => void;
  onLogin?: () => void;
  placedOrders: any[];
  onPlaceOrder: (order: any) => Promise<{ success: boolean; order: any; checkoutUrl: string | null }>;
  onJoinWaitlist: (product: any, customerName: string, phone: string, qty?: number) => Promise<{ position: number } | null>;
}

export default function StoreScreen({ products, onBack, onLogin, placedOrders, onPlaceOrder, onJoinWaitlist }: StoreScreenProps) {
  const [cart, setCart] = useState<{ productId: string; qty: number }[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [view, setView] = useState("browse");
  const [category, setCategory] = useState("All");
  const [placed, setPlaced] = useState<any>(null);
  const [placedCheckoutLink, setPlacedCheckoutLink] = useState<string | null>(null);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "" });
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

  const handlePlaceOrder = async () => {
    const order = {
      id: genId("ORD"),
      customer: form.name || "Website customer",
      phone: form.phone || "",
      email: form.email || "",
      address: form.address || "",
      channel: "Website",
      items: cartLines.map((l) => ({ productId: l.product.id, name: l.product.name, qty: l.qty })),
      total,
      status: "pending",
      date: new Date().toLocaleString(),
    };
    setPlacingOrder(true);
    const result = await onPlaceOrder(order);
    setPlacingOrder(false);
    // result.order mein server ka confirm kiya hua id/status hota hai
    // (client wala id sirf optimistic tha) — confirmation modal isi ko dikhaye.
    setPlaced(result.order || order);
    setPlacedCheckoutLink(result.checkoutUrl || null);
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

            <div className="mt-8">
              <h3 className="text-sm font-bold text-fg mb-2" style={{ fontFamily: displayFont }}>Visit our store</h3>
              <AddressMap address={STORE_ADDRESS} height={180} />
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
        <Field label="Email address">
          <input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} type="email" className={inputCls} placeholder="you@example.com" />
        </Field>
        <Field label="Delivery address">
          <textarea value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} rows={3} className={inputCls} placeholder="House, street, area…" />
        </Field>
        <div className="flex items-center justify-between text-sm font-bold py-3 border-y border mb-4">
          <span className="text-fg">Order total</span>
          <span className="text-indigo-400">{money(total)}</span>
        </div>
        <Button
          className="w-full"
          size="lg"
          onClick={handlePlaceOrder}
          disabled={!form.name || !form.phone || !form.email.includes("@") || !form.address || placingOrder}
        >
          {placingOrder ? "Placing order…" : "Place order"}
        </Button>
      </Modal>

      <Modal
        open={!!placed}
        onClose={() => { setPlaced(null); setPlacedCheckoutLink(null); }}
        title="Order placed"
        width={380}
      >
        {placed && (
          <div className="text-center py-2">
            <div className="w-14 h-14 rounded-full bg-green-500/10 text-green-400 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 size={26} />
            </div>
            <div className="font-bold text-fg mb-1" style={{ fontFamily: displayFont }}>Thanks! Order {placed.id}</div>
            <p className="text-xs text-muted mb-5">We've received your order and will confirm it shortly.</p>
            {placedCheckoutLink && (
              <a href={placedCheckoutLink} target="_blank" rel="noopener noreferrer" className="block mb-2">
                <Button className="w-full" icon={CreditCard}>Pay online now</Button>
              </a>
            )}
            <Button
              className="w-full"
              variant={placedCheckoutLink ? "secondary" : "primary"}
              onClick={() => { setPlaced(null); setPlacedCheckoutLink(null); setView("tracking"); }}
            >
              {placedCheckoutLink ? "Pay later · Track my order" : "Track my order"}
            </Button>
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
