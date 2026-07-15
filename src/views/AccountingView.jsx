import React, { useMemo } from "react";
import { Package, Wallet, TrendingUp, TrendingDown } from "lucide-react";
import { ResponsiveContainer, XAxis, YAxis, Tooltip, BarChart, Bar } from "recharts";
import { displayFont } from "../lib/theme.js";
import { money, computeWeeklyTrend } from "../lib/utils.js";
import { Card, StatCard } from "../components/ui.jsx";

export default function AccountingView({ orders, products }) {
  const revenue = orders.filter((o) => o.status !== "cancelled").reduce((s, o) => s + o.total, 0);
  const cogsEstimate = revenue * 0.68;
  const profit = revenue - cogsEstimate;
  const inventoryValue = products.reduce((s, p) => s + p.cost * p.stock, 0);
  const weeklyTrend = useMemo(() => computeWeeklyTrend(orders), [orders]);
  const todaySales = weeklyTrend[weeklyTrend.length - 1]?.sales || 0;
  const yesterdaySales = weeklyTrend[weeklyTrend.length - 2]?.sales || 0;
  const profitDelta = yesterdaySales > 0
    ? `${todaySales >= yesterdaySales ? "+" : ""}${(((todaySales - yesterdaySales) / yesterdaySales) * 100).toFixed(1)}% vs yesterday`
    : null;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-text-primary" style={{ fontFamily: displayFont }}>Accounting overview</h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Wallet} label="Revenue (7d)" value={money(revenue)} tone="indigo" />
        <StatCard icon={TrendingDown} label="Cost of goods" value={money(cogsEstimate)} tone="amber" />
        <StatCard icon={TrendingUp} label="Estimated profit" value={money(profit)} tone="green" delta={profitDelta} />
        <StatCard icon={Package} label="Inventory value" value={money(inventoryValue)} tone="indigo" />
      </div>

      <Card>
        <h3 className="font-bold text-text-primary text-sm mb-3" style={{ fontFamily: displayFont }}>Revenue vs cost — daily</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyTrend.map((d) => ({ ...d, cost: Math.round(d.sales * 0.68) }))}>
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip 
                formatter={(v) => money(v)} 
                contentStyle={{ 
                  borderRadius: 12, 
                  border: "1px solid #334155", 
                  backgroundColor: "#1E293B", 
                  color: "#E2E8F0",
                  fontSize: 12 
                }} 
              />
              <Bar dataKey="sales" fill="#818CF8" radius={[6, 6, 0, 0]} name="Revenue" />
              <Bar dataKey="cost" fill="#34D399" radius={[6, 6, 0, 0]} name="Cost" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card noPad>
        <h3 className="font-bold text-text-primary text-sm px-5 pt-5 mb-1" style={{ fontFamily: displayFont }}>Recent transactions</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm mt-2">
            <thead>
              <tr className="text-left text-[11px] text-gray-400 font-semibold uppercase tracking-wide">
                <th className="px-5 py-2">Order</th>
                <th className="px-5 py-2">Amount</th>
                <th className="px-5 py-2">Type</th>
                <th className="px-5 py-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 6).map((o) => (
                <tr key={o.id} className="border-t border-white/5">
                  <td className="px-5 py-3 font-semibold text-text-primary">{o.id}</td>
                  <td className={`px-5 py-3 font-medium ${o.status === "cancelled" ? "text-red-400" : "text-green-400"}`}>
                    {o.status === "cancelled" ? "—" : "+" + money(o.total)}
                  </td>
                  <td className="px-5 py-3 text-gray-400">Sale</td>
                  <td className="px-5 py-3 text-gray-500 text-xs">{o.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
