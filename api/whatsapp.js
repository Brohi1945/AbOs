// ============================================================
//  Vercel Serverless Function — /api/whatsapp
//  Manual/outbound WhatsApp sender. POST { to, message } to send a plain
//  text WhatsApp message — useful for testing the Meta credentials work
//  before wiring up the full webhook flow.
// ============================================================
import { sendWhatsAppText } from "./_lib/waClient.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { to, message } = req.body || {};
  if (!to || !message) {
    return res.status(400).json({ error: "to and message are required" });
  }

  const result = await sendWhatsAppText(to, message);
  if (!result.ok) {
    return res.status(500).json({ error: result.data || result.error || "send failed" });
  }
  return res.status(200).json({ sent: true });
}
