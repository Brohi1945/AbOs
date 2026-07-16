// Categories aur order-status metadata ab ek central config file mein
// hain — badalna ho to src/config/app.config.ts kholo.
export { CATEGORIES, STATUS_META } from "../config/app.config";

export const seedProducts = () => [
  { id: "P001", barcode: "8901030895551", name: "Basmati Rice 5kg", category: "Groceries", price: 1450, cost: 1100, stock: 42, threshold: 10, color: "bg-amber-100 text-amber-700", specs: "Premium long-grain basmati rice, 5kg pack, aged for extra aroma. Goes well with Cooking Oil for daily cooking." },
  { id: "P002", barcode: "8901030895568", name: "Cooking Oil 1L", category: "Groceries", price: 620, cost: 480, stock: 8, threshold: 10, color: "bg-yellow-100 text-yellow-700", specs: "1 litre refined cooking oil, cholesterol-free, suitable for frying and daily cooking." },
  { id: "P003", barcode: "8901030895575", name: "Green Tea Box", category: "Beverages", price: 380, cost: 260, stock: 60, threshold: 15, color: "bg-emerald-100 text-emerald-700", specs: "25 tea bags per box, natural green tea leaves, no added sugar. Good with a light snack." },
  { id: "P004", barcode: "8901030895582", name: "Potato Chips 150g", category: "Snacks", price: 150, cost: 95, stock: 5, threshold: 12, color: "bg-orange-100 text-orange-700", specs: "150g crispy salted potato chips, resealable pack, great with Orange Juice." },
  { id: "P005", barcode: "8901030895599", name: "Dish Wash Liquid", category: "Household", price: 275, cost: 190, stock: 30, threshold: 10, color: "bg-cyan-100 text-cyan-700", specs: "500ml concentrated dish wash liquid, lemon fragrance, cuts grease effectively." },
  { id: "P006", barcode: "8901030895605", name: "Shampoo 200ml", category: "Personal Care", price: 495, cost: 340, stock: 3, threshold: 8, color: "bg-pink-100 text-pink-700", specs: "200ml anti-dandruff shampoo, suitable for daily use, dermatologically tested." },
  { id: "P007", barcode: "8901030895612", name: "Orange Juice 1L", category: "Beverages", price: 320, cost: 210, stock: 25, threshold: 10, color: "bg-amber-100 text-amber-700", specs: "1 litre 100% orange juice, no added preservatives, rich in Vitamin C." },
  { id: "P008", barcode: "8901030895629", name: "Whole Wheat Bread", category: "Groceries", price: 180, cost: 120, stock: 18, threshold: 10, color: "bg-yellow-100 text-yellow-700", specs: "400g whole wheat bread loaf, freshly baked daily, no added sugar." },
];

export const seedCustomers = () => [
  { id: "C001", name: "Ayesha Khan", phone: "0301-2345678", email: "ayesha.k@mail.com", orders: 14, spent: 48200, lastOrder: "2026-07-10" },
  { id: "C002", name: "Bilal Ahmed", phone: "0322-8871234", email: "bilal.a@mail.com", orders: 6, spent: 19850, lastOrder: "2026-07-09" },
  { id: "C003", name: "Sara Malik", phone: "0345-1122334", email: "sara.m@mail.com", orders: 2, spent: 3400, lastOrder: "2026-06-28" },
  { id: "C004", name: "Usman Tariq", phone: "0333-9988776", email: "usman.t@mail.com", orders: 21, spent: 76500, lastOrder: "2026-07-12" },
  { id: "C005", name: "Hina Raza", phone: "0312-4455667", email: "hina.r@mail.com", orders: 1, spent: 1450, lastOrder: "2026-07-01" },
];

export const seedOrders = () => [
  { id: "ORD-1042", customer: "Usman Tariq", items: [{ name: "Basmati Rice 5kg", qty: 2 }, { name: "Cooking Oil 1L", qty: 1 }], total: 3520, status: "pending", date: "2026-07-13 10:22", channel: "Store" },
  { id: "ORD-1041", customer: "Ayesha Khan", items: [{ name: "Green Tea Box", qty: 3 }], total: 1140, status: "confirmed", date: "2026-07-13 09:05", channel: "WhatsApp" },
  { id: "ORD-1040", customer: "Bilal Ahmed", items: [{ name: "Shampoo 200ml", qty: 1 }, { name: "Dish Wash Liquid", qty: 2 }], total: 1045, status: "delivered", date: "2026-07-12 18:40", channel: "Store" },
  { id: "ORD-1039", customer: "Sara Malik", items: [{ name: "Orange Juice 1L", qty: 2 }], total: 640, status: "delivered", date: "2026-07-12 14:12", channel: "WhatsApp" },
  { id: "ORD-1038", customer: "Hina Raza", items: [{ name: "Potato Chips 150g", qty: 3 }], total: 450, status: "cancelled", date: "2026-07-11 16:50", channel: "Store" },
  { id: "ORD-1037", customer: "Usman Tariq", items: [{ name: "Whole Wheat Bread", qty: 2 }], total: 360, status: "delivered", date: "2026-07-11 08:30", channel: "Store" },
];

export const seedCampaigns = () => [
  { id: "CMP-01", name: "Weekend Grocery Sale", channel: "WhatsApp", sent: 1200, opened: 940, clicked: 310, status: "Active" },
  { id: "CMP-02", name: "New Customer Welcome", channel: "Email", sent: 850, opened: 520, clicked: 140, status: "Active" },
  { id: "CMP-03", name: "Low Stock Restock Alert", channel: "SMS", sent: 300, opened: 300, clicked: 60, status: "Completed" },
  { id: "CMP-04", name: "Eid Special Offers", channel: "WhatsApp", sent: 2000, opened: 1610, clicked: 705, status: "Scheduled" },
];

export const salesTrend = [
  { day: "Mon", sales: 18500 }, { day: "Tue", sales: 21200 }, { day: "Wed", sales: 19800 },
  { day: "Thu", sales: 24300 }, { day: "Fri", sales: 28900 }, { day: "Sat", sales: 33100 }, { day: "Sun", sales: 26700 },
];
