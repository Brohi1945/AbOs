import React, { useState } from "react";
import { ShoppingCart, Filter, Download, ChevronRight } from "lucide-react";
import { displayFont } from "../lib/theme.js";
import { money } from "../lib/utils.js";
import { STATUS_META } from "../lib/seedData.js";
import { Card, Badge, StatusBadge, Button, Drawer, EmptyState } from "../components/ui.jsx";

/* ---------------------------------- Orders view ---------------------------------- */

export default function OrdersView({ orders, onUpdateStatus }) {
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);

  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);
  const tabs = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "confirmed", label: "Confirmed" },
    { key: "delivered", label: "Delivered" },
    { key: "cancelled", label: "Cancelled" },
  ];

  // Dark versions of status button classes
  const statusDarkCls = {
    pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20 hover:bg-yellow-500/20",
    confirmed: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/20",
    delivered: "bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20",
    cancelled: "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold text-text-primary" style={{ fontFamily: displayFont }}>Orders</h2>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" icon={Download}>Export</Button>
          <Button variant="secondary" size="sm" icon={Filter}>Filter</Button>
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`text-xs font-semibold px-3.5 py-2 rounded-xl whitespace-nowrap transition ${
              filter === t.key ? "bg-indigo-600 text-white" : "bg-bg-surface text-gray-400 border border-white/10 hover:bg-slate-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Card noPad>
        {filtered.length === 0 ? (
          <EmptyState icon={ShoppingCart} title="No orders here" note="Orders matching this filter will show up here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] text-gray-400 font-semibold uppercase tracking-wide">
                  <th className="px-5 py-3">Order</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Channel</th>
                  <th className="px-5 py-3">Total</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o.id} className="border-t border-white/5 hover:bg-white/5 transition cursor-pointer" onClick={() => setSelected(o)}>
                    <td className="px-5 py-3.5 font-semibold text-text-primary">{o.id}</td>
                    <td className="px-5 py-3.5 text-gray-300">{o.customer}</td>
                    <td className="px-5 py-3.5"><Badge tone="slate">{o.channel}</Badge></td>
                    <td className="px-5 py-3.5 text-text-primary font-medium">{money(o.total)}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={o.status} /></td>
                    <td className="px-5 py-3.5 text-gray-500 text-xs">{o.date}</td>
                    <td className="px-5 py-3.5 text-right">
                      <ChevronRight size={15} className="text-gray-600" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Drawer open={!!selected} onClose={() => setSelected(null)} title={selected ? `Order ${selected.id}` : ""}>
        {selected && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <StatusBadge status={selected.status} />
              <span className="text-xs text-gray-500">{selected.date}</span>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-400 mb-1">Customer</div>
              <div className="text-sm font-semibold text-text-primary">{selected.customer}</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-400 mb-2">Items</div>
              <div className="space-y-2">
                {selected.items.map((it, i) => (
                  <div key={i} className="flex items-center justify-between text-sm bg-slate-800 rounded-lg px-3 py-2">
                    <span className="text-gray-300">{it.name}</span>
                    <span className="text-gray-400 font-medium">x{it.qty}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between text-sm font-bold pt-3 border-t border-white/10">
              <span className="text-text-primary">Total</span>
              <span className="text-indigo-400">{money(selected.total)}</span>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-400 mb-2">Update status</div>
              <div className="grid grid-cols-2 gap-2">
                {Object.keys(STATUS_META).map((s) => (
                  <button
                    key={s}
                    onClick={() => { onUpdateStatus(selected.id, s); setSelected((sel) => ({ ...sel, status: s })); }}
                    className={`text-xs font-semibold px-3 py-2.5 rounded-xl border transition ${
                      selected.status === s ? statusDarkCls[s] : "bg-bg-surface border-white/10 text-gray-400 hover:border-indigo-400 hover:text-text-primary"
                    }`}
                  >
                    {STATUS_META[s].label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
