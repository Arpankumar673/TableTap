# Changelog

All notable changes to the TableTap project are documented in this file.

---

## [0.2.0] - 2026-11-12
### Changed — Single-Restaurant Architecture Refactor
- **Architecture Shift:** Converted TableTap from a multi-tenant SaaS architecture into a streamlined Single-Restaurant QR Ordering & Operations Platform.
- **Database Migration (`SINGLE_RESTAURANT_MIGRATION.sql` & `supabase/migrations/20261112000001_single_restaurant_refactor.sql`):**
  - Replaced `restaurants` & `restaurant_memberships` with singleton `restaurant_settings` and `profiles.role` (`'admin' | 'kitchen'`) protected by `prevent_profile_role_escalation()`.
  - Renamed `restaurant_tables` -> `tables` without losing table IDs, QR tokens, or sessions.
  - Safely stripped `restaurant_id` columns and tenant triggers after migrating data and replacing RLS policies with `is_admin()` / `is_staff()`.
  - Normalized order status lifecycle to `new -> accepted -> preparing -> ready -> completed (+ cancelled)`.
- **Routing & UI Refactor:**
  - Retired `/register`, `/onboarding`, and `/r/[slug]`.
  - Added `/menu` (`src/app/(public)/menu/page.tsx`) as the canonical single-restaurant menu; `/t/[token]` validates table QR tokens and redirects to `/menu?session=...`.
  - Removed `restaurantId`, `restaurantSlug`, `owner`, and tenant filters from Admin, Kitchen, API routes, and Realtime subscriptions.
  - Added `vercel.json` configuring `"framework": "nextjs"`.
- **Verification & Reporting:**
  - Updated Vitest suite (23/23 passing), verified `tsc --noEmit`, `next lint`, and `next build` (21/21 routes).
  - Authored `REFACTORING_AUDIT_REPORT.md`, `SINGLE_RESTAURANT_ARCHITECTURE.md`, `DATABASE_MIGRATION_REPORT.md`, `REMOVED_FEATURES_REPORT.md`, `IMPLEMENTATION_REPORT.md`, and `TESTING_REPORT.md`.

---

## [0.1.0] - 2026-11-05
### Added — Initial Phase 1 Foundation
- Initialized Next.js App Router structure, editorial culinary design system, shadcn/ui primitives, base schema types, Zod validation, and product landing page.
