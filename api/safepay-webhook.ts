// ============================================================
//  Vercel Serverless Function — /api/safepay-webhook
//  Safepay yahan "payment.succeeded" / "payment.failed" events bhejta
//  hai jab customer payment complete/cancel/fail karta hai. Yahan hum
//  order ka payment_status update karte hain Supabase mein.
//
//  🔧 Yeh URL Safepay Dashboard → Developers → Webhooks mein add karni
//  hai: https://<aapka-domain>/api/safepay-webhook
// ============================================================
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase, isSupabaseReady } from "./_lib/supabaseServer.js";
import { fetchSafepayTracker } from "./_lib/safepayClient.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!isSupabaseReady()) {
    return res.status(500).json({ error: "Supabase ready nahi hai" });
  }

  try {
    const event: any = req.body || {};
    const tracker = event?.data?.tracker || event?.tracker;
    const trackerToken: string | undefined = tracker?.token || event?.data?.token;
    const eventType: string = event?.type || event?.event || "";

    if (!trackerToken) {
      console.warn("safepay-webhook: tracker token missing in payload", JSON.stringify(event));
      return res.status(400).json({ error: "Tracker token missing" });
    }

    // 🔎 Extra confirmation: webhook payload par hi bharosa nahi karte,
    // Safepay se seedha tracker fetch karke uska asal state check karte hain.
    const verified: any = await fetchSafepayTracker(trackerToken);
    const state = verified?.data?.tracker?.state;

    const paymentStatus =
      state === "TRACKER_ENDED" ? "paid" : eventType.includes("failed") ? "failed" : "pending";

    const { data: order, error: findErr } = await supabase
      .from("orders")
      .select("id")
      .eq("safepay_tracker", trackerToken)
      .single();

    if (findErr || !order) {
      console.warn("safepay-webhook: matching order nahi mila tracker ke liye", trackerToken);
      return res.status(200).json({ received: true, matched: false });
    }

    const updates: Record<string, string> = { payment_status: paymentStatus };
    if (paymentStatus === "paid") updates.status = "confirmed";

    await supabase.from("orders").update(updates).eq("id", order.id);

    return res.status(200).json({ received: true, matched: true, paymentStatus });
  } catch (err: any) {
    console.error("safepay-webhook: error", err.message);
    return res.status(500).json({ error: "Webhook process nahi ho saka" });
  }
}
