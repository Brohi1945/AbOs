// ============================================================
//  voiceCommands — detects two kinds of spoken/typed UI commands
//  that should be handled locally instead of being sent to the LLM:
//
//  1. Voice toggle ("voice mein baat karo", "chup ho jao") — the
//     model has no way to flip our speaker toggle, so it used to
//     just apologize in text.
//
//  2. Sidebar navigation ("inventory ka page kholo", "business
//     intelligence par le jao", "dashboard dikhao") — the model
//     also has no way to actually change which screen is showing;
//     intercepting these here lets the app really switch sections.
// ============================================================
import { NAV_ITEMS } from "../config/app.config";


const ENABLE_PATTERNS: RegExp[] = [
  /\bvoice\s*(mein|main)?\s*baat\b/i,
  /\bvoice\s*on\b/i,
  /\bvoice\s*se\s*bol/i,
  /\bawaaz\s*(mein|main)?\s*bol/i,
  /\bawaaz\s*on\b/i,
  /\bbol\s*kar\s*jawab/i,
  /\bbol\s*kar\s*baat/i,
  /\bbol\s*kar\s*bolo\b/i,
];

const DISABLE_PATTERNS: RegExp[] = [
  /\bvoice\s*off\b/i,
  /\bawaaz\s*off\b/i,
  /\bchup\s*ho\s*ja/i,
  /\bbolna\s*band\b/i,
  /\bvoice\s*band\s*karo\b/i,
  /\bmute\s*(kar|ho)/i,
];

export function detectVoiceToggleCommand(text: string): "enable" | "disable" | null {
  const t = text.trim();
  if (!t) return null;
  // check disable first — "voice band karo" would otherwise partially
  // match an enable-ish pattern in some phrasings
  if (DISABLE_PATTERNS.some((p) => p.test(t))) return "disable";
  if (ENABLE_PATTERNS.some((p) => p.test(t))) return "enable";
  return null;
}

// ---- Section navigation ("inventory kholo", "insights par le jao") ----

// Keywords per NAV_ITEMS key. Kept separate from the label so multiple
// natural phrasings (English name, common shorthand, Roman Urdu word)
// all resolve to the same section.
const SECTION_KEYWORDS: Record<string, string[]> = {
  dashboard: ["dashboard", "home"],
  orders: ["orders", "order"],
  inventory: ["inventory", "stock"],
  customers: ["customers", "customer"],
  waitlist: ["waitlist", "wait list"],
  pos: ["pos", "point of sale", "retail"],
  accounting: ["accounting", "account"],
  insights: ["business intelligence", "insights", "insight", "analytics", "bi"],
  marketing: ["marketing", "campaigns", "campaign"],
  assistant: ["ai assistant", "assistant", "chat"],
};

// A command needs one of these "do something" verbs PLUS a section
// keyword — this avoids false positives on a normal question that
// merely mentions a section name (e.g. "inventory kitni value ki hai").
const NAV_TRIGGER_WORDS =
  /\b(khol|kholo|khol\s*do|kholna|kholiye|dikha|dikhao|dikhaiye|le\s*ja|le\s*jao|lay\s*ja|lay\s*jao|par\s*ja|par\s*jao|open|show|navigate|go\s*to)\b/i;

export function detectNavigationCommand(text: string): { key: string; label: string } | null {
  const t = text.trim().toLowerCase();
  if (!t) return null;
  if (!NAV_TRIGGER_WORDS.test(t)) return null;

  // Pick the LONGEST matching keyword across all sections — this makes
  // "business intelligence" win over a shorter, coincidental overlap.
  let bestKey: string | null = null;
  let bestLen = 0;
  for (const item of NAV_ITEMS) {
    const keywords = SECTION_KEYWORDS[item.key] || [];
    for (const kw of keywords) {
      if (t.includes(kw) && kw.length > bestLen) {
        bestKey = item.key;
        bestLen = kw.length;
      }
    }
  }
  if (!bestKey) return null;
  const label = NAV_ITEMS.find((i) => i.key === bestKey)?.label || bestKey;
  return { key: bestKey, label };
}

