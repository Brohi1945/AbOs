import React, { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ShoppingCart, Users, AlertTriangle, Flame, Radio } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";
import { displayFont } from "../theme";
import { money, todayLabel, computeWeeklyTrend, Order, Product, Customer } from "../lib/utils";
import { Card, Badge, StatCard, StatusBadge } from "../components/ui";
import { SkeletonStatCard, SkeletonChart, SkeletonTable } from "../components/Skeleton";
import { staggerContainer, fadeSlideUp } from "../animations/variants";
import { CHART_ANIMATION } from "../animations/config";

interface DashboardViewProps {
  orders: Order[];
  products: Product[];
  customers: Customer[];
  onGoTo: (screen: string) => void;
}

// One entry in the "Live Activity" timeline — merges low-stock alerts and
// recent orders into a single chronological-feeling feed.
interface TimelineItem {
  id: string;
  message: string;
  meta: string;
  tone: "warning" | "success" | "brand" | "danger";
}

export default function DashboardView({ orders, products, customers, onGoTo }: DashboardViewProps) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading for skeleton demo
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const totalSales = useMemo(
    () => orders.filter((o) => o.status !== "cancelled").reduce((s, o) => s + o.total, 0),
    [orders]
  );
  const lowStock = useMemo(() => products.filter((p) => p.stock <= p.threshold), [products]);
  const recentOrders = orders.slice(0, 5);
  const weeklyTrend = useMemo(() => computeWeeklyTrend(orders), [orders]);
  const weekTotal = weeklyTrend.reduce((s, d) => s + d.sales, 0);
  const todaySales = weeklyTrend[weeklyTrend.length - 1]?.sales || 0;
  const yesterdaySales = weeklyTrend[weeklyTrend.length - 2]?.sales || 0;
  const salesDelta =
    yesterdaySales > 0
      ? `${todaySales >= yesterdaySales ? "+" : ""}${(((todaySales - yesterdaySales) / yesterdaySales) * 100).toFixed(1)}% vs yesterday`
      : null;
  const ordersToday = orders.filter((o) => {
    const d = new Date(o.date);
    return !isNaN(d.getTime()) && d.toDateString() === new Date().toDateString();
  }).length;

  // Build the Live Activity timeline: newest orders + low-stock alerts, interleaved.
  const timeline: TimelineItem[] = useMemo(() => {
    const items: TimelineItem[] = [];
    recentOrders.slice(0, 3).forEach((o) => {
      items.push({
        id: `order-${o.id}`,
        message: `Order ${o.id} — ${o.customer} · ${money(o.total)}`,
        meta: o.status === "cancelled" ? "Cancelled" : o.status === "delivered" ? "Delivered" : "Placed",
        tone: o.status === "cancelled" ? "danger" : "success",
      });
    });
    lowStock.slice(0, 3).forEach((p) => {
      items.push({
        id: `stock-${p.id}`,
        message: `${p.name} is low on stock`,
        meta: `${p.stock} left`,
        tone: "warning",
      });
    });
    return items.slice(0, 6);
  }, [recentOrders, lowStock]);

  if (loading) {
    return (
      <div className="space-y-5">
        <div>
          <div className="h-8 w-48 bg-surface rounded-lg animate-pulse" />
          <div className="h-4 w-64 bg-surface rounded-lg mt-2 animate-pulse" />
        </div>
        <div className="h-40 sm:h-48 bg-surface rounded-3xl animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonStatCard key={i} />
          ))}
        </div>
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <SkeletonChart />
          </div>
          <div>
            <div className="bg-app border rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="h-4 w-24 bg-surface rounded animate-pulse" />
                <div className="h-4 w-16 bg-surface rounded animate-pulse" />
              </div>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between py-2.5 border-t border">
                  <div>
                    <div className="h-3 w-32 bg-surface rounded animate-pulse" />
                    <div className="h-2 w-20 bg-surface rounded mt-1 animate-pulse" />
                  </div>
                  <div className="h-5 w-16 bg-surface rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <SkeletonTable rows={4} cols={4} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-fg" style={{ fontFamily: displayFont }}>
          Good to see you 👋
        </h2>
        <p className="text-sm text-muted">{todayLabel()} — here's how the business is doing.</p>
      </div>

      {/* ===== Hero Pulse tile — the day's headline number, theme-aware gradient ===== */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-brand to-accent"
      >
        <div className="relative z-10">
          <div className="text-[11px] font-semibold tracking-wide text-white/75 uppercase">
            Store Pulse · {todayLabel()}
          </div>
          <div
            className="text-4xl sm:text-5xl font-extrabold text-white mt-1"
            style={{ fontFamily: displayFont }}
          >
            {money(totalSales)}
          </div>
          <div className="text-sm text-white/85 mt-1">
            {orders.length} orders{salesDelta ? ` · ${salesDelta}` : ""}
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            {ordersToday > 0 && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full bg-white/20 text-white">
                <Flame size={12} /> {ordersToday} order{ordersToday === 1 ? "" : "s"} today
              </span>
            )}
            {lowStock.length > 0 && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full bg-white/20 text-white">
                <AlertTriangle size={12} /> {lowStock.length} low-stock
              </span>
            )}
          </div>
        </div>
      </motion.div>

      {/* ===== Compact stat row ===== */}
      <motion.div
        className="grid grid-cols-2 lg:grid-cols-3 gap-4"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
