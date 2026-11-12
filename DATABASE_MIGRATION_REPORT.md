# TableTap — Database Migration Report

**Migration Script:** [SINGLE_RESTAURANT_MIGRATION.sql](file:///C:/Projects/TableTap/SINGLE_RESTAURANT_MIGRATION.sql)  
**Versioned Migration Copy:** [20261112000001_single_restaurant_refactor.sql](file:///C:/Projects/TableTap/supabase/migrations/20261112000001_single_restaurant_refactor.sql)  
**Verification Script:** [rls_single_restaurant_verification.sql](file:///C:/Projects/TableTap/supabase/tests/rls_single_restaurant_verification.sql)

---

## 1. Summary of Structural Changes

Transitioned PostgreSQL from the previous multi-tenant SaaS model to a single-restaurant schema **without dropping historical tables or destroying existing catalog/order rows**.

### Core & Supporting Entities
- **`public.restaurant_settings` (New Singleton Root):** Enforces at most one row via `singleton_key BOOLEAN NOT NULL DEFAULT true UNIQUE CHECK (singleton_key = true)`. Automatically backfills from `public.restaurants` (`ORDER BY created_at ASC LIMIT 1`) if migrating an existing database, or inserts sensible defaults if empty.
- **`public.profiles`:** Added `role user_role NOT NULL DEFAULT 'kitchen'` and `active BOOLEAN NOT NULL DEFAULT true`. Automatically backfills existing `restaurant_memberships` (`owner` / `admin` -> `'admin'`, `'kitchen'` -> `'kitchen'`). Protected by trigger `prevent_profile_role_escalation()` so non-admins cannot elevate themselves.
- **`public.tables`:** Safely renames `public.restaurant_tables` -> `public.tables` (`ALTER TABLE ... RENAME TO tables`) when present, preserving UUIDs and existing QR/session/order foreign keys.
- **`public.categories`, `preparation_stations`, `products`, `product_variants`, `option_groups`, `option_values`, `product_option_groups`, `table_qr_tokens`, `table_sessions`, `orders`, `order_items`, `order_item_options`, `order_status_events`, `payments`:**
  - Removed multi-tenant `restaurant_id` columns safely (`DROP COLUMN restaurant_id CASCADE`) *after* removing old multi-tenant RLS policies and `trg_*_immutable_tenant` triggers.
  - Added single-restaurant unique constraints (`categories_slug_unique`, `preparation_stations_name_unique`, `products_slug_unique`, `tables_table_number_unique`, `orders_order_number_unique`, `orders_idempotency_key_unique`) with safe collision deduplication prior to constraint creation.
- **Order Status Lifecycle Upgrade:**
  - Extended `order_status` enum cleanly with `'new'`.
  - Migrated legacy `'pending'` -> `'new'` and `'served'` -> `'completed'` across `orders` and `order_status_events`, and set column default to `'new'::order_status`.

---

## 2. Single-Restaurant Authorization & Security Controls

- Replaced `get_user_restaurant_role(UUID)` and `is_restaurant_member(UUID)` with:
  - `public.get_current_user_role()` (`SECURITY DEFINER`, `SET search_path = public, extensions`)
  - `public.is_admin()`
  - `public.is_staff()`
- Replaced `handle_new_auth_user()` so new users default to least-privilege `'kitchen'` unless `raw_app_meta_data->>'role'` specifies `'admin'` or `'kitchen'`.
- Replaced `storage.objects` policies on bucket `restaurant-assets` to enforce `public.is_admin()` without requiring tenant UUID folder prefixes.
- Configured `REPLICA IDENTITY FULL` and `supabase_realtime` publication idempotently for `orders`, `order_items`, `order_status_events`, and `table_sessions`.
- Locked down legacy `public.restaurants` and `public.restaurant_memberships` tables (`ENABLE ROW LEVEL SECURITY` with zero permissive policies) rather than blindly dropping them.

---

## 3. Execution Instructions (Supabase Dashboard SQL Editor)

1. Open **Supabase Dashboard -> SQL Editor -> New query**.
2. Paste the entire contents of `C:\Projects\TableTap\SINGLE_RESTAURANT_MIGRATION.sql` and click **Run**.
   *(Uses an in-transaction `TEXT -> CREATE TYPE -> cast` rebuild for `order_status` so the entire migration executes safely in a single Supabase SQL Editor run without PostgreSQL `55P04` uncommitted enum errors.)*
3. **Bootstrap First Admin Account:**
   - Create an Admin user in **Supabase Dashboard -> Authentication -> Users -> Add User** (e.g. `admin@yourrestaurant.com`).
   - Run:
     ```sql
     UPDATE public.profiles SET role = 'admin', active = true WHERE email = 'admin@yourrestaurant.com';
     ```
4. **Verify Isolation & Security:** Run `C:\Projects\TableTap\supabase\tests\rls_single_restaurant_verification.sql` inside SQL Editor (`BEGIN; ... ROLLBACK;`). Confirm output notice: `ALL SINGLE-RESTAURANT RLS, ROLE GUARD, QR & ORDER LIFECYCLE ASSERTIONS PASSED!`.

---

## 4. Rollback Considerations & Post-Migration Checklist

- **Rollback Consideration:** Because legacy tables (`restaurants`, `restaurant_memberships`) are preserved rather than dropped, pre-migration tenant settings and membership snapshots remain recoverable in PostgreSQL until you explicitly drop them. Before dropping `restaurant_id` or renaming `tables` in production, take a standard Supabase point-in-time snapshot (`pg_dump` / Dashboard Backup).
- **Verification Checklist:**
  - `SELECT COUNT(*) FROM public.restaurant_settings;` equals `1`.
  - `SELECT id, email, role, active FROM public.profiles;` shows at least one active `'admin'` user.
  - `SELECT table_number, capacity, active FROM public.tables;` retains all existing tables and QR links.
  - `SELECT status, COUNT(*) FROM public.orders GROUP BY status;` shows zero `'pending'` or `'served'` rows.
  - `SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';` lists `orders`, `order_items`, `order_status_events`, `table_sessions`.
