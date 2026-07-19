import React, { useState, useRef, useEffect } from "react";
import { Send, Loader2, Mic, MicOff, Volume2, VolumeX, Bot, ChevronDown } from "lucide-react";
import { displayFont } from "../theme";
import { CATEGORIES } from "../lib/seedData";
import { callClaude, parseAssistantReply, TypingDots } from "../lib/aiHelpers";
import { computeWeeklyTrend, computeProductInsights } from "../lib/utils";
import { useVoiceInput } from "../lib/useVoiceInput";
import { useVoiceOutput } from "../lib/useVoiceOutput";
import { detectVoiceToggleCommand, detectNavigationCommand } from "../lib/voiceCommands";
import { toastError } from "../lib/toast";
import { Card, Button, inputCls } from "../components/ui";

interface Message {
  role: "user" | "bot";
  text: string;
}

// Change the assistant's name in exactly one place.
const ASSISTANT_NAME = "ABI";

interface AssistantViewProps {
  orders: any[];
  products: any[];
  customers: any[];
  campaigns: any[];
  onAddProduct: (product: any) => void;
  onEditProduct: (id: string, fields: any) => void;
  onDeleteProduct: (id: string) => void;
  onUpdateStatus: (orderId: string, status: string) => void;
  onAddCustomer: (customer: any) => void;
  onAddCampaign: (campaign: any) => void;
  onCreateOrder: (order: any) => void;
  // Optional — lets voice commands like "inventory kholo" actually switch
  // the sidebar section. If not passed, navigation commands are simply
  // not intercepted and fall through to the LLM like a normal question.
  onSectionChange?: (key: string) => void;
  // AssistantView is now a persistent overlay (mounted once in AdminApp,
  // never torn down just because the admin switches sections) instead of
  // a routed page. That's what lets voice input/output survive
  // navigation instead of getting cut off mid-sentence. "mode" controls
  // whether it's shown full-screen or as a small floating bubble.
  mode?: "full" | "minimized";
  onMinimize?: () => void;
  onExpand?: () => void;
}

