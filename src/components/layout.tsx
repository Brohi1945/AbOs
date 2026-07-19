import React from "react";
import {
  Search, Bell, ChevronDown, LogOut, Menu, Sparkles, ShoppingBag, ArrowLeft,
  Sun, Moon, Palette,
} from "lucide-react";
import { displayFont, useTheme } from "../theme";
import { NAV_ITEMS } from "../config/app.config";

// Manual 3-way theme switcher — Light / Dark / Colorful. Reads/writes
// ThemeProvider directly via context, so it works from anywhere inside
// the app without any prop drilling. Same three states the AI assistant
// can also switch via voice/typed commands (see voiceCommands.ts).
function ThemeSwitcher() {
  const { mode, setTheme } = useTheme();
  const options: { key: "light" | "dark" | "colorful"; icon: any; label: string }[] = [
    { key: "light", icon: Sun, label: "Light theme" },
    { key: "dark", icon: Moon, label: "Dark theme" },
    { key: "colorful", icon: Palette, label: "Colorful theme" },
  ];
  return (
    <div className="flex items-center gap-0.5 p-0.5 rounded-full bg-surface border">
      {options.map(({ key, icon: Icon, label }) => {
        const active = mode === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => setTheme(key)}
            title={label}
            aria-label={label}
            aria-pressed={active}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
              active ? "bg-brand text-white shadow-sm" : "text-muted hover:text-fg"
            }`}
          >
            <Icon size={14} />
          </button>
        );
      })}
    </div>
  );
}

interface SidebarProps {
  active: string;
  onSelect: (key: string) => void;
  open: boolean;
  onClose: () => void;
  lowStockCount: number;
  onLogout: () => void;
  onGoStore: () => void;
}

export function Sidebar({ active, onSelect, open, onClose, lowStockCount, onLogout, onGoStore }: SidebarProps) {
  return (
    <>
      {open && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />}
      <aside
        className={`fixed top-0 left-0 bottom-0 w-64 bg-app border-r z-50 flex flex-col transition-transform lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-2 px-5 py-5 font-bold text-fg" style={{ fontFamily: displayFont }}>
          <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center text-white shrink-0">
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
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-surface text-fg"
                    : "text-muted hover:bg-surface hover:text-fg"
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

        <div className="p-3 border-t space-y-1">
          <button
            onClick={onGoStore}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted hover:bg-surface hover:text-brand"
          >
            <ShoppingBag size={17} /> View store
          </button>

          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted hover:bg-surface hover:text-danger"
          >
            <LogOut size={17} /> Log out
          </button>
        </div>
      </aside>
    </>
  );
}

interface TopbarProps {
  title: string;
  onMenuClick: () => void;
  notifCount: number;
  onNotifClick: () => void;
  notifOpen: boolean;
  notifications: { title: string; note: string }[];
  onBack?: () => void;
}

export function Topbar({ title, onMenuClick, notifCount, onNotifClick, notifOpen, notifications, onBack }: TopbarProps) {
  return (
    <div className="sticky top-0 z-30 bg-app/90 backdrop-blur-md border-b">
      <div className="flex items-center gap-3 px-4 sm:px-6 py-3.5">

        {onBack && (
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-lg bg-surface border flex items-center justify-center text-fg shrink-0"
            aria-label="Back to Dashboard"
          >
            <ArrowLeft size={17} />
          </button>
        )}

        <button
          onClick={onMenuClick}
          className="lg:hidden w-9 h-9 rounded-lg bg-surface border flex items-center justify-center text-fg"
        >
          <Menu size={17} />
        </button>

        <h1 className="font-bold text-fg text-lg hidden sm:block" style={{ fontFamily: displayFont }}>
          {title}
        </h1>

        <div className="flex-1 max-w-md relative hidden md:block">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            placeholder="Search orders, products, customers…"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm bg-surface border text-fg placeholder-muted focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition"
          />
        </div>

        <div className="flex-1 sm:flex-none" />

        <ThemeSwitcher />

        <div className="relative">
          <button
            onClick={onNotifClick}
            className="relative w-9 h-9 rounded-lg bg-surface border flex items-center justify-center text-fg"
          >
            <Bell size={16} />

            {notifCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-danger text-white text-[9px] font-bold flex items-center justify-center">
                {notifCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-surface rounded-xl border shadow-xl overflow-hidden">
              <div className="px-4 py-3 text-xs font-bold text-fg border-b">
                Notifications
              </div>

              {notifications.length === 0 ? (
                <div className="px-4 py-6 text-xs text-muted text-center">
                  You're all caught up.
                </div>
              ) : (
                notifications.map((n, i) => (
                  <div key={i} className="px-4 py-2.5 text-xs border-b last:border-0">
                    <div className="font-semibold text-fg">{n.title}</div>
                    <div className="text-muted">{n.note}</div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pl-2 border-l">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand to-accent flex items-center justify-center text-white text-xs font-bold">
            SA
          </div>

          <div className="hidden sm:block leading-tight">
            <div className="text-xs font-semibold text-fg">Store Admin</div>
            <div className="text-[10px] text-muted">Owner</div>
          </div>

          <ChevronDown size={14} className="text-muted hidden sm:block" />
        </div>

      </div>
    </div>
  );
}
