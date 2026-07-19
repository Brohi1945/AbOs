import React, { useEffect, useMemo, useRef, useState } from "react";
import { Search, ShoppingCart, Package, Users, CornerDownLeft, X } from "lucide-react";
import { NAV_ITEMS } from "../config/app.config";
import { Order, Product, Customer, money, matchesQuery } from "../lib/utils";

interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
  orders: Order[];
  products: Product[];
  customers: Customer[];
  onGoTo: (section: string) => void;
}

type ResultKind = "section" | "order" | "product" | "customer";

interface Result {
  kind: ResultKind;
  key: string;
  title: string;
  subtitle: string;
  onSelect: () => void;
}

/**
 * Command-palette style global search. Opens with Ctrl/Cmd+K or by
 * clicking the topbar search field. Searches across nav sections,
 * orders (id/customer), products (name/barcode), and customers
 * (name/phone) at once, and jumps straight to the relevant section
 * when a result is picked.
 */
export function GlobalSearch({ open, onClose, orders, products, customers, onGoTo }: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  const results: Result[] = useMemo(() => {
    const q = query.trim();
    const out: Result[] = [];

    if (!q) {
      // Nothing typed yet: show quick section jumps.
      NAV_ITEMS.filter((i) => i.key !== "assistant").forEach((item) =>
        out.push({
          kind: "section",
          key: `section-${item.key}`,
          title: item.label,
          subtitle: "Go to section",
          onSelect: () => onGoTo(item.key),
        })
      );
      return out;
    }

    NAV_ITEMS.filter((i) => i.key !== "assistant" && i.label.toLowerCase().includes(q.toLowerCase())).forEach((item) =>
      out.push({
        kind: "section",
        key: `section-${item.key}`,
        title: item.label,
        subtitle: "Go to section",
        onSelect: () => onGoTo(item.key),
      })
    );

    orders
      .filter((o) => matchesQuery(q, o.id, o.customer))
      .slice(0, 6)
      .forEach((o) =>
        out.push({
          kind: "order",
          key: `order-${o.id}`,
          title: `${o.id} · ${o.customer}`,
          subtitle: `${money(o.total)} · ${o.status}`,
          onSelect: () => onGoTo("orders"),
        })
      );

    products
      .filter((p) => matchesQuery(q, p.name, p.category, p.barcode))
      .slice(0, 6)
      .forEach((p) =>
        out.push({
          kind: "product",
          key: `product-${p.id}`,
          title: p.name,
          subtitle: `${p.category} · ${money(p.price)} · ${p.stock} in stock`,
          onSelect: () => onGoTo("inventory"),
        })
      );

    customers
      .filter((c) => matchesQuery(q, c.name, c.phone))
      .slice(0, 6)
      .forEach((c) =>
        out.push({
          kind: "customer",
          key: `customer-${c.id}`,
          title: c.name,
          subtitle: c.phone,
          onSelect: () => onGoTo("customers"),
        })
      );

    return out;
  }, [query, orders, products, customers, onGoTo]);

  useEffect(() => setActiveIndex(0), [query]);

  const iconFor = (kind: ResultKind) => {
    if (kind === "order") return ShoppingCart;
    if (kind === "product") return Package;
    if (kind === "customer") return Users;
    return Search;
  };

  const runSelection = (r: Result) => {
    r.onSelect();
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[activeIndex]) runSelection(results[activeIndex]);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-start justify-center pt-20 px-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-surface border rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center gap-2.5 px-4 py-3 border-b">
          <Search size={16} className="text-muted shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search orders, products, customers, sections…"
            className="flex-1 bg-transparent text-sm text-fg placeholder-muted focus:outline-none"
          />
          <button onClick={onClose} className="w-6 h-6 rounded-md hover:bg-fg/5 flex items-center justify-center text-muted shrink-0">
            <X size={14} />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto py-1.5">
          {results.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-muted">No matches for "{query}"</div>
          ) : (
            results.map((r, i) => {
              const Icon = iconFor(r.kind);
              return (
                <button
                  key={r.key}
                  onClick={() => runSelection(r)}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition ${
                    i === activeIndex ? "bg-brand/10" : ""
                  }`}
                >
                  <div className="w-7 h-7 rounded-lg bg-app border flex items-center justify-center text-muted shrink-0">
                    <Icon size={13} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-fg truncate">{r.title}</div>
                    <div className="text-[10px] text-muted truncate">{r.subtitle}</div>
                  </div>
                  {i === activeIndex && <CornerDownLeft size={12} className="text-muted shrink-0" />}
                </button>
              );
            })
          )}
        </div>

        <div className="flex items-center gap-3 px-4 py-2 border-t text-[10px] text-muted">
          <span>↑↓ navigate</span>
          <span>↵ select</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );
}

export default GlobalSearch;
