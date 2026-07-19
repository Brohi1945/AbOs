import {
  LayoutDashboard, ShoppingCart, Package, Users, Barcode, Wallet, PieChart, Megaphone, Bot,
  Clock, CheckCircle2, PackageCheck, XCircle, ListChecks, CircleDollarSign,
} from "lucide-react";

// ============================================================
//  Central app configuration.
//  Naya nav item, category, ya order status add/remove karna ho
//  to SIRF yahan karo — har screen jo ye use karti hai wo automatic
//  update ho jayegi.
// ============================================================

// Sidebar mein dikhne wale sections. Naya item add karna ho:
// { key: "unique-key", label: "Display Name", icon: SomeLucideIcon }
// yahan add karo, phir AdminApp.tsx ke `titles` object aur `renderView()`
// switch mein us key ka case add karna hoga (wo abhi bhi AdminApp.tsx mein rahega).
export const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "orders", label: "Orders", icon: ShoppingCart },
  { key: "inventory", label: "Inventory", icon: Package },
  { key: "customers", label: "Customers", icon: Users },
  { key: "waitlist", label: "Waitlist", icon: ListChecks },
  { key: "pos", label: "POS / Retail", icon: Barcode },
  { key: "accounting", label: "Accounting", icon: Wallet },
  { key: "insights", label: "Business Intelligence", icon: PieChart },
  { key: "marketing", label: "Marketing", icon: Megaphone },
  { key: "assistant", label: "AI Assistant", icon: Bot },
];

// Product categories — Inventory form, AI assistant, aur Store filter
// teeno yahan se padhte hain.
export const CATEGORIES = ["Groceries", "Beverages", "Snacks", "Household", "Personal Care"];

// Physical store address — shown with a map on the public storefront
// (Store.tsx "Visit our store" card) so customers can find the shop.
// Change this to the real store address.
export const STORE_ADDRESS = "Gulshan-e-Iqbal, Karachi, Pakistan";

// Order statuses — Orders view aur StatusBadge component yahan se padhte hain.
export const STATUS_META = {
  pending: { label: "Pending", icon: Clock, cls: "bg-amber-50 text-amber-700 border-amber-200" },
  confirmed: { label: "Confirmed", icon: CheckCircle2, cls: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  delivered: { label: "Delivered", icon: PackageCheck, cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  cancelled: { label: "Cancelled", icon: XCircle, cls: "bg-red-50 text-red-700 border-red-200" },
};

// Safepay payment status (order.payment_status column — alag hai order
// fulfillment status se). "unpaid" tab tak default rehta hai jab tak koi
// payment link generate na ho; "paid"/"failed" api/safepay-webhook.ts
// set karta hai. OrdersView ke payment section yahan se padhta hai.
export const PAYMENT_STATUS_META = {
  unpaid: { label: "Unpaid", icon: CircleDollarSign, cls: "bg-fg/5 text-muted border-transparent" },
  pending: { label: "Payment Pending", icon: Clock, cls: "bg-amber-50 text-amber-700 border-amber-200" },
  paid: { label: "Paid", icon: CheckCircle2, cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  failed: { label: "Payment Failed", icon: XCircle, cls: "bg-red-50 text-red-700 border-red-200" },
};
