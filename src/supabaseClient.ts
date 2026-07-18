// ============================================================
//  Supabase client + data-access helpers
//  Env vars needed (set in Vercel → Settings → Environment Variables):
//    VITE_SUPABASE_URL       — your Supabase project URL
//    VITE_SUPABASE_ANON_KEY  — your Supabase project's anon/public key
// ============================================================
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://akjugxzvexcpslhzvuhz.supabase.co";
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFranVneHp2ZXhjcHNsaHp2dWh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwMDcwNDcsImV4cCI6MjA5OTU4MzA0N30.SYWWFeDA9eHawvvJu3qBFZxpJvAThGAKTrPagy2Thuo";

export const supabase =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const isReady = () => !!supabase;

export async function fetchProducts() {
  if (!isReady()) return null;
  const { data, error } = await supabase.from("products").select("*").order("name");
  if (error) {
    console.error("fetchProducts error:", error.message);
    return null;
  }
  return data;
}

export async function insertProduct(product) {
  if (!isReady()) return;
  const { error } = await supabase.from("products").insert(product);
  if (error) console.error("insertProduct error:", error.message);
}

export async function updateProductRow(id, fields) {
  if (!isReady()) return;
  const { error } = await supabase.from("products").update(fields).eq("id", id);
  if (error) console.error("updateProductRow error:", error.message);
}

export async function deleteProductRow(id) {
  if (!isReady()) return;
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) console.error("deleteProductRow error:", error.message);
}

export async function fetchOrders() {
  if (!isReady()) return null;
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("fetchOrders error:", error.message);
    return null;
  }
  return data;
}

export async function insertOrder(order) {
  if (!isReady()) return;
  const { error } = await supabase.from("orders").insert(order);
  if (error) console.error("insertOrder error:", error.message);
}

export async function updateOrderStatusRow(id, status) {
  if (!isReady()) return;
  const { error } = await supabase.from("orders").update({ status }).eq("id", id);
  if (error) console.error("updateOrderStatusRow error:", error.message);
}

// ---- Waitlist ------------------------------------------------

export async function fetchWaitlist(productId) {
  if (!isReady()) return [];
  const { data, error } = await supabase
    .from("waitlist")
    .select("*")
    .eq("product_id", productId)
    .order("joined_at", { ascending: true });
  if (error) {
    console.error("fetchWaitlist error:", error.message);
    return [];
  }
  return data;
}

export async function fetchAllWaitlist() {
  if (!isReady()) return [];
  const { data, error } = await supabase
    .from("waitlist")
    .select("*")
    .order("joined_at", { ascending: true });
  if (error) {
    console.error("fetchAllWaitlist error:", error.message);
    return [];
  }
  return data;
}

export async function insertWaitlistEntry(entry) {
  if (!isReady()) return null;
  const { data, error } = await supabase.from("waitlist").insert(entry).select().single();
  if (error) {
    console.error("insertWaitlistEntry error:", error.message);
    return null;
  }
  return data;
}

export async function updateWaitlistRow(id, fields) {
  if (!isReady()) return;
  const { error } = await supabase.from("waitlist").update(fields).eq("id", id);
  if (error) console.error("updateWaitlistRow error:", error.message);
}

export async function fetchExpiredReservations() {
  if (!isReady()) return [];
  const { data, error } = await supabase
    .from("waitlist")
    .select("*")
    .eq("status", "notified")
    .lt("reserve_expires_at", new Date().toISOString());
  if (error) {
    console.error("fetchExpiredReservations error:", error.message);
    return [];
  }
  return data;
}

export async function deleteWaitlistRow(id) {
  if (!isReady()) return;
  const { error } = await supabase.from("waitlist").delete().eq("id", id);
  if (error) console.error("deleteWaitlistRow error:", error.message);
}

export async function seedIfEmpty(seedProductsList, seedOrdersList) {
  if (!isReady()) return;
  const { count: productCount } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true });
  if (!productCount) {
    await supabase.from("products").insert(seedProductsList);
  }
  const { count: orderCount } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true });
  if (!orderCount) {
    await supabase.from("orders").insert(seedOrdersList);
  }
}
