import React, { useState } from "react";
import { Package, Barcode, Search, Plus, Pencil, Trash2 } from "lucide-react";
import { displayFont } from "../lib/theme.js";
import { money } from "../lib/utils.js";
import { CATEGORIES } from "../lib/seedData.js";
import { Card, Badge, Button, Modal, Field, inputCls, EmptyState } from "../components/ui.jsx";

/* ---------------------------------- Inventory view ---------------------------------- */

function ProductForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(
    initial || { name: "", category: CATEGORIES[0], price: "", cost: "", stock: "", threshold: "10", barcode: "", specs: "" }
  );
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div>
      <Field label="Product name">
        <input value={form.name} onChange={set("name")} className={inputCls} placeholder="e.g. Basmati Rice 5kg" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Category">
          <select value={form.category} onChange={set("category")} className={inputCls}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Barcode / SKU">
          <input value={form.barcode} onChange={set("barcode")} className={inputCls} placeholder="Scan or type" />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Selling price (Rs)">
          <input value={form.price} onChange={set("price")} inputMode="numeric" className={inputCls} />
        </Field>
        <Field label="Cost price (Rs)">
          <input value={form.cost} onChange={set("cost")} inputMode="numeric" className={inputCls} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Stock quantity">
          <input value={form.stock} onChange={set("stock")} inputMode="numeric" className={inputCls} />
        </Field>
        <Field label="Low stock threshold">
          <input value={form.threshold} onChange={set("threshold")} inputMode="numeric" className={inputCls} />
        </Field>
      </div>
      <Field label="Specifications (shown to customers by the AI assistant)">
        <textarea value={form.specs} onChange={set("specs")} rows={2} className={inputCls} placeholder="e.g. 1kg pack, imported, best before 6 months" />
      </Field>
      <div className="flex gap-2 mt-2">
        <Button variant="secondary" className="flex-1" onClick={onCancel}>Cancel</Button>
        <Button className="flex-1" onClick={() => onSave(form)}>Save product</Button>
      </div>
    </div>
  );
}

export default function InventoryView({ products, onAdd, onEdit, onDelete }) {
  const [modal, setModal] = useState(null);
  const [query, setQuery] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);

  const filtered = products.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()) || p.barcode.includes(query));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold text-text-primary" style={{ fontFamily: displayFont }}>Inventory</h2>
        <Button icon={Plus} onClick={() => setModal({ mode: "add" })}>Add product</Button>
      </div>

      <div className="relative max-w-xs">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search products…" className={`${inputCls} pl-9`} />
      </div>

      <Card noPad>
        {filtered.length === 0 ? (
          <EmptyState icon={Package} title="No products found" note="Try a different search or add a new product." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] text-gray-400 font-semibold uppercase tracking-wide">
                  <th className="px-5 py-3">Product</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Price</th>
                  <th className="px-5 py-3">Stock</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-t border-white/5 hover:bg-white/5 transition">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${p.color}`}>
                          {p.name.slice(0, 1)}
                        </div>
                        <div>
                          <div className="font-semibold text-text-primary">{p.name}</div>
                          <div className="text-[11px] text-gray-500">{p.barcode}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-gray-400">{p.category}</td>
                    <td className="px-5 py-3.5 text-text-primary font-medium">{money(p.price)}</td>
                    <td className="px-5 py-3.5 text-gray-300">{p.stock} units</td>
                    <td className="px-5 py-3.5">
                      {p.stock === 0 ? (
                        <Badge tone="red">Out of stock</Badge>
                      ) : p.stock <= p.threshold ? (
                        <Badge tone="amber">Low stock</Badge>
                      ) : (
                        <Badge tone="green">In stock</Badge>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setModal({ mode: "edit", product: p })} className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-text-primary">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => setConfirmDelete(p)} className="w-8 h-8 rounded-lg hover:bg-red-500/10 flex items-center justify-center text-gray-400 hover:text-red-400">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === "edit" ? "Edit product" : "Add product"}>
        {modal && (
          <ProductForm
            initial={modal.product}
            onCancel={() => setModal(null)}
            onSave={(form) => {
              if (modal.mode === "edit") onEdit(modal.product.id, form);
              else onAdd(form);
              setModal(null);
            }}
          />
        )}
      </Modal>

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete product" width={380}>
        {confirmDelete && (
          <div>
            <p className="text-sm text-gray-400 mb-5">
              Remove <span className="font-semibold text-text-primary">{confirmDelete.name}</span> from inventory? This can't be undone.
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setConfirmDelete(null)}>Cancel</Button>
              <Button variant="danger" className="flex-1" onClick={() => { onDelete(confirmDelete.id); setConfirmDelete(null); }}>Delete</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
