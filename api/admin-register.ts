// ============================================================
//  Vercel Serverless Function — /api/admin-register
//
//  Naya admin panel account banane ka pehla step:
//    1. Supabase Auth mein user create hota hai (service-role
//       admin.createUser), lekin email_confirm: false — isay tab
//       tak login allow nahi hota jab tak OTP verify na ho.
//    2. Ek 6-digit code generate hota hai, sirf hash `admin_verifications`
//       table mein save hota hai (asal code kabhi DB mein nahi jata).
//    3. Code Email (Resend) aur SMS (Twilio) — dono par bheja jata hai.
//
//  Frontend flow: is endpoint ke baad user ko /api/admin-verify-code
//  par code submit karna hota hai — tabhi account use ho sakta hai.
//
//  Required Supabase table (see README §16 for full SQL):
//    admin_verifications(id, user_id, email, phone, code_hash,
//                         attempts, verified, expires_at, created_at)
// ============================================================
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase, isSupabaseReady } from "./_lib/supabaseServer.js";
import { sendAdminVerificationEmail } from "./_lib/emailClient.js";
import { sendSms } from "./_lib/smsClient.js";
import { generateOtp, hashOtp, OTP_TTL_MINUTES } from "./_lib/otp.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!isSupabaseReady()) {
    return res.status(500).json({ error: "Supabase server client ready nahi hai" });
  }

  try {
    const { name, email, phone, password } = req.body || {};

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ error: "Naam, email, phone aur password zaroori hain" });
    }
    if (String(password).length < 8) {
      return res.status(400).json({ error: "Password kam se kam 8 characters ka hona chahiye" });
    }

    // Supabase Auth user create karo — email_confirm:false rakhte hain
    // taake OTP verify hone se pehle login na ho sake.
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: { name, phone },
    });

    if (createErr) {
      return res.status(400).json({ error: createErr.message || "Account create nahi ho saka" });
    }

    const userId = created.user?.id;
    const code = generateOtp();
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000).toISOString();

    const { error: insertErr } = await supabase.from("admin_verifications").insert({
      user_id: userId,
      email,
      phone,
      code_hash: hashOtp(code),
      attempts: 0,
      verified: false,
      expires_at: expiresAt,
    });

    if (insertErr) {
      console.error("admin-register: verification row insert failed", insertErr.message);
      return res.status(500).json({ error: "Verification code save nahi ho saka" });
    }

    const results = await Promise.allSettled([
      sendAdminVerificationEmail(email, code),
      sendSms(phone, `AB OS admin verification code: ${code} (10 minute mein expire hoga)`),
    ]);

    const emailFailed = results[0].status === "rejected";
    const smsFailed = results[1].status === "rejected";
    if (emailFailed) console.error("admin-register: email send failed", (results[0] as PromiseRejectedResult).reason);
    if (smsFailed) console.error("admin-register: sms send failed", (results[1] as PromiseRejectedResult).reason);

    return res.status(200).json({
      success: true,
      emailSent: !emailFailed,
      smsSent: !smsFailed,
    });
  } catch (err: any) {
    console.error("admin-register: unexpected error", err.message);
    return res.status(500).json({ error: "Kuch ghalat ho gaya, dobara try karein" });
  }
}
