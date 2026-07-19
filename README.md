# AB OS — AI-Powered SaaS Business Dashboard

> **Yeh file kis liye hai:** Is ek README mein **poora system** explain kiya gaya hai — architecture, har feature, har file ka kaam, database schema, API endpoints, environment variables, security model, aur AI assistant ka poora working. Maqsad yeh hai ke koi bhi insaan **ya AI** sirf yeh file parh kar poori codebase samajh jaye, bina har file khole. Naya kaam shuru karne se pehle yeh poori file parhein.

---

## 1. Project kya hai

**AB OS** ek chhoti/medium retail store ke liye **all-in-one business dashboard** hai — POS, inventory, orders, customers, accounting, marketing, business-intelligence, aur ek built-in **AI chief-of-staff assistant ("ABI")** jo voice + text dono se chalta hai. Isme ek **public customer-facing store** bhi hai jahan se customer directly order place kar sakte hain, aur ek **WhatsApp bot** bhi hai jo automatically customers ke messages ka reply deta hai.

- **Live URL:** `abos-dashboard.vercel.app`
- **Hosting:** Vercel (frontend + serverless API functions)
- **Database:** Supabase (Postgres)
- **AI model:** Groq (`openai/gpt-oss-120b`, free tier, OpenAI-compatible endpoint)
- **GitHub:** account `brohi1945s-projects`
- **Vercel Project ID:** `prj_JhwswP5cdlo3yiUGe3vrjLLU0q9A`
- **Vercel Team ID:** `team_35anp4iNPOOgAAosTxXxn1fQ`
- **Supabase Project URL:** `https://akjugxzvexcpslhzvuhz.supabase.co`

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Frontend framework | React 18 + Vite 5 + TypeScript |
| Styling | Tailwind CSS 3 (CSS-variable-driven theming, `darkMode: "class"`) |
| Animations | Framer Motion |
| Charts | Recharts |
| Icons | lucide-react |
| Toasts | react-hot-toast |
| Backend | Vercel Serverless Functions (Node, files under `/api`) |
| Database/Auth | Supabase (Postgres + Supabase Auth) |
| AI | Groq API (`GROQ_API_KEY`), OpenAI-compatible `/chat/completions` |
| SMS | Twilio (admin notifications) |
| WhatsApp | Meta WhatsApp Cloud API (customer notifications + bot) |

No backend framework (no Express) — every file in `/api` is a standalone Vercel serverless function.

---

## 3. Folder Structure

