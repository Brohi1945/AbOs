export interface Order {
  id: string;
  customer: string;
  phone?: string;
  address?: string;
  items: { productId?: string; name: string; qty: number }[];
  total: number;
  status: "pending" | "confirmed" | "delivered" | "cancelled";
  date: string;
  channel?: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  threshold: number;
  barcode?: string;
  color?: string;
  specs?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  orders: number;
  spent: number;
  lastOrder: string;
}

export interface Campaign {
  id: string;
  name: string;
  channel: string;
  status: string;
  sent: number;
  opened: number;
  clicked: number;
}

export interface WaitlistEntry {
  id: string;
  product_id: string;
  customer_name?: string;
  phone?: string;
  qty?: number;
  channel?: string;
  status?: string;
  joined_at?: string;
}

export function genId(prefix: string): string {
  return prefix + "-" + Math.random().toString(36).slice(2, 7).toUpperCase();
}

export function money(n: number): string {
  return "Rs " + Math.round(n || 0).toLocaleString("en-US");
}

export function todayLabel(): string {
  return new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

export function computeWeeklyTrend(orders: Order[]) {
  const days: { key: string; label: string; sales: number }[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push({ key: d.toDateString(), label: d.toLocaleDateString("en-US", { weekday: "short" }), sales: 0 });
  }
  orders.forEach((o) => {
    if (o.status === "cancelled") return;
    const parsed = new Date(o.date);
    if (isNaN(parsed.getTime())) return;
    const key = parsed.toDateString();
    const day = days.find((d) => d.key === key);
    if (day) day.sales += o.total;
  });
  return days.map((d) => ({ day: d.label, sales: d.sales }));
}

export function computeCustomerStats(customer: Customer, orders: Order[]) {
  const custOrders = orders.filter((o) => o.customer === customer.name && o.status !== "cancelled");
  const spent = custOrders.reduce((s, o) => s + o.total, 0);
  const lastOrder = custOrders[0]?.date || customer.lastOrder || "—";
  return { orders: custOrders.length, spent, lastOrder };
}

export function computeProductInsights(products: Product[], orders: Order[]) {
  const soldQty: Record<string, number> = {};
  orders.forEach((o) => {
    if (o.status === "cancelled") return;
    o.items.forEach((it) => {
      soldQty[it.name] = (soldQty[it.name] || 0) + it.qty;
    });
  });

  return products.map((p) => {
    const unitsSold = soldQty[p.name] || 0;
    const marginRs = p.price - p.cost;
    const marginPct = p.price > 0 ? (marginRs / p.price) * 100 : 0;
    const revenue = unitsSold * p.price;
    const profitContribution = unitsSold * marginRs;
    const capitalTiedUp = p.cost * p.stock;
    return { ...p, unitsSold, marginRs, marginPct, revenue, profitContribution, capitalTiedUp };
  });
}

export function marginTone(pct: number): "green" | "amber" | "red" {
  if (pct >= 40) return "green";
  if (pct >= 20) return "amber";
  return "red";
}

// ============================================================
//  Search + date-range helpers, shared by every view that has a
//  search box or a calendar/date-range filter (Orders, Waitlist,
//  POS, Marketing, global command-palette search).
// ============================================================

/** Case-insensitive "does any of these fields contain the query" check. */
export function matchesQuery(query: string, ...fields: (string | number | undefined | null)[]): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return fields.some((f) => f !== undefined && f !== null && String(f).toLowerCase().includes(q));
}

export type DatePreset = "all" | "today" | "week" | "month" | "custom";

export interface DateRange {
  preset: DatePreset;
  from: string | null; // yyyy-mm-dd
  to: string | null; // yyyy-mm-dd
}

export const DEFAULT_DATE_RANGE: DateRange = { preset: "all", from: null, to: null };

/** Turns a preset into concrete from/to yyyy-mm-dd bounds (inclusive). */
export function resolvePresetRange(preset: DatePreset): { from: string | null; to: string | null } {
  const toYMD = (d: Date) => d.toISOString().slice(0, 10);
  const now = new Date();
  if (preset === "today") {
    return { from: toYMD(now), to: toYMD(now) };
  }
  if (preset === "week") {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    return { from: toYMD(start), to: toYMD(now) };
  }
  if (preset === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: toYMD(start), to: toYMD(now) };
  }
  return { from: null, to: null };
}

/**
 * Checks whether a loosely-formatted date string (either an ISO date
 * from Supabase, or the `toLocaleString()` strings this app stores on
 * orders, e.g. "7/19/2026, 3:45:00 PM") falls within a DateRange.
 */
export function isWithinDateRange(dateValue: string | undefined | null, range: DateRange): boolean {
  if (!range || range.preset === "all") return true;
  if (!dateValue) return false;
  const parsed = new Date(dateValue);
  if (isNaN(parsed.getTime())) return false;
  const ymd = parsed.toISOString().slice(0, 10);
  const { from, to } = range.preset === "custom" ? range : resolvePresetRange(range.preset);
  if (from && ymd < from) return false;
  if (to && ymd > to) return false;
  return true;
}

/** Google Maps embed URL for an address — no API key required. */
export function mapsEmbedUrl(address: string): string {
  return `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`;
}

/** Google Maps "open in new tab" search URL for an address. */
export function mapsSearchUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}