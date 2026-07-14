import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  LayoutDashboard, ShoppingCart, Package, Users, Wallet, Megaphone, Bot,
  Barcode, Search, Bell, ChevronDown, Plus, Pencil, Trash2, X,
  Clock, XCircle, TrendingUp, TrendingDown, AlertTriangle, LogOut,
  Menu, ArrowRight, Sparkles, Send, ShoppingBag, Filter, Download, Mail,
  MessageSquare, Smartphone, Eye, MousePointerClick, ChevronRight, Minus,
  CreditCard, Printer, ArrowLeft, CheckCircle2, PackageCheck, Star, Lock,
  Mail as MailIcon, Loader2, PieChart, Percent, Archive,
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar } from "recharts";
import {
  fetchProducts, insertProduct, updateProductRow, deleteProductRow,
  fetchOrders, insertOrder, updateOrderStatusRow, seedIfEmpty,
} from "./supabaseClient.js";

const displayFont = "'Poppins', sans-serif";
const bodyFont = "'Inter', sans-serif";

/* ---------------------------------- Mock data ---------------------------------- */

const CATEGORIES = ["Groceries", "Beverages", "Snacks", "Household", "Personal Care"];

const seedProducts = () => [
  { id: "P001", barcode: "8901030895551", name: "Basmati Rice 5kg", category: "Groceries", price: 1450, cost: 1100, stock: 42, threshold: 10, color: "bg-amber-100 text-amber-700", specs: "Premium long-grain basmati rice, 5kg pack, aged for extra aroma. Goes well with Cooking Oil for daily cooking." },
  { id: "P002", barcode: "8901030895568", name: "Cooking Oil 1L", category: "Groceries", price: 620, cost: 480, stock: 8, threshold: 10, color: "bg-yellow-100 text-yellow-700", specs: "1 litre refined cooking oil, cholesterol-free, suitable for frying and daily cooking." },
  { id: "P003", barcode: "8901030895575", name: "Green Tea Box", category: "Beverages", price: 380, cost: 260, stock: 60, threshold: 15, color: "bg-emerald-100 text-emerald-700", specs: "25 tea bags per box, natural green tea leaves, no added sugar. Good with a light snack." },
  { id: "P004", barcode: "8901030895582", name: "Potato Chips 150g", category: "Snacks", price: 150, cost: 95, stock: 5, threshold: 12, color: "bg-orange-100 text-orange-700", specs: "150g crispy salted potato chips, resealable pack, great with Orange Juice." },
  { id: "P005", barcode: "8901030895599", name: "Dish Wash Liquid", category: "Household", price: 275, cost: 190, stock: 30, threshold: 10, color: "bg-cyan-100 text-cyan-700", specs: "500ml concentrated dish wash liquid, lemon fragrance, cuts grease effectively." },
  { id: "P006", barcode: "8901030895605", name: "Shampoo 200ml", category: "Personal Care", price: 495, cost: 340, stock: 3, threshold: 8, color: "bg-pink-100 text-pink-700", specs: "200ml anti-dandruff shampoo, suitable for daily use, dermatologically tested." },
  { id: "P007", barcode: "8901030895612", name: "Orange Juice 1L", category: "Beverages", price: 320, cost: 210, stock: 25, threshold: 10, color: "bg-amber-100 text-amber-700", specs: "1 litre 100% orange juice, no added preservatives, rich in Vitamin C." },
  { id: "P008", barcode: "8901030895629", name: "Whole Wheat Bread", category: "Groceries", price: 180, cost: 120, stock: 18, threshold: 10, color: "bg-yellow-100 text-yellow-700", specs: "400g whole wheat bread loaf, freshly baked daily, no added sugar." },
];

const seedCustomers = () => [
  { id: "C001", name: "Ayesha Khan", phone: "0301-2345678", email: "ayesha.k@mail.com", orders: 14, spent: 48200, lastOrder: "2026-07-10" },
  { id: "C002", name: "Bilal Ahmed", phone: "0322-8871234", email: "bilal.a@mail.com", orders: 6, spent: 19850, lastOrder: "2026-07-09" },
  { id: "C003", name: "Sara Malik", phone: "0345-1122334", email: "sara.m@mail.com", orders: 2, spent: 3400, lastOrder: "2026-06-28" },
  { id: "C004", name: "Usman Tariq", phone: "0333-9988776", email: "usman.t@mail.com", orders: 21, spent: 76500, lastOrder: "2026-07-12" },
  { id: "C005", name: "Hina Raza", phone: "0312-4455667", email: "hina.r@mail.com", orders: 1, spent: 1450, lastOrder: "2026-07-01" },
];

