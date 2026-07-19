// ============================================================
//  Vercel Serverless Function — /api/place-order
//  🔒 SECURITY (Stage C): customer order ab yahan se save hoti hai,
//  browser se seedha nahi. Wajah:
//    - Total yahan SERVER par products ki asal price se calculate
//      hota hai — customer browser se price tamper nahi kar sakta.
//    - Stock yahan check hota hai — negative/overselling nahi hoga.
//    - Yeh service-role key use karta hai, is liye products/orders
//      table par ab public INSERT/UPDATE policies ki zaroorat nahi.
//
//  Email confirmation: agar customer ne checkout par email diya hai,
//  order save hone ke baad sendOrderConfirmationEmail() fire hota hai.
//  Yeh best-effort hai — email fail ho bhi jaye to order successful
//  hi rehta hai (response order-save par depend karta hai, email par nahi).
// ============================================================
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase, isSupabaseReady } from "./_lib/supabaseServer";
import { sendOrderConfirmationEmail } from "./_lib/emailClient";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!isSupabaseReady()) {
    return res.status(500).json({ error: "Supabase server client ready nahi hai" });
  }

  try {
    const { items, customer, phone, email, address, channel } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Order mein koi item nahi hai" });
    }

    const productIds = items.map((it: any) => it.productId);
    const { data: products, error: fetchErr } = await supabase
      .from("products")
      .select("id, name, price, stock")
      .in("id", productIds);

    if (fetchErr) {
      console.error("place-order: products fetch error", fetchErr.message);
      return res.status(500).json({ error: "Products fetch nahi ho sake" });
    }

    // Stock validate + total server-side calculate karo (client ke
    // bheje hue price/total par bharosa nahi karte).
    let total = 0;
    for (const line of items) {
      const product = products.find((p: any) => p.id === line.productId);
      if (!product) {
        return res.status(400).json({ error: `Product ${line.productId} nahi mila` });
      }
      if (product.stock < line.qty) {
        return res.status(400).json({ error: `${product.name} mein sirf ${product.stock} stock bacha hai` });
      }
      total += Number(product.price) * Number(line.qty);
    }

    const orderId = "ORD-" + Date.now().toString(36).toUpperCase();
    const order = {
      id: orderId,
      customer: customer || "",
      items,
      total,
      status: "pending",
      date: new Date().toISOString(),
      channel: channel || "store",
      phone: phone || "",
      email: email || "",
      address: address || "",
    };

    const { error: insertErr } = await supabase.from("orders").insert(order);
    if (insertErr) {
      console.error("place-order: insert error", insertErr.message);
      return res.status(500).json({ error: "Order save nahi ho saka" });
    }

    for (const line of items) {
      const product = products.find((p: any) => p.id === line.productId);
      const newStock = Math.max(0, product.stock - line.qty);
      const { error: stockErr } = await supabase
        .from("products")
        .update({ stock: newStock })
        .eq("id", line.productId);
      if (stockErr) console.error("place-order: stock update error", stockErr.message);
    }

    // Best-effort confirmation email — order response client ko email
    // ke result ka wait kiye baghair chala jaye, lekin agar Resend fast
    // respond kare to await kar lete hain taake error log ho sake.
    if (email) {
      try {
        await sendOrderConfirmationEmail(
          { id: order.id, customer: order.customer, total: order.total, items: order.items },
          email
        );
      } catch (emailErr: any) {
        console.error("place-order: confirmation email failed", emailErr.message);
      }
    }

    return res.status(200).json({ success: true, order });
  } catch (err: any) {
    console.error("place-order: unexpected error", err.message);
    return res.status(500).json({ error: "Kuch ghalat ho gaya, dobara try karein" });
  }
}
