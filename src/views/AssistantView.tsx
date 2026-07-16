import React, { useState, useRef, useEffect } from "react";
import { Send, Loader2 } from "lucide-react";
import { displayFont } from "../lib/theme";
import { CATEGORIES } from "../lib/seedData";
import { callClaude, parseAssistantReply, TypingDots } from "../lib/aiHelpers";
import { Card, Button, inputCls } from "../components/ui";

interface Message {
  role: "user" | "bot";
  text: string;
}

interface AssistantViewProps {
  orders: any[];
  products: any[];
  onAddProduct: (product: any) => void;
  onEditProduct: (id: string, fields: any) => void;
  onDeleteProduct: (id: string) => void;
  onUpdateStatus: (orderId: string, status: string) => void;
}

export default function AssistantView({ orders, products, onAddProduct, onEditProduct, onDeleteProduct, onUpdateStatus }: AssistantViewProps) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "bot", text: "Hi! I'm your store's AI assistant — I'm connected live to your orders and inventory. I can also add/edit products or update order statuses for you, just ask." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const suggestions = ["Show today's sales", "Low stock items", "Recent orders", "Add a new product"];
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const send = async (text?: string) => {
    const q = (text ?? input).trim();
    if (!q || loading) return;
    const history = messages;
    setMessages((m) => [...m, { role: "user", text: q }]);
    setInput("");
    setLoading(true);

    const storeContext = {
      totalOrders: orders.length,
      totalSales: orders.filter((o) => o.status !== "cancelled").reduce((s, o) => s + o.total, 0),
      pendingOrders: orders.filter((o) => o.status === "pending").map((o) => ({ id: o.id, customer: o.customer, total: o.total })),
      recentOrders: orders.slice(0, 6).map((o) => ({ id: o.id, customer: o.customer, total: o.total, status: o.status, channel: o.channel, date: o.date })),
      lowStockProducts: products.filter((p) => p.stock <= p.threshold).map((p) => ({ id: p.id, name: p.name, stock: p.stock, threshold: p.threshold })),
      allProducts: products.map((p) => ({ id: p.id, name: p.name, category: p.category, price: p.price, cost: p.cost, stock: p.stock, threshold: p.threshold })),
    };

    const systemPrompt = `You are the internal AI assistant inside a small retail store's admin dashboard (AB OS). You help the store owner in two ways:
1. Answer questions briefly (2-4 sentences, or a short list) using ONLY the live store data given below as JSON.
2. Perform real management actions when asked: adding a new product, editing a product's price/stock/etc, deleting a product, or updating an order's status. When the owner asks for one of these, collect any missing required fields by asking ONE question at a time, then emit the action once you have everything.

Amounts are in Pakistani Rupees (Rs). If a question isn't covered by this data, say you don't have that information rather than guessing.

Always write the "reply" text in Roman Urdu (Urdu written in plain English/Latin letters, e.g. "aapki sales acchi ja rahi hain"). Do not mix in English words unless it's a product name, number, or a term with no natural Urdu equivalent. Do not reply in Urdu script or in English.

CRITICAL OUTPUT FORMAT — you must ALWAYS respond with ONLY a raw JSON object (no markdown fences, no extra text), matching exactly this shape:
{"reply": "message in Roman Urdu", "action": null}

When ready to perform a management action, set "action" to one of these shapes instead:
- {"type": "add_product", "name": "...", "category": "...", "price": 100, "cost": 70, "stock": 20, "threshold": 10, "barcode": ""}
- {"type": "edit_product", "productId": "P001", "fields": {"price": 120, "stock": 15}}
- {"type": "delete_product", "productId": "P001"}
- {"type": "update_order_status", "orderId": "ORD-1042", "status": "confirmed"}

Only emit an action once you have the required fields (for add_product: at least name, category, price, stock). Category must be one of: ${JSON.stringify(CATEGORIES)}. Status must be one of: pending, confirmed, delivered, cancelled.

Store data:
${JSON.stringify(storeContext)}`;

    try {
      const raw = await callClaude(systemPrompt, history, q);
      const { reply, action } = parseAssistantReply(raw);
      setMessages((m) => [...m, { role: "bot", text: reply }]);

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
        }
      }
    } catch (err) {
      setMessages((m) => [...m, { role: "bot", text: "Sorry, I couldn't reach the assistant just now. Please try again in a moment." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-text-primary" style={{ fontFamily: displayFont }}>AI Assistant</h2>
      <Card noPad className="flex flex-col" style={{ height: "80vh" }}>
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] px-4 py-2.5 text-sm rounded-2xl whitespace-pre-line ${
                m.role === "user" ? "bg-indigo-600 text-white rounded-br-md" : "bg-slate-800 text-gray-200 border border-white/10 rounded-bl-md"
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
            <button key={s} disabled={loading} onClick={() => send(s)} className="text-xs px-3 py-1.5 rounded-full bg-slate-800 border border-white/10 text-gray-300 hover:border-indigo-400 disabled:opacity-40">
              {s}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 px-5 py-4 border-t border-white/10">
          <input
            value={input}
            disabled={loading}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") send(); }}
            placeholder="Ask about sales, stock, or orders…"
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