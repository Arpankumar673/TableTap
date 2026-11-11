# Changelog

All notable changes to the TableTap project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.2.0] - 2026-11-11
### Added & Changed — Multi-Tenant SaaS Implementation & Security Hardening
- **Framework Security Patch:**
  - Upgraded `next` and `eslint-config-next` from `14.2.24` to patched `14.2.35` (`react@18.3.1` preserved).
- **Complete Database Initialization & Security SQL:**
  - Authored idempotent `supabase/SQL_SETUP_COMPLETE.sql` configuring 18 tables, 6 enums, `handle_new_auth_user`, `prevent_restaurant_id_change` triggers, RBAC helpers, 11 transactional RPCs (`onboard_restaurant`, `resolve_table_qr`, `create_customer_order`, `get_order_by_public_token`, `get_session_orders`, `request_table_bill`, `resolve_session_context`, `update_order_status_secure`, `update_order_item_status_secure`), comprehensive RLS policies, `restaurant-assets` storage policies, and `supabase_realtime` publication.
  - Authored `supabase/tests/rls_multi_tenant_verification.sql` transaction-wrapped 10-assertion cross-tenant RLS test suite.
- **Authentication, Middleware & Setup:**
  - Implemented `src/middleware.ts`, `/login`, `/register` (with automatic onboarding), `/forgot-password`, `/onboarding`, and `/setup-required`.
  - Updated Supabase SSR client typings (`@supabase/ssr@0.5.2` + `@supabase/supabase-js@2.119.0`) with strict `Database` schema interfaces.
- **Interface A — Customer Ordering & Checkout:**
  - Built editorial menu & cart experience in `customer-menu-view.tsx`, interactive demo (`/demo`), QR table resolver (`/t/[token]`), slug menu (`/r/[slug]`), and live customer order tracking + bill request + Razorpay checkout (`/order/[publicToken]`).
  - Built `/api/qr/resolve`, `/api/orders`, and `/api/payments/razorpay/*` (`create-order`, `verify`, `webhook`) with rate limiting, SHA-256 token hashing, server-side pricing validation, idempotency, and timing-safe HMAC verification.
- **Interface B — Kitchen Display System (KDS):**
  - Built real-time dark KDS (`/kitchen`) supporting station routing tabs, elapsed ticket timers, warning/delayed visual thresholds, item-level status updates, sound notification chime with mute toggle, and reconnect polling fallback.
- **Interface C — Restaurant Admin Dashboard:**
  - Built `/admin` overview with Recharts analytics, `/admin/menu` CMS with Supabase Storage uploads and 1-click 14-category menu + 4 starter QR seeder (`seedSampleCatalogAction`), `/admin/tables` with QR generation/regeneration/revocation + PNG/ZIP/printable card export, `/admin/orders` audit inspector, `/admin/analytics` with CSV export, and `/admin/settings` with owner-only kitchen login provisioning (`provisionKitchenLoginAction`).
- **Automated Testing & Docs Pack:**
  - Added Vitest (`tests/*.test.ts`) with 22 passing unit tests across pricing, order state machine, token/HMAC security, and Zod schemas.
  - Added `API_DOCUMENTATION.md`, `SECURITY_DOCUMENTATION.md`, `TESTING_REPORT.md`, and `PHASE_2_COMPLETION_REPORT.md`.

---

## [0.1.0] - 2026-11-05
### Added — Phase 1: Project Initialization & Foundation
- Initialized Next.js App Router architecture, Tailwind CSS editorial palette, shadcn/ui primitives, base domain TypeScript models, Zod validation schemas, initial migration schema (`20261105000001_initial_schema.sql`), product landing page, and Phase 1 docs pack.