```
ABOS-main/
├── api/                          # Vercel serverless functions (backend)
│   ├── chat.js                   # POST /api/chat — web AI assistant (admin + store widget)
│   ├── notify.js                 # POST /api/notify — Twilio SMS to store owner
│   ├── place-order.js            # POST /api/place-order — secure server-side order creation
│   ├── whatsapp.js               # POST /api/whatsapp — outbound WhatsApp send
│   ├── whatsapp-webhook.js       # GET/POST /api/whatsapp-webhook — Meta webhook, WhatsApp bot logic
│   └── _lib/
│       ├── groqClient.js         # Shared Groq caller (retries, timeout, backoff)
│       ├── supabaseServer.js     # Server-side Supabase client (SERVICE ROLE key)
│       └── waClient.js           # Shared WhatsApp Cloud API sender
│
├── src/
│   ├── App.tsx                   # Root component — screen-stack navigation, session lock, order flow
│   ├── main.tsx                  # React entry point
│   ├── index.css                 # Tailwind base + tokens.css import
│   ├── supabaseClient.ts         # Client-side Supabase client (ANON key) + all data-access helpers
│   │
│   ├── config/
│   │   └── app.config.ts         # Central config: NAV_ITEMS, CATEGORIES, STATUS_META
│   │
│   ├── theme/                    # 3-theme system (Light / Dark / Colorful)
│   │   ├── colors.ts             # Raw hex palettes (JS-side, used by charts)
│   │   ├── tokens.css            # Same palettes as CSS variables (`:root`, `.dark`, `.colorful`)
│   │   ├── typography.ts         # Font tokens (Inter)
│   │   ├── ThemeProvider.tsx     # React context: mode, setTheme(), cycleTheme()
│   │   └── index.ts              # Barrel export
│   │
│   ├── screens/                  # Top-level "pages" in the screen stack
│   │   ├── Landing.tsx           # Marketing/landing page
│   │   ├── Login.tsx             # Admin (Supabase Auth) + Customer login
│   │   ├── AdminApp.tsx          # Admin shell — sidebar, topbar, section router, AI overlay
│   │   └── Store.tsx             # Public customer storefront + CustomerAssistantWidget
│   │
│   ├── views/                    # Admin dashboard sections (rendered inside AdminApp)
│   │   ├── DashboardView.tsx
│   │   ├── OrdersView.tsx
│   │   ├── InventoryView.tsx
│   │   ├── CustomersView.tsx
│   │   ├── WaitlistView.tsx
│   │   ├── POSView.tsx
│   │   ├── AccountingView.tsx
│   │   ├── BusinessIntelligenceView.tsx
│   │   ├── MarketingView.tsx
│   │   └── AssistantView.tsx     # AI assistant "ABI" — chat + voice, persistent overlay
│   │
│   ├── components/
│   │   ├── layout.tsx            # Sidebar, Topbar (incl. ThemeSwitcher)
│   │   ├── ui.tsx                # Reusable primitives: Button, Card, Badge, StatCard, Drawer, Modal, Field, EmptyState
│   │   └── Skeleton.tsx          # Loading skeletons
│   │
│   ├── lib/
│   │   ├── aiHelpers.tsx         # callClaude() → hits /api/chat, parseAssistantReply() → parses JSON action
│   │   ├── voiceCommands.ts      # Local command detection: voice toggle, navigation, THEME switch
│   │   ├── useVoiceInput.ts      # Web Speech API — speech-to-text hook
│   │   ├── useVoiceOutput.ts     # Web Speech API — text-to-speech hook
│   │   ├── waitlist.ts           # FIFO waitlist logic, 48hr reservation system
│   │   ├── notify.ts             # Notification dispatch (WhatsApp-first, SMS fallback)
│   │   ├── seedData.ts           # Demo/seed products, customers, orders, campaigns
│   │   ├── utils.ts              # genId, money, computeWeeklyTrend, computeProductInsights, types
│   │   └── toast.ts              # toastError/toastSuccess wrappers
│   │
│   └── animations/                # Framer Motion variants, durations, easing constants
│
├── tailwind.config.js             # Maps Tailwind color names → CSS variables
├── vite.config.js
└── tsconfig.json
```

---

## 4. Navigation Model (`App.tsx`)

There's no router library — navigation is a **manual screen stack** synced with `window.history`:

```
screenStack: string[]   e.g. ["landing"] → ["landing","login"] → ["admin:dashboard"]
```

- `screen = screenStack[top]`. If it starts with `"admin:"`, admin shell renders with `adminSection = screen.slice(6)`.
- `navigate(next)` pushes a new screen + `history.pushState`.
- `switchSection(next)` — special-cased so that switching *between* admin sections **replaces** the top of the stack (so browser-back from Inventory goes to Login, not to Dashboard-then-Inventory-then-Login), but entering/leaving the dashboard itself pushes/pops normally.
- `goBack()` just calls `window.history.back()`; a `popstate` listener pops the stack to match.
- **Screens:** `landing` → `login` → (`admin:*` | `store`).

---

## 5. Authentication & Security Model

- **Admin login is real Supabase Auth** (`supabase.auth.signInWithPassword`) — not a fake role toggle. See `src/screens/Login.tsx`.
- **Session lock in `App.tsx`:** `session` state is `undefined` (checking) → `null` (logged out) → `object` (real session). A `useEffect` force-redirects to `login` if `isAdmin && !session`, so admin routes can't be reached via URL/history tricks — only a genuine Supabase session unlocks them.
- **Customer role** has no password — store browsing is intentionally public.
- **Order placement is server-validated:** the client does an *optimistic* UI update, but the actual insert happens in `/api/place-order` using the **service-role key**, which re-fetches real product prices/stock from the DB and recomputes the total server-side — the client can never tamper with price/total. Stock is validated so orders can't oversell.
- **Service-role key never ships to the browser** — it only exists in `api/_lib/supabaseServer.js`, which runs server-side only. The frontend (`src/supabaseClient.ts`) uses the public **anon key**.
- **Known gap (not yet done):** Row Level Security (RLS) policies on Supabase tables should be reviewed/hardened — service-role endpoints bypass RLS by design, but any remaining anon-key write paths from the client should be checked.
- **Customers table:** currently there is **no `customers` table wired up** in `supabaseClient.ts` — customer records only live in React state (`seedCustomers()` + runtime additions) and are lost on refresh. Products, orders, and waitlist *are* persisted to Supabase.

