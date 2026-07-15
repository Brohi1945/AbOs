import React, { useState, useEffect } from "react";
import { bodyFont } from "./lib/theme.js";
import { seedProducts, seedOrders, seedCustomers } from "./lib/seedData.js";
import { genId } from "./lib/utils";
import { notifyNewOrder, notifyLowStock } from "./lib/notify.js";
import {
  fetchProducts, insertOrder, updateProductRow, fetchOrders, seedIfEmpty,
} from "./supabaseClient.js";
import LandingScreen from "./screens/Landing.jsx";
import LoginScreen from "./screens/Login.jsx";
import AdminApp from "./screens/AdminApp.jsx";
import StoreScreen from "./screens/Store.jsx";

/* ---------------------------------- Root app ---------------------------------- */

export default function BusinessAutomationSystem() {
  const [screen, setScreen] = useState("landing"); // landing | login | admin | store
  const [products, setProducts] = useState(seedProducts());
  const [orders, setOrders] = useState(seedOrders());
  const [placedOrders, setPlacedOrders] = useState([]);
  const [customers, setCustomers] = useState(seedCustomers());

  useEffect(() => {
    (async () => {
      await seedIfEmpty(seedProducts(), seedOrders());
      const [liveProducts, liveOrders] = await Promise.all([fetchProducts(), fetchOrders()]);
      if (liveProducts) setProducts(liveProducts);
      if (liveOrders) setOrders(liveOrders);
    })();
  }, []);

  const handlePlaceOrder = (order) => {
    products.forEach((p) => {
      const line = order.items.find((it) => it.productId === p.id);
      if (!line) return;
      const newStock = Math.max(0, p.stock - line.qty);
      if (newStock <= p.threshold && p.stock > p.threshold) notifyLowStock(p, newStock);
    });
    setProducts((ps) => ps.map((p) => {
      const line = order.items.find((it) => it.productId === p.id);
      if (line) updateProductRow(p.id, { stock: Math.max(0, p.stock - line.qty) });
      return line ? { ...p, stock: Math.max(0, p.stock - line.qty) } : p;
    }));
    setOrders((os) => [order, ...os]);
    setPlacedOrders((os) => [order, ...os]);
    insertOrder(order);
    notifyNewOrder(order);
    setCustomers((cs) => {
      const exists = cs.some((c) => c.name.toLowerCase() === (order.customer || "").toLowerCase());
      if (exists || !order.customer) return cs;
      return [{ id: genId("C"), name: order.customer, phone: order.phone || "", email: "", orders: 0, spent: 0, lastOrder: order.date }, ...cs];
    });
  };

  return (
    <div style={{ fontFamily: bodyFont }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@600;700;800&family=Inter:wght@400;500;600&display=swap');
        input::placeholder, textarea::placeholder { color: #94A3B8; }
        @keyframes drawerIn { from { transform: translateX(24px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .animate-drawer-in { animation: drawerIn 0.22s ease-out; }
        @keyframes modalIn { from { transform: scale(0.97); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .animate-modal-in { animation: modalIn 0.18s ease-out; }
      `}</style>

      {screen === "landing" && (
        <LandingScreen onLogin={() => setScreen("login")} onBrowseStore={() => setScreen("store")} />
      )}
      {screen === "login" && (
        <LoginScreen onBack={() => setScreen("landing")} onLoginAs={(role) => setScreen(role === "admin" ? "admin" : "store")} />
      )}
      {screen === "admin" && (
        <AdminApp
          onLogout={() => setScreen("landing")}
          onGoStore={() => setScreen("store")}
          products={products}
          setProducts={setProducts}
          orders={orders}
          setOrders={setOrders}
          customers={customers}
          setCustomers={setCustomers}
        />
      )}
      {screen === "store" && (
        <StoreScreen
          products={products}
          onBack={() => setScreen("landing")}
          onLogin={() => setScreen("login")}
          placedOrders={placedOrders}
          onPlaceOrder={handlePlaceOrder}
        />
      )}
    </div>
  );
}