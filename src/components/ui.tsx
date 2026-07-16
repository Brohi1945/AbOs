import React from "react";
import { X, TrendingUp, TrendingDown } from "lucide-react";
import { displayFont } from "../lib/theme";
import { STATUS_META } from "../lib/seedData";

export function Button({ children, variant = "primary", size = "md", icon: Icon, className = "", ...props }) {
  const base = "inline-flex items-center justify-center gap-1.5 font-semibold rounded-xl transition active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100 whitespace-nowrap";
  const sizes = { sm: "text-xs px-3 py-1.5", md: "text-sm px-4 py-2.5", lg: "text-sm px-5 py-3" };

  const variants = {
    primary: "bg-[#C9A44C] text-black hover:bg-[#8A712F]",
    secondary: "bg-[#14171F] text-[#E8E9ED] border border-[rgba(255,255,255,0.06)] hover:bg-[#1B1F2A]",
    success: "bg-green-500 text-white hover:bg-green-600",
    danger: "bg-[#14171F] text-red-500 border border-red-500/20",
    ghost: "text-[#8B8F9C] hover:bg-white/5",
    glassOutline: "bg-white/10 text-white border border-white/20 backdrop-blur-md",
    glassSolid: "bg-white text-black",
  };

  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
      {Icon && <Icon size={size === "sm" ? 13 : 15} />}
      {children}
    </button>
  );
}

export function Card({ children, className = "", noPad = false, style }) {
  return (
    <div
      style={style}
      className={`bg-[#14171F] border border-[rgba(255,255,255,0.06)] rounded-xl ${noPad ? "" : "p-5"} ${className}`}
    >
      {children}
    </div>
  );
}

export function Badge({ children, tone = "slate" }) {
  const tones = {
    slate: "bg-white/5 text-[#8B8F9C]",
    indigo: "bg-indigo-500/10 text-indigo-400",
    green: "bg-green-500/10 text-green-400",
    amber: "bg-yellow-500/10 text-yellow-400",
    red: "bg-red-500/10 text-red-400",
  };
  return <span className={`text-[11px] font-semibold px-2 py-1 rounded-lg ${tones[tone]}`}>{children}</span>;
}

export function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.pending;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg border ${meta.cls}`}>
      <Icon size={11} /> {meta.label}
    </span>
  );
}

export function StatCard({ icon: Icon, label, value, delta, tone = "indigo" }) {
  const tones = {
    indigo: "bg-indigo-500/10 text-indigo-400",
    green: "bg-green-500/10 text-green-400",
    amber: "bg-yellow-500/10 text-yellow-400",
    red: "bg-red-500/10 text-red-400",
  };

  return (
    <Card className="flex items-start justify-between">
      <div>
        <div className="text-xs font-medium text-[#8B8F9C] mb-1.5">{label}</div>
        <div className="text-2xl font-bold text-[#E8E9ED]" style={{ fontFamily: displayFont }}>{value}</div>

        {delta && (
          <div className={`flex items-center gap-1 mt-2 text-xs font-semibold ${delta.startsWith("-") ? "text-red-500" : "text-green-400"}`}>
            {delta.startsWith("-") ? <TrendingDown size={13} /> : <TrendingUp size={13} />} {delta}
          </div>
        )}
      </div>

      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tones[tone]}`}>
        <Icon size={18} />
      </div>
    </Card>
  );
}

export function Drawer({ open, onClose, title, children, width = 420 }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200]">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div
        className="absolute top-0 right-0 bottom-0 bg-[#14171F] shadow-2xl overflow-y-auto"
        style={{ width: "92%", maxWidth: width }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(255,255,255,0.06)] sticky top-0 bg-[#14171F] z-10">
          <h3 className="font-bold text-[#E8E9ED]" style={{ fontFamily: displayFont }}>{title}</h3>

          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-gray-400">
            <X size={17} />
          </button>
        </div>

        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Modal({ open, onClose, title, children, width = 460 }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div className="relative bg-[#14171F] rounded-2xl shadow-2xl w-full max-h-[88vh] overflow-y-auto" style={{ maxWidth: width }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(255,255,255,0.06)] sticky top-0 bg-[#14171F] z-10">
          <h3 className="font-bold text-[#E8E9ED]" style={{ fontFamily: displayFont }}>{title}</h3>

          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-gray-400">
            <X size={17} />
          </button>
        </div>

        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <div className="mb-3.5">
      <label className="text-xs font-semibold text-[#8B8F9C] mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}

export const inputCls =
  "w-full px-3.5 py-2.5 rounded-xl text-sm bg-[#1B1F2A] border border-[rgba(255,255,255,0.06)] focus:outline-none focus:ring-2 focus:ring-[#C9A44C]/40 transition text-[#E8E9ED]";

export function EmptyState({ icon: Icon, title, note }) {
  return (
    <div className="text-center py-14 px-5">
      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-3 text-gray-400">
        <Icon size={20} />
      </div>
      <div className="text-sm font-semibold text-[#E8E9ED]">{title}</div>
      {note && <div className="text-xs text-[#8B8F9C] mt-1">{note}</div>}
    </div>
  );
}
