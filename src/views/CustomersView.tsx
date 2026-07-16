import React, { useState } from "react";
import { Users, Search, Plus, Download, ChevronRight } from "lucide-react";
import { displayFont } from "../lib/theme";
import { money, computeCustomerStats } from "../lib/utils";
import { Card, Badge, StatusBadge, Button, Drawer, Modal, Field, inputCls, EmptyState } from "../components/ui";

function CustomerForm({ initial = null, onSave, onCancel }) {
  const [form, setForm] = useState(initial || { name: "", phone: "", email: "" });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div>
      <Field label="Customer name">
        <input value={form.name} onChange={set("name")} className={inputCls} placeholder="e.g. Ayesha Khan" />
      </Field>
      <Field label="Phone number">
        <input value={form.phone} onChange={set("phone")} className={inputCls} placeholder="e.g. 0301-2345678" />
      </Field>
      <Field label="Email (optional)">
        <input value={form.email} onChange={set("email")} className={inputCls} placeholder="e.g. name@mail.com" />
      </Field>
      <div className="flex gap-2 mt-2">
        <Button variant="secondary" className="flex-1" onClick={onCancel}>Cancel</Button>
        <Button className="flex-1" onClick={() => onSave(form)} disabled={!form.name || !form.phone}>Save customer</Button>
      </div>
    </div>
  );
}

export default function CustomersView({ customers, orders, onAdd }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const filtered = customers.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()) || c.phone.includes(query));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: displayFont }}>Customers</h2>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={Download}>Export list</Button>
          <Button size="sm" icon={Plus} onClick={() => setModalOpen(true)}>Add customer</Button>
        </div>
      </div>

      <div className="relative max-w-xs">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search customers…" className={`${inputCls} pl-9`} />
      </div>

      <Card noPad>
        {filtered.length === 0 ? (
          <EmptyState icon={Users} title="No customers found" note="Try a different search or add a new customer." />
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] text-slate-400 font-semibold uppercase tracking-wide">
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">Phone</th>
                <th className="px-5 py-3">Orders</th>
                <th className="px-5 py-3">Total spent</th>
                <th className="px-5 py-3">Last order</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const stats = computeCustomerStats(c, orders);
                return (
                <tr key={c.id} onClick={() => setSelected(c)} className="border-t border-slate-50 hover:bg-slate-50/70 transition cursor-pointer">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold shrink-0">
                        {c.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </div>
                      <span className="font-semibold text-slate-800">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500">{c.phone}</td>
                  <td className="px-5 py-3.5 text-slate-700">{stats.orders}</td>
                  <td className="px-5 py-3.5 text-slate-800 font-medium">{money(stats.spent)}</td>
                  <td className="px-5 py-3.5 text-slate-400 text-xs">{stats.lastOrder}</td>
                  <td className="px-5 py-3.5 text-right"><ChevronRight size={15} className="text-slate-300" /></td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        )}
      </Card>

      <Drawer open={!!selected} onClose={() => setSelected(null)} title={selected?.name}>
        {selected && (() => {
          const stats = computeCustomerStats(selected, orders);
          return (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0">
                {selected.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
              </div>
              <div>
                <div className="font-semibold text-slate-800 text-sm">{selected.name}</div>
                <div className="text-xs text-slate-400">{selected.phone} · {selected.email}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-50 p-3">
                <div className="text-[10px] text-slate-400 font-medium mb-1">Total orders</div>
                <div className="text-lg font-bold text-slate-900">{stats.orders}</div>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <div className="text-[10px] text-slate-400 font-medium mb-1">Total spent</div>
                <div className="text-lg font-bold text-slate-900">{money(stats.spent)}</div>
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-400 mb-2">Order history</div>
              <div className="space-y-2">
                {orders.filter((o) => o.customer === selected.name).map((o) => (
                  <div key={o.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2.5 text-sm">
                    <div>
                      <div className="font-semibold text-slate-700">{o.id}</div>
                      <div className="text-[11px] text-slate-400">{o.date}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-slate-800">{money(o.total)}</div>
                      <StatusBadge status={o.status} />
                    </div>
                  </div>
                ))}
                {orders.filter((o) => o.customer === selected.name).length === 0 && (
                  <div className="text-xs text-slate-400 text-center py-4">No orders yet.</div>
                )}
              </div>
            </div>
          </div>
          );
        })()}
      </Drawer>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add customer">
        <CustomerForm
          onCancel={() => setModalOpen(false)}
          onSave={(form) => { onAdd(form); setModalOpen(false); }}
        />
      </Modal>
    </div>
  );
}