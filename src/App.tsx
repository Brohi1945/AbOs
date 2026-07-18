import React, { useState, useEffect } from "react";
import { Toaster } from "react-hot-toast";
import { bodyFont, fontImportUrl, ThemeProvider } from "./theme";
import { seedProducts, seedOrders, seedCustomers } from "./lib/seedData";
import { genId } from "./lib/utils";
import { notifyNewOrder, notifyLowStock } from "./lib/notify";
import {
  fetchProducts,
  insertOrder,
  updateProductRow,
  fetchOrders,
  seedIfEmpty,
} from "./supabaseClient";
import { expireStaleReservations, convertWaitlistIfMatched, joinWaitlist } from "./lib/waitlist";
import LandingScreen from "./screens/Landing";
import LoginScreen from "./screens/Login";
import AdminApp from "./screens/AdminApp";
import StoreScreen from "./screens/Store";
import { TOAST_POSITION } from "./animations/config";

export default function BusinessAutomationSystem() {
  const [screenStack, setScreenStack] = useState(["landing"]);
  const screen = screenStack[screenStack.length - 1];
  const isAdmin = screen.startsWith("admin:");
  const adminSection = isAdmin ? screen.slice(6) : "dashboard";

  const [products, setProducts] = useState(seedProducts());
  const [orders, setOrders] = useState(seedOrders());
  const [placedOrders, setPlacedOrders] = useState([]);
  const [customers, setCustomers] = useState(seedCustomers());

  const navigate = (next) => {
    setScreenStack((s) => {
      const ns = [...s, next];
      window.history.pushState({ depth: ns.length }, "");
      return ns;
    });
  };

  const switchSection = (next) => {
    const current = screenStack[screenStack.length - 1];
    const isCurrentDashboard = current === "admin:dashboard";
    const isNextDashboard = next === "admin:dashboard";

    if (isCurrentDashboard && !isNextDashboard) {
      setScreenStack((s) => {
        const ns = [...s, next];
        window.history.pushState({ depth: ns.length }, "");
        return ns;
      });
      return;
    }

    if (!isCurrentDashboard && isNextDashboard) {
      window.history.back();
      return;
    }

    setScreenStack((s) => {
      const ns = [...s.slice(0, -1), next];
      window.history.replaceState({ depth: ns.length }, "");
      return ns;
    });
  };

  const goBack = () => {
    window.history.back();
  };

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

  const updateProductField = (id, fields) => {
    setProducts((ps) => ps.map((p) => (p.id === id ? { ...p, ...fields } : p)));
  };

  useEffect(() => {
    (async () => {
      await seedIfEmpty(seedProducts(), seedOrders());
      const [liveProducts, liveOrders] = await Promise.all([fetchProducts(), fetchOrders()]);
      if (liveProducts) setProducts(liveProducts);
      if (liveOrders) setOrders(liveOrders);
      // 48hr se expire ho chuki waitlist reservations release karo aur
      // agle customer ko offer karo. Koi cron abhi nahi hai isliye yeh
      // sirf app open hone par check hota hai (prototype ke liye theek).
      if (liveProducts) await expireStaleReservations(liveProducts, updateProductField);
    })();
  }, []);

  const handlePlaceOrder = (order) => {
    products.forEach((p) => {
      const line = order.items.find((it) => it.productId === p.id);
      if (!line) return;
      const newStock = Math.max(0, p.stock - line.qty);
      if (newStock <= p.threshold && p.stock > p.threshold) notifyLowStock(p, newStock);
    });
    setProducts((ps) =>
      ps.map((p) => {
        const line = order.items.find((it) => it.productId === p.id);
        if (line) updateProductRow(p.id, { stock: Math.max(0, p.stock - line.qty) });
        return line ? { ...p, stock: Math.max(0, p.stock - line.qty) } : p;
      })
    );
    setOrders((os) => [order, ...os]);
    setPlacedOrders((os) => [order, ...os]);
    insertOrder(order);
    notifyNewOrder(order);
    setCustomers((cs) => {
      const exists = cs.some((c) => c.name.toLowerCase() === (order.customer || "").toLowerCase());
      if (exists || !order.customer) return cs;
      return [
        {
          id: genId("C"),
          name: order.customer,
          phone: order.phone || "",
          email: "",
          orders: 0,
          spent: 0,
          lastOrder: order.date,
        },
        ...cs,
      ];
    });
    // Agar yeh order kisi waitlist reservation se match karta hai
    // (same product + same phone), to us reservation ko "converted"
    // mark karo aur reserved stock free karo.
    if (order.phone) {
      order.items.forEach((line) => {
        const product = products.find((p) => p.id === line.productId);
        if (product) convertWaitlistIfMatched(product, order.phone, order.id, updateProductField);
      });
    }
  };

  const handleJoinWaitlist = async (product, customerName, phone, qty = 1) => {
    return joinWaitlist({ product, customerName, phone, qty });
  };

  return (
    <ThemeProvider>
    <div style={{ fontFamily: bodyFont }}>
      <Toaster position={TOAST_POSITION} gutter={8} />

      <style>{`
        @import url('${fontImportUrl}');
        input::placeholder, textarea::placeholder { color: var(--color-text-muted); }
        @keyframes drawerIn { from { transform: translateX(24px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .animate-drawer-in { animation: drawerIn 0.22s ease-out; }
        @keyframes modalIn { from { transform: scale(0.97); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .animate-modal-in { animation: modalIn 0.18s ease-out; }
      `}</style>

      {screen === "landing" && (
        <LandingScreen onLogin={() => navigate("login")} onBrowseStore={() => navigate("store")} />
      )}
      {screen === "login" && (
        <LoginScreen
          onBack={goBack}
          onLoginAs={(role) => navigate(role === "admin" ? "admin:dashboard" : "store")}
        />
      )}
      {isAdmin && (
        <AdminApp
          section={adminSection}
          onSectionChange={(s) => switchSection("admin:" + s)}
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
          onJoinWaitlist={handleJoinWaitlist}
        />
      )}
    </div>
    </ThemeProvider>
  );
}
