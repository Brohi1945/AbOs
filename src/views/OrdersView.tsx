import React, { useState, useEffect } from "react";
import { ShoppingCart, Download, ChevronRight, Search, X, CreditCard, Copy, MessageCircle } from "lucide-react";
import { displayFont } from "../theme";
import { money, Order, matchesQuery, isWithinDateRange, DateRange, DEFAULT_DATE_RANGE } from "../lib/utils";
import { STATUS_META } from "../lib/seedData";
import { Card, Badge, StatusBadge, PaymentStatusBadge, Button, Drawer, EmptyState, inputCls } from "../components/ui";
import { SkeletonTable } from "../components/Skeleton";
import { DateRangeFilter } from "../components/DateRangeFilter";
import { toastSuccess, toastError } from "../lib/toast";

interface OrdersViewProps {
  orders: Order[];
  onUpdateStatus: (id: string, status: string) => void;
}

export default function OrdersView({ orders, onUpdateStatus }: OrdersViewProps) {
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>(DEFAULT_DATE_RANGE);
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Safepay "Send Payment Link" flow — order select hote hi reset ho jata
  // hai taake purane order ka generated link naye order par na dikhe.
  const [linkLoading, setLinkLoading] = useState(false);
  const [checkoutLink, setCheckoutLink] = useState<string | null>(null);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);

  useEffect(() => {
    setCheckoutLink(null);
    setLinkLoading(false);
    setSendingWhatsApp(false);
  }, [selected?.id]);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  // Step 1: /api/create-payment se checkout link generate karo (server
  // order ka asal total DB se khud nikalta hai — yahan se sirf orderId
  // jata hai, koi amount client se nahi bheja jata).
  const handleGetPaymentLink = async () => {
    if (!selected) return;
    setLinkLoading(true);
    try {
      const res = await fetch("/api/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: selected.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.checkoutUrl) {
        toastError(data.error || "Payment link nahi ban saka");
        return;
      }
      setCheckoutLink(data.checkoutUrl);
      toastSuccess("Payment link ban gaya");
    } catch (err) {
      toastError("Payment link generate karte waqt error aaya — dobara try karein");
    } finally {
      setLinkLoading(false);
    }
  };

  // Step 2a: link clipboard par copy karo — admin ko khud kahin bhi
  // (SMS, chat, dukan ke counter par) bhejne ki azaadi.
  const handleCopyLink = async () => {
    if (!checkoutLink) return;
    try {
      await navigator.clipboard.writeText(checkoutLink);
      toastSuccess("Link copy ho gaya");
    } catch {
      toastError("Link copy nahi ho saka — manually select karein");
    }
  };

  // Step 2b: link seedha customer ke WhatsApp par bhej do — existing
  // /api/whatsapp (Meta Cloud API sender) reuse karta hai, koi naya
  // backend endpoint nahi banana pada.
  const handleSendWhatsApp = async () => {
    if (!checkoutLink || !selected) return;
    if (!selected.phone) {
      toastError("Is order par customer ka phone number nahi hai");
      return;
    }
    setSendingWhatsApp(true);
    try {
      const res = await fetch("/api/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: selected.phone,
          message: `Aapke order ${selected.id} (${money(selected.total)}) ka payment link:\n${checkoutLink}\n\n(Ya Cash on Delivery bhi chalega — koi payment zaroori nahi.)`,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toastError(data.error || "WhatsApp par link nahi bhej saka");
        return;
      }
      toastSuccess("Payment link WhatsApp par bhej diya");
    } catch (err) {
      toastError("WhatsApp send karte waqt error aaya — dobara try karein");
    } finally {
      setSendingWhatsApp(false);
    }
  };

  const filtered = orders
    .filter((o) => (filter === "all" ? true : o.status === filter))
    .filter((o) => matchesQuery(query, o.id, o.customer))
    .filter((o) => isWithinDateRange(o.date, dateRange));
  const tabs = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "confirmed", label: "Confirmed" },
    { key: "delivered", label: "Delivered" },
    { key: "cancelled", label: "Cancelled" },
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="h-8 w-32 bg-surface rounded-lg animate-pulse" />
          <div className="flex gap-2">
            <div className="h-9 w-20 bg-surface rounded-lg animate-pulse" />
            <div className="h-9 w-20 bg-surface rounded-lg animate-pulse" />
          </div>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-9 w-16 bg-surface rounded-xl animate-pulse" />
          ))}
        </div>
        <SkeletonTable rows={6} cols={6} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold text-fg" style={{ fontFamily: displayFont }}>
          Orders
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" icon={Download}>
            Export
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by order ID or customer…"
            className={`${inputCls} pl-9 pr-8`}
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted">
              <X size={14} />
            </button>
          )}
        </div>
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`text-xs font-semibold px-3.5 py-2 rounded-xl whitespace-nowrap transition ${
              filter === t.key
                ? "bg-brand text-white"
                : "bg-app text-muted border"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Card noPad>
        {filtered.length === 0 ? (
          <EmptyState icon={ShoppingCart} title="No orders here" note="Try a different search, status, or date range." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] text-muted font-semibold uppercase tracking-wide">
                  <th className="px-5 py-3">Order</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Channel</th>
                  <th className="px-5 py-3">Total</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Payment</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr
                    key={o.id}
                    className="border-t border hover:bg-white/5 transition cursor-pointer"
                    onClick={() => setSelected(o)}
                  >
                    <td className="px-5 py-3.5 font-semibold text-fg">{o.id}</td>
                    <td className="px-5 py-3.5 text-muted">{o.customer}</td>
                    <td className="px-5 py-3.5">
                      <Badge tone="slate">{o.channel}</Badge>
                    </td>
                    <td className="px-5 py-3.5 text-fg font-medium">{money(o.total)}</td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="px-5 py-3.5">
                      <PaymentStatusBadge status={o.payment_status} />
                    </td>
                    <td className="px-5 py-3.5 text-muted text-xs">{o.date}</td>
                    <td className="px-5 py-3.5 text-right">
                      <ChevronRight size={15} className="text-muted" />
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
              <span className="text-xs text-muted">{selected.date}</span>
            </div>
            <div>
              <div className="text-xs font-semibold text-muted mb-1">Customer</div>
              <div className="text-sm font-semibold text-fg">{selected.customer}</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-muted mb-2">Items</div>
              <div className="space-y-2">
                {selected.items.map((it: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-sm bg-white/5 rounded-lg px-3 py-2">
                    <span className="text-muted">{it.name}</span>
                    <span className="text-muted font-medium">x{it.qty}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between text-sm font-bold pt-3 border-t border">
              <span className="text-fg">Total</span>
              <span className="text-indigo-400">{money(selected.total)}</span>
            </div>

            {selected.status !== "cancelled" && (
              <div className="pt-1">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold text-muted">Payment</div>
                  <PaymentStatusBadge status={selected.payment_status} />
                </div>
                {selected.payment_status === "paid" ? (
                  <div className="text-xs text-muted">Payment already received — koi link zaroorat nahi.</div>
                ) : !checkoutLink ? (
                  <Button variant="secondary" size="sm" icon={CreditCard} onClick={handleGetPaymentLink} disabled={linkLoading}>
                    {linkLoading ? "Generating…" : "Get Payment Link"}
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <div className="text-xs bg-white/5 rounded-lg px-3 py-2 break-all text-muted">{checkoutLink}</div>
                    <div className="flex gap-2 flex-wrap">
                      <Button variant="secondary" size="sm" icon={Copy} onClick={handleCopyLink}>
                        Copy Link
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={MessageCircle}
                        onClick={handleSendWhatsApp}
                        disabled={sendingWhatsApp || !selected.phone}
                      >
                        {sendingWhatsApp ? "Sending…" : "Send via WhatsApp"}
                      </Button>
                    </div>
                    {!selected.phone && (
                      <div className="text-[11px] text-muted">Is order par phone number nahi hai — link sirf copy ho sakta hai.</div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div>
              <div className="text-xs font-semibold text-muted mb-2">Update status</div>
              <div className="grid grid-cols-2 gap-2">
                {Object.keys(STATUS_META).map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      onUpdateStatus(selected.id, s);
                      setSelected((sel: any) => ({ ...sel, status: s }));
                    }}
                    className={`text-xs font-semibold px-3 py-2.5 rounded-xl border transition ${
                      selected.status === s
                        ? STATUS_META[s].cls
                        : "bg-app border text-muted hover:border-indigo-500/40"
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
