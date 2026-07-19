import React, { useState } from "react";
import { Calendar, ChevronDown } from "lucide-react";
import { DatePreset, DateRange } from "../lib/utils";

interface DateRangeFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

const PRESETS: { key: DatePreset; label: string }[] = [
  { key: "all", label: "All time" },
  { key: "today", label: "Today" },
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "custom", label: "Custom range" },
];

/**
 * Calendar / date-range filter. Quick presets (Today, This week, This
 * month) plus a custom native date-range picker. Used anywhere a list
 * needs to be filtered by date — Orders, Waitlist, and available for
 * any future view (Accounting, Business Intelligence, etc).
 */
export function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  const [open, setOpen] = useState(false);

  const label =
    value.preset === "custom" && (value.from || value.to)
      ? `${value.from || "…"} → ${value.to || "…"}`
      : PRESETS.find((p) => p.key === value.preset)?.label || "All time";

  const selectPreset = (preset: DatePreset) => {
    if (preset === "custom") {
      onChange({ preset: "custom", from: value.from, to: value.to });
      return; // keep panel open so they can pick dates
    }
    onChange({ preset, from: null, to: null });
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl border transition whitespace-nowrap ${
          value.preset !== "all" ? "bg-brand text-white border-brand" : "bg-app text-muted"
        }`}
      >
        <Calendar size={13} />
        {label}
        <ChevronDown size={12} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-60 bg-surface border rounded-xl shadow-xl z-20 p-2">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => selectPreset(p.key)}
                className={`w-full text-left text-xs font-semibold px-3 py-2 rounded-lg transition ${
                  value.preset === p.key ? "bg-brand/10 text-brand" : "text-muted hover:bg-app"
                }`}
              >
                {p.label}
              </button>
            ))}

            {value.preset === "custom" && (
              <div className="px-1 pt-2 space-y-2 border-t mt-2">
                <label className="block text-[10px] font-semibold text-muted uppercase tracking-wide">From</label>
                <input
                  type="date"
                  value={value.from || ""}
                  onChange={(e) => onChange({ ...value, preset: "custom", from: e.target.value || null })}
                  className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-app border text-fg focus:outline-none focus:ring-2 focus:ring-brand/40"
                />
                <label className="block text-[10px] font-semibold text-muted uppercase tracking-wide">To</label>
                <input
                  type="date"
                  value={value.to || ""}
                  onChange={(e) => onChange({ ...value, preset: "custom", to: e.target.value || null })}
                  className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-app border text-fg focus:outline-none focus:ring-2 focus:ring-brand/40"
                />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="w-full text-center text-xs font-semibold px-3 py-1.5 rounded-lg bg-brand text-white mt-1"
                >
                  Apply
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default DateRangeFilter;
