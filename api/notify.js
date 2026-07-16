// ============================================================
//  Vercel Serverless Function — /api/notify
//  Sends the store owner an SMS via Twilio for new orders and
//  low-stock alerts.
//
//  Env vars needed (Vercel → Settings → Environment Variables):
//    TWILIO_ACCOUNT_SID   — starts with "AC..."
//    TWILIO_AUTH_TOKEN    — from the same Twilio console page
//    TWILIO_PHONE_NUMBER  — the Twilio number you send FROM, e.g. +1XXXXXXXXXX
//    ADMIN_PHONE_NUMBER   — the store owner's phone to send TO, e.g. +923XXXXXXXXX
//
//  If these aren't set yet, this quietly does nothing (returns 200 with
//  skipped:true) so the rest of the app keeps working as before.
// ============================================================

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, ADMIN_PHONE_NUMBER } = process.env;

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER || !ADMIN_PHONE_NUMBER) {
    return res.status(200).json({ skipped: true, reason: "Twilio env vars not set yet" });
  }

  try {
    const { message, to } = req.body || {};
    if (!message) return res.status(400).json({ error: "message is required" });

    const recipient = to || ADMIN_PHONE_NUMBER;
    const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64");

    const form = new URLSearchParams({
      To: recipient,
      From: TWILIO_PHONE_NUMBER,
      Body: message,
    });

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form.toString(),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Twilio error:", data);
      return res.status(response.status).json({ error: data });
    }

    return res.status(200).json({ sent: true, sid: data.sid });
  } catch (err) {
    console.error("notify error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}