---

## 6. Database (Supabase / Postgres) — tables in use

Inferred from every `supabase.from(...)` call across the codebase:

### `products`
Columns used: `id, barcode, name, category, price, cost, stock, threshold, color, specs, reserved_stock`
- CRUD via `insertProduct`, `updateProductRow`, `deleteProductRow`, `fetchProducts` (`src/supabaseClient.ts`).
- `reserved_stock` is used by the waitlist system — `availableStock(p) = stock - reserved_stock`.

### `orders`
Columns used: `id, customer, phone, items (json), total, status, date, channel`
- Status enum: `pending | confirmed | delivered | cancelled` (see `STATUS_META` in `app.config.ts`).
- Written via `/api/place-order` (customer orders, service-role) and `insertOrder`/`updateOrderStatusRow` (admin-created orders, e.g. POS/AI/manual — anon key, admin-only UI).

### `waitlist`
Columns used: `id, product_id, customer_name, phone, qty, status, channel, joined_at, notified_at, reserve_expires_at, order_id`
- Status enum: `waiting | notified | converted | expired`.
- FIFO logic in `src/lib/waitlist.ts`: when stock is restocked, the longest-waiting customer is notified and given a **48-hour reservation** (`RESERVE_HOURS = 48`) before the item is offered to the next person. Expired reservations are released back to stock on app load (`expireStaleReservations`, no cron yet — prototype-level).

### `auth.users` (built-in Supabase Auth)
- Used only for admin login — no custom `profiles` table currently.

---

## 7. API Endpoints (`/api/*`, Vercel serverless)

| Endpoint | Method | Purpose | Key env vars |
|---|---|---|---|
| `/api/chat` | POST | Web AI assistant (admin ABI + store `CustomerAssistantWidget`) — forwards `{systemPrompt, messages}` to Groq via `callGroq()` | `GROQ_API_KEY` |
| `/api/place-order` | POST | Secure order creation — re-validates stock, recomputes total server-side, service-role insert | `VITE_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| `/api/notify` | POST | Twilio SMS to the store owner (new order / low stock). No-ops silently (`skipped: true`) if Twilio env vars aren't set | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `ADMIN_PHONE_NUMBER` |
| `/api/whatsapp` | POST | Outbound WhatsApp text (used by `notify.ts` for waitlist alerts) | `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` |
| `/api/whatsapp-webhook` | GET/POST | Meta webhook — receives inbound WhatsApp messages, runs a full Groq-powered WhatsApp shopping bot (browse products, place orders, join waitlist) directly against Supabase | same as above + Supabase service-role |

`api/_lib/groqClient.js` is shared by `/api/chat` and `/api/whatsapp-webhook` — retries with exponential backoff + jitter, honors `Retry-After`, 20s timeout. Model config lives in exactly one place — don't duplicate it.

---

## 8. Environment Variables (set in Vercel → Settings → Environment Variables)

| Variable | Used by | Required for |
|---|---|---|
| `VITE_SUPABASE_URL` | frontend + server | Supabase connection (both client & server) |
| `VITE_SUPABASE_ANON_KEY` | frontend | Client-side reads (RLS-governed) |
| `SUPABASE_SERVICE_ROLE_KEY` | server only (`api/_lib/supabaseServer.js`) | Secure order insert, WhatsApp bot DB access — never expose to frontend |
| `GROQ_API_KEY` | server (`api/_lib/groqClient.js`) | AI assistant (admin + store + WhatsApp bot) |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_PHONE_NUMBER` / `ADMIN_PHONE_NUMBER` | `api/notify.js` | Owner SMS alerts (optional — silently skipped if unset) |
| `WHATSAPP_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` | `api/whatsapp.js`, `api/whatsapp-webhook.js`, `api/_lib/waClient.js` | WhatsApp send + bot (optional — logs error and skips if unset) |

