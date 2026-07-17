// ============================================================
//  Vercel Serverless Function — /api/whatsapp-webhook
//  Receives incoming WhatsApp messages from Meta, runs them through the
//  Groq AI (same brain as the web store's CustomerAssistantWidget), and
//  dispatches actions (place_order / join_waitlist) into the SAME
//  Supabase tables the web app uses — so a "Waitlist" entry from
//  WhatsApp shows up in the exact same admin Waitlist view as one from
//  the website.
//
//  Env vars needed (Vercel → Settings → Environment Variables):
//    WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_VERIFY_TOKEN,
//    ADMIN_WHATSAPP_NUMBER, GROQ_API_KEY,
//    VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY (already set)
// ============================================================
import { supabase } from "./_lib/supabaseServer.js";
import { sendWhatsAppText } from "./_lib/waClient.js";
import { callGroq, parseReply } from "./_lib/groqClient.js";

const CATEGORIES = ["Groceries", "Beverages", "Snacks", "Household", "Personal Care"];

function genId(prefix) {
  return prefix + "-" + Math.random().toString(36).slice(2, 7).toUpperCase();
}

// Pakistani numbers show up in different formats depending on where they
// were typed (local "0301-2345678" on the website vs WhatsApp's
// "923012345678" wa_id) — comparing the last 10 digits matches them
// regardless of format.
function last10(phone) {
  const digits = (phone || "").replace(/\D/g, "");
  return digits.slice(-10);
}

function availableStock(p) {
  return Math.max(0, (p.stock || 0) - (p.reserved_stock || 0));
}

async function getSession(phone) {
  if (!supabase) return [];
  const { data, error } = await supabase.from("whatsapp_sessions").select("*").eq("phone", phone).maybeSingle();
  if (error) {
    console.error("getSession error:", error.message);
    return [];
  }
  return data?.messages || [];
}

async function saveSession(phone, messages) {
  if (!supabase) return;
  const trimmed = messages.slice(-16);
  const { error } = await supabase
    .from("whatsapp_sessions")
    .upsert({ phone, messages: trimmed, updated_at: new Date().toISOString() });
  if (error) console.error("saveSession error:", error.message);
}

// ---- Customer branch: sales + order-taking + waitlist + tracking ----
async function buildCustomerPrompt(senderName, senderPhone) {
  const { data: products } = await supabase.from("products").select("*");
  const { data: orders } = await supabase.from("orders").select("*");

  const myOrders = (orders || []).filter((o) => last10(o.phone) === last10(senderPhone));

  const shopContext = {
    catalog: (products || []).map((p) => ({
      id: p.id, name: p.name, category: p.category, price: p.price,
      inStock: availableStock(p) > 0, specs: p.specs,
    })),
    customerOrders: myOrders.map((o) => ({ id: o.id, status: o.status, total: o.total, items: o.items, date: o.date })),
    customerName: senderName || "",
    deliveryInfo: "Standard delivery takes 1-2 days within the city.",
    paymentInfo: "Cash on Delivery is accepted; bank transfer support is coming soon.",
  };

  const systemPrompt = `You are the friendly SALES + support assistant for AB Store, replying over WhatsApp. You can do five things:
1. Answer questions about products, specs, prices, delivery, and payment using ONLY the catalog data below.
2. Proactively push sales: when a customer shows interest in a product, briefly mention one relevant add-on from the catalog — never pushy, one suggestion max per reply.
3. Track existing orders using the customerOrders data (these are already matched to this customer's phone number — never ask them for an order ID).
4. Take a NEW order end-to-end: the customer's name and phone are already known (see customerName above, and their WhatsApp number is the phone). Figure out which in-stock product(s) and quantities from the conversation, then ask ONLY for their delivery address if missing. Once you have product(s)+quantities AND address, emit the place_order action.
5. If a customer asks when a product will be available/restocked ("kab tak milega", "available kab hoga", "stock kab aayega" etc.) OR wants a product that is OUT OF STOCK (inStock: false), treat this as strong buying intent — do NOT just answer informationally and stop there. Warmly acknowledge it's currently unavailable, briefly highlight why they'd like it (using its specs), then proactively offer to add them to the waitlist. Their name/phone are already known, so once you know WHICH product and quantity, emit the join_waitlist action immediately — do not ask for name or phone again, and do not wait for them to explicitly say "yes add me".

You are warm, attentive, and proactive — like a good real-life shop salesman, not a passive FAQ bot. Always try to move the conversation toward either a completed sale or a waitlist signup, and share relevant product info (specs, price, category) naturally as part of the conversation.

Prices are in Pakistani Rupees (Rs). Never mention cost price, margins, or internal admin details.

Always write the "reply" text in Roman Urdu (Urdu written in plain English/Latin letters). Do not mix in English words unless it's a product name, number, or a term with no natural Urdu equivalent. Do not reply in Urdu script or in English.

CRITICAL OUTPUT FORMAT — respond with ONLY a raw JSON object (no markdown fences, no extra text):
{"reply": "message in Roman Urdu", "action": null}

When ready to place the order:
{"reply": "confirmation in Roman Urdu", "action": {"type": "place_order", "items": [{"productId": "P001", "qty": 2}], "address": "..."}}

When ready to join the waitlist:
{"reply": "confirmation in Roman Urdu explaining they're on the waitlist and reserved for 48 hours once notified", "action": {"type": "join_waitlist", "productId": "P001", "qty": 1}}

Only emit an action once you truly have everything needed for it — otherwise "action": null and ask for the missing piece in "reply".

Shop data:
${JSON.stringify(shopContext)}`;

  return { systemPrompt, products: products || [] };
}