export default function AssistantView({
  orders,
  products,
  customers,
  campaigns,
  onAddProduct,
  onEditProduct,
  onDeleteProduct,
  onUpdateStatus,
  onAddCustomer,
  onAddCampaign,
  onCreateOrder,
  onSectionChange,
  mode = "full",
  onMinimize,
  onExpand,
}: AssistantViewProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "bot",
      text: `Salam! Main ${ASSISTANT_NAME} hoon. Aapke business ka live data mere paas hai — kuch bhi poochiye.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const suggestions = ["Business health report do", "Sabse zyada profit konsa product de raha hay", "Kaunsa customer risk pe hay", "Aaj kya priority honi chahiye"];
  const endRef = useRef<HTMLDivElement>(null);
  const sendingRef = useRef(false);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  // AI ka jawab bhi bola jaye — Siri/Alexa style. Off by default,
  // admin speaker icon se on karta hai.
  // NOTE: "en-IN" reads Latin-script Roman Urdu text more naturally than
  // a "ur-PK" voice, which expects Urdu SCRIPT rather than transliteration.
  const { isSupported: ttsSupported, isSpeaking, voiceEnabled, toggleVoiceEnabled, speak, speakUnlocked } = useVoiceOutput({
    lang: "en-IN",
  });

  // Voice command: admin bolke bhi dashboard changes kar sakta hai
  // ("stock update karo 50 pieces", "naya product add karo" waghera) —
  // jo bhi bola gaya, seedha usi text ke saath send() call ho jata hai.
  // NOTE: lang is "en-US" (not "ur-PK") on purpose — the browser's Urdu
  // recognizer transcribes into Urdu SCRIPT, but our app is built around
  // Roman Urdu (Latin letters). The English recognizer phonetically
  // spells out Urdu/Hindi words in Latin letters instead — that's what
  // actually gives us Roman Urdu text.
  //
  // pause: isSpeaking — mic mutes itself while ABI is talking so it
  // never picks up its own voice through the speaker as a "command", and
  // un-mutes automatically the instant speaking stops (see useVoiceInput).
  const { isSupported: voiceSupported, isListening, interimTranscript, toggleListening } = useVoiceInput({
    onResult: (transcript) => send(transcript),
    onError: (message) => toastError(message),
    lang: "en-US",
    pause: isSpeaking,
  });

  // Every bot reply goes through here so it's shown AND (if voice output
  // is enabled) spoken aloud.
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

    // "inventory kholo" / "business intelligence par le jao" etc. — switch
    // sidebar sections directly instead of sending them to the LLM (which
    // has no way to actually change what's on screen). Only handled if the
    // parent passed onSectionChange down.
    if (onSectionChange) {
      const nav = detectNavigationCommand(q);
      if (nav) {
        setMessages((m) => [...m, { role: "user", text: q }]);
        setInput("");
        const confirmText = `${nav.label} khol raha hoon…`;
        addBotMessage(confirmText);
        // AssistantView is now a persistent overlay (see AdminApp), so it
        // no longer unmounts when the section changes — speech keeps
        // playing to the end even after we minimize and switch sections.
        onMinimize?.();
        window.setTimeout(() => onSectionChange(nav.key), 400);
        return;
      }
    }

    sendingRef.current = true;
    const history = messages;
    setMessages((m) => [...m, { role: "user", text: q }]);
    setInput("");
    setLoading(true);

    // ---- Same formulas the dashboards use, reused here so the assistant's
    // numbers always match Accounting / Business Intelligence exactly ----
    const activeOrders = orders.filter((o) => o.status !== "cancelled");
    const revenue = activeOrders.reduce((s, o) => s + o.total, 0);
    const cogsEstimate = Math.round(revenue * 0.68);
    const profitEstimate = revenue - cogsEstimate;
    const inventoryValue = products.reduce((s, p) => s + p.cost * p.stock, 0);
    const weeklyTrend = computeWeeklyTrend(orders);
    const todaySales = weeklyTrend[weeklyTrend.length - 1]?.sales || 0;
    const yesterdaySales = weeklyTrend[weeklyTrend.length - 2]?.sales || 0;

    // ---- Chief Data Analyst layer: per-product margin, profit contribution,
    // dead stock, best sellers — exact same engine as the BI tab ----
    const productInsights = computeProductInsights(products, orders);
    const bestSellers = [...productInsights].sort((a, b) => b.unitsSold - a.unitsSold).slice(0, 6)
      .map((p) => ({ name: p.name, unitsSold: p.unitsSold, revenue: p.revenue, marginPct: Math.round(p.marginPct) }));
    const topMarginProducts = [...productInsights].sort((a, b) => b.marginPct - a.marginPct).slice(0, 5)
      .map((p) => ({ name: p.name, marginPct: Math.round(p.marginPct) }));
    const lowMarginProducts = [...productInsights].filter((p) => p.marginPct < 20).sort((a, b) => a.marginPct - b.marginPct).slice(0, 5)
      .map((p) => ({ name: p.name, marginPct: Math.round(p.marginPct) }));
    const deadStock = productInsights.filter((p) => p.unitsSold === 0 && p.stock > 0)
      .sort((a, b) => b.capitalTiedUp - a.capitalTiedUp).slice(0, 8)
      .map((p) => ({ name: p.name, stock: p.stock, capitalTiedUp: p.capitalTiedUp }));
    const avgMarginPct = productInsights.length ? productInsights.reduce((s, p) => s + p.marginPct, 0) / productInsights.length : 0;

    // ---- Chief Growth/CRM layer: repeat vs one-time buyers, VIPs ----
    const repeatCustomers = customers.filter((c) => c.orders > 1).length;
    const oneTimeCustomers = customers.filter((c) => c.orders === 1).length;
    const topCustomers = [...customers].sort((a, b) => b.spent - a.spent).slice(0, 8)
      .map((c) => ({ id: c.id, name: c.name, phone: c.phone, orders: c.orders, spent: c.spent, lastOrder: c.lastOrder }));

    // ---- Chief Marketing layer: open/click rate per campaign ----
    const campaignPerformance = campaigns.map((c) => ({
      name: c.name, channel: c.channel, status: c.status, sent: c.sent,
      openRatePct: c.sent ? Math.round((c.opened / c.sent) * 100) : 0,
      clickRatePct: c.sent ? Math.round((c.clicked / c.sent) * 100) : 0,
    }));

    const storeContext = {
      // Accounting
      totalSalesAllTime: revenue,
      costOfGoodsEstimate: cogsEstimate,
      profitEstimate,
      inventoryValue,
      todaySales,
      yesterdaySales,
      weeklyTrend,
      avgMarginPct: Math.round(avgMarginPct),
      // Analytics / BI
      bestSellingProducts: bestSellers,
      topMarginProducts,
      lowMarginProducts,
      deadStockItems: deadStock,
      // Inventory
      totalOrders: orders.length,
      pendingOrders: orders.filter((o) => o.status === "pending").map((o) => ({ id: o.id, customer: o.customer, phone: o.phone, items: o.items, total: o.total, channel: o.channel, date: o.date })),
      recentOrders: orders.slice(0, 30).map((o) => ({ id: o.id, customer: o.customer, phone: o.phone, items: o.items, total: o.total, status: o.status, channel: o.channel, date: o.date })),
      allProducts: products.map((p) => ({ id: p.id, name: p.name, category: p.category, price: p.price, cost: p.cost, stock: p.stock, threshold: p.threshold, lowStock: p.stock <= p.threshold })),
      // CRM
      totalCustomers: customers.length,
      repeatCustomers,
      oneTimeCustomers,
      topCustomers,
      // Marketing
      campaignPerformance,
    };

    const systemPrompt = `Your name is ${ASSISTANT_NAME}, the AI chief-of-staff built into AB OS — the store owner's entire admin dashboard. Introduce yourself by name only once, at the very start of a conversation, never again mid-conversation. You operate as FOUR senior roles combined into one assistant: Chief Accountant (revenue, cost, profit, margins), Chief Operations Manager (orders, inventory, stock health), Chief Data Analyst (best sellers, dead stock, trends, customer segments), and Chief Marketing Officer (campaign performance). Think and answer the way an elite, highly competent human executive team would — fast, precise, numbers-first, and proactive. You are not a generic FAQ bot: you have full live read access to every part of the business (given as JSON below) and the ability to execute real actions.

Reason like a senior analyst before you answer: silently work out (a) which numbers in the JSON below actually answer the question, (b) what the single most important insight or risk is, and (c) what action the owner should take next — then write ONLY the final, distilled answer in "reply". Never show your working, never say "let me check" or "calculating" — just deliver the finished, confident answer as if you already knew it instantly.

Behave like Jarvis for this business: when asked an open-ended question ("business health report do", "aaj kya priority honi chahiye"), synthesize across accounting + inventory + customers + marketing yourself and give a short, prioritized, decision-ready answer — don't just dump raw numbers, interpret them (e.g. flag a margin that's shrinking, a customer at churn risk, a campaign underperforming, a product that's dead stock tying up capital, or a pending order that needs attention). Always ground every number in the JSON below — never invent figures. When relevant, proactively surface a second-order insight the owner didn't explicitly ask for but would want to know.

You can perform these real management actions when the owner asks. Collect any missing required field by asking ONE question at a time, then emit the action once you have everything needed:
- add_product: add a new item to inventory
- edit_product: change a product's price/stock/cost/threshold/name/etc
- delete_product: remove a product
- update_order_status: change an order's status
- create_order: manually log a new order (e.g. a phone/walk-in sale the owner tells you about)
- add_customer: add a new customer record
- add_campaign: log a new marketing campaign

Amounts are in Pakistani Rupees (Rs). If something genuinely isn't in the data below, say so honestly instead of guessing.

Always write the "reply" text in Roman Urdu (Urdu written in plain English/Latin letters, e.g. "aapki sales acchi ja rahi hain"). Do not mix in English words unless it's a product/customer name, number, or a term with no natural Urdu equivalent. Do not reply in Urdu script or in English. Keep replies tight: 2-6 sentences, or a short list for reports — never pad with fluff.

CRITICAL OUTPUT FORMAT — you must ALWAYS respond with ONLY a raw JSON object (no markdown fences, no extra text), matching exactly this shape:
{"reply": "message in Roman Urdu", "action": null}

When ready to perform a management action, set "action" to one of these shapes instead:
- {"type": "add_product", "name": "...", "category": "...", "price": 100, "cost": 70, "stock": 20, "threshold": 10, "barcode": ""}
- {"type": "edit_product", "productId": "P001", "fields": {"price": 120, "stock": 15}}
- {"type": "delete_product", "productId": "P001"}
- {"type": "update_order_status", "orderId": "ORD-1042", "status": "confirmed"}
- {"type": "create_order", "customer": "Customer Name", "phone": "", "channel": "Store", "status": "pending", "items": [{"productId": "P001", "qty": 2}]}
- {"type": "add_customer", "name": "...", "phone": "...", "email": ""}
- {"type": "add_campaign", "name": "...", "channel": "WhatsApp", "status": "Active", "sent": 0, "opened": 0, "clicked": 0}

Only emit an action once you truly have the required fields (add_product needs at least name, category, price, stock; create_order needs at least one item with a valid productId and a customer name). Category must be one of: ${JSON.stringify(CATEGORIES)}. Order status must be one of: pending, confirmed, delivered, cancelled. Match product names to their productId using the allProducts list below before emitting create_order.

Live business data:
${JSON.stringify(storeContext)}`;

    try {
      const raw = await callClaude(systemPrompt, history, q);
      const { reply, action } = parseAssistantReply(raw);
      addBotMessage(reply);

      if (action) {
        if (action.type === "add_product" && action.name) {
          onAddProduct({
            name: action.name, category: action.category || CATEGORIES[0], price: action.price,
            cost: action.cost, stock: action.stock, threshold: action.threshold, barcode: action.barcode,
          });
        } else if (action.type === "edit_product" && action.productId && action.fields) {
          const existing = products.find((p) => p.id === action.productId);
          onEditProduct(action.productId, { ...existing, ...action.fields });
        } else if (action.type === "delete_product" && action.productId) {
          onDeleteProduct(action.productId);
        } else if (action.type === "update_order_status" && action.orderId && action.status) {
          onUpdateStatus(action.orderId, action.status);
        } else if (action.type === "create_order" && Array.isArray(action.items) && action.items.length) {
          onCreateOrder(action);
        } else if (action.type === "add_customer" && action.name) {
          onAddCustomer(action);
        } else if (action.type === "add_campaign" && action.name) {
          onAddCampaign(action);
        }
      }
    } catch (err: any) {
      const status = err?.status;
      const text =
        status === 429
          ? "Abhi thora zyada traffic hai is liye jawab dene mein dair lag rahi hai — 30 second baad dobara try karein."
          : status === 500 && /GROQ_API_KEY/i.test(err?.detail?.error || err?.message || "")
          ? "AI service configure nahi hai (API key missing) — admin ko batayein."
          : "Maaf kijiye, is waqt assistant tak nahi pohanch saka — thodi dair mein dobara koshish karein.";
      addBotMessage(text);
    } finally {
      setLoading(false);
      sendingRef.current = false;
    }
  };

  // ---- MINIMIZED: small floating bubble, shown on top of whatever page
  // the admin is actually looking at. Voice input/output hooks above stay
  // alive the whole time (this component never unmounts anymore — see
  // AdminApp), so a reply that's mid-sentence keeps speaking right
  // through a section switch instead of being cut off. ----
  if (mode === "minimized") {
    return (
      <div className="fixed bottom-5 right-5 z-[60] flex items-center gap-2">
        {/* BUG FIX: previously the mic button only existed inside the full
            chat panel, so once minimized there was no way to keep giving
            voice commands without expanding first. Hands-free listening
            (see useVoiceInput's keepListeningRef) now also stays active
            here — this button just lets the admin toggle it on/off while
            minimized, same as the full view. */}
        {voiceSupported && (
          <button
            type="button"
            onClick={toggleListening}
            title={isListening ? "Stop voice input" : "Bol kar command dein"}
            className={`w-11 h-11 rounded-full flex items-center justify-center shadow-lg transition ${
              isListening ? "bg-red-500 text-white" : "bg-app border text-muted hover:border-brand"
            }`}
          >
            {isListening ? <MicOff size={16} /> : <Mic size={16} />}
          </button>
        )}
        <button
          type="button"
          onClick={() => onExpand?.()}
          title={`${ASSISTANT_NAME} — tap to open`}
          className="flex items-center gap-2 pl-3 pr-4 py-2.5 rounded-full bg-brand text-white shadow-lg hover:opacity-90 transition"
        >
          <span className="relative flex items-center justify-center w-6 h-6 rounded-full bg-white/20 shrink-0">
            <Bot size={14} />
            {(isListening || isSpeaking) && (
              <span className="absolute inset-0 rounded-full bg-white/40 animate-ping" />
            )}
          </span>
          <span className="text-xs font-medium">
            {isListening ? "Sun raha hoon…" : isSpeaking ? "Bol raha hoon…" : ASSISTANT_NAME}
          </span>
        </button>
      </div>
    );
  }

  // ---- FULL: the complete chat panel, rendered as a fixed overlay so it
  // sits above the current page instead of being a routed page itself. ----
  return (
    <div className="fixed inset-0 z-[60] bg-app flex flex-col p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-fg" style={{ fontFamily: displayFont }}>AI Assistant</h2>
        <div className="flex items-center gap-2">
          {ttsSupported && (
            <button
              type="button"
              onClick={() => {
                // Speaking directly inside this click (a real user gesture)
                // "unlocks" audio on Android Chrome, which otherwise blocks
                // speechSynthesis calls that happen later after an async
                // fetch response.
                if (!voiceEnabled) speakUnlocked("Voice on hai, ab main jawab bol kar dunga.");
                toggleVoiceEnabled();
              }}
              title={voiceEnabled ? "Voice replies on — tap to mute" : "Voice replies off — tap to enable"}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition ${
                voiceEnabled ? "bg-brand/20 text-brand border-brand/30" : "bg-app text-muted"
              }`}
            >
              {voiceEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
              {voiceEnabled ? "Voice on" : "Voice off"}
            </button>
          )}
          <button
            type="button"
            onClick={() => onMinimize?.()}
            title="Minimize"
            className="w-8 h-8 rounded-full flex items-center justify-center bg-app border text-muted hover:border-brand shrink-0"
          >
            <ChevronDown size={16} />
          </button>
        </div>
      </div>
      <Card noPad className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] px-4 py-2.5 text-sm rounded-2xl whitespace-pre-line ${
                m.role === "user" ? "bg-brand text-white rounded-br-md" : "bg-app text-fg border rounded-bl-md"
              }`}>
                {m.text}
              </div>
            </div>
          ))}
          {loading && <TypingDots />}
          <div ref={endRef} />
        </div>
        <div className="px-5 pb-3 flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button key={s} disabled={loading} onClick={() => send(s)} className="text-xs px-3 py-1.5 rounded-full bg-app border text-muted hover:border-brand disabled:opacity-40">
              {s}
            </button>
          ))}
        </div>
        {isListening && (
          <div className="px-5 pb-1.5">
            <div className="flex items-center gap-1.5 text-xs text-red-400">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              {interimTranscript || "Sun raha hoon…"}
            </div>
          </div>
        )}
        <div className="flex items-center gap-2 px-5 py-4 border-t">
          {voiceSupported && (
            <button
              type="button"
              onClick={toggleListening}
              disabled={loading}
              title={isListening ? "Stop voice input" : "Bol kar command dein"}
              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition disabled:opacity-40 ${
                isListening ? "bg-red-500 text-white" : "bg-app border text-muted hover:border-brand"
              }`}
            >
              {isListening ? <MicOff size={15} /> : <Mic size={15} />}
            </button>
          )}
          <input
            value={input}
            disabled={loading}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") send(); }}
            placeholder={isListening ? "Bol rahe hain…" : "Ask about sales, stock, orders, customers…"}
            className={`${inputCls} flex-1 rounded-full disabled:opacity-60`}
          />
          <Button onClick={() => send()} disabled={loading}>
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          </Button>
        </div>
      </Card>
    </div>
  );
}