Vercel MCP/connector tools cannot write environment variables — always set these manually at `vercel.com/brohi1945s-projects/abos-dashboard/settings/environment-variables`.

---

## 9. Feature-by-Feature Breakdown

### Landing (`screens/Landing.tsx`)
Marketing page with a sales-trend chart preview, CTA buttons → Login or Store.

### Login (`screens/Login.tsx`)
Admin/Customer role toggle. Admin uses real Supabase Auth; Customer just navigates through.

### Store (`screens/Store.tsx`)
Public storefront: product browsing/filtering by `CATEGORIES`, cart, checkout → `onPlaceOrder` → `/api/place-order`. Includes `CustomerAssistantWidget` — a floating AI chat (same "ABI" persona, Roman Urdu) that can answer product questions, place orders on the customer's behalf, and join a waitlist for out-of-stock items. Supports voice input/output too.

### Admin shell (`screens/AdminApp.tsx`)
Owns all cross-cutting admin state and handlers (`handleAddProduct`, `handleEditProduct`, `handleUpdateStatus`, `handlePOSCheckout`, `handleCreateOrder`, etc.), renders `Sidebar` + `Topbar` (from `components/layout.tsx`) and routes `section` to the matching view in `views/`. The AI Assistant is not a routed page — it's a persistent overlay mounted once here (`assistantMode: "closed" | "minimized" | "full"`) so voice replies never get cut off mid-sentence by a section switch.

### Dashboard, Orders, Inventory, Customers, Waitlist, POS, Accounting, Business Intelligence, Marketing (`views/*View.tsx`)
Standard CRUD/reporting screens, all theme-aware (use `bg-app`, `text-fg`, `bg-brand`, etc — never hardcoded colors), all driven by the state/handlers passed down from `AdminApp`.
- **BusinessIntelligenceView / AccountingView / AssistantView** all reuse the exact same formulas from `lib/utils.ts` (`computeWeeklyTrend`, `computeProductInsights`) so numbers never disagree between tabs and the AI assistant's answers.
- **WaitlistView** shows FIFO position, reservation countdowns, and manual controls for the system in `lib/waitlist.ts`.

### AI Assistant "ABI" (`views/AssistantView.tsx` + `lib/aiHelpers.tsx`)
See full breakdown in Section 10.

### Theme system (Light / Dark / Colorful)
See full breakdown in Section 11.

---

## 10. AI Assistant System ("ABI") — full architecture

There are three separate AI surfaces, all sharing the same Groq backend and the same persona name (`ASSISTANT_NAME = "ABI"`, changeable in exactly one place per file):

1. **Admin assistant** — `views/AssistantView.tsx` (full chat panel + minimized floating bubble, persistent overlay in `AdminApp`)
2. **Store assistant** — `CustomerAssistantWidget` inside `screens/Store.tsx` (customer-facing, can place real orders)
3. **WhatsApp bot** — `api/whatsapp-webhook.js` (fully server-side, no UI, replies inbound WhatsApp messages)

### Request flow (admin/store, web)
```
User types/speaks → send(text)
   → local command interceptors first (see below) — if matched, handled locally, LLM never called
   → else: callClaude(systemPrompt, history, userText)   [lib/aiHelpers.tsx]
       → POST /api/chat  { systemPrompt, messages }
       → api/chat.js → callGroq()  [api/_lib/groqClient.js]
       → Groq returns raw text
   → parseAssistantReply(raw) → { reply: string, action: {...} | null }
   → reply is shown + spoken (if voice output on)
   → if action present, the matching handler in AdminApp/Store runs it (add_product, create_order, etc.)
```

