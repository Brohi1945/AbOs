import React, { useEffect, useState } from "react";
import { ListChecks, RefreshCw, Trash2, Search, X } from "lucide-react";
import { displayFont } from "../theme";
import { Card, Badge, Button, EmptyState, inputCls } from "../components/ui";
import { fetchAllWaitlist, deleteWaitlistRow } from "../supabaseClient";
import { toastSuccess } from "../lib/toast";
import { matchesQuery, isWithinDateRange, DateRange, DEFAULT_DATE_RANGE, Product } from "../lib/utils";
import { DateRangeFilter } from "../components/DateRangeFilter";

interface WaitlistViewProps {
  products: Product[];
}

const STATUS_TONE: Record<string, "amber" | "indigo" | "green" | "red" | "slate"> = {
  waiting: "amber",
  notified: "indigo",
  converted: "green",
  expired: "red",
};

const FILTERS = ["all", "waiting", "notified", "converted", "expired"];

export default function WaitlistView({ products }: WaitlistViewProps) {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>(DEFAULT_DATE_RANGE);

  const load = async () => {
    setLoading(true);
    const data = await fetchAllWaitlist();
    setEntries(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleRemove = async (id: string) => {
    await deleteWaitlistRow(id);
    setEntries((es) => es.filter((e) => e.id !== id));
    toastSuccess("Waitlist entry hata di gayi.");
  };

  const filtered = entries
    .filter((e) => (filter === "all" ? true : e.status === filter))
    .filter((e) => {
      const product = products.find((p) => p.id === e.product_id);
      return matchesQuery(query, e.customer_name, e.phone, product?.name);
    })
    .filter((e) => isWithinDateRange(e.joined_at, dateRange));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold text-fg" style={{ fontFamily: displayFont }}>Waitlist</h2>
        <Button variant="secondary" size="sm" icon={RefreshCw} onClick={load}>
          Refresh
        </Button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by customer or product…"
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

      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs font-semibold px-3.5 py-2 rounded-xl whitespace-nowrap transition capitalize ${
              filter === f ? "bg-brand text-white" : "bg-app border text-muted"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <Card noPad>
        {loading ? (
          <div className="px-5 py-10 text-center text-sm text-muted">Loading…</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={ListChecks} title="No waitlist entries" note="Customers who ask to be notified about out-of-stock products will show up here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] text-muted font-semibold uppercase tracking-wide">
                  <th className="px-5 py-3">Product</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Phone</th>
                  <th className="px-5 py-3">Qty</th>
                  <th className="px-5 py-3">Channel</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Joined</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => {
                  const product = products.find((p) => p.id === e.product_id);
                  return (
                    <tr key={e.id} className="border-t border hover:bg-white/5 transition">
                      <td className="px-5 py-3.5 font-semibold text-fg">{product?.name || e.product_id}</td>
                      <td className="px-5 py-3.5 text-muted">{e.customer_name || "—"}</td>
                      <td className="px-5 py-3.5 text-muted">{e.phone || "—"}</td>
                      <td className="px-5 py-3.5 text-muted">{e.qty || 1}</td>
                      <td className="px-5 py-3.5">
                        <Badge tone={e.channel === "WhatsApp" ? "green" : "indigo"}>{e.channel || "Website"}</Badge>
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge tone={STATUS_TONE[e.status] || "slate"}>{e.status || "waiting"}</Badge>
                      </td>
                      <td className="px-5 py-3.5 text-muted text-xs">
                        {e.joined_at ? new Date(e.joined_at).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => handleRemove(e.id)}
                          className="w-7 h-7 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center hover:bg-red-500/20 ml-auto"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
