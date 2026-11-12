# TableTap — Phase 1: Single-Restaurant Refactoring Audit Report

**Prepared Before Code Changes (Phase 1)**  
**Workspace:** `C:\Projects\TableTap`  
**Objective:** Refactor TableTap from a multi-tenant SaaS architecture (`restaurants` + `restaurant_memberships` + `restaurant_id` tenant scoping) into a clean, production-ready **Single-Restaurant QR-Based Ordering & Management System**.

---

## 1. Existing Architecture & Specification Audit

Inspected all specification documents (`docs/01_PRD.md`, `02_TRD.md`, `03_SYSTEM_ARCHITECTURE.md`), existing SQL schemas (`supabase/migrations/20261105000001_initial_schema.sql`, `supabase/SQL_SETUP_COMPLETE.sql`, `supabase/tests/rls_multi_tenant_verification.sql`), and all Next.js App Router source files (`src/` and `tests/`).

### Identified Multi-Tenant Entities & Dependencies

1. **Multi-Tenant Database Tables & Columns:**
   - `public.restaurants` (tenant root) & `public.restaurant_memberships` (`owner`/`admin`/`kitchen` per tenant)
   - `restaurant_id` foreign keys & composite constraints across:
     `categories`, `preparation_stations`, `products`, `product_variants`, `option_groups`, `option_values`, `restaurant_tables`, `table_qr_tokens`, `table_sessions`, `orders`, `order_items`, `order_status_events`, `payments`
   - Tenant-scoped triggers & helpers: `prevent_restaurant_id_change()`, `get_user_restaurant_role(UUID)`, `is_restaurant_member(UUID)`, `onboard_restaurant(...)`
   - Tenant folder storage check: `((storage.foldername(name))[1])::UUID` in `storage.objects` policies.

2. **Multi-Tenant Auth, Registration & Routing:**
   - `src/app/(auth)/register/page.tsx` — Multi-restaurant owner registration + slug generator calling `onboard_restaurant`.
   - `src/app/onboarding/page.tsx` — New restaurant workspace creation screen.
   - `src/app/(public)/r/[slug]/page.tsx` — Tenant slug-based customer menu URL (`/r/[slug]`).
   - `src/lib/auth/session.ts` — `getOptionalMemberContext(preferredRestaurantId)` & `requireRestaurantRole(...)` querying `restaurant_memberships` + returning `allRestaurants`.
   - `src/middleware.ts` — Protecting `/onboarding` alongside `/admin` and `/kitchen`.
   - `src/types/roles.ts` — Uses `"owner" | "admin" | "kitchen"` and `RestaurantMembership`.
   - `src/lib/validation/auth.ts` & `restaurant.ts` — Includes `restaurantRegisterSchema` (multi-tenant signup) and `slug` field requirements.

3. **Backend Services, Server Actions & Queries Passing `restaurant_id` / `restaurantSlug`:**
   - `src/app/actions/admin-menu.ts`, `admin-tables.ts`, `admin-settings.ts`
   - `src/app/api/payments/razorpay/create-order/route.ts`
   - `src/app/(admin)/layout.tsx`, `admin/page.tsx`, `menu/page.tsx`, `tables/page.tsx`, `orders/page.tsx`, `analytics/page.tsx`, `settings/page.tsx`
   - `src/app/(kitchen)/kitchen/page.tsx`
   - `src/app/t/[token]/page.tsx` (redirects to `/r/${restaurant_slug}?session=...` instead of `/menu?session=...`)

4. **Frontend Multi-Tenant Props & Copy:**
   - `src/components/admin/admin-sidebar.tsx` (`restaurantSlug`, `"Multi-Tenant RLS Active"`, `/r/${restaurantSlug}` link)
   - `src/components/admin/menu-manager.tsx`, `table-qr-manager.tsx`, `orders-manager.tsx`, `settings-manager.tsx` (`restaurantId`, `restaurantSlug`, `"Owner only"` kitchen provisioning check, `${restaurantId}/...` storage paths)
   - `src/components/kitchen/kitchen-board.tsx` (`restaurantId`, Realtime filter `restaurant_id=eq.${restaurantId}`)
   - `src/app/page.tsx` (`"Multi-Tenant Restaurant Operating System"`, `/register` CTAs, `"Tenant ID: TT-8821"`)

5. **Order Lifecycle Alignment:**
   - Current workflow uses `pending -> accepted -> preparing -> ready -> served -> completed` (+ `cancelled`).
   - Target single-restaurant workflow requested: `new -> accepted -> preparing -> ready -> completed` (+ `cancelled`).

---

## 2. Safe Refactoring & Non-Destructive Migration Plan

1. **Roles:** Simplify to strictly `admin` and `kitchen` (stored directly in `public.profiles.role`), with anonymous `customer` access scoped via cryptographic table QR / session / order tokens.
2. **Database Migration (`SINGLE_RESTAURANT_MIGRATION.sql`):**
   - Never drop existing tables or destroy existing product/order data.
   - Introduce singleton `public.restaurant_settings` (backfilled from `public.restaurants`), add `role` to `public.profiles` (backfilled from `restaurant_memberships`), rename `public.restaurant_tables` -> `public.tables` (preserving UUIDs and relationships), remove `restaurant_id` columns & multi-tenant triggers safely after replacing RLS policies, add `'new'` to `order_status` (migrating `'pending' -> 'new'` and `'served' -> 'ready'`), add `public.is_admin()` / `public.is_staff()` helpers, lock down legacy `restaurants` & `restaurant_memberships` tables without destructive `DROP`s, and update all RPCs + Realtime publication + Storage policies.
3. **Routes:** Remove `/register`, `/onboarding`, and `/r/[slug]`; introduce single-restaurant `/menu` route (`/t/[token]` redirects to `/menu?session=...`).
4. **Verification:** Update Vitest unit suite (`tests/`), verify `npm test`, `npm run type-check`, `npm run lint`, and `npm run build`, and generate all required single-restaurant deliverables & reports.
