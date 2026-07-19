import React, { createContext, useContext, useEffect, useState } from "react";

export type ThemeMode = "light" | "dark" | "colorful";

const THEME_MODES: ThemeMode[] = ["light", "dark", "colorful"];

interface ThemeContextValue {
  mode: ThemeMode;
  /** Cycle light → dark → colorful → light. Used by the manual 3-way switcher. */
  cycleTheme: () => void;
  /** Set an exact theme directly — used by the AI assistant (voice + typed commands). */
  setTheme: (mode: ThemeMode) => void;
  /** @deprecated kept for backwards compatibility — same as cycleTheme. */
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = "abos-theme";

function isThemeMode(v: unknown): v is ThemeMode {
  return v === "light" || v === "dark" || v === "colorful";
}

function getInitialMode(): ThemeMode {
  if (typeof window === "undefined") return "dark";
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (isThemeMode(saved)) return saved;
  // Pehli dafa: system preference check karo, warna dark default hai
  // (ABOS admin dashboard ka default look).
  const prefersLight = window.matchMedia?.("(prefers-color-scheme: light)").matches;
  return prefersLight ? "light" : "dark";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(getInitialMode);

  useEffect(() => {
    const root = document.documentElement;
    // Sirf apni teeno theme classes hi remove karo, koi aur class chhoro.
    root.classList.remove("dark", "colorful");
    if (mode === "dark" || mode === "colorful") root.classList.add(mode);
    window.localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  const setTheme = (m: ThemeMode) => {
    if (isThemeMode(m)) setMode(m);
  };

  const cycleTheme = () => {
    setMode((m) => {
      const idx = THEME_MODES.indexOf(m);
      return THEME_MODES[(idx + 1) % THEME_MODES.length];
    });
  };

  return (
    <ThemeContext.Provider value={{ mode, cycleTheme, setTheme, toggleTheme: cycleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
