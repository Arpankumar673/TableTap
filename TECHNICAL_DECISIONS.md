# TableTap — Technical Decisions Record (TDR)

This document formalizes the architectural and engineering decisions made during Phase 1.

---

## TDR 01: Next.js App Router Monolithic Modular Architecture
- **Decision:** Use a single Next.js codebase with App Router route groups (`(public)`, `(admin)`, `(kitchen)`) rather than an independent micro-frontend or multi-repo setup.
- **Rationale:** 
  - Shared domain models, validation schemas (Zod), and Supabase client logic.
  - Zero cross-service deployment complexity.
  - Vercel edge/serverless scaling meets all performance criteria for MVP and multi-tenant expansion.
  - Avoids monorepo/Turborepo operational overhead while maintaining clean directory separation.

---

## TDR 02: Multi-Tenant PostgreSQL Row Level Security (RLS)
- **Decision:** Multi-tenancy is enforced natively in PostgreSQL using Supabase Row Level Security on every table, keyed by `restaurant_id`.
- **Rationale:**
  - Guarantees zero data leakage between competing restaurants at the database engine level.
  - Prevents accidental developer bugs where a `WHERE restaurant_id = ...` clause might be omitted in application queries.
  - Authenticated queries automatically execute in the context of the user's role via `auth.uid()` and `get_user_restaurant_role(restaurant_id)`.

---

## TDR 03: Guest-First QR Dine-In Authorization
- **Decision:** Diners are treated as guests and are NOT forced to sign up or install an application.
- **Rationale:**
  - Mandatory account registration or app downloads creates high drop-off friction at restaurant tables.
  - Authorization is established via a cryptographically random, revocable QR token attached to a physical table session.
  - Orders are submitted using a scoped `table_session_token` and an `idempotency_key`.

---

## TDR 04: Server-Side Canonical Price Calculation & Snapshotting
- **Decision:** Order totals and unit prices submitted by the client are strictly ignored and recalculated server-side against canonical database records.
- **Rationale:**
  - Prevents malicious client-side tampering with prices or discounts.
  - Every committed order item creates an immutable snapshot (`unit_price_snapshot`, `product_name_snapshot`, `station_name_snapshot`, `price_delta_snapshot`).
  - Guarantees historical receipts and financial accounting remain accurate even if restaurant owners alter menu prices or delete products later.

---

## TDR 05: Kitchen Display Station Routing Without Staff Management
- **Decision:** Route orders to preparation stations (e.g. Pizza, Grill, Bar, Desserts) purely through product metadata tags, avoiding any staff-management or employee-scheduling modules.
- **Rationale:**
  - Adheres strictly to the project scope and non-goals.
  - Operational efficiency requires line cooks to view relevant tickets without creating heavyweight human resource management overhead.

---

## TDR 06: Supabase Realtime with Polling Fallback
- **Decision:** Utilize Supabase Realtime (PostgreSQL replication events via WebSockets) as the notification mechanism, with a client-side polling reconnect fallback.
- **Rationale:**
  - Real-time notification guarantees kitchen orders appear in < 1 second.
  - PostgreSQL remains the single source of truth; if a kitchen tablet loses Wi-Fi, it refetches state upon reconnection, preventing dropped orders.

---

## TDR 07: Editorial Culinary Design System
- **Decision:** Customer interface adopts a warm editorial culinary aesthetic (warm cream backgrounds, forest green accents, tomato red indicators, spice highlights) rather than standard corporate SaaS UI or delivery clone layouts.
- **Rationale:**
  - Diners in premium restaurants expect an experience that feels customized to the venue's brand and hospitality ambiance.
  - Distinct visual systems: Editorial hospitality for customers, high-contrast dark utility for kitchen line cooks, and clean neutral SaaS for restaurant administrators.