### LLM output contract
The system prompt forces the model to reply with raw JSON only:
```json
{"reply": "message in Roman Urdu", "action": null}
```
or with a populated `action`, e.g.:
```json
{"type": "add_product", "name": "...", "category": "...", "price": 100, "cost": 70, "stock": 20, "threshold": 10, "barcode": ""}
{"type": "edit_product", "productId": "P001", "fields": {"price": 120, "stock": 15}}
{"type": "delete_product", "productId": "P001"}
{"type": "update_order_status", "orderId": "ORD-1042", "status": "confirmed"}
{"type": "create_order", "customer": "...", "phone": "", "channel": "Store", "status": "pending", "items": [{"productId": "P001", "qty": 2}]}
{"type": "add_customer", "name": "...", "phone": "...", "email": ""}
{"type": "add_campaign", "name": "...", "channel": "WhatsApp", "status": "Active", "sent": 0, "opened": 0, "clicked": 0}
```
`parseAssistantReply` strips markdown fences and extracts the outermost `{...}` before `JSON.parse`.

### The assistant is given live business context
Every admin-assistant request builds a `storeContext` JSON blob (revenue, profit estimate, margins, best sellers, dead stock, top customers, campaign performance, pending orders, etc — all computed with the same functions the dashboards use) and embeds it directly in the system prompt so ABI's numbers are always grounded in real data, never invented.

### Locally-intercepted commands (never sent to the LLM)
The LLM cannot flip UI state directly, so three categories of command are pattern-matched before anything is sent to Groq (`lib/voiceCommands.ts`):

| Command type | Detector | Examples | Effect |
|---|---|---|---|
| Voice output toggle | `detectVoiceToggleCommand()` | "voice mein baat karo", "chup ho jao", "mute kardo" | Flips `voiceEnabled` (text-to-speech) |
| Section navigation | `detectNavigationCommand()` | "inventory kholo", "business intelligence par le jao" | Calls `onSectionChange(key)` |
| **Theme switch** | `detectThemeCommand()` | "dark mode laga do", "colorful theme kar do", "light theme on karo" | Calls `setTheme(mode)` from `ThemeProvider` |

