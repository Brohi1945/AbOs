// ============================================================
//  Shared Groq (OpenAI-compatible) caller.
//  Used by BOTH api/chat.js (web AI widgets) and
//  api/whatsapp-webhook.js (WhatsApp bot) so the model config
//  lives in exactly one place — do not duplicate this logic.
// ============================================================

export async function callGroq(systemPrompt, messages) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    const err = new Error("GROQ_API_KEY is not set in Vercel environment variables");
    err.status = 500;
    throw err;
  }

  const chatMessages = [
    { role: "system", content: systemPrompt },
    ...messages.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    })),
  ];

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "openai/gpt-oss-120b",
      messages: chatMessages,
      temperature: 0.5,
      max_completion_tokens: 1000,
      response_format: { type: "json_object" },
      frequency_penalty: 0.4,
      presence_penalty: 0.3,
      reasoning_effort: "low",
      include_reasoning: false,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const err = new Error("Groq API error");
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data?.choices?.[0]?.message?.content || "";
}

// Same parsing rules as src/lib/aiHelpers.tsx's parseAssistantReply — kept
// as a small standalone copy here because this file runs as plain Node
// (not Vite-bundled) and can't import the frontend .tsx module directly.
export function parseReply(raw) {
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
      // fall through
    }
  }
  return { reply: raw || "Sorry, samajh nahi aaya — dobara batayein?", action: null };
}
