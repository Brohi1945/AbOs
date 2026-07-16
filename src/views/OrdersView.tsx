import React, { useState } from "react";
import { ShoppingCart, Filter, Download, ChevronRight } from "lucide-react";
import { displayFont } from "../lib/theme.js";
import { money } from "../lib/utils";
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: displayFont }}>Orders</h2>
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
              filter === t.key ? "bg-indigo-600 text-white" : "bg-white text-slate-500 border border-slate-200"
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
                <tr className="text-left text-[11px] text-slate-400 font-semibold uppercase tracking-wide">
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
                  <tr key={o.id} className="border-t border-slate-50 hover:bg-slate-50/70 transition cursor-pointer" onClick={() => setSelected(o)}>
                    <td className="px-5 py-3.5 font-semibold text-slate-800">{o.id}</td>
                    <td className="px-5 py-3.5 text-slate-600">{o.customer}</td>
                    <td className="px-5 py-3.5"><Badge tone="slate">{o.channel}</Badge></td>
                    <td className="px-5 py-3.5 text-slate-800 font-medium">{money(o.total)}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={o.status} /></td>
                    <td className="px-5 py-3.5 text-slate-400 text-xs">{o.date}</td>
                    <td className="px-5 py-3.5 text-right">
                      <ChevronRight size={15} className="text-slate-300" />
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
              <span className="text-xs text-slate-400">{selected.date}</span>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-400 mb-1">Customer</div>
              <div className="text-sm font-semibold text-slate-800">{selected.customer}</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-400 mb-2">Items</div>
              <div className="space-y-2">
                {selected.items.map((it, i) => (
                  <div key={i} className="flex items-center justify-between text-sm bg-slate-50 rounded-lg px-3 py-2">
                    <span className="text-slate-700">{it.name}</span>
                    <span className="text-slate-500 font-medium">x{it.qty}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between text-sm font-bold pt-3 border-t border-slate-100">
              <span className="text-slate-800">Total</span>
              <span className="text-indigo-600">{money(selected.total)}</span>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-400 mb-2">Update status</div>
              <div className="grid grid-cols-2 gap-2">
                {Object.keys(STATUS_META).map((s) => (
                  <button
                    key={s}
                    onClick={() => { onUpdateStatus(selected.id, s); setSelected((sel) => ({ ...sel, status: s })); }}
                    className={`text-xs font-semibold px-3 py-2.5 rounded-xl border transition ${
                      selected.status === s ? STATUS_META[s].cls : "bg-white border-slate-200 text-slate-500 hover:border-indigo-300"
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
