# TableTap — Removed Multi-Tenant Features Report

**Refactor Milestone:** Multi-Tenant SaaS -> Single-Restaurant System  
**Workspace:** `C:\Projects\TableTap`

---

## 1. Removed Multi-Tenant Routes & UI Flows

| Removed Feature / File | Previous Multi-Tenant Purpose | Replacement / Behavior |
|---|---|---|
| `src/app/(auth)/register/page.tsx` | Self-service multi-restaurant owner signup + slug creation | Removed. Staff accounts are managed by Admin / Supabase Auth; public links direct guests to `/menu`. |
| `src/app/onboarding/page.tsx` | Workspace creation wizard calling `onboard_restaurant` | Removed. Restaurant operates on singleton `public.restaurant_settings`. |
| `src/app/(public)/r/[slug]/page.tsx` | Dynamic multi-tenant URL routing (`/r/<restaurant-slug>`) | Replaced cleanly with single-restaurant route `/menu` (`src/app/(public)/menu/page.tsx`). |
| Tenant & Owner UI Strings | `"Multi-Tenant Restaurant Operating System"`, `"Tenant ID: TT-8821"`, `"Multi-Tenant RLS Active"`, `"Owner only"` | Replaced with single-restaurant branding, `"Single-Restaurant RLS Active"`, and `"admin"` / `"kitchen"` role checks. |
| Public Menu Slug Field (`settings-manager.tsx`) | Editable `slug` column on `restaurants` | Removed from settings UI and `restaurantSettingsSchema`. |

---

## 2. Removed Backend, Auth & Database Logic

| Component / Function | Removed Multi-Tenant Logic |
|---|---|
| `src/types/roles.ts` | Removed `"owner"` role and `RestaurantMembership` interface; strictly `"admin" | "kitchen"`. |
| `src/lib/auth/session.ts` | Removed `preferredRestaurantId`, `allRestaurants`, `getOptionalMemberContext()`, `requireRestaurantRole()`, and `/onboarding` redirect; replaced with `getOptionalStaffContext()` and `requireStaffRole()`. |
| `src/middleware.ts` | Removed `/onboarding` protected route rule. |
| `src/lib/validation/auth.ts` | Removed `restaurantRegisterSchema` (multi-tenant signup + slug validation). |
| `src/app/t/[token]/page.tsx` | Removed `restaurant_slug` validation & `/r/[slug]` redirect; now redirects to `/menu?session=...`. |
| `src/app/api/payments/razorpay/*` | Removed `restaurant_id` query and insert columns on `payments` and `orders`. |
| `src/app/actions/admin-*.ts` & Admin Pages | Removed `restaurantId`, `restaurantSlug`, `.eq("restaurant_id", ...)` filters, and tenant folder upload paths (`${restaurantId}/...`). Renamed `restaurant_tables` queries to `tables`. |
| `src/components/kitchen/kitchen-board.tsx` | Removed `restaurantId` prop and `filter: restaurant_id=eq.${restaurantId}` on Supabase Realtime subscriptions. |
| PostgreSQL (`SINGLE_RESTAURANT_MIGRATION.sql`) | Dropped `onboard_restaurant(...)`, `get_user_restaurant_role(UUID)`, `is_restaurant_member(UUID)`, `prevent_restaurant_id_change()`, tenant `trg_*_immutable_tenant` triggers, multi-tenant RLS policies, and `restaurant_id` columns across 13 tables. Replaced `supabase/tests/rls_multi_tenant_verification.sql` with `rls_single_restaurant_verification.sql`. |

---

## 3. Scope Preserved Intact

All core hospitality features remain fully intact and operational:
- Premium editorial customer menu, search, dietary markers, variants, add-on groups, cart persistence, bill request, live order tracking, and Razorpay checkout.
- Cryptographic SHA-256 QR token resolution, revocation, PNG/ZIP download, and printable table cards.
- Real-time Kitchen Display System (KDS) with station routing, urgency timers, item-level progress, audio chime with mute toggle, and reconnect polling fallback.
- Restaurant Admin overview, analytics (Recharts + CSV export), menu CMS + 1-click 14-category seeder, order audit log, and kitchen tablet provisioning.
