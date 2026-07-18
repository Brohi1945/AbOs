import React, { useEffect, useState } from "react";
import { ListChecks, RefreshCw, Trash2 } from "lucide-react";
import { displayFont } from "../theme";
import { Card, Badge, Button, EmptyState } from "../components/ui";
import { fetchAllWaitlist, deleteWaitlistRow } from "../supabaseClient";
import { toastSuccess } from "../lib/toast";

interface WaitlistViewProps {
  products: any[];
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

  const filtered = filter === "all" ? entries : entries.filter((e) => e.status === filter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold text-fg" style={{ fontFamily: displayFont }}>Waitlist</h2>
        <Button variant="secondary" size="sm" icon={RefreshCw} onClick={load}>
          Refresh
        </Button>
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
