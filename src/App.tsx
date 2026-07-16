import React, { useState, useEffect } from "react";
import { bodyFont } from "./lib/theme";
import { seedProducts, seedOrders, seedCustomers } from "./lib/seedData";
import { genId } from "./lib/utils";
import { notifyNewOrder, notifyLowStock } from "./lib/notify";
import {
  fetchProducts, insertOrder, updateProductRow, fetchOrders, seedIfEmpty,
} from "./supabaseClient";
import LandingScreen from "./screens/Landing";
import LoginScreen from "./screens/Login";
import AdminApp from "./screens/AdminApp";
import StoreScreen from "./screens/Store";

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

  // Admin sections are two-tiered for history purposes: "dashboard" is the base
  // level for the whole admin panel, and any other section sits one level deeper.
  // - dashboard -> subsection: a real step deeper, so it pushes a history entry.
  // - subsection -> dashboard: a real step up, so it goes through goBack()/
  //   window.history.back() — the exact same path the hardware back button uses.
  //   This is what keeps the in-app "back to dashboard" control and the phone's
  //   back button in sync: they now do the literal same thing.
  // - subsection -> subsection (e.g. Orders -> Inventory via the sidebar) is a
  //   lateral move and just replaces the current entry, so the back-stack
  //   doesn't balloon on every sidebar click.
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
      // Let the popstate handler below pop the stack, so this behaves
      // identically to pressing the hardware/browser back button.
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
        <LoginScreen onBack={goBack} onLoginAs={(role) => navigate(role === "admin" ? "admin:dashboard" : "store")} />
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
        />
      )}
    </div>
  );
}