// ---- Admin branch: internal inventory assistant (mirrors AssistantView.tsx) ----
async function buildAdminPrompt() {
  const { data: products } = await supabase.from("products").select("*");
  const { data: orders } = await supabase.from("orders").select("*");

  const storeContext = {
    totalOrders: (orders || []).length,
    totalSales: (orders || []).filter((o) => o.status !== "cancelled").reduce((s, o) => s + o.total, 0),
    pendingOrders: (orders || []).filter((o) => o.status === "pending").map((o) => ({ id: o.id, customer: o.customer, total: o.total })),
    lowStockProducts: (products || []).filter((p) => p.stock <= p.threshold).map((p) => ({ id: p.id, name: p.name, stock: p.stock, threshold: p.threshold })),
    allProducts: (products || []).map((p) => ({ id: p.id, name: p.name, category: p.category, price: p.price, cost: p.cost, stock: p.stock, threshold: p.threshold })),
  };

  const systemPrompt = `You are the internal AI assistant for AB Store's owner, replying over WhatsApp. This is NOT a customer — never take customer orders or upsell, this is the store owner managing inventory.
1. Answer questions briefly using ONLY the live store data below.
2. Perform management actions when asked: add a product, edit a product's price/stock, delete a product, or update an order's status. Ask ONE missing field at a time, then emit the action once you have everything.

Amounts are in Pakistani Rupees (Rs).

Always write "reply" in Roman Urdu. CRITICAL OUTPUT FORMAT — respond with ONLY a raw JSON object:
{"reply": "message in Roman Urdu", "action": null}

Action shapes:
- {"type": "add_product", "name": "...", "category": "...", "price": 100, "cost": 70, "stock": 20, "threshold": 10}
- {"type": "edit_product", "productId": "P001", "fields": {"price": 120, "stock": 15}}
- {"type": "delete_product", "productId": "P001"}
- {"type": "update_order_status", "orderId": "ORD-1042", "status": "confirmed"}

Category must be one of: ${JSON.stringify(CATEGORIES)}. Status must be one of: pending, confirmed, delivered, cancelled.

Store data:
${JSON.stringify(storeContext)}`;

  return { systemPrompt, products: products || [] };
}

