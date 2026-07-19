// ============================================================
//  Safepay client — Express Checkout integration
//  🔒 Yeh sirf server-side use hota hai. SAFEPAY_SECRET_KEY kabhi
//  frontend bundle mein nahi jaani chahiye — sirf Vercel env var mein.
//
//  Flow (Safepay "Express Checkout" — official docs ke mutabiq):
//    1. createSafepaySession()   -> payment tracker + auth token
//    2. buildSafepayCheckoutUrl() -> customer ko is URL par redirect karo
//    3. fetchSafepayTracker()    -> webhook aane par asal status verify karo
// ============================================================
import Safepay from "@sfpy/node-core";

const SANDBOX_HOST = "https://sandbox.api.getsafepay.com";
const LIVE_HOST = "https://api.getsafepay.com";

const env = process.env.SAFEPAY_ENV || "sandbox"; // "sandbox" ya "production"
const secretKey = process.env.SAFEPAY_SECRET_KEY;
const publicKey = process.env.SAFEPAY_PUBLIC_KEY; // merchant_api_key (sec_...)

export function isSafepayReady() {
  if (!secretKey || !publicKey) {
    console.error("⚠️ SAFEPAY_SECRET_KEY ya SAFEPAY_PUBLIC_KEY missing hai Vercel env vars mein.");
    return false;
  }
  return true;
}

function getClient() {
  return Safepay(secretKey, {
    authType: "secret",
    host: env === "production" ? LIVE_HOST : SANDBOX_HOST,
  });
}

// Rupay ko paisa mein convert karta hai — Safepay amount lowest
// denomination mein chahta hai (PKR ke liye 1 Rs = 100 paisa).
export function rupeesToPaisa(rupees: number) {
  return Math.round(Number(rupees) * 100);
}

// Step 2 + 3: payment session (tracker) banao, phir auth token banao.
export async function createSafepaySession(orderId: string, amountRupees: number) {
  const safepay = getClient();

  const session: any = await safepay.payments.session.setup({
    merchant_api_key: publicKey,
    intent: "CYBERSOURCE",
    mode: "payment",
    entry_mode: "raw",
    currency: "PKR",
    amount: rupeesToPaisa(amountRupees),
    metadata: { order_id: orderId },
  });

  const trackerToken = session?.data?.tracker?.token;
  if (!trackerToken) {
    throw new Error("Safepay tracker token nahi mila — session response check karein.");
  }

  const authResponse: any = await safepay.auth.passport.create();
  const authToken = authResponse?.data;
  if (!authToken) {
    throw new Error("Safepay authentication token nahi mila.");
  }

  return { trackerToken, authToken };
}

// Step 4: Checkout URL generate karo jahan customer ko redirect karna hai.
export function buildSafepayCheckoutUrl(params: {
  trackerToken: string;
  authToken: string;
  redirectUrl: string;
  cancelUrl: string;
}) {
  const safepay = getClient();
  const { trackerToken, authToken, redirectUrl, cancelUrl } = params;

  return safepay.checkouts.payment.create({
    tracker: trackerToken,
    tbt: authToken,
    environment: env,
    source: "hosted",
    redirect_url: redirectUrl,
    cancel_url: cancelUrl,
  });
}

// Webhook verification ke ilawa extra confirmation — Safepay se seedha
// tracker ka asal status fetch karta hai.
export async function fetchSafepayTracker(trackerToken: string) {
  const safepay = getClient();
  return safepay.reporter.payments.fetch(trackerToken);
}
