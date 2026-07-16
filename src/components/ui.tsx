import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, TrendingUp, TrendingDown, LucideIcon } from "lucide-react";
import { displayFont } from "../lib/theme";
import { STATUS_META } from "../lib/seedData";
import { backdropFade, modalScale, drawerSlideRight, backdropTransition, modalTransition, drawerTransition } from "../animations/variants";
import { useCountUp } from "../animations/useCountUp";

type ButtonVariant = "primary" | "secondary" | "success" | "danger" | "ghost" | "glassOutline" | "glassSolid";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon | null;
  className?: string;
}

export function Button({ children, variant = "primary", size = "md", icon: Icon = null, className = "", ...props }: ButtonProps) {
  const base = "inline-flex items-center justify-center gap-1.5 font-semibold rounded-xl transition active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100 whitespace-nowrap";
  const sizes: Record<ButtonSize, string> = { sm: "text-xs px-3 py-1.5", md: "text-sm px-4 py-2.5", lg: "text-sm px-5 py-3" };

  const variants: Record<ButtonVariant, string> = {
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

interface CardProps {
  children?: React.ReactNode;
  className?: string;
  noPad?: boolean;
  style?: React.CSSProperties;
}

export function Card({ children, className = "", noPad = false, style = undefined }: CardProps) {
  return (
    <div
      style={style}
      className={`bg-[#14171F] border border-[rgba(255,255,255,0.06)] rounded-xl ${noPad ? "" : "p-5"} ${className}`}
    >
      {children}
    </div>
  );
}

type BadgeTone = "slate" | "indigo" | "green" | "amber" | "red";

interface BadgeProps {
  children?: React.ReactNode;
  tone?: BadgeTone;
}

export function Badge({ children, tone = "slate" }: BadgeProps) {
  const tones: Record<BadgeTone, string> = {
    slate: "bg-white/5 text-[#8B8F9C]",
    indigo: "bg-indigo-500/10 text-indigo-400",
    green: "bg-green-500/10 text-green-400",
    amber: "bg-yellow-500/10 text-yellow-400",
    red: "bg-red-500/10 text-red-400",
  };
  return <span className={`text-[11px] font-semibold px-2 py-1 rounded-lg ${tones[tone]}`}>{children}</span>;
}

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const meta = STATUS_META[status] || STATUS_META.pending;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg border ${meta.cls}`}>
      <Icon size={11} /> {meta.label}
    </span>
  );
}

type StatTone = "indigo" | "green" | "amber" | "red";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  delta?: string | null;
  tone?: StatTone;
}

export function StatCard({ icon: Icon, label, value, delta = null, tone = "indigo" }: StatCardProps) {
  const tones: Record<StatTone, string> = {
    indigo: "bg-indigo-500/10 text-indigo-400",
    green: "bg-green-500/10 text-green-400",
    amber: "bg-yellow-500/10 text-yellow-400",
    red: "bg-red-500/10 text-red-400",
  };

  const animatedValue = useCountUp(value);

  return (
    <Card className="flex items-start justify-between">
      <div>
        <div className="text-xs font-medium text-[#8B8F9C] mb-1.5">{label}</div>
        <div className="text-2xl font-bold text-[#E8E9ED]" style={{ fontFamily: displayFont }}>{animatedValue}</div>

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

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children?: React.ReactNode;
  width?: number;
}

export function Drawer({ open, onClose, title, children, width = 420 }: DrawerProps) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[200]">
          <motion.div
            className="absolute inset-0 bg-black/60"
            variants={backdropFade}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={backdropTransition}
            onClick={onClose}
          />

          <motion.div
            className="absolute top-0 right-0 bottom-0 bg-[#14171F] shadow-2xl overflow-y-auto"
            style={{ width: "92%", maxWidth: width }}
            variants={drawerSlideRight}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={drawerTransition}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(255,255,255,0.06)] sticky top-0 bg-[#14171F] z-10">
              <h3 className="font-bold text-[#E8E9ED]" style={{ fontFamily: displayFont }}>{title}</h3>

              <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-gray-400">
                <X size={17} />
              </button>
            </div>

            <div className="p-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children?: React.ReactNode;
  width?: number;
}

export function Modal({ open, onClose, title, children, width = 460 }: ModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-black/60"
            variants={backdropFade}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={backdropTransition}
            onClick={onClose}
          />

          <motion.div
            className="relative bg-[#14171F] rounded-2xl shadow-2xl w-full max-h-[88vh] overflow-y-auto"
            style={{ maxWidth: width }}
            variants={modalScale}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={modalTransition}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(255,255,255,0.06)] sticky top-0 bg-[#14171F] z-10">
              <h3 className="font-bold text-[#E8E9ED]" style={{ fontFamily: displayFont }}>{title}</h3>

              <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-gray-400">
                <X size={17} />
              </button>
            </div>

            <div className="p-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

interface FieldProps {
  label?: React.ReactNode;
  children?: React.ReactNode;
}

export function Field({ label, children }: FieldProps) {
  return (
    <div className="mb-3.5">
      <label className="text-xs font-semibold text-[#8B8F9C] mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}

export const inputCls =
  "w-full px-3.5 py-2.5 rounded-xl text-sm bg-[#1B1F2A] border border-[rgba(255,255,255,0.06)] focus:outline-none focus:ring-2 focus:ring-[#C9A44C]/40 transition text-[#E8E9ED]";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  note?: string;
}

export function EmptyState({ icon: Icon, title, note }: EmptyStateProps) {
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
