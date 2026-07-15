import React, { useMemo } from "react";
import { TrendingUp, Star, Percent, Archive } from "lucide-react";
import { displayFont } from "../lib/theme.js";
import { money, computeProductInsights, marginTone } from "../lib/utils";
import { Card, Badge, StatCard, EmptyState } from "../components/ui.jsx";

export default function BusinessIntelligenceView({ orders, products }) {
  const insights = useMemo(() => computeProductInsights(products, orders), [products, orders]);

  const bestSellers = useMemo(() => [...insights].sort((a, b) => b.unitsSold - a.unitsSold).slice(0, 5), [insights]);
  const byMargin = useMemo(() => [...insights].sort((a, b) => b.marginPct - a.marginPct), [insights]);
  const deadStock = useMemo(
    () => insights.filter((p) => p.unitsSold === 0 && p.stock > 0).sort((a, b) => b.capitalTiedUp - a.capitalTiedUp),
    [insights]
  );

  const totalProfit = insights.reduce((s, p) => s + p.profitContribution, 0);
  const avgMarginPct = insights.length ? insights.reduce((s, p) => s + p.marginPct, 0) / insights.length : 0;
  const deadStockValue = deadStock.reduce((s, p) => s + p.capitalTiedUp, 0);
  const topSellerUnits = bestSellers[0]?.unitsSold || 1;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: displayFont }}>Business Intelligence</h2>
        <p className="text-sm text-slate-500">Profit, best-sellers, and dead stock — computed from your live orders and inventory.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={TrendingUp} label="Profit contribution" value={money(totalProfit)} tone="green" />
        <StatCard icon={Percent} label="Avg. margin" value={`${avgMarginPct.toFixed(1)}%`} tone="indigo" />
        <StatCard icon={Star} label="Best seller" value={bestSellers[0]?.name || "—"} tone="amber" />
        <StatCard
          icon={Archive}
          label="Dead stock items"
          value={deadStock.length}
          delta={deadStock.length > 0 ? `${money(deadStockValue)} tied up` : "All items moving"}
          tone="red"
        />
      </div>

      <Card noPad>
        <div className="flex items-center justify-between px-5 pt-5 mb-3">
          <h3 className="font-bold text-slate-900 text-sm" style={{ fontFamily: displayFont }}>Best-selling products</h3>
          <Badge tone="indigo">By units sold</Badge>
        </div>
        {bestSellers.every((p) => p.unitsSold === 0) ? (
          <EmptyState icon={TrendingUp} title="No sales recorded yet" note="Best-sellers will show up here once orders come in." />
        ) : (
          <div className="px-5 pb-5 space-y-3">
            {bestSellers.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 text-[11px] font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-800 truncate">{p.name}</span>
                    <span className="text-xs font-semibold text-slate-500 shrink-0 ml-2">{p.unitsSold} sold · {money(p.revenue)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${Math.max(4, (p.unitsSold / topSellerUnits) * 100)}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card noPad>
        <h3 className="font-bold text-slate-900 text-sm px-5 pt-5 mb-1" style={{ fontFamily: displayFont }}>Profit &amp; margin per product</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm mt-2">
            <thead>
              <tr className="text-left text-[11px] text-slate-400 font-semibold uppercase tracking-wide">
                <th className="px-5 py-2">Product</th>
                <th className="px-5 py-2">Price</th>
                <th className="px-5 py-2">Cost</th>
                <th className="px-5 py-2">Margin</th>
                <th className="px-5 py-2">Units sold</th>
                <th className="px-5 py-2">Profit earned</th>
              </tr>
            </thead>
            <tbody>
              {byMargin.map((p) => (
                <tr key={p.id} className="border-t border-slate-50">
                  <td className="px-5 py-3 font-semibold text-slate-800">{p.name}</td>
                  <td className="px-5 py-3 text-slate-600">{money(p.price)}</td>
                  <td className="px-5 py-3 text-slate-400">{money(p.cost)}</td>
                  <td className="px-5 py-3">
                    <Badge tone={marginTone(p.marginPct)}>{money(p.marginRs)} · {p.marginPct.toFixed(0)}%</Badge>
                  </td>
                  <td className="px-5 py-3 text-slate-600">{p.unitsSold}</td>
                  <td className="px-5 py-3 font-medium text-slate-800">{money(p.profitContribution)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card noPad>
        <div className="flex items-center justify-between px-5 pt-5 mb-1">
          <h3 className="font-bold text-slate-900 text-sm" style={{ fontFamily: displayFont }}>Dead stock report</h3>
          {deadStock.length > 0 && <Badge tone="red">{money(deadStockValue)} tied up</Badge>}
        </div>
        {deadStock.length === 0 ? (
          <EmptyState icon={Archive} title="No dead stock" note="Every product in inventory has sold at least once." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm mt-2">
              <thead>
                <tr className="text-left text-[11px] text-slate-400 font-semibold uppercase tracking-wide">
                  <th className="px-5 py-2">Product</th>
                  <th className="px-5 py-2">Category</th>
                  <th className="px-5 py-2">Stock on hand</th>
                  <th className="px-5 py-2">Capital tied up</th>
                </tr>
              </thead>
              <tbody>
                {deadStock.map((p) => (
                  <tr key={p.id} className="border-t border-slate-50">
                    <td className="px-5 py-3 font-semibold text-slate-800">{p.name}</td>
                    <td className="px-5 py-3 text-slate-500">{p.category}</td>
                    <td className="px-5 py-3 text-slate-600">{p.stock} units</td>
                    <td className="px-5 py-3 font-medium text-red-500">{money(p.capitalTiedUp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}