This same pattern should be used for any future "control the app" voice command — add a detector function to `voiceCommands.ts` and intercept it early in `send()` inside `AssistantView.tsx` (and `Store.tsx`'s widget, if customer-facing).

### Voice I/O
- `lib/useVoiceInput.ts` — Web Speech API (`SpeechRecognition`), `lang: "en-US"` on purpose (the Urdu recognizer transcribes into Urdu script; the English recognizer phonetically spells Roman Urdu in Latin letters, which matches the app's Roman Urdu design). Auto-pauses while ABI is speaking so it doesn't hear itself.
- `lib/useVoiceOutput.ts` — `speechSynthesis`, `lang: "en-IN"` (reads Latin-script Roman Urdu more naturally than `ur-PK`, which expects real Urdu script). Off by default; toggled by the speaker icon or a voice command.

### WhatsApp bot (`api/whatsapp-webhook.js`)
A parallel, fully server-side implementation of the same idea — receives Meta webhook events, calls `callGroq()` + `parseReply()` directly (no HTTP hop through `/api/chat`), and can browse products / place orders / manage waitlist entries straight against Supabase using the service-role client. Waitlist helper functions here are a Node-adapted copy of `src/lib/waitlist.ts` — keep both in sync if the waitlist logic changes.

---

## 11. Theme System (Light / Dark / Colorful) — manual + AI-controlled

The entire app is styled through Tailwind utility classes that resolve to CSS variables (`tailwind.config.js` maps `bg-app`, `text-fg`, `bg-brand`, `border` etc → `var(--color-bg)`, `var(--color-text)`, `var(--color-primary)`...). This means adding/changing a theme never requires touching individual components — only `src/theme/colors.ts` (JS palette, used by charts) and `src/theme/tokens.css` (CSS variables) need to stay in sync.

### The three themes
| Mode | Feel | CSS class on `<html>` |
|---|---|---|
| `light` | Clean, bright, default light SaaS look | *(none)* |
| `dark` | Default theme — deep navy/slate | `.dark` |
| `colorful` | "Aurora" — deep violet-black bg, electric purple→pink brand gradient, glowing radial background | `.colorful` |

### How switching works (`src/theme/ThemeProvider.tsx`)
- Context exposes: `mode`, `setTheme(mode)` (exact), `cycleTheme()` (light→dark→colorful→light).
- Persisted to `localStorage` under key `abos-theme`; falls back to system `prefers-color-scheme` on first visit (dark by default if no preference).
- On mode change, `<html>` gets exactly one of `.dark` / `.colorful` (or neither, for light).

### 1) Manual switching
`components/layout.tsx` → `Topbar` renders a `ThemeSwitcher` — a 3-icon pill (Sun / Moon / Palette) using `useTheme()` directly from context (no prop drilling needed since `ThemeProvider` wraps the whole app in `App.tsx`). Tapping an icon calls `setTheme(key)` directly.

### 2) AI / voice switching
Covered in Section 10's command table — `detectThemeCommand()` in `lib/voiceCommands.ts` matches phrases (typed or spoken, since both paths go through the same `send()` function) and calls `setTheme()`. Recognized phrasing patterns (extend this list in `voiceCommands.ts` if new phrasings are needed):
- **Colorful:** "colorful theme/mode", "rangeen theme", "vibrant theme", "aurora theme"
- **Dark:** "dark mode/theme", "theme dark karo/laga/banao", "kaala theme"
- **Light:** "light mode/theme", "theme light karo/laga/banao", "white theme", "roshan theme"

### Adding a 4th theme in future
1. Add a new palette object to `src/theme/colors.ts` + `PALETTES` map.
2. Add a matching `.your-theme-name { --color-*: ... }` block to `tokens.css`.
3. Add `"your-theme-name"` to the `ThemeMode` union + `THEME_MODES` array in `ThemeProvider.tsx`.
4. Add an icon/option to `ThemeSwitcher` in `layout.tsx`.
5. Add detection phrases to `THEME_KEYWORDS` in `voiceCommands.ts`.

---

## 12. Coding Conventions & Principles (read before making changes)

- **Comments are written in Roman Urdu** throughout the codebase, especially around security-sensitive or non-obvious logic — keep this convention.
- **Single source of truth files** — never duplicate these, always edit in place:
  - Nav items / categories / order statuses → `src/config/app.config.ts`
  - Theme colors → `src/theme/colors.ts` and `src/theme/tokens.css` (must stay in sync)
  - Groq model/config → `api/_lib/groqClient.js`
  - Assistant persona name → the `ASSISTANT_NAME`/`STORE_ASSISTANT_NAME` constant at the top of `AssistantView.tsx` / `Store.tsx`
- **Never hardcode colors** in components — always use the Tailwind semantic classes (`bg-app`, `bg-surface`, `text-fg`, `text-muted`, `bg-brand`, `bg-accent`, `bg-success`, `bg-danger`, `bg-warning`, `border`) so all 3 themes work automatically.
- **Never trust client-provided price/total for real money-moving actions** — see `/api/place-order`'s pattern (server re-fetches truth from DB) and follow it for any new checkout-like flow.
- **Any new "the AI should be able to control the UI" feature** — don't try to make the LLM emit a UI-control action; instead add a local regex detector in `voiceCommands.ts` and intercept it in `send()` before the LLM call (see Section 10).
- **Build log errors are the most reliable diagnostic method** on Vercel — a 429 in runtime logs = AI provider rate limit; a syntax error in build logs (often "Expected '>' but found end of file" around a specific line) = a file got truncated, almost always from copy-pasting a large file on mobile instead of using GitHub's "Upload files".
- **Mobile GitHub editing workflow:** large files must be replaced via "Upload files", not copy-paste into the inline editor (copy-paste reliably truncates around line ~1950).

---

## 13. Known Gaps / TODO

- **Customers are not persisted to Supabase** — no `customers` table wired up yet; customer list resets on refresh. Products, orders, and waitlist already persist correctly.
- **No cron for waitlist reservation expiry** — expired reservations are only released when the app happens to load (`expireStaleReservations` in `App.tsx`'s init effect). Fine for a prototype; would need a real cron/scheduled function for production scale.
- **RLS policies on Supabase tables** should be reviewed now that most writes go through service-role server functions — confirm no over-permissive anon-key write policies remain.
- **Twilio/WhatsApp env vars are optional** — if unset, those notification paths silently no-op (`skipped: true`) rather than breaking the app; check Vercel env vars if the owner reports not receiving alerts.
