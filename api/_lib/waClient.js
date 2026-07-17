// ============================================================
//  Shared WhatsApp Cloud API text-message sender.
//  Used by BOTH api/whatsapp.js (manual/admin outbound sends) and
//  api/whatsapp-webhook.js (auto-replies to incoming messages).
//  Fire-and-forget style: never throws in a way that breaks the caller.
// ============================================================

export async function sendWhatsAppText(to, body) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    console.error("sendWhatsAppText: WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID not set");
    return { ok: false, skipped: true };
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body },
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("sendWhatsAppText error:", data);
      return { ok: false, data };
    }
    return { ok: true, data };
  } catch (err) {
    console.error("sendWhatsAppText failed:", err.message);
    return { ok: false, error: err.message };
  }
}
