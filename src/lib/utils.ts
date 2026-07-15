export interface Order {
  id: string;
  customer: string;
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
  color?: string;
  specs?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  orders: number;
  spent: number;
  lastOrder: string;
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