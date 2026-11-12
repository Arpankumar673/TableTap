# TableTap — Single-Restaurant Architecture Specification

**Project:** TableTap (`C:\Projects\TableTap`)  
**Architecture Model:** Single-Restaurant QR Dine-In Ordering & Operations System  
**Stack:** Next.js 14.2.35 (App Router), React 18.3.1, TypeScript 5.9.3, Supabase (PostgreSQL + RLS + Auth + Storage + Realtime), Tailwind CSS, shadcn/ui, Razorpay

---

## 1. Core Architectural Objective

TableTap is architected exclusively for **one hospitality venue**:
- A single singleton restaurant configuration (`public.restaurant_settings`).
- Unlimited physical dining tables (`public.tables`), each bound to an unguessable cryptographic QR token (`public.table_qr_tokens`).
- Zero guest registration or app installation friction (`/t/[token]` -> `/menu?session=...`).
- Dedicated real-time Kitchen Display System (`/kitchen`) with preparation station routing and urgency thresholds.
- Unified Restaurant Admin Dashboard (`/admin/*`) for menu, tables/QRs, live order audit, analytics, and settings.

---

## 2. Role & Authorization Model

Strictly two authenticated staff roles stored in `public.profiles.role` (`user_role` enum), alongside anonymous QR-bound dine-in guests:

| Role | Access Routes | Privileges & Guardrails |
|---|---|---|
| **Customer (Guest)** | `/`, `/menu`, `/demo`, `/t/[token]`, `/order/[publicToken]` | No login required. Cannot query private tables directly (`orders`, `tables`, `table_qr_tokens`). Places orders strictly via verified `session_token` + `create_customer_order` RPC. |
| **`kitchen`** | `/kitchen` | Authenticated KDS access (`is_staff()`). Views orders/items, updates preparation statuses (`new -> accepted -> preparing -> ready -> completed`, or cancels only prior to active preparation). Cannot access `/admin/*`, settings, menu CRUD, or payments. |
| **`admin`** | `/admin/*`, `/kitchen` | Full single-restaurant control (`is_admin()`): profile/tax settings, categories/products/variants/options, tables & QR generation/revocation, payment recording, analytics, and provisioning dedicated `kitchen` login credentials. |

---

## 3. Application Route Topology

```text
/                               -> Restaurant Landing & Entry Portal
/menu                           -> Public Single-Restaurant Digital Menu (Browse or Active Table ?session=)
/t/[token]                      -> Cryptographic QR Validator -> Opens/Reuses Table Session -> Redirects to /menu?session=...
/order/[publicToken]            -> Live Guest Order Status Tracker (New -> Accepted -> Preparing -> Ready -> Completed) + Checkout
/demo                           -> Isolated Interactive Menu UI Preview
/login                          -> Staff Sign-In (Routes 'admin' -> /admin, 'kitchen' -> /kitchen)
/forgot-password                -> Staff Password Recovery
/setup-required                 -> Environment & Migration Instructions Fallback

/kitchen                        -> Kitchen Display System (Realtime Order Queue + Audio Alert + Station Filter)

/admin                          -> Restaurant KPI Overview & 7-Day Trend
/admin/orders                   -> Order Management, Status Audit & Counter Settlement
/admin/menu                     -> Categories, Dishes, Variants, Add-On Groups & 1-Click Sample Menu Seeder
/admin/tables                   -> Table Registry, Cryptographic QR Generator/Revoker, PNG/ZIP & Print Export
/admin/analytics                -> Revenue, Top Dishes, Category Mix & CSV Export
/admin/settings                 -> Singleton Restaurant Settings, Stations & Kitchen Account Provisioning

/api/qr/resolve                 -> Rate-limited SHA-256 QR resolution API
/api/orders                     -> Rate-limited Server-Validated Order Submission API
/api/payments/razorpay/*        -> Checkout Creation, HMAC-SHA256 Signature Verification & Webhook Handler
```

---

## 4. End-to-End Customer -> Kitchen Ordering Flow

1. **Table QR Generation (`/admin/tables`):** Admin creates Table `01`. Server generates a 24-byte `base64url` random token, stores its SHA-256 digest in `table_qr_tokens.token_hash` along with `qr_token_secret` for PNG/ZIP printing, and encodes `/t/<rawToken>`.
2. **QR Scan & Session Binding (`/t/[token]`):** Server hashes `rawToken` with SHA-256 and calls `resolve_table_qr(p_token_hash)`. PostgreSQL verifies active QR + active table + singleton `restaurant_settings`, opens or reuses an `open` row in `table_sessions`, and returns an opaque `session_token` redirecting to `/menu?session=<session_token>`.
3. **Cart & Canonical Order Placement (`POST /api/orders`):** Customer cart never sends prices or table IDs as trusted parameters. `create_customer_order` resolves `table_id` directly from `table_sessions`, prevents duplicates via `idempotency_key`, validates required options, calculates canonical pricing (`subtotal`, `tax`, `service_charge`, `total`), snapshots items/options/station names, sets status `'new'`, and appends an audit event.
4. **Realtime KDS Dispatch (`/kitchen`):** Supabase Realtime notifies the Kitchen Display immediately on `orders` / `order_items` changes (with 15s polling reconnect fallback) and plays an optional audio chime.
5. **Live Order Progress (`/order/[publicToken]`):** Guests monitor live steps (`New -> Accepted -> Preparing -> Ready -> Completed`) via Realtime + 8s fallback polling and can pay via Razorpay or at the counter.
