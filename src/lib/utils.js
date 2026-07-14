export function genId(prefix) {
  return prefix + "-" + Math.random().toString(36).slice(2, 7).toUpperCase();
}

export function money(n) {
  return "Rs " + Math.round(n || 0).toLocaleString("en-US");
}

export function todayLabel() {
  return new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

export function computeWeeklyTrend(orders) {
  const days = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push({ key: d.toDateString(), label: d.toLocaleDateString("en-US", { weekday: "short" }), sales: 0 });
  }
  orders.forEach((o) => {
    if (o.status === "cancelled") return;
    const parsed = new Date(o.date);
    if (isNaN(parsed)) return;
    const key = parsed.toDateString();
    const day = days.find((d) => d.key === key);
    if (day) day.sales += o.total;
  });
  return days.map((d) => ({ day: d.label, sales: d.sales }));
}

export function computeCustomerStats(customer, orders) {
  const custOrders = orders.filter((o) => o.customer === customer.name && o.status !== "cancelled");
  const spent = custOrders.reduce((s, o) => s + o.total, 0);
  const lastOrder = custOrders[0]?.date || customer.lastOrder || "—";
  return { orders: custOrders.length, spent, lastOrder };
}

export function computeProductInsights(products, orders) {
  const soldQty = {};
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

export function marginTone(pct) {
  if (pct >= 40) return "green";
  if (pct >= 20) return "amber";
  return "red";
}
