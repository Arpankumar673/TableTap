# TableTap

> **Multi-Tenant QR-Based Restaurant Ordering & Operations SaaS Platform**

TableTap digitizes dine-in ordering for hospitality venues with zero app installation required by guests. Diners scan a unique cryptographic QR code at their table, browse a hospitality-grade editorial menu, customize dishes, submit orders validated server-side, track live kitchen progress, request the bill, or settle via Razorpay checkout.

Incoming tickets stream in real time to the Kitchen Display System (KDS), while restaurant owners manage menus, QR codes, orders, and business analytics from an isolated multi-tenant Admin Dashboard.

---

## Three Strictly Scoped Interfaces

1. **Interface A — Customer Ordering Website (`/demo`, `/t/[token]`, `/r/[slug]`, `/order/[publicToken]`):**
   - Warm editorial culinary theme (`#FCFBF7` cream, `#1B5E3A` forest green, `#DC3522` tomato red, `#F58220` spice).
   - Real-time category filtering, dish search, and `Veg` / `Non-Veg` / `Vegan` / `Egg` dietary indicators.
   - Variant & modifier customizer drawer, table session banner, persistent cart, and duplicate-safe checkout.
   - Live order status tracker, `Request Bill`, and optional Razorpay online payment.

2. **Interface B — Kitchen Display System (`/kitchen`):**
   - High-contrast dark operations console optimized for kitchen tablets & displays.
   - Supabase Realtime WebSocket stream with automatic polling fallback.
   - Preparation station routing (`Main Kitchen`, `Pizza`, `Grill`, `Beverages`, `Desserts`), elapsed ticket timers, delayed-order alerts, item-level status controls, and audio notification bell with mute toggle.

3. **Interface C — Restaurant Admin Dashboard (`/admin/*`):**
   - **Overview & Analytics (`/admin`, `/admin/analytics`):** Revenue trends (Recharts), top dishes, payment/status breakdowns, and CSV export.
   - **Menu Management (`/admin/menu`):** Categories, dishes, variants, option groups, image uploads, stock toggles, and 1-click 14-category sample menu + 4 starter QR seeder.
   - **Tables & QR Codes (`/admin/tables`):** Cryptographic SHA-256 QR token generation, regeneration, revocation, single PNG download, bulk ZIP download, and print cards.
   - **Order Audit & Settings (`/admin/orders`, `/admin/settings`):** Full order inspection, bill settlement, tax/service charge settings, station creation, and owner-only kitchen login provisioning.

---

## Tech Stack

- **Framework:** Next.js `14.2.35` (App Router, Server Components, Server Actions, Edge Middleware)
- **Language:** TypeScript `5.9.3` & React `18.3.1`
- **Styling & UI:** Tailwind CSS `3.4.19`, shadcn/ui (`@radix-ui/*`), `lucide-react`, `framer-motion`, `recharts`
- **Database, Auth, Storage & Realtime:** Supabase (`@supabase/supabase-js@2.119.0`, `@supabase/ssr@0.5.2`)
- **Payments & QR:** Razorpay REST API + HMAC-SHA256 Checkout/Webhook Verification, `qrcode`, `jszip`
- **Validation & Testing:** Zod `3.25.76`, React Hook Form `7.91.0`, Vitest `2.1.9`

---

## Quickstart (`C:\Projects\TableTap`)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure `.env.local`
```bash
cp .env.example .env.local
```
Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and optionally `RAZORPAY_*` keys.

### 3. Initialize Supabase Database (Manual Step)
Open **Supabase Dashboard -> SQL Editor** and execute the entire contents of:
```text
C:\Projects\TableTap\supabase\SQL_SETUP_COMPLETE.sql
```

### 4. Run Local Development Server & Verification
```bash
npm run dev          # Start at http://localhost:3000
npm test             # Run 22 Vitest unit tests
npm run type-check   # TypeScript strict verification
npm run lint         # ESLint verification
npm run build        # Compile production bundle
```

---

## Project Documentation

- [PROJECT_STATUS.md](PROJECT_STATUS.md) — Current build & milestone status
- [ENVIRONMENT_SETUP.md](ENVIRONMENT_SETUP.md) — Setup, env vars & manual SQL deployment steps
- [API_DOCUMENTATION.md](API_DOCUMENTATION.md) — REST endpoints, Server Actions & Supabase RPCs
- [SECURITY_DOCUMENTATION.md](SECURITY_DOCUMENTATION.md) — Multi-tenant RLS, QR hashing, server pricing & HMAC security
- [TESTING_REPORT.md](TESTING_REPORT.md) — Observed test, lint, type-check & production build outputs
- [PHASE_2_COMPLETION_REPORT.md](PHASE_2_COMPLETION_REPORT.md) — Complete database & security report
- [CHANGELOG.md](CHANGELOG.md) — Version history (`0.1.0` -> `0.2.0`)
- Architectural Specs: [docs/](docs/README.md) (`01_PRD.md` through `08_SECURITY_AND_TESTING.md`)
