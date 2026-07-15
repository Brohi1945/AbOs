import React, { useState } from "react";
import { Sidebar, Topbar } from "../components/layout.jsx";
import { bodyFont } from "../lib/theme.js";
import { money, genId } from "../lib/utils";
import { seedCampaigns } from "../lib/seedData.js";
import { notifyLowStock } from "../lib/notify.js";
import {
  insertProduct, updateProductRow, deleteProductRow, insertOrder, updateOrderStatusRow,
} from "../supabaseClient.js";
import DashboardView from "../views/DashboardView.jsx";
import OrdersView from "../views/OrdersView.jsx";
import InventoryView from "../views/InventoryView.jsx";
import CustomersView from "../views/CustomersView.jsx";
import POSView from "../views/POSView.jsx";
import AccountingView from "../views/AccountingView.jsx";
import BusinessIntelligenceView from "../views/BusinessIntelligenceView.jsx";
import MarketingView from "../views/MarketingView.jsx";
import AssistantView from "../views/AssistantView.jsx";

/* ---------------------------------- Admin app shell ---------------------------------- */

export default function AdminApp({ onLogout, onGoStore, products, setProducts, orders, setOrders, customers, setCustomers }) {
  const [section, setSection] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [campaigns, setCampaigns] = useState(seedCampaigns());

  const lowStock = products.filter((p) => p.stock <= p.threshold);
  const pendingOrders = orders.filter((o) => o.status === "pending");

  const notifications = [
    ...pendingOrders.slice(0, 3).map((o) => ({ title: `New order ${o.id}`, note: `${o.customer} · ${money(o.total)}` })),
    ...lowStock.slice(0, 2).map((p) => ({ title: `${p.name} is low on stock`, note: `${p.stock} units left` })),
  ];

  const handleUpdateStatus = (id, status) => {
    setOrders((os) => os.map((o) => (o.id === id ? { ...o, status } : o)));
    updateOrderStatusRow(id, status);
  };

  const handleAddProduct = (form) => {
    const newProduct = { id: genId("P"), barcode: form.barcode || genId("BC"), name: form.name, category: form.category, price: Number(form.price) || 0, cost: Number(form.cost) || 0, stock: Number(form.stock) || 0, threshold: Number(form.threshold) || 10, color: "bg-indigo-100 text-indigo-700", specs: form.specs || "" };
    setProducts((ps) => [newProduct, ...ps]);
    insertProduct(newProduct);
  };
  const handleEditProduct = (id, form) => {
    const fields = { ...form, price: Number(form.price) || 0, cost: Number(form.cost) || 0, stock: Number(form.stock) || 0, threshold: Number(form.threshold) || 10 };
    setProducts((ps) => ps.map((p) => (p.id === id ? { ...p, ...fields } : p)));
    updateProductRow(id, fields);
  };
  const handleDeleteProduct = (id) => {
    setProducts((ps) => ps.filter((p) => p.id !== id));
    deleteProductRow(id);
  };

  const handleAddCustomer = (form) => {
    setCustomers((cs) => [
      { id: genId("C"), name: form.name, phone: form.phone, email: form.email || "", orders: 0, spent: 0, lastOrder: "—" },
      ...cs,
    ]);
  };

  const handleAddCampaign = (form) => {
    setCampaigns((cs) => [
      { id: genId("CMP"), name: form.name, channel: form.channel, status: form.status, sent: Number(form.sent) || 0, opened: Number(form.opened) || 0, clicked: Number(form.clicked) || 0 },
      ...cs,
    ]);
  };

  const handlePOSCheckout = (cartLines) => {
    products.forEach((p) => {
      const line = cartLines.find((l) => l.productId === p.id);
      if (!line) return;
      const newStock = Math.max(0, p.stock - line.qty);
      if (newStock <= p.threshold && p.stock > p.threshold) notifyLowStock(p, newStock);
    });
    setProducts((ps) => ps.map((p) => {
      const line = cartLines.find((l) => l.productId === p.id);
      if (line) updateProductRow(p.id, { stock: Math.max(0, p.stock - line.qty) });
      return line ? { ...p, stock: Math.max(0, p.stock - line.qty) } : p;
    }));
    const total = cartLines.reduce((s, l) => s + l.subtotal, 0);
    const newOrder = { id: genId("ORD"), customer: "Walk-in customer", items: cartLines.map((l) => ({ name: l.product.name, qty: l.qty })), total, status: "delivered", date: new Date().toLocaleString(), channel: "POS" };
    setOrders((os) => [newOrder, ...os]);
    insertOrder(newOrder);
  };

  const titles = {
    dashboard: "Dashboard", orders: "Orders", inventory: "Inventory", customers: "Customers",
    pos: "POS / Retail", accounting: "Accounting", insights: "Business Intelligence", marketing: "Marketing", assistant: "AI Assistant",
  };

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: bodyFont }}>
      <Sidebar active={section} onSelect={setSection} open={sidebarOpen} onClose={() => setSidebarOpen(false)} lowStockCount={lowStock.length} onLogout={onLogout} onGoStore={onGoStore} />
      <div className="lg:pl-64">
        <Topbar
          title={titles[section]}
          onMenuClick={() => setSidebarOpen(true)}
          notifCount={notifications.length}
          onNotifClick={() => setNotifOpen((o) => !o)}
          notifOpen={notifOpen}
          notifications={notifications}
        />
        <div className="p-4 sm:p-6 max-w-6xl">
          {section === "dashboard" && <DashboardView orders={orders} products={products} customers={customers} onGoTo={setSection} />}
          {section === "orders" && <OrdersView orders={orders} onUpdateStatus={handleUpdateStatus} />}
          {section === "inventory" && <InventoryView products={products} onAdd={handleAddProduct} onEdit={handleEditProduct} onDelete={handleDeleteProduct} />}
          {section === "customers" && <CustomersView customers={customers} orders={orders} onAdd={handleAddCustomer} />}
          {section === "pos" && <POSView products={products} onCheckout={handlePOSCheckout} />}
          {section === "accounting" && <AccountingView orders={orders} products={products} />}
          {section === "insights" && <BusinessIntelligenceView orders={orders} products={products} />}
          {section === "marketing" && <MarketingView campaigns={campaigns} onAdd={handleAddCampaign} />}
          {section === "assistant" && (
            <AssistantView
              orders={orders}
              products={products}
              onAddProduct={handleAddProduct}
              onEditProduct={handleEditProduct}
              onDeleteProduct={handleDeleteProduct}
              onUpdateStatus={handleUpdateStatus}
            />
          )}
        </div>
      </div>
    </div>
  );
}