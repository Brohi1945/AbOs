import React, { useState } from "react";
import { ShoppingCart, Filter, Download, ChevronRight } from "lucide-react";
import { displayFont } from "../lib/theme";
import { money } from "../lib/utils";
import { STATUS_META } from "../lib/seedData";
import { Card, Badge, StatusBadge, Button, Drawer, EmptyState } from "../components/ui";

interface OrdersViewProps {
  orders: any[];
  onUpdateStatus: (id: string, status: string) => void;
}

export default function OrdersView({ orders, onUpdateStatus }: OrdersViewProps) {
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<any>(null);

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
        <h2 className="text-xl font-bold text-[#E8E9ED]" style={{ fontFamily: displayFont }}>Orders</h2>
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
              filter === t.key ? "bg-[#C9A44C] text-black" : "bg-[#14171F] text-[#8B8F9C] border border-[rgba(255,255,255,0.06)]"
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
                <tr className="text-left text-[11px] text-[#8B8F9C] font-semibold uppercase tracking-wide">
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
                  <tr key={o.id} className="border-t border-[rgba(255,255,255,0.06)] hover:bg-white/5 transition cursor-pointer" onClick={() => setSelected(o)}>
                    <td className="px-5 py-3.5 font-semibold text-[#E8E9ED]">{o.id}</td>
                    <td className="px-5 py-3.5 text-[#C7C9D1]">{o.customer}</td>
                    <td className="px-5 py-3.5"><Badge tone="slate">{o.channel}</Badge></td>
                    <td className="px-5 py-3.5 text-[#E8E9ED] font-medium">{money(o.total)}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={o.status} /></td>
                    <td className="px-5 py-3.5 text-[#8B8F9C] text-xs">{o.date}</td>
                    <td className="px-5 py-3.5 text-right">
                      <ChevronRight size={15} className="text-[#6B7080]" />
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
              <span className="text-xs text-[#8B8F9C]">{selected.date}</span>
            </div>
            <div>
              <div className="text-xs font-semibold text-[#8B8F9C] mb-1">Customer</div>
              <div className="text-sm font-semibold text-[#E8E9ED]">{selected.customer}</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-[#8B8F9C] mb-2">Items</div>
              <div className="space-y-2">
                {selected.items.map((it: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-sm bg-white/5 rounded-lg px-3 py-2">
                    <span className="text-[#C7C9D1]">{it.name}</span>
                    <span className="text-[#8B8F9C] font-medium">x{it.qty}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between text-sm font-bold pt-3 border-t border-[rgba(255,255,255,0.06)]">
              <span className="text-[#E8E9ED]">Total</span>
              <span className="text-indigo-400">{money(selected.total)}</span>
            </div>
            <div>
              <div className="text-xs font-semibold text-[#8B8F9C] mb-2">Update status</div>
              <div className="grid grid-cols-2 gap-2">
                {Object.keys(STATUS_META).map((s) => (
                  <button
                    key={s}
                    onClick={() => { onUpdateStatus(selected.id, s); setSelected((sel: any) => ({ ...sel, status: s })); }}
                    className={`text-xs font-semibold px-3 py-2.5 rounded-xl border transition ${
                      selected.status === s ? STATUS_META[s].cls : "bg-[#14171F] border-[rgba(255,255,255,0.06)] text-[#8B8F9C] hover:border-indigo-500/40"
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