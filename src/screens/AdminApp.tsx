import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sidebar, Topbar } from "../components/layout";
import { bodyFont } from "../lib/theme";
import { money, genId } from "../lib/utils";
import { seedCampaigns } from "../lib/seedData";
import { notifyLowStock } from "../lib/notify";
import { checkAndNotifyWaitlist } from "../lib/waitlist";
import { NAV_ITEMS } from "../config/app.config";
import {
  insertProduct,
  updateProductRow,
  deleteProductRow,
  insertOrder,
  updateOrderStatusRow,
} from "../supabaseClient";
import { fadeSlideUp } from "../animations/variants";
import DashboardView from "../views/DashboardView";
import OrdersView from "../views/OrdersView";
import InventoryView from "../views/InventoryView";
import CustomersView from "../views/CustomersView";
import WaitlistView from "../views/WaitlistView";
import POSView from "../views/POSView";
import AccountingView from "../views/AccountingView";
import BusinessIntelligenceView from "../views/BusinessIntelligenceView";
import MarketingView from "../views/MarketingView";
import AssistantView from "../views/AssistantView";

export default function AdminApp({
  section,
  onSectionChange,
  onLogout,
  onGoStore,
  products,
  setProducts,
  orders,
  setOrders,
  customers,
  setCustomers,
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [campaigns, setCampaigns] = useState(seedCampaigns());

  const lowStock = products.filter((p) => p.stock <= p.threshold);
  const pendingOrders = orders.filter((o) => o.status === "pending");

  const notifications = [
    ...pendingOrders.slice(0, 3).map((o) => ({
      title: `New order ${o.id}`,
      note: `${o.customer} · ${money(o.total)}`,
    })),
    ...lowStock.slice(0, 2).map((p) => ({
      title: `${p.name} is low on stock`,
      note: `${p.stock} units left`,
    })),
  ];

  const handleUpdateStatus = (id, status) => {
    setOrders((os) => os.map((o) => (o.id === id ? { ...o, status } : o)));
    updateOrderStatusRow(id, status);
  };

  const handleAddProduct = (form) => {
    const newProduct = {
      id: genId("P"),
      barcode: form.barcode || genId("BC"),
      name: form.name,
      category: form.category,
      price: Number(form.price) || 0,
      cost: Number(form.cost) || 0,
      stock: Number(form.stock) || 0,
      threshold: Number(form.threshold) || 10,
      color: "bg-indigo-100 text-indigo-700",
      specs: form.specs || "",
    };
    setProducts((ps) => [newProduct, ...ps]);
    insertProduct(newProduct);
  };

  const handleEditProduct = (id, form) => {
    const fields = {
      ...form,
      price: Number(form.price) || 0,
      cost: Number(form.cost) || 0,
      stock: Number(form.stock) || 0,
      threshold: Number(form.threshold) || 10,
    };
    const previous = products.find((p) => p.id === id);
    const updatedProduct = { ...previous, ...fields };
    setProducts((ps) => ps.map((p) => (p.id === id ? updatedProduct : p)));
    updateProductRow(id, fields);

    // Stock badha (restock) to waitlist par bethe customers ko FIFO order
    // mein notify + reserve karo.
    if (previous && updatedProduct.stock > previous.stock) {
      checkAndNotifyWaitlist(updatedProduct, updateProductField);
    }
  };

  const updateProductField = (id, fields) => {
    setProducts((ps) => ps.map((p) => (p.id === id ? { ...p, ...fields } : p)));
  };

  const handleDeleteProduct = (id) => {
    setProducts((ps) => ps.filter((p) => p.id !== id));
    deleteProductRow(id);
  };

  const handleAddCustomer = (form) => {
    setCustomers((cs) => [
      {
        id: genId("C"),
        name: form.name,
        phone: form.phone,
        email: form.email || "",
        orders: 0,
        spent: 0,
        lastOrder: "—",
      },
      ...cs,
    ]);
  };

  const handleAddCampaign = (form) => {
    setCampaigns((cs) => [
      {
        id: genId("CMP"),
        name: form.name,
        channel: form.channel,
        status: form.status,
        sent: Number(form.sent) || 0,
        opened: Number(form.opened) || 0,
        clicked: Number(form.clicked) || 0,
      },
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
    setProducts((ps) =>
      ps.map((p) => {
        const line = cartLines.find((l) => l.productId === p.id);
        if (line) updateProductRow(p.id, { stock: Math.max(0, p.stock - line.qty) });
        return line ? { ...p, stock: Math.max(0, p.stock - line.qty) } : p;
      })
    );
    const total = cartLines.reduce((s, l) => s + l.subtotal, 0);
    const newOrder = {
      id: genId("ORD"),
      customer: "Walk-in customer",
      items: cartLines.map((l) => ({ name: l.product.name, qty: l.qty })),
      total,
      status: "delivered",
      date: new Date().toLocaleString(),
      channel: "POS",
    };
    setOrders((os) => [newOrder, ...os]);
    insertOrder(newOrder);
  };

  // Section title now comes from NAV_ITEMS (src/config/app.config.ts) —
  // no separate list to keep in sync when a label changes.
  const sectionTitle = NAV_ITEMS.find((item) => item.key === section)?.label || "Dashboard";

  const renderView = () => {
    switch (section) {
      case "dashboard":
        return <DashboardView orders={orders} products={products} customers={customers} onGoTo={onSectionChange} />;
      case "orders":
        return <OrdersView orders={orders} onUpdateStatus={handleUpdateStatus} />;
      case "inventory":
        return (
          <InventoryView
            products={products}
            onAdd={handleAddProduct}
            onEdit={handleEditProduct}
            onDelete={handleDeleteProduct}
          />
        );
      case "customers":
        return <CustomersView customers={customers} orders={orders} onAdd={handleAddCustomer} />;
      case "waitlist":
        return <WaitlistView products={products} />;
      case "pos":
        return <POSView products={products} onCheckout={handlePOSCheckout} />;
      case "accounting":
        return <AccountingView orders={orders} products={products} />;
      case "insights":
        return <BusinessIntelligenceView orders={orders} products={products} />;
      case "marketing":
        return <MarketingView campaigns={campaigns} onAdd={handleAddCampaign} />;
      case "assistant":
        return (
          <AssistantView
            orders={orders}
            products={products}
            onAddProduct={handleAddProduct}
            onEditProduct={handleEditProduct}
            onDeleteProduct={handleDeleteProduct}
            onUpdateStatus={handleUpdateStatus}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0D12]" style={{ fontFamily: bodyFont }}>
      <Sidebar
        active={section}
        onSelect={onSectionChange}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        lowStockCount={lowStock.length}
        onLogout={onLogout}
        onGoStore={onGoStore}
      />
      <div className="lg:pl-64">
        <Topbar
          title={sectionTitle}
          onMenuClick={() => setSidebarOpen(true)}
          notifCount={notifications.length}
          onNotifClick={() => setNotifOpen((o) => !o)}
          notifOpen={notifOpen}
          notifications={notifications}
          onBack={section !== "dashboard" ? () => onSectionChange("dashboard") : undefined}
        />
        <div className="p-4 sm:p-6 max-w-6xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={section}
              variants={fadeSlideUp}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.2 }}
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
