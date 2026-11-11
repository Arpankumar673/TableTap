# TableTap — Phase 2 Database & Security Completion Report

**Project Location:** `C:\Projects\TableTap`  
**Phase Status:** Application & Database Schema Ready (Awaiting Manual Execution of `supabase/SQL_SETUP_COMPLETE.sql` in Supabase Dashboard)  
**Target Version:** `0.2.0`

---

## 1. Database Architecture & Design

TableTap implements a single-database, row-isolated multi-tenant PostgreSQL architecture optimized for Supabase SSR and Realtime WebSockets. Every tenant-scoped operational table mandates `restaurant_id UUID REFERENCES public.restaurants(id)` and delegates authorization to PostgreSQL Row Level Security (RLS) policies and `SECURITY DEFINER` stored procedures.

## 2. Tables Implemented (18 Public Tables + 6 Enums)

### Enum Types (`6`)
`user_role`, `dietary_type`, `order_status`, `order_item_status`, `payment_status`, `session_status`

### Core Entities (`18`)
1. `restaurants` — Tenant root configuration (slug, currency, timezone, tax, service charge, opening hours, acceptance toggle)
2. `profiles` — Synced mirror of `auth.users` metadata
3. `restaurant_memberships` — Tenant-user role mapping (`owner`, `admin`, `kitchen`)
4. `categories` — Menu sections with sort order and active state
5. `preparation_stations` — Kitchen routing stations (`Main Kitchen`, `Pizza`, `Grill`, `Beverages`, `Desserts`)
6. `products` — Menu items with dietary flags, base prices, prep times, images, featured/available flags
7. `product_variants` — Size/portion price overrides
8. `option_groups` — Modifier sets (`min_select`, `max_select`, `required`)
9. `option_values` — Modifier choices with `price_delta`
10. `product_option_groups` — Join mapping between products and modifier groups
11. `restaurant_tables` — Physical dine-in tables (`table_number`, `label`, `capacity`)
12. `table_qr_tokens` — SHA-256 hashed verification tokens + owner-only `qr_token_secret` for QR printing + revocation timestamps
13. `table_sessions` — Active dine-in customer sessions and `bill_requested` state
14. `orders` — Idempotent orders with `public_token`, `order_number`, canonical totals, `table_number_snapshot`, status, payment status
15. `order_items` — Immutable line item & station snapshots
16. `order_item_options` — Immutable modifier choice snapshots
17. `order_status_events` — Append-only order transition audit trail
18. `payments` — Razorpay/counter payment records linked by `restaurant_id`, `order_id`, and `provider_order_id`

## 3. Relationships, Indexes & Constraints

- Foreign keys connect child entities cleanly to `restaurants`, `orders`, `products`, and `restaurant_tables` with appropriate `ON DELETE CASCADE` / `ON DELETE SET NULL` semantics so historical receipts survive catalog pruning.
- Unique constraints enforce unique restaurant `slug`, per-restaurant `table_number`, active `session_token`, `public_token`, `idempotency_key`, and SHA-256 `token_hash`.
- Composite indexes prioritize multi-tenant KDS queries (`orders(restaurant_id, status)`, `order_items(order_id)`), category filtering, QR hash lookup, and `provider_order_id` payment webhook matching.

## 4. Row Level Security & Triggers

- RLS enabled on all 18 tables with helper functions `get_user_restaurant_role(UUID)` and `is_restaurant_member(UUID)`.
- Public `anon` read policies limited strictly to active `restaurants`, `categories`, `products`, `product_variants`, `option_groups`, `option_values`, and `product_option_groups`.
- `prevent_restaurant_id_change()` triggers prevent cross-tenant row reassignment across 9 core tenant tables.
- `set_updated_at_timestamp()` triggers automatically update `updated_at` timestamps across 11 operational tables.

## 5. Authentication & Onboarding Configuration

- `handle_new_auth_user()` trigger on `auth.users` provisions `public.profiles` rows upon signup.
- `onboard_restaurant(...)` RPC atomically initializes a new restaurant, owner membership, and 5 default preparation stations in one transaction.
- `provisionKitchenLoginAction` uses server-only `SUPABASE_SERVICE_ROLE_KEY` to allow restaurant owners to provision dedicated kitchen tablet logins (`kitchen` role).

## 6. QR Token & Guest Ordering Security

- Cryptographic 24-byte `base64url` QR tokens stored as SHA-256 digests (`token_hash`).
- Public order placement routed strictly through `POST /api/orders` -> `create_customer_order(...)` RPC, recalculating canonical prices, variants, add-ons, taxes, and service charges server-side.
- Guest order tracking isolated via `get_order_by_public_token` and `get_session_orders`.

## 7. Supabase Storage & Realtime Configuration

- Storage bucket `restaurant-assets` created with public read access and restaurant-folder-scoped `owner`/`admin` write/update/delete policies.
- `REPLICA IDENTITY FULL` and `supabase_realtime` publication enabled idempotently for `orders`, `order_items`, `order_status_events`, and `table_sessions`.

## 8. Framework Security Audit Summary

- Audited `next@14.2.24` against Next.js security advisory `security-update-2025-12-11`.
- Upgraded `next` and `eslint-config-next` to patched **`14.2.35`** alongside `react@18.3.1`.

## 9. Verification & Remaining Manual Steps

- **Verified Locally:** `npm test` (22/22 passed), `npm run type-check` (0 errors), `npm run lint` (0 warnings/errors), `npm run build` (22/22 routes built).
- **Remaining User Action:**
  1. Configure Supabase and Razorpay credentials in `C:\Projects\TableTap\.env.local` (from `.env.example`).
  2. Execute `C:\Projects\TableTap\supabase\SQL_SETUP_COMPLETE.sql` inside the Supabase Dashboard SQL Editor.
  3. Optionally execute `C:\Projects\TableTap\supabase\tests\rls_multi_tenant_verification.sql` in the SQL Editor to confirm all 10 live multi-tenant RLS assertions pass cleanly.
