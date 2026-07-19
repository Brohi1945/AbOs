import { useEffect } from "react";

interface ShortcutHandlers {
  onSearch: () => void;
  onQuickBill: () => void;
  onNewProduct: () => void;
  onEscape: () => void;
  onSectionNumber: (n: number) => void;
}

/**
 * Wires up app-wide keyboard shortcuts:
 *   Ctrl/Cmd + K → open global search
 *   Ctrl/Cmd + B → jump to POS (quick new bill)
 *   Ctrl/Cmd + N → jump to Inventory and open "add product"
 *   Esc          → close whatever overlay is open
 *   1-9          → jump to the Nth sidebar section
 * Ignored while the user is typing in an input/textarea/select, except
 * Ctrl/Cmd combos (which always fire) and Esc.
 */
export function useKeyboardShortcuts({ onSearch, onQuickBill, onNewProduct, onEscape, onSectionNumber }: ShortcutHandlers) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        !!target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable);
      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onSearch();
        return;
      }
      if (mod && e.key.toLowerCase() === "b") {
        e.preventDefault();
        onQuickBill();
        return;
      }
      if (mod && e.key.toLowerCase() === "n") {
        e.preventDefault();
        onNewProduct();
        return;
      }
      if (e.key === "Escape") {
        onEscape();
        return;
      }
      if (!isTyping && !mod && /^[1-9]$/.test(e.key)) {
        onSectionNumber(Number(e.key));
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onSearch, onQuickBill, onNewProduct, onEscape, onSectionNumber]);
}

export default useKeyboardShortcuts;
