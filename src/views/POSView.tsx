import React, { useState, useRef } from "react";
import { ShoppingCart, Barcode, Plus, X, Minus, CreditCard, Printer } from "lucide-react";
import { displayFont } from "../lib/theme";
import { genId, money } from "../lib/utils";
import { Card, Badge, Button, Modal, EmptyState } from "../components/ui";

interface POSViewProps {
  products: any[];
  onCheckout: (cartLines: any[]) => void;
}

export default function POSView({ products, onCheckout }: POSViewProps) {
  const [barcodeInput, setBarcodeInput] = useState("");
  const [cart, setCart] = useState<{ productId: string; qty: number }[]>([]);
  const [scanMsg, setScanMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [invoice, setInvoice] = useState<any>(null);
  const scanRef = useRef<HTMLInputElement>(null);

  const addToCart = (product: any) => {
    setCart((c) => {
      const existing = c.find((it) => it.productId === product.id);
      if (existing) return c.map((it) => (it.productId === product.id ? { ...it, qty: it.qty + 1 } : it));
      return [...c, { productId: product.id, qty: 1 }];
    });
  };

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    const code = barcodeInput.trim();
    if (!code) return;
    const product = products.find((p) => p.barcode === code || p.id.toLowerCase() === code.toLowerCase());
    if (!product) {
      setScanMsg({ ok: false, text: `No product found for "${code}"` });
    } else if (product.stock <= 0) {
      setScanMsg({ ok: false, text: `${product.name} is out of stock` });
    } else {
      addToCart(product);
      setScanMsg({ ok: true, text: `Added ${product.name}` });
    }
    setBarcodeInput("");
    scanRef.current?.focus();
    setTimeout(() => setScanMsg(null), 2200);
  };

  const cartLines = cart.map((it) => {
    const p = products.find((pr) => pr.id === it.productId);
    return { ...it, product: p, subtotal: p ? p.price * it.qty : 0 };
  }).filter((l) => l.product);

  const total = cartLines.reduce((s, l) => s + l.subtotal, 0);

  const updateQty = (id: string, delta: number) => {
    setCart((c) => c.map((it) => (it.productId === id ? { ...it, qty: Math.max(1, it.qty + delta) } : it)).filter((it) => it.qty > 0));
  };
  const removeLine = (id: string) => setCart((c) => c.filter((it) => it.productId !== id));

  const handleGenerateInvoice = () => {
    if (cartLines.length === 0) return;
    const inv = { id: genId("INV"), lines: cartLines, total, date: new Date().toLocaleString() };
    setInvoice(inv);
    onCheckout(cartLines);
    setCart([]);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: displayFont }}>POS / Retail mode</h2>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <form onSubmit={handleScan} className="flex items-center gap-2">
              <div className="relative flex-1">
                <Barcode size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-500" />
                <input
                  ref={scanRef}
                  autoFocus
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder="Scan or type barcode, then press Enter…"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl text-sm bg-indigo-50 border border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition text-slate-800"
                />
              </div>
              <Button type="submit">Add</Button>
            </form>
            {scanMsg && (
              <div className={`mt-2.5 text-xs font-semibold px-3 py-2 rounded-lg ${scanMsg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                {scanMsg.text}
              </div>
            )}
          </Card>

          <Card noPad>
            <h3 className="font-bold text-slate-900 text-sm px-5 pt-5 mb-3" style={{ fontFamily: displayFont }}>Quick-add products</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 px-5 pb-5">
              {products.map((p) => (
                <button
                  key={p.id}
                  disabled={p.stock <= 0}
                  onClick={() => addToCart(p)}
                  className="text-left rounded-xl border border-slate-100 p-3 hover:border-indigo-300 hover:shadow-sm transition disabled:opacity-40 disabled:hover:border-slate-100"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs mb-2 ${p.color}`}>{p.name.slice(0, 1)}</div>
                  <div className="text-xs font-semibold text-slate-800 leading-tight mb-0.5">{p.name}</div>
                  <div className="text-[11px] text-slate-400">{money(p.price)} · {p.stock} in stock</div>
                </button>
              ))}
            </div>
          </Card>
        </div>

        <Card noPad className="lg:sticky lg:top-20 h-fit">
          <div className="flex items-center justify-between px-5 pt-5 mb-1">
            <h3 className="font-bold text-slate-900 text-sm" style={{ fontFamily: displayFont }}>Current bill</h3>
            <Badge tone="indigo">{cartLines.length} items</Badge>
          </div>
          {cartLines.length === 0 ? (
            <EmptyState icon={ShoppingCart} title="Cart is empty" note="Scan a barcode or tap a product to begin." />
          ) : (
            <>
              <div className="px-5 py-2 space-y-2.5 max-h-72 overflow-y-auto">
                {cartLines.map((l) => (
                  <div key={l.productId} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-800 truncate">{l.product.name}</div>
                      <div className="text-[11px] text-slate-400">{money(l.product.price)} each</div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => updateQty(l.productId, -1)} className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center text-slate-500">
                        <Minus size={11} />
                      </button>
                      <span className="text-xs font-semibold w-5 text-center">{l.qty}</span>
                      <button onClick={() => updateQty(l.productId, 1)} className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center text-slate-500">
                        <Plus size={11} />
                      </button>
                      <button onClick={() => removeLine(l.productId)} className="w-6 h-6 rounded-md hover:bg-red-50 flex items-center justify-center text-slate-300 hover:text-red-500">
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-5 py-4 border-t border-slate-100 mt-2">
                <div className="flex items-center justify-between text-sm font-bold mb-3">
                  <span className="text-slate-800">Total</span>
                  <span className="text-indigo-600">{money(total)}</span>
                </div>
                <Button className="w-full" size="lg" icon={CreditCard} onClick={handleGenerateInvoice}>
                  Generate bill
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>

      <Modal open={!!invoice} onClose={() => setInvoice(null)} title="Invoice" width={380}>
        {invoice && (
          <div>
            <div className="text-center mb-4">
              <div className="font-bold text-slate-900" style={{ fontFamily: displayFont }}>AB OS</div>
              <div className="text-[11px] text-slate-400">{invoice.id} · {invoice.date}</div>
            </div>
            <div className="space-y-1.5 mb-4 pb-4 border-b border-dashed border-slate-200">
              {invoice.lines.map((l: any) => (
                <div key={l.productId} className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">{l.qty}x {l.product.name}</span>
                  <span className="font-semibold text-slate-800">{money(l.subtotal)}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between text-sm font-bold mb-5">
              <span>Total</span>
              <span className="text-indigo-600">{money(invoice.total)}</span>
            </div>
            <Button className="w-full" icon={Printer} onClick={() => window.print()}>Print receipt</Button>
          </div>
        )}
      </Modal>
    </div>
  );
}