async function dispatchCustomerAction(action, products, senderName, senderPhone) {
  if (action.type === "place_order" && Array.isArray(action.items) && action.items.length) {
    const lines = action.items
      .map((it) => {
        const product = products.find((p) => p.id === it.productId);
        return product ? { productId: product.id, name: product.name, qty: Number(it.qty) || 1, price: product.price } : null;
      })
      .filter(Boolean);
    if (!lines.length) return;

    const total = lines.reduce((s, l) => s + l.price * l.qty, 0);
    const order = {
      id: genId("ORD"),
      customer: senderName || "WhatsApp customer",
      phone: senderPhone,
      address: action.address || "",
      channel: "WhatsApp",
      items: lines.map((l) => ({ productId: l.productId, name: l.name, qty: l.qty })),
      total,
      status: "pending",
      date: new Date().toLocaleString(),
    };
    await supabase.from("orders").insert(order);

    for (const l of lines) {
      const product = products.find((p) => p.id === l.productId);
      if (product) {
        await supabase.from("products").update({ stock: Math.max(0, product.stock - l.qty) }).eq("id", product.id);
      }
    }
  } else if (action.type === "join_waitlist" && action.productId) {
    await supabase.from("waitlist").insert({
      product_id: action.productId,
      customer_name: senderName || "WhatsApp customer",
      phone: senderPhone,
      qty: Number(action.qty) || 1,
      status: "waiting",
      channel: "WhatsApp",
    });
  }
}

async function dispatchAdminAction(action) {
  if (action.type === "add_product" && action.name) {
    await supabase.from("products").insert({
      id: genId("P"),
      barcode: genId("BC"),
      name: action.name,
      category: action.category || CATEGORIES[0],
      price: Number(action.price) || 0,
      cost: Number(action.cost) || 0,
      stock: Number(action.stock) || 0,
      threshold: Number(action.threshold) || 10,
      color: "bg-indigo-100 text-indigo-700",
    });
  } else if (action.type === "edit_product" && action.productId && action.fields) {
    await supabase.from("products").update(action.fields).eq("id", action.productId);
  } else if (action.type === "delete_product" && action.productId) {
    await supabase.from("products").delete().eq("id", action.productId);
  } else if (action.type === "update_order_status" && action.orderId && action.status) {
    await supabase.from("orders").update({ status: action.status }).eq("id", action.orderId);
  }
}

export default async function handler(req, res) {
  // ---- Meta webhook verification handshake ----
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.status(403).send("Forbidden");
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Always acknowledge Meta with 200, even on internal errors, so it
  // doesn't keep retrying the same webhook delivery.
  try {
    const value = req.body?.entry?.[0]?.changes?.[0]?.value;
    const message = value?.messages?.[0];

    // No "messages" field = a delivery/read-receipt "statuses" payload, not
    // an actual incoming message. No-op.
    if (!message || message.type !== "text") {
      return res.status(200).json({ ok: true, skipped: true });
    }

    const senderPhone = message.from; // digits only, country code, e.g. "923001234567"
    const senderName = value?.contacts?.[0]?.profile?.name || "";
    const userText = message.text?.body?.trim();
    if (!userText || !supabase) {
      return res.status(200).json({ ok: true, skipped: true });
    }

    const isAdmin = last10(senderPhone) === last10(process.env.ADMIN_WHATSAPP_NUMBER || "");

    const history = await getSession(senderPhone);

    let systemPrompt, products;
    if (isAdmin) {
      ({ systemPrompt, products } = await buildAdminPrompt());
    } else {
      ({ systemPrompt, products } = await buildCustomerPrompt(senderName, senderPhone));
    }

    const apiMessages = [
      ...history.slice(-16),
      { role: "user", content: userText },
    ];

    const raw = await callGroq(systemPrompt, apiMessages);
    const { reply, action } = parseReply(raw);

    if (action) {
      if (isAdmin) {
        await dispatchAdminAction(action);
      } else {
        await dispatchCustomerAction(action, products, senderName, senderPhone);
      }
    }

    await saveSession(senderPhone, [
      ...history,
      { role: "user", content: userText },
      { role: "assistant", content: reply },
    ]);

    await sendWhatsAppText(senderPhone, reply);

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("whatsapp-webhook error:", err.message);
    return res.status(200).json({ ok: false, error: err.message });
  }
}
