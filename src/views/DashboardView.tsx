import React, { useMemo } from "react";
import { ShoppingCart, Users, Wallet, AlertTriangle } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";
import { displayFont } from "../lib/theme";
import { money, todayLabel, computeWeeklyTrend } from "../lib/utils";
import { Card, Badge, StatCard, StatusBadge } from "../components/ui";

interface DashboardViewProps {
  orders: any[];
  products: any[];
  customers: any[];
  onGoTo: (screen: string) => void;
}

export default function DashboardView({ orders, products, customers, onGoTo }: DashboardViewProps) {
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
    return !isNaN(d.getTime()) && d.toDateString() === new Date().toDateString();
  }).length;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-[#E8E9ED]" style={{ fontFamily: displayFont }}>Good to see you 👋</h2>
        <p className="text-sm text-[#8B8F9C]">{todayLabel()} — here's how the business is doing.</p>
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
            <h3 className="font-bold text-[#E8E9ED] text-sm" style={{ fontFamily: displayFont }}>Sales this week</h3>
            <Badge tone="green">{money(weekTotal)} total</Badge>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyTrend}>
                <defs>
                  <linearGradient id="dashGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#C9A44C" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#C9A44C" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#8B8F9C" }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  formatter={(v: any) => money(v)}
                  contentStyle={{ background: "#1B1F2A", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)", fontSize: 12 }}
                  labelStyle={{ color: "#8B8F9C" }}
                  itemStyle={{ color: "#E8E9ED" }}
                />
                <Area type="monotone" dataKey="sales" stroke="#C9A44C" strokeWidth={2.5} fill="url(#dashGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card noPad>
          <div className="flex items-center justify-between px-5 pt-5 mb-1">
            <h3 className="font-bold text-[#E8E9ED] text-sm" style={{ fontFamily: displayFont }}>Low stock</h3>
            <button onClick={() => onGoTo("inventory")} className="text-[11px] font-semibold text-indigo-400">View all</button>
          </div>
          {lowStock.length === 0 ? (
            <div className="px-5 py-8 text-xs text-[#8B8F9C] text-center">Everything is well stocked.</div>
          ) : (
            <div className="divide-y divide-white/5">
              {lowStock.slice(0, 5).map((p) => (
                <div key={p.id} className="flex items-center justify-between px-5 py-2.5">
                  <div>
                    <div className="text-xs font-semibold text-[#C7C9D1]">{p.name}</div>
                    <div className="text-[10px] text-[#8B8F9C]">{p.category}</div>
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
          <h3 className="font-bold text-[#E8E9ED] text-sm" style={{ fontFamily: displayFont }}>Recent orders</h3>
          <button onClick={() => onGoTo("orders")} className="text-[11px] font-semibold text-indigo-400">View all</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm mt-2">
            <thead>
              <tr className="text-left text-[11px] text-[#8B8F9C] font-semibold uppercase tracking-wide">
                <th className="px-5 py-2 font-semibold">Order</th>
                <th className="px-5 py-2 font-semibold">Customer</th>
                <th className="px-5 py-2 font-semibold">Total</th>
                <th className="px-5 py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((o) => (
                <tr key={o.id} className="border-t border-[rgba(255,255,255,0.06)] hover:bg-white/5 transition">
                  <td className="px-5 py-3 font-semibold text-[#E8E9ED]">{o.id}</td>
                  <td className="px-5 py-3 text-[#C7C9D1]">{o.customer}</td>
                  <td className="px-5 py-3 text-[#E8E9ED] font-medium">{money(o.total)}</td>
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