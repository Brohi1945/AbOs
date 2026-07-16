import React, { useState, useEffect } from "react";
import { bodyFont } from "./lib/theme";
import { seedProducts, seedOrders, seedCustomers } from "./lib/seedData";
import { genId } from "./lib/utils";
import { notifyNewOrder, notifyLowStock } from "./lib/notify";
import {
  fetchProducts, insertOrder, updateProductRow, fetchOrders, seedIfEmpty,
} from "./supabaseClient.js";
import LandingScreen from "./screens/Landing";
import LoginScreen from "./screens/Login";
import AdminApp from "./screens/AdminApp";
import StoreScreen from "./screens/Store";

export default function BusinessAutomationSystem() {
  const [screenStack, setScreenStack] = useState(["landing"]);
  const screen = screenStack[screenStack.length - 1];
  const [products, setProducts] = useState(seedProducts());
  const [orders, setOrders] = useState(seedOrders());
  const [placedOrders, setPlacedOrders] = useState([]);
  const [customers, setCustomers] = useState(seedCustomers());

  // Push a new screen onto the stack (forward navigation) and register a
  // matching browser history entry, so the hardware/software back button
  // has something of ours to go back to instead of leaving the app.
  const navigate = (next) => {
    setScreenStack((s) => [...s, next]);
    window.history.pushState({ depth: screenStack.length + 1 }, "");
  };

  // Pop back to the previous screen (used by in-app "back" buttons). This
  // only moves browser history backward — the popstate listener below is
  // the single place that actually pops screenStack, so in-app back button
  // taps and the hardware/software back button behave identically and
  // never double-pop.
  const goBack = () => {
    window.history.back();
  };

  // Full reset (used by "Log out") — clears the stack back to the start
  // rather than just going back one step.
  const resetTo = (start) => {
    setScreenStack([start]);
    window.history.replaceState({ depth: 1 }, "");
  };

  useEffect(() => {
    window.history.replaceState({ depth: 1 }, "");
    const onPopState = () => {
      setScreenStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

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
        <LandingScreen onLogin={() => navigate("login")} onBrowseStore={() => navigate("store")} />
      )}
      {screen === "login" && (
        <LoginScreen onBack={goBack} onLoginAs={(role) => navigate(role === "admin" ? "admin" : "store")} />
      )}
      {screen === "admin" && (
        <AdminApp
          onLogout={() => resetTo("landing")}
          onGoStore={() => navigate("store")}
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
          onBack={goBack}
          onLogin={() => navigate("login")}
          placedOrders={placedOrders}
          onPlaceOrder={handlePlaceOrder}
        />
      )}
    </div>
  );
}