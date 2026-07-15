// ============================================================
//  Supabase client + data-access helpers
//  Env vars needed (set in Vercel → Settings → Environment Variables):
//    VITE_SUPABASE_URL       — your Supabase project URL
//    VITE_SUPABASE_ANON_KEY  — your Supabase project's anon/public key
//  Run supabase_schema.sql once in Supabase → SQL Editor before using this.
// ============================================================
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// If the env vars aren't set yet, `supabase` is null and every helper below
// quietly no-ops so the app keeps working exactly like before (in-memory only).
const isReady = () => !!supabase;

/* ---------------------------------- Products ---------------------------------- */

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

/* ---------------------------------- Orders ---------------------------------- */

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

/* ---------------------------------- One-time seeding ---------------------------------- */
// On first ever run (empty tables), pushes the app's built-in sample data into
// Supabase so the dashboard has something to show. After that, Supabase is
// always the source of truth and this is skipped.

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
