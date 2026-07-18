import React from "react";
import { Loader2 } from "lucide-react";

interface ChatMessage {
  role: string;
  text: string;
}

interface AssistantAction {
  type: string;
  items?: { productId: string; qty: number }[];
  customer?: { name: string; phone: string; address: string };
  // add_product
  name?: string;
  category?: string;
  price?: number;
  cost?: number;
  stock?: number;
  threshold?: number;
  barcode?: string;
  // edit_product / delete_product
  productId?: string;
  fields?: Record<string, any>;
  // update_order_status
  orderId?: string;
  status?: string;
}

export async function callClaude(systemPrompt: string, history: ChatMessage[], userText: string): Promise<string> {
  // Only send the most recent turns. Sending the entire, ever-growing
  // conversation on every request bloats the prompt and is a common cause
  // of the model losing track and repeating earlier replies in long chats.
  const recentHistory = history.slice(-16);
  const apiMessages = [
    ...recentHistory
      .filter((m) => m.role === "user" || m.role === "bot")
      .map((m) => ({ role: m.role === "bot" ? "assistant" : "user", content: m.text })),
    { role: "user", content: userText },
  ];

  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemPrompt,
      messages: apiMessages,
    }),
  });

  if (!response.ok) {
    let detail: any = null;
    try { detail = await response.json(); } catch { /* body wasn't JSON */ }
    const err: any = new Error(`API error ${response.status}`);
    err.status = response.status;
    err.detail = detail;
    throw err;
  }
  const data = await response.json();
  const text = (data.content || [])
    .filter((block: any) => block.type === "text")
    .map((block: any) => block.text)
    .join("\n")
    .trim();
  return text || "I couldn't find a good answer for that — try rephrasing?";
}

export function parseAssistantReply(raw: string): { reply: string; action: AssistantAction | null } {
  let cleaned = (raw || "").trim();
  cleaned = cleaned.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "");

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    const jsonSlice = cleaned.slice(start, end + 1);
    try {
      const parsed = JSON.parse(jsonSlice);
      if (parsed && typeof parsed === "object" && "reply" in parsed) {
        return { reply: parsed.reply, action: parsed.action || null };
      }
    } catch (e) {
      // fall through to plain text
    }
  }
  return { reply: raw, action: null };
}

export function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3 bg-app border rounded-2xl rounded-bl-md w-fit">
      <Loader2 size={13} className="animate-spin text-brand" />
      <span className="text-xs text-muted">Thinking…</span>
    </div>
  );
}
