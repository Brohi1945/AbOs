// ============================================================
//  Vercel Serverless Function — /api/admin-verify-code
//
//  admin-register.ts ke baad frontend yahan {email, code} bhejta hai.
//  Code sahi + abhi expire nahi hua to:
//    - admin_verifications row par verified:true set hota hai
//    - Supabase Auth user par email_confirm:true set hota hai
//      (ab woh signInWithPassword se login kar sakta hai)
//
//  5 galat attempts ke baad wohi code block ho jata hai (bruteforce
//  guard) — user ko dobara /api/admin-register call karna hoga.
// ============================================================
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase, isSupabaseReady } from "./_lib/supabaseServer.js";
import { hashOtp, OTP_MAX_ATTEMPTS } from "./_lib/otp.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!isSupabaseReady()) {
    return res.status(500).json({ error: "Supabase server client ready nahi hai" });
  }

  try {
    const { email, code } = req.body || {};
    if (!email || !code) {
      return res.status(400).json({ error: "Email aur code zaroori hain" });
    }

    const { data: row, error: fetchErr } = await supabase
      .from("admin_verifications")
      .select("*")
      .eq("email", email)
      .eq("verified", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchErr) {
      console.error("admin-verify-code: fetch error", fetchErr.message);
      return res.status(500).json({ error: "Verification check nahi ho saka" });
    }
    if (!row) {
      return res.status(400).json({ error: "Koi pending verification nahi mili — pehle register karein" });
    }
    if (new Date(row.expires_at).getTime() < Date.now()) {
      return res.status(400).json({ error: "Code expire ho chuka hai — dobara register karein" });
    }
    if (row.attempts >= OTP_MAX_ATTEMPTS) {
      return res.status(429).json({ error: "Bohat zyada ghalat koshishein — dobara register karein" });
    }

    if (hashOtp(String(code)) !== row.code_hash) {
      await supabase
        .from("admin_verifications")
        .update({ attempts: row.attempts + 1 })
        .eq("id", row.id);
      return res.status(400).json({ error: "Code ghalat hai" });
    }

    await supabase.from("admin_verifications").update({ verified: true }).eq("id", row.id);

    if (row.user_id) {
      const { error: confirmErr } = await supabase.auth.admin.updateUserById(row.user_id, {
        email_confirm: true,
      });
      if (confirmErr) {
        console.error("admin-verify-code: confirm error", confirmErr.message);
        return res.status(500).json({ error: "Account confirm nahi ho saka" });
      }
    }

    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error("admin-verify-code: unexpected error", err.message);
    return res.status(500).json({ error: "Kuch ghalat ho gaya, dobara try karein" });
  }
}
