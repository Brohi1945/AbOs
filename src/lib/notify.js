// ============================================================
//  SMS/WhatsApp notification helpers (Twilio, via /api/notify)
//  These are "fire and forget" — they never throw, so a notification
//  failure (or Twilio not being configured yet) never breaks the order
//  or inventory flow that triggered it.
// ============================================================

async function sendNotification(message) {
  try {
    await fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
  } catch (err) {
    console.error("sendNotification failed:", err.message);
  }
}

export function notifyNewOrder(order) {
  const itemsText = (order.items || []).map((it) => `${it.qty}x ${it.name}`).join(", ");
  sendNotification(
    `Naya order ${order.id}\nCustomer: ${order.customer}\nItems: ${itemsText}\nTotal: Rs ${order.total}`
  );
}

export function notifyLowStock(product, newStock) {
  sendNotification(
    `Low stock alert: ${product.name} sirf ${newStock} units bache hain (threshold: ${product.threshold}).`
  );
}