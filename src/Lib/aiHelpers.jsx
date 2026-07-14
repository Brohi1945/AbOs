import React from "react";
import { Loader2 } from "lucide-react";

/* ---------------------------------- AI Assistant view ---------------------------------- */

/**
 * Calls the live Claude API with a system prompt grounded in the current
 * store data, so the assistant answers using real orders/inventory instead
 * of canned keyword matches.
 */
export async function callClaude(systemPrompt, history, userText) {
  const apiMessages = [
    ...history
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

  if (!response.ok) throw new Error(`API error ${response.status}`);
  const data = await response.json();
  const text = (data.content || [])
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
  return text || "I couldn't find a good answer for that — try rephrasing?";
}

/**
 * The assistant is instructed to always respond with a JSON envelope:
 * { "reply": "text to show the user", "action": null | { "type": "...", ...fields } }
 * This safely parses that, stripping markdown code fences if present,
 * and falls back to treating the raw text as a plain reply if parsing fails.
 */
export function parseAssistantReply(raw) {
  let cleaned = (raw || "").trim();
  cleaned = cleaned.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "");
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed === "object" && "reply" in parsed) {
      return { reply: parsed.reply, action: parsed.action || null };
    }
  } catch (e) {
    // not JSON — treat as plain text
  }
  return { reply: raw, action: null };
}

export function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl rounded-bl-md w-fit">
      <Loader2 size={13} className="animate-spin text-indigo-500" />
      <span className="text-xs text-slate-400">Thinking…</span>
    </div>
  );
}