<motion.div variants={fadeSlideUp}>
          <StatCard
            icon={ShoppingCart}
            label="Orders"
            value={orders.length}
            delta={ordersToday > 0 ? `+${ordersToday} today` : null}
            tone="green"
            onClick={() => onGoTo("orders")}
          />
        </motion.div>
        <motion.div variants={fadeSlideUp}>
          <StatCard icon={Users} label="Customers" value={customers.length} tone="indigo" onClick={() => onGoTo("customers")} />
        </motion.div>
        <motion.div variants={fadeSlideUp} className="col-span-2 lg:col-span-1">
          <StatCard
            icon={AlertTriangle}
            label="Low Stock Alerts"
            value={lowStock.length}
            delta={lowStock.length > 0 ? "Needs attention" : "All good"}
            tone="amber"
            onClick={() => onGoTo("inventory")}
          />
        </motion.div>
      </motion.div>

      {/* ===== Chart + Live Activity timeline ===== */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-fg text-sm" style={{ fontFamily: displayFont }}>
              Sales this week
            </h3>
            <Badge tone="green">{money(weekTotal)} total</Badge>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyTrend}>
                <defs>
                  <linearGradient id="dashGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366F1" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#6366F1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  formatter={(v: any) => money(v)}
                  contentStyle={{
                    background: "#111827",
                    borderRadius: 12,
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "#9CA3AF" }}
                  itemStyle={{ color: "#E5E7EB" }}
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="#6366F1"
                  strokeWidth={2.5}
                  fill="url(#dashGrad)"
                  {...CHART_ANIMATION}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card noPad className="flex flex-col">
          <div className="flex items-center justify-between px-5 pt-5 mb-1">
            <h3 className="font-bold text-fg text-sm flex items-center gap-1.5" style={{ fontFamily: displayFont }}>
              <Radio size={13} className="text-accent" /> Live Activity
            </h3>
            <button onClick={() => onGoTo("orders")} className="text-[11px] font-semibold text-indigo-400">
              View all
            </button>
          </div>
          {timeline.length === 0 ? (
            <div className="px-5 py-8 text-xs text-muted text-center">Nothing new right now.</div>
          ) : (
            <div className="px-5 py-3">
              {timeline.map((item, i) => (
                <div key={item.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                        item.tone === "warning"
                          ? "bg-warning"
                          : item.tone === "danger"
                          ? "bg-danger"
                          : item.tone === "brand"
                          ? "bg-brand"
                          : "bg-success"
                      }`}
                    />
                    {i < timeline.length - 1 && <span className="w-px flex-1 bg-fg/10 my-1" />}
                  </div>
                  <div className="pb-4 min-w-0">
                    <div className="text-xs font-semibold text-fg truncate">{item.message}</div>
                    <div className="text-[10px] text-muted mt-0.5">{item.meta}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ===== Recent orders table (unchanged) ===== */}
      <Card noPad>
        <div className="flex items-center justify-between px-5 pt-5 mb-1">
          <h3 className="font-bold text-fg text-sm" style={{ fontFamily: displayFont }}>
            Recent orders
          </h3>
          <button onClick={() => onGoTo("orders")} className="text-[11px] font-semibold text-indigo-400">
            View all
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm mt-2">
            <thead>
              <tr className="text-left text-[11px] text-muted font-semibold uppercase tracking-wide">
                <th className="px-5 py-2 font-semibold">Order</th>
                <th className="px-5 py-2 font-semibold">Customer</th>
                <th className="px-5 py-2 font-semibold">Total</th>
                <th className="px-5 py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((o) => (
                <tr key={o.id} className="border-t border hover:bg-white/5 transition">
                  <td className="px-5 py-3 font-semibold text-fg">{o.id}</td>
                  <td className="px-5 py-3 text-muted">{o.customer}</td>
                  <td className="px-5 py-3 text-fg font-medium">{money(o.total)}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={o.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