const STATUS_META = {
  pending: { label: "Pending", icon: Clock, cls: "bg-amber-50 text-amber-700 border-amber-200" },
  confirmed: { label: "Confirmed", icon: CheckCircle2, cls: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  delivered: { label: "Delivered", icon: PackageCheck, cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  cancelled: { label: "Cancelled", icon: XCircle, cls: "bg-red-50 text-red-700 border-red-200" },
};

const seedOrders = () => [
  { id: "ORD-1042", customer: "Usman Tariq", items: [{ name: "Basmati Rice 5kg", qty: 2 }, { name: "Cooking Oil 1L", qty: 1 }], total: 3520, status: "pending", date: "2026-07-13 10:22", channel: "Store" },
  { id: "ORD-1041", customer: "Ayesha Khan", items: [{ name: "Green Tea Box", qty: 3 }], total: 1140, status: "confirmed", date: "2026-07-13 09:05", channel: "WhatsApp" },
  { id: "ORD-1040", customer: "Bilal Ahmed", items: [{ name: "Shampoo 200ml", qty: 1 }, { name: "Dish Wash Liquid", qty: 2 }], total: 1045, status: "delivered", date: "2026-07-12 18:40", channel: "Store" },
  { id: "ORD-1039", customer: "Sara Malik", items: [{ name: "Orange Juice 1L", qty: 2 }], total: 640, status: "delivered", date: "2026-07-12 14:12", channel: "WhatsApp" },
  { id: "ORD-1038", customer: "Hina Raza", items: [{ name: "Potato Chips 150g", qty: 3 }], total: 450, status: "cancelled", date: "2026-07-11 16:50", channel: "Store" },
  { id: "ORD-1037", customer: "Usman Tariq", items: [{ name: "Whole Wheat Bread", qty: 2 }], total: 360, status: "delivered", date: "2026-07-11 08:30", channel: "Store" },
];

const seedCampaigns = () => [
  { id: "CMP-01", name: "Weekend Grocery Sale", channel: "WhatsApp", sent: 1200, opened: 940, clicked: 310, status: "Active" },
  { id: "CMP-02", name: "New Customer Welcome", channel: "Email", sent: 850, opened: 520, clicked: 140, status: "Active" },
  { id: "CMP-03", name: "Low Stock Restock Alert", channel: "SMS", sent: 300, opened: 300, clicked: 60, status: "Completed" },
  { id: "CMP-04", name: "Eid Special Offers", channel: "WhatsApp", sent: 2000, opened: 1610, clicked: 705, status: "Scheduled" },
];

const salesTrend = [
  { day: "Mon", sales: 18500 }, { day: "Tue", sales: 21200 }, { day: "Wed", sales: 19800 },
  { day: "Thu", sales: 24300 }, { day: "Fri", sales: 28900 }, { day: "Sat", sales: 33100 }, { day: "Sun", sales: 26700 },
];

function genId(prefix) {
  return prefix + "-" + Math.random().toString(36).slice(2, 7).toUpperCase();
}

function money(n) {
  return "Rs " + Math.round(n || 0).toLocaleString("en-US");
}

function todayLabel() {
  return new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

/* ---------------------------------- Shared UI primitives ---------------------------------- */

function Button({ children, variant = "primary", size = "md", icon: Icon, className = "", ...props }) {
  const base = "inline-flex items-center justify-center gap-1.5 font-semibold rounded-xl transition active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100 whitespace-nowrap";
  const sizes = { sm: "text-xs px-3 py-1.5", md: "text-sm px-4 py-2.5", lg: "text-sm px-5 py-3" };
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-600/20",
    secondary: "bg-white text-slate-700 border border-slate-200 hover:border-indigo-300 hover:text-indigo-600",
    success: "bg-green-500 text-white hover:bg-green-600 shadow-sm shadow-green-500/20",
    danger: "bg-white text-red-600 border border-red-200 hover:bg-red-50",
    ghost: "text-slate-500 hover:bg-slate-100",
    glassOutline: "bg-white/20 text-white border border-white/30 backdrop-blur-md hover:bg-white/30",
    glassSolid: "bg-white text-indigo-700 hover:bg-slate-50",
  };
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
      {Icon && <Icon size={size === "sm" ? 13 : 15} />}
      {children}
    </button>
  );
}

function Card({ children, className = "", noPad = false, style }) {
  return (
    <div style={style} className={`bg-white rounded-xl border border-slate-100 shadow-sm ${noPad ? "" : "p-5"} ${className}`}>
      {children}
    </div>
  );
}

function Badge({ children, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-600",
    indigo: "bg-indigo-50 text-indigo-700",
    green: "bg-green-50 text-green-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
  };
  return <span className={`text-[11px] font-semibold px-2 py-1 rounded-lg ${tones[tone]}`}>{children}</span>;
}

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.pending;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg border ${meta.cls}`}>
      <Icon size={11} /> {meta.label}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, delta, tone = "indigo" }) {
  const tones = {
    indigo: "bg-indigo-50 text-indigo-600",
    green: "bg-green-50 text-green-600",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-600",
  };
  return (
    <Card className="flex items-start justify-between">
      <div>
        <div className="text-xs font-medium text-slate-500 mb-1.5">{label}</div>
        <div className="text-2xl font-bold text-slate-900" style={{ fontFamily: displayFont }}>{value}</div>
        {delta && (
          <div className={`flex items-center gap-1 mt-2 text-xs font-semibold ${delta.startsWith("-") ? "text-red-500" : "text-green-600"}`}>
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

function Drawer({ open, onClose, title, children, width = 420 }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[200]">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div
        className="absolute top-0 right-0 bottom-0 bg-white shadow-2xl overflow-y-auto animate-drawer-in"
        style={{ width: "92%", maxWidth: width }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <h3 className="font-bold text-slate-900" style={{ fontFamily: displayFont }}>{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400">
            <X size={17} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function Modal({ open, onClose, title, children, width = 460 }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full animate-modal-in max-h-[88vh] overflow-y-auto" style={{ maxWidth: width }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <h3 className="font-bold text-slate-900" style={{ fontFamily: displayFont }}>{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400">
            <X size={17} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="mb-3.5">
      <label className="text-xs font-semibold text-slate-500 mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition text-slate-800";

function EmptyState({ icon: Icon, title, note }) {
  return (
    <div className="text-center py-14 px-5">
      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
        <Icon size={20} />
      </div>
      <div className="text-sm font-semibold text-slate-700">{title}</div>
      {note && <div className="text-xs text-slate-400 mt-1">{note}</div>}
    </div>
  );
}

/* ---------------------------------- Landing screen (glass) ---------------------------------- */

function LandingScreen({ onLogin, onBrowseStore }) {
  return (
    <div className="min-h-screen w-full relative overflow-hidden bg-slate-50" style={{ fontFamily: bodyFont }}>
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-indigo-500 to-green-500 opacity-95" />
      <div className="absolute -top-32 -left-20 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute -bottom-40 -right-10 w-[28rem] h-[28rem] rounded-full bg-green-300/20 blur-3xl" />

      <div className="relative max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2 text-white font-bold text-lg" style={{ fontFamily: displayFont }}>
          <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
            <Sparkles size={18} />
          </div>
          AB OS
        </div>
        <div className="hidden sm:flex items-center gap-6 text-sm text-white/90 font-medium">
          <span>Product</span>
          <span>Pricing</span>
          <span>Support</span>
        </div>
        <Button variant="glassOutline" size="sm" onClick={onLogin}>
          Sign in
        </Button>
      </div>

      <div className="relative max-w-6xl mx-auto px-6 pt-10 pb-24 grid lg:grid-cols-2 gap-10 items-center">
        <div className="text-white">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md mb-5">
            <Star size={12} className="text-green-300" /> All-in-one business automation
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold leading-[1.1] mb-5" style={{ fontFamily: displayFont }}>
            Run your whole shop from one clean dashboard.
          </h1>
          <p className="text-white/90 text-base max-w-md mb-8">
            Orders, inventory, POS billing, customers, and marketing — in one fast, uncluttered workspace built for small business teams.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" variant="glassSolid" icon={ArrowRight} onClick={onLogin}>
              Open Admin Dashboard
            </Button>
            <Button size="lg" variant="glassOutline" icon={ShoppingBag} onClick={onBrowseStore}>
              Browse as Customer
            </Button>
          </div>
        </div>

        <div className="relative">
          <div className="rounded-3xl p-6 backdrop-blur-2xl bg-white/20 border border-white/25 shadow-2xl">
            <div className="rounded-2xl bg-white/95 p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-slate-400">Today's overview</span>
                <span className="text-[10px] font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Live</span>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="text-[10px] text-slate-400 font-medium mb-1">Sales</div>
                  <div className="text-lg font-bold text-slate-900" style={{ fontFamily: displayFont }}>Rs 33,100</div>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="text-[10px] text-slate-400 font-medium mb-1">Orders</div>
                  <div className="text-lg font-bold text-slate-900" style={{ fontFamily: displayFont }}>48</div>
                </div>
              </div>
              <div className="h-24">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salesTrend}>
                    <defs>
                      <linearGradient id="landingGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4F46E5" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#4F46E5" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="sales" stroke="#4F46E5" strokeWidth={2} fill="url(#landingGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------- Login screen (glass) ---------------------------------- */

function LoginScreen({ onBack, onLoginAs }) {
  const [role, setRole] = useState("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="min-h-screen w-full relative overflow-hidden bg-slate-50 flex items-center justify-center p-5" style={{ fontFamily: bodyFont }}>
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-indigo-500 to-green-500" />
      <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute -bottom-32 -left-16 w-96 h-96 rounded-full bg-green-300/20 blur-3xl" />

      <div className="relative w-full max-w-sm rounded-3xl backdrop-blur-2xl bg-white/20 border border-white/25 shadow-2xl p-2">
        <div className="rounded-[20px] bg-white/90 backdrop-blur-xl p-7">
          <button onClick={onBack} className="flex items-center gap-1 text-xs font-semibold text-slate-400 mb-5 hover:text-slate-600">
            <ArrowLeft size={13} /> Back
          </button>
          <div className="w-11 h-11 rounded-2xl bg-indigo-600 flex items-center justify-center text-white mb-4">
            <Lock size={18} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-1" style={{ fontFamily: displayFont }}>Welcome back</h2>
          <p className="text-xs text-slate-500 mb-5">Sign in to continue to AB OS.</p>

          <div className="flex gap-1.5 mb-5 bg-slate-100 p-1 rounded-xl">
            {[{ key: "admin", label: "Admin" }, { key: "customer", label: "Customer" }].map((r) => (
              <button
                key={r.key}
                onClick={() => setRole(r.key)}
                className={`flex-1 text-xs font-semibold py-2 rounded-lg transition ${
                  role === r.key ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <Field label="Email address">
            <div className="relative">
              <MailIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@business.com" className={`${inputCls} pl-9`} />
            </div>
          </Field>
          <Field label="Password">
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="••••••••" className={`${inputCls} pl-9`} />
            </div>
          </Field>

          <Button className="w-full mt-2" size="lg" onClick={() => onLoginAs(role)}>
            Sign in as {role === "admin" ? "Admin" : "Customer"}
          </Button>
          <p className="text-[11px] text-center text-slate-400 mt-4">Demo prototype — any email &amp; password works.</p>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------- Admin shell: sidebar + topbar ---------------------------------- */

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "orders", label: "Orders", icon: ShoppingCart },
  { key: "inventory", label: "Inventory", icon: Package },
  { key: "customers", label: "Customers", icon: Users },
  { key: "pos", label: "POS / Retail", icon: Barcode },
  { key: "accounting", label: "Accounting", icon: Wallet },
  { key: "insights", label: "Business Intelligence", icon: PieChart },
  { key: "marketing", label: "Marketing", icon: Megaphone },
  { key: "assistant", label: "AI Assistant", icon: Bot },
];

