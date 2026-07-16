import React, { useMemo } from "react";
import { ShoppingCart, Users, Wallet, AlertTriangle } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";
import { displayFont } from "../lib/theme";
import { money, todayLabel, computeWeeklyTrend } from "../lib/utils";
import { Card, Badge, StatCard, StatusBadge } from "../components/ui";

export default function DashboardView({ orders, products, customers, onGoTo }) {
  const totalSales = useMemo(() => orders.filter((o) => o.status !== "cancelled").reduce((s, o) => s + o.total, 0), [orders]);
  const lowStock = useMemo(() => products.filter((p) => p.stock <= p.threshold), [products]);
  const recentOrders = orders.slice(0, 5);
  const weeklyTrend = useMemo(() => computeWeeklyTrend(orders), [orders]);
  const weekTotal = weeklyTrend.reduce((s, d) => s + d.sales, 0);
  const todaySales = weeklyTrend[weeklyTrend.length - 1]?.sales || 0;
  const yesterdaySales = weeklyTrend[weeklyTrend.length - 2]?.sales || 0;
  const salesDelta = yesterdaySales > 0
    ? `${todaySales >= yesterdaySales ? "+" : ""}${(((todaySales - yesterdaySales) / yesterdaySales) * 100).toFixed(1)}% vs yesterday`
    : null;
  const ordersToday = orders.filter((o) => {
    const d = new Date(o.date);
    return !isNaN(d) && d.toDateString() === new Date().toDateString();
  }).length;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: displayFont }}>Good to see you 👋</h2>
        <p className="text-sm text-slate-500">{todayLabel()} — here's how the business is doing.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Wallet} label="Total Sales" value={money(totalSales)} delta={salesDelta} tone="indigo" />
        <StatCard icon={ShoppingCart} label="Orders" value={orders.length} delta={ordersToday > 0 ? `+${ordersToday} today` : null} tone="green" />
        <StatCard icon={Users} label="Customers" value={customers.length} tone="indigo" />
        <StatCard icon={AlertTriangle} label="Low Stock Alerts" value={lowStock.length} delta={lowStock.length > 0 ? "Needs attention" : "All good"} tone="amber" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-900 text-sm" style={{ fontFamily: displayFont }}>Sales this week</h3>
            <Badge tone="green">{money(weekTotal)} total</Badge>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyTrend}>
                <defs>
                  <linearGradient id="dashGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4F46E5" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#4F46E5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip formatter={(v) => money(v)} contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 12 }} />
                <Area type="monotone" dataKey="sales" stroke="#4F46E5" strokeWidth={2.5} fill="url(#dashGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card noPad>
          <div className="flex items-center justify-between px-5 pt-5 mb-1">
            <h3 className="font-bold text-slate-900 text-sm" style={{ fontFamily: displayFont }}>Low stock</h3>
            <button onClick={() => onGoTo("inventory")} className="text-[11px] font-semibold text-indigo-600">View all</button>
          </div>
          {lowStock.length === 0 ? (
            <div className="px-5 py-8 text-xs text-slate-400 text-center">Everything is well stocked.</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {lowStock.slice(0, 5).map((p) => (
                <div key={p.id} className="flex items-center justify-between px-5 py-2.5">
                  <div>
                    <div className="text-xs font-semibold text-slate-700">{p.name}</div>
                    <div className="text-[10px] text-slate-400">{p.category}</div>
                  </div>
                  <Badge tone="red">{p.stock} left</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card noPad>
        <div className="flex items-center justify-between px-5 pt-5 mb-1">
          <h3 className="font-bold text-slate-900 text-sm" style={{ fontFamily: displayFont }}>Recent orders</h3>
          <button onClick={() => onGoTo("orders")} className="text-[11px] font-semibold text-indigo-600">View all</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm mt-2">
            <thead>
              <tr className="text-left text-[11px] text-slate-400 font-semibold uppercase tracking-wide">
                <th className="px-5 py-2 font-semibold">Order</th>
                <th className="px-5 py-2 font-semibold">Customer</th>
                <th className="px-5 py-2 font-semibold">Total</th>
                <th className="px-5 py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((o) => (
                <tr key={o.id} className="border-t border-slate-50 hover:bg-slate-50/70 transition">
                  <td className="px-5 py-3 font-semibold text-slate-800">{o.id}</td>
                  <td className="px-5 py-3 text-slate-600">{o.customer}</td>
                  <td className="px-5 py-3 text-slate-800 font-medium">{money(o.total)}</td>
                  <td className="px-5 py-3"><StatusBadge status={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}