// ============================================================
//  Shared validators — order/customer data ko save/payment
//  process karne se pehle yahan check karte hain.
// ============================================================

// Pakistani mobile number: 03XXXXXXXXX (11 digits) ya +923XXXXXXXXX /
// 923XXXXXXXXX (country code ke sath). Spaces/dashes normalize kar dete hain.
export function isValidPakPhone(phone) {
  if (!phone || typeof phone !== "string") return false;
  const cleaned = phone.replace(/[\s-]/g, "");
  return /^(\+92|0092|92|0)3\d{9}$/.test(cleaned);
}

// Number ko ek standard format mein normalize karta hai (+923XXXXXXXXX) —
// Safepay/WhatsApp ko consistent format bhejne ke liye.
export function normalizePakPhone(phone) {
  const cleaned = phone.replace(/[\s-]/g, "");
  const digits = cleaned.replace(/^(\+92|0092|92|0)/, "");
  return `+92${digits}`;
}