function Sidebar({ active, onSelect, open, onClose, lowStockCount, onLogout, onGoStore }) {
  return (
    <>
      {open && <div className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden" onClick={onClose} />}
      <aside
        className={`fixed top-0 left-0 bottom-0 w-64 bg-white border-r border-slate-100 z-50 flex flex-col transition-transform lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-2 px-5 py-5 font-bold text-slate-900" style={{ fontFamily: displayFont }}>
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shrink-0">
            <Sparkles size={15} />
          </div>
          AB OS
        </div>
        <nav className="flex-1 overflow-y-auto px-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = active === item.key;
            const badge = item.key === "inventory" ? lowStockCount : 0;
            return (
              <button
                key={item.key}
                onClick={() => { onSelect(item.key); onClose(); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                  isActive ? "bg-indigo-50 text-indigo-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                }`}
              >
                <item.icon size={17} className="shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
                {badge > 0 && (
                  <span className="text-[10px] font-bold bg-red-500 text-white min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center">
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t border-slate-100 space-y-1">
          <button onClick={onGoStore} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-indigo-600">
            <ShoppingBag size={17} /> View store
          </button>
          <button onClick={onLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-red-600">
            <LogOut size={17} /> Log out
          </button>
        </div>
      </aside>
    </>
  );
}

function Topbar({ title, onMenuClick, notifCount, onNotifClick, notifOpen, notifications }) {
  return (
    <div className="sticky top-0 z-30 bg-slate-50/90 backdrop-blur-sm border-b border-slate-100">
      <div className="flex items-center gap-3 px-4 sm:px-6 py-3.5">
        <button onClick={onMenuClick} className="lg:hidden w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
          <Menu size={17} />
        </button>
        <h1 className="font-bold text-slate-900 text-lg hidden sm:block shrink-0" style={{ fontFamily: displayFont }}>{title}</h1>
        <div className="flex-1 max-w-md relative hidden md:block">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input placeholder="Search orders, products, customers…" className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition" />
        </div>
        <div className="flex-1 sm:flex-none" />
        <div className="relative">
          <button onClick={onNotifClick} className="relative w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
            <Bell size={16} />
            {notifCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                {notifCount}
              </span>
            )}
          </button>
          {notifOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl border border-slate-100 shadow-xl overflow-hidden">
              <div className="px-4 py-3 text-xs font-bold text-slate-700 border-b border-slate-100">Notifications</div>
              {notifications.length === 0 ? (
                <div className="px-4 py-6 text-xs text-slate-400 text-center">You're all caught up.</div>
              ) : (
                notifications.map((n, i) => (
                  <div key={i} className="px-4 py-2.5 text-xs border-b border-slate-50 last:border-0">
                    <div className="font-semibold text-slate-700">{n.title}</div>
                    <div className="text-slate-400">{n.note}</div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200 shrink-0">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600 to-green-500 flex items-center justify-center text-white text-xs font-bold">
            SA
          </div>
          <div className="hidden sm:block leading-tight">
            <div className="text-xs font-semibold text-slate-700">Store Admin</div>
            <div className="text-[10px] text-slate-400">Owner</div>
          </div>
          <ChevronDown size={14} className="text-slate-400 hidden sm:block" />
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------- Dashboard view ---------------------------------- */

function DashboardView({ orders, products, customers, onGoTo }) {
  const totalSales = useMemo(() => orders.filter((o) => o.status !== "cancelled").reduce((s, o) => s + o.total, 0), [orders]);
  const lowStock = useMemo(() => products.filter((p) => p.stock <= p.threshold), [products]);
  const recentOrders = orders.slice(0, 5);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: displayFont }}>Good to see you 👋</h2>
        <p className="text-sm text-slate-500">{todayLabel()} — here's how the business is doing.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Wallet} label="Total Sales" value={money(totalSales)} delta="+12.4%" tone="indigo" />
        <StatCard icon={ShoppingCart} label="Orders" value={orders.length} delta="+5" tone="green" />
        <StatCard icon={Users} label="Customers" value={customers.length} delta="+2" tone="indigo" />
        <StatCard icon={AlertTriangle} label="Low Stock Alerts" value={lowStock.length} delta={lowStock.length > 0 ? "Needs attention" : "All good"} tone="amber" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-900 text-sm" style={{ fontFamily: displayFont }}>Sales this week</h3>
            <Badge tone="green">+18.2% vs last week</Badge>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesTrend}>
                <defs>
                  <linearGradient id="dashGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4F46E5" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#4F46E5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip formatter={(v) => money(v)} contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 12 }} />
                <Area type="monotone" dataKey="sales" stroke="#4F46E5" strokeWidth={2.5} fill="url(#dashGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card noPad>
          <div className="flex items-center justify-between px-5 pt-5 mb-1">
            <h3 className="font-bold text-slate-900 text-sm" style={{ fontFamily: displayFont }}>Low stock</h3>
            <button onClick={() => onGoTo("inventory")} className="text-[11px] font-semibold text-indigo-600">View all</button>
          </div>
          {lowStock.length === 0 ? (
            <div className="px-5 py-8 text-xs text-slate-400 text-center">Everything is well stocked.</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {lowStock.slice(0, 5).map((p) => (
                <div key={p.id} className="flex items-center justify-between px-5 py-2.5">
                  <div>
                    <div className="text-xs font-semibold text-slate-700">{p.name}</div>
                    <div className="text-[10px] text-slate-400">{p.category}</div>
                  </div>
                  <Badge tone="red">{p.stock} left</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card noPad>
        <div className="flex items-center justify-between px-5 pt-5 mb-1">
          <h3 className="font-bold text-slate-900 text-sm" style={{ fontFamily: displayFont }}>Recent orders</h3>
          <button onClick={() => onGoTo("orders")} className="text-[11px] font-semibold text-indigo-600">View all</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm mt-2">
            <thead>
              <tr className="text-left text-[11px] text-slate-400 font-semibold uppercase tracking-wide">
                <th className="px-5 py-2 font-semibold">Order</th>
                <th className="px-5 py-2 font-semibold">Customer</th>
                <th className="px-5 py-2 font-semibold">Total</th>
                <th className="px-5 py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((o) => (
                <tr key={o.id} className="border-t border-slate-50 hover:bg-slate-50/70 transition">
                  <td className="px-5 py-3 font-semibold text-slate-800">{o.id}</td>
                  <td className="px-5 py-3 text-slate-600">{o.customer}</td>
                  <td className="px-5 py-3 text-slate-800 font-medium">{money(o.total)}</td>
                  <td className="px-5 py-3"><StatusBadge status={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* ---------------------------------- Orders view ---------------------------------- */

function OrdersView({ orders, onUpdateStatus }) {
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);

  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);
  const tabs = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "confirmed", label: "Confirmed" },
    { key: "delivered", label: "Delivered" },
    { key: "cancelled", label: "Cancelled" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: displayFont }}>Orders</h2>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" icon={Download}>Export</Button>
          <Button variant="secondary" size="sm" icon={Filter}>Filter</Button>
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`text-xs font-semibold px-3.5 py-2 rounded-xl whitespace-nowrap transition ${
              filter === t.key ? "bg-indigo-600 text-white" : "bg-white text-slate-500 border border-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Card noPad>
        {filtered.length === 0 ? (
          <EmptyState icon={ShoppingCart} title="No orders here" note="Orders matching this filter will show up here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] text-slate-400 font-semibold uppercase tracking-wide">
                  <th className="px-5 py-3">Order</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Channel</th>
                  <th className="px-5 py-3">Total</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o.id} className="border-t border-slate-50 hover:bg-slate-50/70 transition cursor-pointer" onClick={() => setSelected(o)}>
                    <td className="px-5 py-3.5 font-semibold text-slate-800">{o.id}</td>
                    <td className="px-5 py-3.5 text-slate-600">{o.customer}</td>
                    <td className="px-5 py-3.5"><Badge tone="slate">{o.channel}</Badge></td>
                    <td className="px-5 py-3.5 text-slate-800 font-medium">{money(o.total)}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={o.status} /></td>
                    <td className="px-5 py-3.5 text-slate-400 text-xs">{o.date}</td>
                    <td className="px-5 py-3.5 text-right">
                      <ChevronRight size={15} className="text-slate-300" />
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
              <span className="text-xs text-slate-400">{selected.date}</span>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-400 mb-1">Customer</div>
              <div className="text-sm font-semibold text-slate-800">{selected.customer}</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-400 mb-2">Items</div>
              <div className="space-y-2">
                {selected.items.map((it, i) => (
                  <div key={i} className="flex items-center justify-between text-sm bg-slate-50 rounded-lg px-3 py-2">
                    <span className="text-slate-700">{it.name}</span>
                    <span className="text-slate-500 font-medium">x{it.qty}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between text-sm font-bold pt-3 border-t border-slate-100">
              <span className="text-slate-800">Total</span>
              <span className="text-indigo-600">{money(selected.total)}</span>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-400 mb-2">Update status</div>
              <div className="grid grid-cols-2 gap-2">
                {Object.keys(STATUS_META).map((s) => (
                  <button
                    key={s}
                    onClick={() => { onUpdateStatus(selected.id, s); setSelected((sel) => ({ ...sel, status: s })); }}
                    className={`text-xs font-semibold px-3 py-2.5 rounded-xl border transition ${
                      selected.status === s ? STATUS_META[s].cls : "bg-white border-slate-200 text-slate-500 hover:border-indigo-300"
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

/* ---------------------------------- Inventory view ---------------------------------- */

function ProductForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(
    initial || { name: "", category: CATEGORIES[0], price: "", cost: "", stock: "", threshold: "10", barcode: "" }
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
      <div className="flex gap-2 mt-2">
        <Button variant="secondary" className="flex-1" onClick={onCancel}>Cancel</Button>
        <Button className="flex-1" onClick={() => onSave(form)}>Save product</Button>
      </div>
    </div>
  );
}

function InventoryView({ products, onAdd, onEdit, onDelete }) {
  const [modal, setModal] = useState(null); // { mode: 'add'|'edit', product }
  const [query, setQuery] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);

  const filtered = products.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()) || p.barcode.includes(query));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: displayFont }}>Inventory</h2>
        <Button icon={Plus} onClick={() => setModal({ mode: "add" })}>Add product</Button>
      </div>

      <div className="relative max-w-xs">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search products…" className={`${inputCls} pl-9`} />
      </div>

      <Card noPad>
        {filtered.length === 0 ? (
          <EmptyState icon={Package} title="No products found" note="Try a different search or add a new product." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] text-slate-400 font-semibold uppercase tracking-wide">
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
                  <tr key={p.id} className="border-t border-slate-50 hover:bg-slate-50/70 transition">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${p.color}`}>
                          {p.name.slice(0, 1)}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-800">{p.name}</div>
                          <div className="text-[11px] text-slate-400">{p.barcode}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">{p.category}</td>
                    <td className="px-5 py-3.5 text-slate-800 font-medium">{money(p.price)}</td>
                    <td className="px-5 py-3.5 text-slate-700">{p.stock} units</td>
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
                        <button onClick={() => setModal({ mode: "edit", product: p })} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => setConfirmDelete(p)} className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-slate-400 hover:text-red-500">
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
            <p className="text-sm text-slate-600 mb-5">
              Remove <span className="font-semibold text-slate-800">{confirmDelete.name}</span> from inventory? This can't be undone.
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

/* ---------------------------------- Customers view ---------------------------------- */

function CustomersView({ customers, orders }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const filtered = customers.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()) || c.phone.includes(query));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: displayFont }}>Customers</h2>
        <Button variant="secondary" size="sm" icon={Download}>Export list</Button>
      </div>

      <div className="relative max-w-xs">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search customers…" className={`${inputCls} pl-9`} />
      </div>

      <Card noPad>
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
              {filtered.map((c) => (
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
                  <td className="px-5 py-3.5 text-slate-700">{c.orders}</td>
                  <td className="px-5 py-3.5 text-slate-800 font-medium">{money(c.spent)}</td>
                  <td className="px-5 py-3.5 text-slate-400 text-xs">{c.lastOrder}</td>
                  <td className="px-5 py-3.5 text-right"><ChevronRight size={15} className="text-slate-300" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Drawer open={!!selected} onClose={() => setSelected(null)} title={selected?.name}>
        {selected && (
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
                <div className="text-lg font-bold text-slate-900">{selected.orders}</div>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <div className="text-[10px] text-slate-400 font-medium mb-1">Total spent</div>
                <div className="text-lg font-bold text-slate-900">{money(selected.spent)}</div>
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
        )}
      </Drawer>
    </div>
  );
}

/* ---------------------------------- Accounting view ---------------------------------- */

function AccountingView({ orders, products }) {
  const revenue = orders.filter((o) => o.status !== "cancelled").reduce((s, o) => s + o.total, 0);
  const cogsEstimate = revenue * 0.68;
  const profit = revenue - cogsEstimate;
  const inventoryValue = products.reduce((s, p) => s + p.cost * p.stock, 0);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: displayFont }}>Accounting overview</h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Wallet} label="Revenue (7d)" value={money(revenue)} tone="indigo" />
        <StatCard icon={TrendingDown} label="Cost of goods" value={money(cogsEstimate)} tone="amber" />
        <StatCard icon={TrendingUp} label="Estimated profit" value={money(profit)} tone="green" delta="+9.6%" />
        <StatCard icon={Package} label="Inventory value" value={money(inventoryValue)} tone="indigo" />
      </div>

      <Card>
        <h3 className="font-bold text-slate-900 text-sm mb-3" style={{ fontFamily: displayFont }}>Revenue vs cost — daily</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={salesTrend.map((d) => ({ ...d, cost: Math.round(d.sales * 0.68) }))}>
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip formatter={(v) => money(v)} contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 12 }} />
              <Bar dataKey="sales" fill="#4F46E5" radius={[6, 6, 0, 0]} name="Revenue" />
              <Bar dataKey="cost" fill="#22C55E" radius={[6, 6, 0, 0]} name="Cost" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card noPad>
        <h3 className="font-bold text-slate-900 text-sm px-5 pt-5 mb-1" style={{ fontFamily: displayFont }}>Recent transactions</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm mt-2">
            <thead>
              <tr className="text-left text-[11px] text-slate-400 font-semibold uppercase tracking-wide">
                <th className="px-5 py-2">Order</th>
                <th className="px-5 py-2">Amount</th>
                <th className="px-5 py-2">Type</th>
                <th className="px-5 py-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 6).map((o) => (
                <tr key={o.id} className="border-t border-slate-50">
                  <td className="px-5 py-3 font-semibold text-slate-800">{o.id}</td>
                  <td className={`px-5 py-3 font-medium ${o.status === "cancelled" ? "text-red-500" : "text-green-600"}`}>
                    {o.status === "cancelled" ? "—" : "+" + money(o.total)}
                  </td>
                  <td className="px-5 py-3 text-slate-500">Sale</td>
                  <td className="px-5 py-3 text-slate-400 text-xs">{o.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* ---------------------------------- Business Intelligence view ---------------------------------- */

/**
 * Aggregates per-product performance from the order history: units sold,
 * revenue, profit margin, and capital tied up in unsold stock. Matches by
 * product name since not every order path stores a productId.
 */
function computeProductInsights(products, orders) {
  const soldQty = {};
  orders.forEach((o) => {
    if (o.status === "cancelled") return;
    o.items.forEach((it) => {
      soldQty[it.name] = (soldQty[it.name] || 0) + it.qty;
    });
  });

  return products.map((p) => {
    const unitsSold = soldQty[p.name] || 0;
    const marginRs = p.price - p.cost;
    const marginPct = p.price > 0 ? (marginRs / p.price) * 100 : 0;
    const revenue = unitsSold * p.price;
    const profitContribution = unitsSold * marginRs;
    const capitalTiedUp = p.cost * p.stock;
    return { ...p, unitsSold, marginRs, marginPct, revenue, profitContribution, capitalTiedUp };
  });
}

function marginTone(pct) {
  if (pct >= 40) return "green";
  if (pct >= 20) return "amber";
  return "red";
}

function BusinessIntelligenceView({ orders, products }) {
  const insights = useMemo(() => computeProductInsights(products, orders), [products, orders]);

  const bestSellers = useMemo(() => [...insights].sort((a, b) => b.unitsSold - a.unitsSold).slice(0, 5), [insights]);
  const byMargin = useMemo(() => [...insights].sort((a, b) => b.marginPct - a.marginPct), [insights]);
  const deadStock = useMemo(
    () => insights.filter((p) => p.unitsSold === 0 && p.stock > 0).sort((a, b) => b.capitalTiedUp - a.capitalTiedUp),
    [insights]
  );

  const totalProfit = insights.reduce((s, p) => s + p.profitContribution, 0);
  const avgMarginPct = insights.length ? insights.reduce((s, p) => s + p.marginPct, 0) / insights.length : 0;
  const deadStockValue = deadStock.reduce((s, p) => s + p.capitalTiedUp, 0);
  const topSellerUnits = bestSellers[0]?.unitsSold || 1;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: displayFont }}>Business Intelligence</h2>
        <p className="text-sm text-slate-500">Profit, best-sellers, and dead stock — computed from your live orders and inventory.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={TrendingUp} label="Profit contribution" value={money(totalProfit)} tone="green" />
        <StatCard icon={Percent} label="Avg. margin" value={`${avgMarginPct.toFixed(1)}%`} tone="indigo" />
        <StatCard icon={Star} label="Best seller" value={bestSellers[0]?.name || "—"} tone="amber" />
        <StatCard
          icon={Archive}
          label="Dead stock items"
          value={deadStock.length}
          delta={deadStock.length > 0 ? `${money(deadStockValue)} tied up` : "All items moving"}
          tone="red"
        />
      </div>

      <Card noPad>
        <div className="flex items-center justify-between px-5 pt-5 mb-3">
          <h3 className="font-bold text-slate-900 text-sm" style={{ fontFamily: displayFont }}>Best-selling products</h3>
          <Badge tone="indigo">By units sold</Badge>
        </div>
        {bestSellers.every((p) => p.unitsSold === 0) ? (
          <EmptyState icon={TrendingUp} title="No sales recorded yet" note="Best-sellers will show up here once orders come in." />
        ) : (
          <div className="px-5 pb-5 space-y-3">
            {bestSellers.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 text-[11px] font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-800 truncate">{p.name}</span>
                    <span className="text-xs font-semibold text-slate-500 shrink-0 ml-2">{p.unitsSold} sold · {money(p.revenue)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${Math.max(4, (p.unitsSold / topSellerUnits) * 100)}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card noPad>
        <h3 className="font-bold text-slate-900 text-sm px-5 pt-5 mb-1" style={{ fontFamily: displayFont }}>Profit &amp; margin per product</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm mt-2">
            <thead>
              <tr className="text-left text-[11px] text-slate-400 font-semibold uppercase tracking-wide">
                <th className="px-5 py-2">Product</th>
                <th className="px-5 py-2">Price</th>
                <th className="px-5 py-2">Cost</th>
                <th className="px-5 py-2">Margin</th>
                <th className="px-5 py-2">Units sold</th>
                <th className="px-5 py-2">Profit earned</th>
              </tr>
            </thead>
            <tbody>
              {byMargin.map((p) => (
                <tr key={p.id} className="border-t border-slate-50">
                  <td className="px-5 py-3 font-semibold text-slate-800">{p.name}</td>
                  <td className="px-5 py-3 text-slate-600">{money(p.price)}</td>
                  <td className="px-5 py-3 text-slate-400">{money(p.cost)}</td>
                  <td className="px-5 py-3">
                    <Badge tone={marginTone(p.marginPct)}>{money(p.marginRs)} · {p.marginPct.toFixed(0)}%</Badge>
                  </td>
                  <td className="px-5 py-3 text-slate-600">{p.unitsSold}</td>
                  <td className="px-5 py-3 font-medium text-slate-800">{money(p.profitContribution)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card noPad>
        <div className="flex items-center justify-between px-5 pt-5 mb-1">
          <h3 className="font-bold text-slate-900 text-sm" style={{ fontFamily: displayFont }}>Dead stock report</h3>
          {deadStock.length > 0 && <Badge tone="red">{money(deadStockValue)} tied up</Badge>}
        </div>
        {deadStock.length === 0 ? (
          <EmptyState icon={Archive} title="No dead stock" note="Every product in inventory has sold at least once." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm mt-2">
              <thead>
                <tr className="text-left text-[11px] text-slate-400 font-semibold uppercase tracking-wide">
                  <th className="px-5 py-2">Product</th>
                  <th className="px-5 py-2">Category</th>
                  <th className="px-5 py-2">Stock on hand</th>
                  <th className="px-5 py-2">Capital tied up</th>
                </tr>
              </thead>
              <tbody>
                {deadStock.map((p) => (
                  <tr key={p.id} className="border-t border-slate-50">
                    <td className="px-5 py-3 font-semibold text-slate-800">{p.name}</td>
                    <td className="px-5 py-3 text-slate-500">{p.category}</td>
                    <td className="px-5 py-3 text-slate-600">{p.stock} units</td>
                    <td className="px-5 py-3 font-medium text-red-500">{money(p.capitalTiedUp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ---------------------------------- POS / Retail view ---------------------------------- */

function POSView({ products, onCheckout }) {
  const [barcodeInput, setBarcodeInput] = useState("");
  const [cart, setCart] = useState([]); // [{productId, qty}]
  const [scanMsg, setScanMsg] = useState(null);
  const [invoice, setInvoice] = useState(null);
  const scanRef = useRef(null);

  const addToCart = (product) => {
    setCart((c) => {
      const existing = c.find((it) => it.productId === product.id);
      if (existing) return c.map((it) => (it.productId === product.id ? { ...it, qty: it.qty + 1 } : it));
      return [...c, { productId: product.id, qty: 1 }];
    });
  };

  const handleScan = (e) => {
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

  const updateQty = (id, delta) => {
    setCart((c) => c.map((it) => (it.productId === id ? { ...it, qty: Math.max(1, it.qty + delta) } : it)).filter((it) => it.qty > 0));
  };
  const removeLine = (id) => setCart((c) => c.filter((it) => it.productId !== id));

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
              {invoice.lines.map((l) => (
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

/* ---------------------------------- Marketing view ---------------------------------- */

const CHANNEL_META = {
  SMS: { icon: Smartphone, cls: "bg-amber-50 text-amber-600" },
  Email: { icon: Mail, cls: "bg-indigo-50 text-indigo-600" },
  WhatsApp: { icon: MessageSquare, cls: "bg-green-50 text-green-600" },
};

function MarketingView({ campaigns }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: displayFont }}>Marketing campaigns</h2>
        <Button icon={Plus}>New campaign</Button>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard icon={Send} label="Total sent" value={campaigns.reduce((s, c) => s + c.sent, 0).toLocaleString()} tone="indigo" />
        <StatCard icon={Eye} label="Total opened" value={campaigns.reduce((s, c) => s + c.opened, 0).toLocaleString()} tone="green" />
        <StatCard icon={MousePointerClick} label="Total clicks" value={campaigns.reduce((s, c) => s + c.clicked, 0).toLocaleString()} tone="amber" />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {campaigns.map((c) => {
          const meta = CHANNEL_META[c.channel];
          const openRate = Math.round((c.opened / c.sent) * 100);
          const clickRate = Math.round((c.clicked / c.sent) * 100);
          return (
            <Card key={c.id}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${meta.cls}`}>
                    <meta.icon size={16} />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800 text-sm">{c.name}</div>
                    <div className="text-[11px] text-slate-400">{c.channel} campaign</div>
                  </div>
                </div>
                <Badge tone={c.status === "Active" ? "green" : c.status === "Scheduled" ? "amber" : "slate"}>{c.status}</Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="rounded-lg bg-slate-50 p-2.5 text-center">
                  <div className="text-sm font-bold text-slate-800">{c.sent.toLocaleString()}</div>
                  <div className="text-[10px] text-slate-400">Sent</div>
                </div>
                <div className="rounded-lg bg-slate-50 p-2.5 text-center">
                  <div className="text-sm font-bold text-slate-800">{openRate}%</div>
                  <div className="text-[10px] text-slate-400">Opened</div>
                </div>
                <div className="rounded-lg bg-slate-50 p-2.5 text-center">
                  <div className="text-sm font-bold text-slate-800">{clickRate}%</div>
                  <div className="text-[10px] text-slate-400">Clicked</div>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${openRate}%` }} />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------------------------- AI Assistant view ---------------------------------- */

/**
 * Calls the live Claude API with a system prompt grounded in the current
 * store data, so the assistant answers using real orders/inventory instead
 * of canned keyword matches.
 */
async function callClaude(systemPrompt, history, userText) {
  const apiMessages = [
    ...history
      .filter((m) => m.role === "user" || m.role === "bot")
      .map((m) => ({ role: m.role === "bot" ? "assistant" : "user", content: m.text })),
    { role: "user", content: userText },
  ];

  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemPrompt,
      messages: apiMessages,
    }),
  });

  if (!response.ok) throw new Error(`API error ${response.status}`);
  const data = await response.json();
  const text = (data.content || [])
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
  return text || "I couldn't find a good answer for that — try rephrasing?";
}

/**
 * The assistant is instructed to always respond with a JSON envelope:
 * { "reply": "text to show the user", "action": null | { "type": "...", ...fields } }
 * This safely parses that, stripping markdown code fences if present,
 * and falls back to treating the raw text as a plain reply if parsing fails.
 */
function parseAssistantReply(raw) {
  let cleaned = (raw || "").trim();
  cleaned = cleaned.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "");
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed === "object" && "reply" in parsed) {
      return { reply: parsed.reply, action: parsed.action || null };
    }
  } catch (e) {
    // not JSON — treat as plain text
  }
  return { reply: raw, action: null };
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl rounded-bl-md w-fit">
      <Loader2 size={13} className="animate-spin text-indigo-500" />
      <span className="text-xs text-slate-400">Thinking…</span>
    </div>
  );
}

function AssistantView({ orders, products, onAddProduct, onEditProduct, onDeleteProduct, onUpdateStatus }) {
  const [messages, setMessages] = useState([
    { role: "bot", text: "Hi! I'm your store's AI assistant — I'm connected live to your orders and inventory. I can also add/edit products or update order statuses for you, just ask." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const suggestions = ["Show today's sales", "Low stock items", "Recent orders", "Add a new product"];
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const send = async (text) => {
    const q = (text ?? input).trim();
    if (!q || loading) return;
    const history = messages;
    setMessages((m) => [...m, { role: "user", text: q }]);
    setInput("");
    setLoading(true);

    const storeContext = {
      totalOrders: orders.length,
      totalSales: orders.filter((o) => o.status !== "cancelled").reduce((s, o) => s + o.total, 0),
      pendingOrders: orders.filter((o) => o.status === "pending").map((o) => ({ id: o.id, customer: o.customer, total: o.total })),
      recentOrders: orders.slice(0, 6).map((o) => ({ id: o.id, customer: o.customer, total: o.total, status: o.status, channel: o.channel, date: o.date })),
      lowStockProducts: products.filter((p) => p.stock <= p.threshold).map((p) => ({ id: p.id, name: p.name, stock: p.stock, threshold: p.threshold })),
      allProducts: products.map((p) => ({ id: p.id, name: p.name, category: p.category, price: p.price, cost: p.cost, stock: p.stock, threshold: p.threshold })),
    };

    const systemPrompt = `You are the internal AI assistant inside a small retail store's admin dashboard (AB OS). You help the store owner in two ways:
1. Answer questions briefly (2-4 sentences, or a short list) using ONLY the live store data given below as JSON.
2. Perform real management actions when asked: adding a new product, editing a product's price/stock/etc, deleting a product, or updating an order's status. When the owner asks for one of these, collect any missing required fields by asking ONE question at a time, then emit the action once you have everything.

Amounts are in Pakistani Rupees (Rs). If a question isn't covered by this data, say you don't have that information rather than guessing.

Always write the "reply" text in Roman Urdu (Urdu written in plain English/Latin letters, e.g. "aapki sales acchi ja rahi hain"). Do not mix in English words unless it's a product name, number, or a term with no natural Urdu equivalent. Do not reply in Urdu script or in English.

CRITICAL OUTPUT FORMAT — you must ALWAYS respond with ONLY a raw JSON object (no markdown fences, no extra text), matching exactly this shape:
{"reply": "message in Roman Urdu", "action": null}

When ready to perform a management action, set "action" to one of these shapes instead:
- {"type": "add_product", "name": "...", "category": "...", "price": 100, "cost": 70, "stock": 20, "threshold": 10, "barcode": ""}
- {"type": "edit_product", "productId": "P001", "fields": {"price": 120, "stock": 15}}
- {"type": "delete_product", "productId": "P001"}
- {"type": "update_order_status", "orderId": "ORD-1042", "status": "confirmed"}

Only emit an action once you have the required fields (for add_product: at least name, category, price, stock). Category must be one of: ${JSON.stringify(CATEGORIES)}. Status must be one of: pending, confirmed, delivered, cancelled.

Store data:
${JSON.stringify(storeContext)}`;

    try {
      const raw = await callClaude(systemPrompt, history, q);
      const { reply, action } = parseAssistantReply(raw);
      setMessages((m) => [...m, { role: "bot", text: reply }]);

      if (action) {
        if (action.type === "add_product" && action.name) {
          onAddProduct({
            name: action.name, category: action.category || CATEGORIES[0], price: action.price,
            cost: action.cost, stock: action.stock, threshold: action.threshold, barcode: action.barcode,
          });
        } else if (action.type === "edit_product" && action.productId && action.fields) {
          const existing = products.find((p) => p.id === action.productId);
          onEditProduct(action.productId, { ...existing, ...action.fields });
        } else if (action.type === "delete_product" && action.productId) {
          onDeleteProduct(action.productId);
        } else if (action.type === "update_order_status" && action.orderId && action.status) {
          onUpdateStatus(action.orderId, action.status);
        }
      }
    } catch (err) {
      setMessages((m) => [...m, { role: "bot", text: "Sorry, I couldn't reach the assistant just now. Please try again in a moment." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: displayFont }}>AI Assistant</h2>
      <Card noPad className="flex flex-col" style={{ height: "80vh" }}>
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] px-4 py-2.5 text-sm rounded-2xl whitespace-pre-line ${
                m.role === "user" ? "bg-indigo-600 text-white rounded-br-md" : "bg-slate-50 text-slate-700 border border-slate-100 rounded-bl-md"
              }`}>
                {m.text}
              </div>
            </div>
          ))}
          {loading && <TypingDots />}
          <div ref={endRef} />
        </div>
        <div className="px-5 pb-3 flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button key={s} disabled={loading} onClick={() => send(s)} className="text-xs px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-slate-600 hover:border-indigo-300 disabled:opacity-40">
              {s}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 px-5 py-4 border-t border-slate-100">
          <input
            value={input}
            disabled={loading}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") send(); }}
            placeholder="Ask about sales, stock, or orders…"
            className={`${inputCls} flex-1 rounded-full disabled:opacity-60`}
          />
          <Button onClick={() => send()} disabled={loading}>
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          </Button>
        </div>
      </Card>
    </div>
  );
}

/* ---------------------------------- Customer store screen ---------------------------------- */

/* ---------------------------------- Customer AI assistant (storefront) ---------------------------------- */

function CustomerAssistantWidget({ products, placedOrders, onPlaceOrder }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "bot", text: "Hi! Ask me about products, specs, deals, or your order status — I can even take your order right here." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastOrderId, setLastOrderId] = useState(null);
  const suggestions = ["Is Basmati Rice available?", "Track my order", "I want to order rice", "Payment options"];
  const endRef = useRef(null);

  useEffect(() => { if (open) endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, open, loading]);

  const send = async (text) => {
    const q = (text ?? input).trim();
    if (!q || loading) return;
    const history = messages;
    setMessages((m) => [...m, { role: "user", text: q }]);
    setInput("");
    setLoading(true);

    const shopContext = {
      catalog: products.map((p) => ({ id: p.id, name: p.name, category: p.category, price: p.price, inStock: p.stock > 0, specs: p.specs })),
      customerOrders: placedOrders.map((o) => ({ id: o.id, status: o.status, total: o.total, items: o.items, date: o.date })),
      deliveryInfo: "Standard delivery takes 1-2 days within the city.",
      paymentInfo: "Cash on Delivery is accepted; bank transfer support is coming soon.",
      returnsInfo: "Report any order issue within 24 hours of delivery for support.",
    };

    const systemPrompt = `You are the friendly SALES + support assistant for AB Store, a small online grocery/essentials shop. You can do four things:
1. Answer questions about products, specs, prices, delivery, and payment using ONLY the catalog data below.
2. Proactively push sales: when a customer shows interest in a product, briefly mention one relevant add-on from the catalog (e.g. suggest Cooking Oil alongside Rice) — but never be pushy, one suggestion max per reply.
3. Track existing orders using the customerOrders data.
4. Take a NEW order end-to-end: when the customer wants to order something, figure out which product(s) and quantities from the conversation, then ask for their name, phone number, and delivery address ONE missing piece at a time if not yet given. Once you have product(s)+quantities AND name AND phone AND address, output the order action (see format below) so it gets placed for real — do not just say you placed it, you must include the action object.

Prices are in Pakistani Rupees (Rs). Never mention cost price, margins, or internal admin details.

Always write the "reply" text in Roman Urdu (Urdu written in plain English/Latin letters, e.g. "aapka order kal tak pahunch jayega"). Do not mix in English words unless it's a product name, number, or a term with no natural Urdu equivalent. Do not reply in Urdu script or in English.

CRITICAL OUTPUT FORMAT — you must ALWAYS respond with ONLY a raw JSON object (no markdown fences, no extra text), matching exactly this shape:
{"reply": "the message to show the customer in Roman Urdu", "action": null}

When you have everything needed to place an order (product ids + quantities + customer name + phone + address), instead set "action" to:
{"reply": "confirmation message in Roman Urdu mentioning what was ordered", "action": {"type": "place_order", "items": [{"productId": "P001", "qty": 2}], "customer": {"name": "...", "phone": "...", "address": "..."}}}

Only ever emit the place_order action ONCE you truly have all required fields — otherwise keep "action": null and ask for the missing piece in "reply".

Shop data:
${JSON.stringify(shopContext)}`;

    try {
      const raw = await callClaude(systemPrompt, history, q);
      const { reply, action } = parseAssistantReply(raw);
      setMessages((m) => [...m, { role: "bot", text: reply }]);

      if (action && action.type === "place_order" && Array.isArray(action.items) && action.items.length) {
        const lines = action.items
          .map((it) => {
            const product = products.find((p) => p.id === it.productId);
            return product ? { productId: product.id, name: product.name, qty: Number(it.qty) || 1, price: product.price } : null;
          })
          .filter(Boolean);
        if (lines.length) {
          const total = lines.reduce((s, l) => s + l.price * l.qty, 0);
          const order = {
            id: genId("ORD"),
            customer: action.customer?.name || "Website customer",
            phone: action.customer?.phone || "",
            address: action.customer?.address || "",
            channel: "AI Assistant",
            items: lines.map((l) => ({ productId: l.productId, name: l.name, qty: l.qty })),
            total,
            status: "pending",
            date: new Date().toLocaleString(),
          };
          onPlaceOrder(order);
          setLastOrderId(order.id);
        }
      }
    } catch (err) {
      setMessages((m) => [...m, { role: "bot", text: "Sorry, I'm having trouble replying right now — please try again in a moment." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 flex items-center justify-center hover:bg-indigo-700 transition"
      >
        {open ? <X size={22} /> : <Bot size={22} />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-40 w-[94%] max-w-md bg-white rounded-2xl border border-slate-100 shadow-2xl flex flex-col overflow-hidden" style={{ height: "78vh", maxHeight: 680 }}>
          <div className="flex items-center gap-2 px-4 py-3.5 border-b border-slate-100 bg-indigo-600 text-white shrink-0">
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
              <Bot size={14} />
            </div>
            <div>
              <div className="text-sm font-bold" style={{ fontFamily: displayFont }}>Store Assistant</div>
              <div className="text-[10px] text-white/90">Usually replies instantly</div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[82%] px-3.5 py-2 text-sm rounded-2xl ${
                  m.role === "user" ? "bg-indigo-600 text-white rounded-br-md" : "bg-slate-50 text-slate-700 border border-slate-100 rounded-bl-md"
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-1 px-3.5 py-2 bg-slate-50 border border-slate-100 rounded-2xl rounded-bl-md w-fit">
                <Loader2 size={12} className="animate-spin text-indigo-500" />
                <span className="text-[10px] text-slate-400">Typing…</span>
              </div>
            )}
            {lastOrderId && (
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 w-fit">
                <CheckCircle2 size={12} /> Order {lastOrderId} placed!
              </div>
            )}
            <div ref={endRef} />
          </div>
          <div className="px-4 pb-2.5 flex flex-wrap gap-1.5 shrink-0">
            {suggestions.map((s) => (
              <button key={s} disabled={loading} onClick={() => send(s)} className="text-[10px] px-2.5 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-slate-600 hover:border-indigo-300 disabled:opacity-40">
                {s}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 px-4 py-3 border-t border-slate-100 shrink-0">
            <input
              value={input}
              disabled={loading}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") send(); }}
              placeholder="Type a message…"
              className={`${inputCls} flex-1 rounded-full text-sm py-2.5 disabled:opacity-60`}
            />
            <Button size="sm" onClick={() => send()} disabled={loading}>
              {loading ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

function StoreScreen({ products, onBack, onLogin, placedOrders, onPlaceOrder }) {
  const [cart, setCart] = useState([]); // {productId, qty}
  const [cartOpen, setCartOpen] = useState(false);
  const [view, setView] = useState("browse"); // browse | tracking
  const [category, setCategory] = useState("All");
  const [placed, setPlaced] = useState(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", address: "" });

  const cats = ["All", ...CATEGORIES];
  const filtered = category === "All" ? products : products.filter((p) => p.category === category);

  const addToCart = (p) => {
    setCart((c) => {
      const existing = c.find((it) => it.productId === p.id);
      if (existing) return c.map((it) => (it.productId === p.id ? { ...it, qty: it.qty + 1 } : it));
      return [...c, { productId: p.id, qty: 1 }];
    });
  };
  const updateQty = (id, delta) => setCart((c) => c.map((it) => (it.productId === id ? { ...it, qty: it.qty + delta } : it)).filter((it) => it.qty > 0));

  const cartLines = cart.map((it) => ({ ...it, product: products.find((p) => p.id === it.productId) })).filter((l) => l.product);
  const total = cartLines.reduce((s, l) => s + l.product.price * l.qty, 0);
  const cartCount = cartLines.reduce((s, l) => s + l.qty, 0);

  const handlePlaceOrder = () => {
    const order = {
      id: genId("ORD"),
      customer: form.name || "Website customer",
      channel: "Website",
      items: cartLines.map((l) => ({ productId: l.product.id, name: l.product.name, qty: l.qty })),
      total,
      status: "pending",
      date: new Date().toLocaleString(),
    };
    onPlaceOrder(order);
    setPlaced(order);
    setCart([]);
    setCheckoutOpen(false);
    setCartOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: bodyFont }}>
      <div className="sticky top-0 z-30 bg-white border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center gap-3">
          <button onClick={onBack} className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
            <ArrowLeft size={16} />
          </button>
          <div className="flex items-center gap-2 font-bold text-slate-900" style={{ fontFamily: displayFont }}>
            <Sparkles size={16} className="text-indigo-600" /> AB Store
          </div>
          <div className="flex-1" />
          <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button onClick={() => setView("browse")} className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition ${view === "browse" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"}`}>Shop</button>
            <button onClick={() => setView("tracking")} className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition ${view === "tracking" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"}`}>My Orders</button>
          </div>
          <button onClick={() => setCartOpen(true)} className="relative w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <ShoppingBag size={16} />
            {cartCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-500 text-white text-[9px] font-bold flex items-center justify-center">{cartCount}</span>}
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {view === "browse" ? (
          <>
            <div className="mb-5">
              <h1 className="text-2xl font-bold text-slate-900 mb-1" style={{ fontFamily: displayFont }}>Shop essentials, delivered fast.</h1>
              <p className="text-sm text-slate-500">Fresh groceries and daily needs from your neighbourhood store.</p>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 mb-5">
              {cats.map((c) => (
                <button key={c} onClick={() => setCategory(c)} className={`text-xs font-semibold px-3.5 py-2 rounded-xl whitespace-nowrap transition ${category === c ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-slate-500"}`}>
                  {c}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filtered.map((p) => (
                <div key={p.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex flex-col">
                  <div className={`w-full aspect-square rounded-lg flex items-center justify-center text-2xl font-bold mb-3 ${p.color}`}>
                    {p.name.slice(0, 1)}
                  </div>
                  <div className="text-xs font-semibold text-slate-800 leading-snug mb-1 flex-1">{p.name}</div>
                  <div className="text-[11px] text-slate-400 mb-2">{p.category}</div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-indigo-600">{money(p.price)}</span>
                    {p.stock <= 0 ? (
                      <span className="text-[10px] font-semibold text-red-500">Sold out</span>
                    ) : (
                      <button onClick={() => addToCart(p)} className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700">
                        <Plus size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="max-w-2xl">
            <h1 className="text-xl font-bold text-slate-900 mb-4" style={{ fontFamily: displayFont }}>Order tracking</h1>
            {placedOrders.length === 0 ? (
              <EmptyState icon={PackageCheck} title="No orders yet" note="Orders you place will show up here with live status." />
            ) : (
              <div className="space-y-3">
                {placedOrders.map((o) => (
                  <Card key={o.id}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-slate-800 text-sm">{o.id}</span>
                      <StatusBadge status={o.status} />
                    </div>
                    <div className="text-xs text-slate-500 mb-2">{o.items.map((it) => `${it.qty}x ${it.name}`).join(", ")}</div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">{o.date}</span>
                      <span className="font-bold text-indigo-600">{money(o.total)}</span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <Drawer open={cartOpen} onClose={() => setCartOpen(false)} title="Your cart">
        {cartLines.length === 0 ? (
          <EmptyState icon={ShoppingBag} title="Cart is empty" note="Add products to get started." />
        ) : (
          <div>
            <div className="space-y-3 mb-5">
              {cartLines.map((l) => (
                <div key={l.productId} className="flex items-center justify-between gap-2">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${l.product.color}`}>{l.product.name.slice(0, 1)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-slate-800 truncate">{l.product.name}</div>
                    <div className="text-[11px] text-slate-400">{money(l.product.price)}</div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => updateQty(l.productId, -1)} className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center text-slate-500"><Minus size={11} /></button>
                    <span className="text-xs font-semibold w-5 text-center">{l.qty}</span>
                    <button onClick={() => updateQty(l.productId, 1)} className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center text-slate-500"><Plus size={11} /></button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between text-sm font-bold pt-3 border-t border-slate-100 mb-4">
              <span>Total</span>
              <span className="text-indigo-600">{money(total)}</span>
            </div>
            <Button className="w-full" size="lg" onClick={() => setCheckoutOpen(true)}>Checkout</Button>
          </div>
        )}
      </Drawer>

      <Modal open={checkoutOpen} onClose={() => setCheckoutOpen(false)} title="Checkout" width={420}>
        <Field label="Full name">
          <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} placeholder="Your name" />
        </Field>
        <Field label="Phone number">
          <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className={inputCls} placeholder="03XX-XXXXXXX" />
        </Field>
        <Field label="Delivery address">
          <textarea value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} rows={3} className={inputCls} placeholder="House, street, area…" />
        </Field>
        <div className="flex items-center justify-between text-sm font-bold py-3 border-y border-slate-100 mb-4"

