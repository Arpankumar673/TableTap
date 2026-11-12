-- ==============================================================================
-- TABLETAP — SINGLE-RESTAURANT MIGRATION & INITIALIZATION SCRIPT
-- File: SINGLE_RESTAURANT_MIGRATION.sql
--
-- Target Architecture: Single-Restaurant QR Ordering & Operations Platform
-- Operational Roles: 'admin', 'kitchen' (plus anonymous 'customer' via QR/session tokens)
-- Order Lifecycle:   new -> accepted -> preparing -> ready -> completed (+ cancelled)
--
-- IMPORTANT SAFETY PROPERTIES:
-- 1. Non-destructive & idempotent: Never drops existing tables or deletes orders/products.
-- 2. Safe on both existing multi-tenant DBs and clean empty Supabase databases.
-- 3. Safely migrates data from `restaurants` -> `restaurant_settings`,
--    `restaurant_memberships` -> `profiles.role`, `restaurant_tables` -> `tables`,
--    and `orders.status` ('pending' -> 'new', 'served' -> 'completed').
-- 4. Safe single-run execution in Supabase SQL Editor via in-transaction enum rebuild
--    (avoids PostgreSQL 55P04 uncommitted enum value errors).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. EXTENSIONS
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 2. ENUMS & TYPES
-- ------------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'kitchen');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE dietary_type AS ENUM ('veg', 'non-veg', 'vegan', 'egg');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE order_status AS ENUM (
    'new',
    'accepted',
    'preparing',
    'ready',
    'completed',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE order_item_status AS ENUM (
    'pending',
    'preparing',
    'ready',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM (
    'unpaid',
    'pending',
    'paid',
    'failed',
    'refunded',
    'partially_refunded'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE session_status AS ENUM ('open', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ------------------------------------------------------------------------------
-- 3. UTILITY FUNCTIONS & CLEANUP OF OLD MULTI-TENANT DEPENDENCIES
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = clock_timestamp();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop old multi-tenant RLS policies cleanly before dropping tenant columns
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I;', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "Public Read Access for Restaurant Assets" ON storage.objects;
DROP POLICY IF EXISTS "Restaurant Admins Can Upload Assets" ON storage.objects;
DROP POLICY IF EXISTS "Restaurant Admins Can Update Assets" ON storage.objects;
DROP POLICY IF EXISTS "Restaurant Admins Can Delete Assets" ON storage.objects;
DROP POLICY IF EXISTS "Admin Can Upload Restaurant Assets" ON storage.objects;
DROP POLICY IF EXISTS "Admin Can Update Restaurant Assets" ON storage.objects;
DROP POLICY IF EXISTS "Admin Can Delete Restaurant Assets" ON storage.objects;

-- Drop old immutable restaurant_id triggers before removing restaurant_id columns
DO $$
DECLARE
  tbl RECORD;
BEGIN
  FOR tbl IN
    SELECT event_object_table AS tablename, trigger_name
    FROM information_schema.triggers
    WHERE event_object_schema = 'public'
      AND trigger_name LIKE '%immutable_tenant%'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I;', tbl.trigger_name, tbl.tablename);
  END LOOP;
END $$;

DROP FUNCTION IF EXISTS public.prevent_restaurant_id_change() CASCADE;
DROP FUNCTION IF EXISTS public.onboard_restaurant(VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_restaurant_role(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.is_restaurant_member(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.update_order_status_secure(UUID, public.order_status, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.update_order_item_status_secure(UUID, public.order_item_status) CASCADE;

-- ------------------------------------------------------------------------------
-- 4. SINGLETON RESTAURANT SETTINGS TABLE (Backfilled from legacy restaurants)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.restaurant_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton_key BOOLEAN NOT NULL DEFAULT true UNIQUE CHECK (singleton_key = true),
  name VARCHAR(150) NOT NULL DEFAULT 'TableTap Kitchen & Bistro',
  description TEXT,
  logo_url TEXT,
  cover_image_url TEXT,
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  timezone VARCHAR(60) NOT NULL DEFAULT 'Asia/Kolkata',
  tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 5.00 CHECK (tax_rate >= 0 AND tax_rate <= 100),
  service_charge_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (service_charge_rate >= 0 AND service_charge_rate <= 100),
  phone VARCHAR(30),
  email VARCHAR(150),
  address TEXT,
  opening_hours JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_accepting_orders BOOLEAN NOT NULL DEFAULT true,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

DO $$
BEGIN
  IF to_regclass('public.restaurants') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.restaurant_settings) THEN
    INSERT INTO public.restaurant_settings (
      id, singleton_key, name, description, logo_url, cover_image_url,
      currency, timezone, tax_rate, service_charge_rate,
      phone, email, address, opening_hours, is_accepting_orders,
      settings, created_at, updated_at
    )
    SELECT
      id, true, name, description, logo_url, cover_image_url,
      currency, timezone, tax_rate, service_charge_rate,
      phone, email, address, opening_hours, is_accepting_orders,
      settings, created_at, updated_at
    FROM public.restaurants
    ORDER BY created_at ASC
    LIMIT 1
    ON CONFLICT (singleton_key) DO NOTHING;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.restaurant_settings) THEN
    INSERT INTO public.restaurant_settings (singleton_key, name, description)
    VALUES (
      true,
      'TableTap Kitchen & Bistro',
      'Wood-fired artisan dining crafted fresh to order directly from your table.'
    )
    ON CONFLICT (singleton_key) DO NOTHING;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 5. PROFILES & SINGLE-RESTAURANT ROLES ('admin', 'kitchen')
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(150),
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'kitchen',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role user_role NOT NULL DEFAULT 'kitchen';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;

-- Backfill existing owner/admin -> admin, kitchen -> kitchen safely
DO $$
BEGIN
  IF to_regclass('public.restaurant_memberships') IS NOT NULL THEN
    UPDATE public.profiles p
    SET role = CASE
      WHEN rm.role::text IN ('owner', 'admin') THEN 'admin'::user_role
      ELSE 'kitchen'::user_role
    END
    FROM (
      SELECT DISTINCT ON (user_id) user_id, role
      FROM public.restaurant_memberships
      WHERE active = true
      ORDER BY user_id,
        CASE WHEN role::text IN ('owner', 'admin') THEN 0 ELSE 1 END,
        created_at ASC
    ) rm
    WHERE p.id = rm.user_id;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role, active);

-- Prevent non-admin users from escalating their own role via UPDATE
CREATE OR REPLACE FUNCTION public.prevent_profile_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, extensions
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role OR NEW.active IS DISTINCT FROM OLD.active THEN
    IF current_user IN ('postgres', 'service_role', 'supabase_admin') THEN
      RETURN NEW;
    END IF;

    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Security violation: only administrators can change user roles or status';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_role_guard ON public.profiles;
CREATE TRIGGER trg_profiles_role_guard
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_role_escalation();

-- Sync new auth.users automatically; respects server app_metadata.role when present
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_role user_role := 'kitchen'::user_role;
BEGIN
  IF (NEW.raw_app_meta_data->>'role') IN ('admin', 'kitchen') THEN
    v_role := (NEW.raw_app_meta_data->>'role')::user_role;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, avatar_url, role, active)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    NEW.raw_user_meta_data->>'avatar_url',
    v_role,
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.profiles.full_name);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

-- ------------------------------------------------------------------------------
-- 6. CORE & SUPPORTING TABLES (Remove restaurant_id cleanly without data loss)
-- ------------------------------------------------------------------------------

-- 6.1 Rename restaurant_tables -> tables if migrating from Phase 1/2
DO $$
BEGIN
  IF to_regclass('public.restaurant_tables') IS NOT NULL
     AND to_regclass('public.tables') IS NULL THEN
    ALTER TABLE public.restaurant_tables RENAME TO tables;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_number VARCHAR(20) NOT NULL UNIQUE,
  label VARCHAR(60),
  capacity INT NOT NULL DEFAULT 4 CHECK (capacity > 0),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 6.2 Categories
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(120) NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 6.3 Preparation Stations
CREATE TABLE IF NOT EXISTS public.preparation_stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(80) NOT NULL UNIQUE,
  description TEXT,
  color_hex VARCHAR(16) NOT NULL DEFAULT '#1B5E3A',
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

ALTER TABLE public.preparation_stations ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.preparation_stations ADD COLUMN IF NOT EXISTS color_hex VARCHAR(16) NOT NULL DEFAULT '#1B5E3A';

-- 6.4 Products
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  station_id UUID REFERENCES public.preparation_stations(id) ON DELETE SET NULL,
  name VARCHAR(150) NOT NULL,
  slug VARCHAR(180) NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  base_price NUMERIC(10, 2) NOT NULL CHECK (base_price >= 0),
  dietary_type dietary_type NOT NULL DEFAULT 'veg',
  is_popular BOOLEAN NOT NULL DEFAULT false,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_chef_special BOOLEAN NOT NULL DEFAULT false,
  prep_time_minutes INT NOT NULL DEFAULT 15 CHECK (prep_time_minutes >= 0),
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 6.5 Product Variants
CREATE TABLE IF NOT EXISTS public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  sku VARCHAR(60),
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  is_default BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  available BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 6.6 Option Groups, Option Values & Product Option Mapping
CREATE TABLE IF NOT EXISTS public.option_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  required BOOLEAN NOT NULL DEFAULT false,
  min_select INT NOT NULL DEFAULT 0 CHECK (min_select >= 0),
  max_select INT NOT NULL DEFAULT 1 CHECK (max_select >= min_select),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS public.option_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  option_group_id UUID NOT NULL REFERENCES public.option_groups(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  price_delta NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (price_delta >= 0),
  is_default BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS public.product_option_groups (
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  option_group_id UUID NOT NULL REFERENCES public.option_groups(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, option_group_id)
);

-- 6.7 Table QR Tokens & Table Sessions
CREATE TABLE IF NOT EXISTS public.table_qr_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  token_prefix VARCHAR(16),
  qr_token_secret TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  revoked_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.table_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  status session_status NOT NULL DEFAULT 'open',
  bill_requested BOOLEAN NOT NULL DEFAULT false,
  bill_requested_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  closed_at TIMESTAMPTZ
);

-- 6.8 Orders, Order Items, Item Options, Status History & Payments
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_session_id UUID NOT NULL REFERENCES public.table_sessions(id) ON DELETE RESTRICT,
  table_id UUID REFERENCES public.tables(id) ON DELETE SET NULL,
  table_number_snapshot VARCHAR(20),
  order_number VARCHAR(30) NOT NULL UNIQUE,
  public_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  status order_status NOT NULL,
  subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0),
  discount NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (discount >= 0),
  tax NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (tax >= 0),
  service_charge NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (service_charge >= 0),
  total NUMERIC(10, 2) NOT NULL CHECK (total >= 0),
  payment_status payment_status NOT NULL DEFAULT 'unpaid',
  idempotency_key UUID NOT NULL UNIQUE,
  customer_notes TEXT,
  accepted_at TIMESTAMPTZ,
  preparing_at TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  product_name_snapshot VARCHAR(150) NOT NULL,
  variant_name_snapshot VARCHAR(100),
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price_snapshot NUMERIC(10, 2) NOT NULL CHECK (unit_price_snapshot >= 0),
  total_price_snapshot NUMERIC(10, 2) NOT NULL CHECK (total_price_snapshot >= 0),
  station_id UUID REFERENCES public.preparation_stations(id) ON DELETE SET NULL,
  station_name_snapshot VARCHAR(80),
  notes TEXT,
  status order_item_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS public.order_item_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id UUID NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  option_group_name_snapshot VARCHAR(100) NOT NULL,
  option_value_name_snapshot VARCHAR(100) NOT NULL,
  price_delta_snapshot NUMERIC(10, 2) NOT NULL DEFAULT 0.00
);

CREATE TABLE IF NOT EXISTS public.order_status_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  from_status order_status,
  to_status order_status NOT NULL,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  provider VARCHAR(30) NOT NULL DEFAULT 'counter',
  provider_order_id TEXT,
  provider_payment_id TEXT,
  provider_signature TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- ------------------------------------------------------------------------------
-- 7. REMOVE MULTI-TENANT restaurant_id COLUMNS & MIGRATE LEGACY STATUS VALUES
-- ------------------------------------------------------------------------------

-- Safely deduplicate slugs / table_numbers / order_numbers before adding single-restaurant UNIQUE constraints
DO $$
DECLARE
  rec RECORD;
  col_table TEXT;
  tenant_tables TEXT[] := ARRAY[
    'categories',
    'preparation_stations',
    'products',
    'product_variants',
    'option_groups',
    'option_values',
    'tables',
    'table_qr_tokens',
    'table_sessions',
    'orders',
    'order_items',
    'order_status_events',
    'payments'
  ];
BEGIN
  -- 7.1 Drop composite restaurant_id unique constraints cleanly
  ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_restaurant_id_slug_key;
  ALTER TABLE public.preparation_stations DROP CONSTRAINT IF EXISTS preparation_stations_restaurant_id_name_key;
  ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_restaurant_id_slug_key;
  ALTER TABLE public.tables DROP CONSTRAINT IF EXISTS restaurant_tables_restaurant_id_table_number_key;
  ALTER TABLE public.tables DROP CONSTRAINT IF EXISTS tables_restaurant_id_table_number_key;
  ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_restaurant_id_order_number_key;
  ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_restaurant_id_idempotency_key_key;

  -- 7.2 Drop restaurant_id indexes & columns across all operational tables
  FOREACH col_table IN ARRAY tenant_tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = col_table AND column_name = 'restaurant_id'
    ) THEN
      EXECUTE format('ALTER TABLE public.%I DROP COLUMN restaurant_id CASCADE;', col_table);
    END IF;
  END LOOP;

  -- 7.3 Ensure unique single-restaurant constraints safely
  FOR rec IN
    SELECT id, name, ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at ASC) AS rn
    FROM public.preparation_stations
  LOOP
    IF rec.rn > 1 THEN
      UPDATE public.preparation_stations SET name = LEFT(rec.name || '-' || rec.rn, 80) WHERE id = rec.id;
    END IF;
  END LOOP;

  FOR rec IN
    SELECT id, slug, ROW_NUMBER() OVER (PARTITION BY slug ORDER BY created_at ASC) AS rn
    FROM public.categories
  LOOP
    IF rec.rn > 1 THEN
      UPDATE public.categories SET slug = rec.slug || '-' || rec.rn WHERE id = rec.id;
    END IF;
  END LOOP;

  FOR rec IN
    SELECT id, slug, ROW_NUMBER() OVER (PARTITION BY slug ORDER BY created_at ASC) AS rn
    FROM public.products
  LOOP
    IF rec.rn > 1 THEN
      UPDATE public.products SET slug = rec.slug || '-' || rec.rn WHERE id = rec.id;
    END IF;
  END LOOP;

  FOR rec IN
    SELECT id, table_number, ROW_NUMBER() OVER (PARTITION BY table_number ORDER BY created_at ASC) AS rn
    FROM public.tables
  LOOP
    IF rec.rn > 1 THEN
      UPDATE public.tables SET table_number = LEFT(rec.table_number || '-' || rec.rn, 20) WHERE id = rec.id;
    END IF;
  END LOOP;

  FOR rec IN
    SELECT id, order_number, ROW_NUMBER() OVER (PARTITION BY order_number ORDER BY created_at ASC) AS rn
    FROM public.orders
  LOOP
    IF rec.rn > 1 THEN
      UPDATE public.orders SET order_number = LEFT(rec.order_number || '-' || rec.rn, 30) WHERE id = rec.id;
    END IF;
  END LOOP;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'categories_slug_unique') THEN
    BEGIN
      ALTER TABLE public.categories ADD CONSTRAINT categories_slug_unique UNIQUE (slug);
    EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL; END;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'preparation_stations_name_unique') THEN
    BEGIN
      ALTER TABLE public.preparation_stations ADD CONSTRAINT preparation_stations_name_unique UNIQUE (name);
    EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL; END;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_slug_unique') THEN
    BEGIN
      ALTER TABLE public.products ADD CONSTRAINT products_slug_unique UNIQUE (slug);
    EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL; END;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tables_table_number_unique') THEN
    BEGIN
      ALTER TABLE public.tables ADD CONSTRAINT tables_table_number_unique UNIQUE (table_number);
    EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL; END;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_order_number_unique') THEN
    BEGIN
      ALTER TABLE public.orders ADD CONSTRAINT orders_order_number_unique UNIQUE (order_number);
    EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL; END;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_idempotency_key_unique') THEN
    BEGIN
      ALTER TABLE public.orders ADD CONSTRAINT orders_idempotency_key_unique UNIQUE (idempotency_key);
    EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL; END;
  END IF;

  -- 7.4 Rebuild order_status enum cleanly in-transaction (avoids PostgreSQL 55P04 uncommitted enum error)
  IF to_regclass('public.orders') IS NOT NULL AND (
    NOT EXISTS (
      SELECT 1 FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'order_status'
        AND t.typnamespace = 'public'::regnamespace
        AND e.enumlabel = 'new'
    )
    OR EXISTS (
      SELECT 1 FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'order_status'
        AND t.typnamespace = 'public'::regnamespace
        AND e.enumlabel IN ('pending', 'served')
    )
  ) THEN
    DROP INDEX IF EXISTS idx_orders_status_created;
    DROP INDEX IF EXISTS idx_orders_restaurant_status;

    ALTER TABLE public.orders ALTER COLUMN status DROP DEFAULT;
    ALTER TABLE public.orders ALTER COLUMN status TYPE TEXT USING status::text;

    IF to_regclass('public.order_status_events') IS NOT NULL THEN
      ALTER TABLE public.order_status_events ALTER COLUMN from_status TYPE TEXT USING from_status::text;
      ALTER TABLE public.order_status_events ALTER COLUMN to_status TYPE TEXT USING to_status::text;
    END IF;

    UPDATE public.orders SET status = 'new' WHERE status = 'pending';
    UPDATE public.orders
      SET status = 'completed',
          completed_at = COALESCE(completed_at, updated_at, clock_timestamp())
      WHERE status = 'served';

    IF to_regclass('public.order_status_events') IS NOT NULL THEN
      UPDATE public.order_status_events SET from_status = 'new' WHERE from_status = 'pending';
      UPDATE public.order_status_events SET to_status = 'new' WHERE to_status = 'pending';
      UPDATE public.order_status_events SET from_status = 'completed' WHERE from_status = 'served';
      UPDATE public.order_status_events SET to_status = 'completed' WHERE to_status = 'served';
    END IF;

    DROP TYPE public.order_status CASCADE;
    CREATE TYPE public.order_status AS ENUM (
      'new',
      'accepted',
      'preparing',
      'ready',
      'completed',
      'cancelled'
    );

    ALTER TABLE public.orders ALTER COLUMN status TYPE public.order_status USING status::public.order_status;
    ALTER TABLE public.orders ALTER COLUMN status SET DEFAULT 'new'::public.order_status;

    IF to_regclass('public.order_status_events') IS NOT NULL THEN
      ALTER TABLE public.order_status_events ALTER COLUMN from_status TYPE public.order_status USING from_status::public.order_status;
      ALTER TABLE public.order_status_events ALTER COLUMN to_status TYPE public.order_status USING to_status::public.order_status;
    END IF;
  END IF;
END $$;

ALTER TABLE public.orders ALTER COLUMN status SET DEFAULT 'new'::order_status;

-- 7.5 Ensure default preparation stations exist (now safe after restaurant_id column removal)
INSERT INTO public.preparation_stations (name, color_hex, sort_order)
VALUES
  ('Main Kitchen', '#1B5E3A', 1),
  ('Pizza', '#D93829', 2),
  ('Grill', '#F58220', 3),
  ('Beverages', '#0369A1', 4),
  ('Desserts', '#9333EA', 5)
ON CONFLICT (name) DO NOTHING;

-- Lock down legacy multi-tenant tables safely without dropping historical rows
DO $$
BEGIN
  IF to_regclass('public.restaurants') IS NOT NULL THEN
    ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
  END IF;
  IF to_regclass('public.restaurant_memberships') IS NOT NULL THEN
    ALTER TABLE public.restaurant_memberships ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 8. SINGLE-RESTAURANT PERFORMANCE INDEXES & UPDATED_AT TRIGGERS
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_categories_sort ON public.categories(sort_order) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_stations_sort ON public.preparation_stations(sort_order);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id, sort_order, active, available);
CREATE INDEX IF NOT EXISTS idx_products_station ON public.products(station_id);
CREATE INDEX IF NOT EXISTS idx_variants_product ON public.product_variants(product_id, sort_order) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_option_values_group ON public.option_values(option_group_id, sort_order) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_product_option_groups_group ON public.product_option_groups(option_group_id);
CREATE INDEX IF NOT EXISTS idx_tables_active ON public.tables(table_number) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_qr_tokens_active ON public.table_qr_tokens(token_hash) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_qr_tokens_table ON public.table_qr_tokens(table_id, active);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON public.table_sessions(table_id) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_sessions_token ON public.table_sessions(session_token) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON public.orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_session ON public.orders(table_session_id);
CREATE INDEX IF NOT EXISTS idx_orders_public_token ON public.orders(public_token);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_status ON public.order_items(status);
CREATE INDEX IF NOT EXISTS idx_order_item_options_item ON public.order_item_options(order_item_id);
CREATE INDEX IF NOT EXISTS idx_order_status_events ON public.order_status_events(order_id, created_at);
CREATE INDEX IF NOT EXISTS idx_payments_order ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider_order ON public.payments(provider_order_id);

DO $$
DECLARE
  t_name TEXT;
  target_tables TEXT[] := ARRAY[
    'restaurant_settings',
    'profiles',
    'categories',
    'products',
    'product_variants',
    'option_groups',
    'tables',
    'orders',
    'order_items',
    'payments'
  ];
BEGIN
  FOREACH t_name IN ARRAY target_tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON public.%I;', t_name, t_name);
    EXECUTE format(
      'CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();',
      t_name, t_name
    );
  END LOOP;
END $$;

-- ------------------------------------------------------------------------------
-- 9. AUTHORIZATION HELPERS & SINGLE-RESTAURANT RPCS
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT role
  FROM public.profiles
  WHERE id = auth.uid()
    AND active = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role::text = 'admin'
      AND active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role::text IN ('admin', 'kitchen')
      AND active = true
  );
$$;

-- 9.1 Secure QR Resolution -> Identifies Table & Opens/Reuses Table Session
CREATE OR REPLACE FUNCTION public.resolve_table_qr(p_token_hash TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_token RECORD;
  v_settings RECORD;
  v_session RECORD;
  v_new_session_token TEXT;
BEGIN
  SELECT
    qr.id AS qr_id,
    qr.table_id,
    t.table_number,
    t.label AS table_label,
    t.active AS table_active
  INTO v_token
  FROM public.table_qr_tokens qr
  JOIN public.tables t ON t.id = qr.table_id
  WHERE qr.token_hash = p_token_hash
    AND qr.active = true
    AND qr.revoked_at IS NULL
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invalid or revoked table QR code.');
  END IF;

  IF NOT v_token.table_active THEN
    RETURN jsonb_build_object('valid', false, 'error', 'This table is currently deactivated.');
  END IF;

  SELECT * INTO v_settings FROM public.restaurant_settings LIMIT 1;

  SELECT *
  INTO v_session
  FROM public.table_sessions
  WHERE table_id = v_token.table_id
    AND status = 'open'
  ORDER BY opened_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    v_new_session_token := encode(gen_random_bytes(32), 'hex');
    INSERT INTO public.table_sessions (table_id, session_token, status)
    VALUES (v_token.table_id, v_new_session_token, 'open')
    RETURNING * INTO v_session;
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'restaurant_name', COALESCE(v_settings.name, 'TableTap'),
    'is_accepting_orders', COALESCE(v_settings.is_accepting_orders, true),
    'currency', COALESCE(v_settings.currency, 'INR'),
    'tax_rate', COALESCE(v_settings.tax_rate, 5.00),
    'service_charge_rate', COALESCE(v_settings.service_charge_rate, 0.00),
    'table_id', v_token.table_id,
    'table_number', v_token.table_number,
    'table_label', v_token.table_label,
    'session_id', v_session.id,
    'session_token', v_session.session_token
  );
END;
$$;

-- 9.2 Transactional Server-Validated Customer Order Placement
CREATE OR REPLACE FUNCTION public.create_customer_order(
  p_session_token TEXT,
  p_idempotency_key UUID,
  p_items JSONB,
  p_customer_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_session RECORD;
  v_settings RECORD;
  v_table RECORD;
  v_existing_order RECORD;
  v_order_id UUID;
  v_order_number VARCHAR(30);
  v_public_token TEXT;
  v_subtotal NUMERIC(10, 2) := 0.00;
  v_tax NUMERIC(10, 2) := 0.00;
  v_service_charge NUMERIC(10, 2) := 0.00;
  v_total NUMERIC(10, 2) := 0.00;
  v_item JSONB;
  v_product RECORD;
  v_variant RECORD;
  v_unit_base NUMERIC(10, 2);
  v_options_sum NUMERIC(10, 2);
  v_unit_price NUMERIC(10, 2);
  v_line_total NUMERIC(10, 2);
  v_qty INT;
  v_order_item_id UUID;
  v_opt_id UUID;
  v_opt_val RECORD;
  v_variant_name VARCHAR(100);
  v_station_name VARCHAR(80);
  v_count INT;
  v_req_group RECORD;
  v_sel_count INT;
BEGIN
  -- 1. Validate active table session
  SELECT * INTO v_session
  FROM public.table_sessions
  WHERE session_token = p_session_token
    AND status = 'open'
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or closed dining session. Please re-scan your table QR code.';
  END IF;

  SELECT * INTO v_settings FROM public.restaurant_settings LIMIT 1;
  IF NOT FOUND OR NOT v_settings.is_accepting_orders THEN
    RAISE EXCEPTION 'The restaurant is currently not accepting new table orders.';
  END IF;

  SELECT * INTO v_table
  FROM public.tables
  WHERE id = v_session.table_id AND active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Table is currently inactive.';
  END IF;

  -- 2. Idempotency protection
  SELECT id, order_number, public_token, status, total
  INTO v_existing_order
  FROM public.orders
  WHERE idempotency_key = p_idempotency_key
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'order_id', v_existing_order.id,
      'order_number', v_existing_order.order_number,
      'public_token', v_existing_order.public_token,
      'status', v_existing_order.status,
      'total', v_existing_order.total,
      'duplicate', true
    );
  END IF;

  -- 3. Validate items payload
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Order must contain at least one valid item.';
  END IF;

  -- 4. Advisory lock for collision-free sequential order number
  PERFORM pg_advisory_xact_lock(99421001);
  SELECT COUNT(*) INTO v_count FROM public.orders;
  v_order_number := 'TT-' || LPAD((v_count + 1001)::TEXT, 4, '0');
  v_public_token := encode(gen_random_bytes(16), 'hex');

  INSERT INTO public.orders (
    table_session_id, table_id, table_number_snapshot,
    order_number, public_token, status, subtotal, discount, tax, service_charge, total,
    payment_status, idempotency_key, customer_notes
  )
  VALUES (
    v_session.id, v_table.id, v_table.table_number,
    v_order_number, v_public_token, 'new'::order_status, 0, 0, 0, 0, 0,
    'unpaid', p_idempotency_key, NULLIF(TRIM(COALESCE(p_customer_notes, '')), '')
  )
  RETURNING id INTO v_order_id;

  -- 5. Verify every line item against canonical database prices
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_qty := COALESCE((v_item->>'quantity')::INT, 0);
    IF v_qty < 1 OR v_qty > 50 THEN
      RAISE EXCEPTION 'Item quantity must be between 1 and 50.';
    END IF;

    SELECT * INTO v_product
    FROM public.products
    WHERE id = (v_item->>'product_id')::UUID
      AND active = true
      AND available = true;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product % is unavailable.', v_item->>'product_id';
    END IF;

    v_unit_base := v_product.base_price;
    v_variant_name := NULL;

    IF NULLIF(v_item->>'variant_id', '') IS NOT NULL THEN
      SELECT * INTO v_variant
      FROM public.product_variants
      WHERE id = (v_item->>'variant_id')::UUID
        AND product_id = v_product.id
        AND active = true
        AND available = true;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Selected variant for % is unavailable.', v_product.name;
      END IF;
      v_unit_base := v_variant.price;
      v_variant_name := v_variant.name;
    END IF;

    v_station_name := 'Main Kitchen';
    IF v_product.station_id IS NOT NULL THEN
      SELECT name INTO v_station_name FROM public.preparation_stations WHERE id = v_product.station_id;
    END IF;

    -- Validate option groups
    FOR v_req_group IN
      SELECT og.id, og.name, og.required, og.min_select, og.max_select
      FROM public.product_option_groups pog
      JOIN public.option_groups og ON og.id = pog.option_group_id
      WHERE pog.product_id = v_product.id AND og.active = true
    LOOP
      SELECT COUNT(*) INTO v_sel_count
      FROM public.option_values ov
      WHERE ov.option_group_id = v_req_group.id
        AND ov.active = true
        AND ov.id = ANY (
          ARRAY(
            SELECT (elem)::UUID
            FROM jsonb_array_elements_text(COALESCE(v_item->'option_value_ids', '[]'::jsonb)) AS elem
          )
        );

      IF v_req_group.required AND v_sel_count < GREATEST(1, v_req_group.min_select) THEN
        RAISE EXCEPTION 'Missing required customization "%" for %.', v_req_group.name, v_product.name;
      END IF;
      IF v_sel_count > v_req_group.max_select THEN
        RAISE EXCEPTION 'Too many selections in "%" for %.', v_req_group.name, v_product.name;
      END IF;
    END LOOP;

    v_options_sum := 0.00;
    IF jsonb_typeof(v_item->'option_value_ids') = 'array' THEN
      FOR v_opt_id IN
        SELECT (elem)::UUID FROM jsonb_array_elements_text(v_item->'option_value_ids') AS elem
      LOOP
        SELECT ov.id, ov.name, ov.price_delta
        INTO v_opt_val
        FROM public.option_values ov
        JOIN public.option_groups og ON og.id = ov.option_group_id
        JOIN public.product_option_groups pog ON pog.option_group_id = og.id
        WHERE ov.id = v_opt_id
          AND pog.product_id = v_product.id
          AND ov.active = true
          AND og.active = true;

        IF NOT FOUND THEN
          RAISE EXCEPTION 'Invalid or unavailable option selected for %.', v_product.name;
        END IF;
        v_options_sum := v_options_sum + v_opt_val.price_delta;
      END LOOP;
    END IF;

    v_unit_price := ROUND(v_unit_base + v_options_sum, 2);
    v_line_total := ROUND(v_unit_price * v_qty, 2);
    v_subtotal := v_subtotal + v_line_total;

    INSERT INTO public.order_items (
      order_id, product_id, variant_id,
      product_name_snapshot, variant_name_snapshot,
      quantity, unit_price_snapshot, total_price_snapshot,
      station_id, station_name_snapshot, notes, status
    )
    VALUES (
      v_order_id, v_product.id,
      NULLIF(v_item->>'variant_id', '')::UUID,
      v_product.name, v_variant_name,
      v_qty, v_unit_price, v_line_total,
      v_product.station_id, v_station_name,
      NULLIF(TRIM(COALESCE(v_item->>'notes', '')), ''),
      'pending'
    )
    RETURNING id INTO v_order_item_id;

    IF jsonb_typeof(v_item->'option_value_ids') = 'array' THEN
      INSERT INTO public.order_item_options (
        order_item_id,
        option_group_name_snapshot,
        option_value_name_snapshot,
        price_delta_snapshot
      )
      SELECT
        v_order_item_id,
        og.name,
        ov.name,
        ov.price_delta
      FROM public.option_values ov
      JOIN public.option_groups og ON og.id = ov.option_group_id
      WHERE ov.id = ANY (
        ARRAY(
          SELECT (elem)::UUID FROM jsonb_array_elements_text(v_item->'option_value_ids') AS elem
        )
      );
    END IF;
  END LOOP;

  -- 6. Final canonical totals
  v_tax := ROUND(v_subtotal * (v_settings.tax_rate / 100.0), 2);
  v_service_charge := ROUND(v_subtotal * (v_settings.service_charge_rate / 100.0), 2);
  v_total := ROUND(v_subtotal + v_tax + v_service_charge, 2);

  UPDATE public.orders
  SET subtotal = v_subtotal,
      tax = v_tax,
      service_charge = v_service_charge,
      total = v_total
  WHERE id = v_order_id;

  INSERT INTO public.order_status_events (order_id, from_status, to_status, reason)
  VALUES (v_order_id, NULL, 'new'::order_status, 'Order submitted by table guest');

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'public_token', v_public_token,
    'status', 'new',
    'subtotal', v_subtotal,
    'tax', v_tax,
    'service_charge', v_service_charge,
    'total', v_total,
    'duplicate', false
  );
END;
$$;

-- 9.3 Public Customer Order Tracking Read by Public Token
CREATE OR REPLACE FUNCTION public.get_order_by_public_token(p_public_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_order RECORD;
  v_settings RECORD;
  v_items JSONB;
  v_events JSONB;
BEGIN
  SELECT * INTO v_order
  FROM public.orders
  WHERE public_token = p_public_token
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_settings FROM public.restaurant_settings LIMIT 1;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', oi.id,
      'product_name', oi.product_name_snapshot,
      'variant_name', oi.variant_name_snapshot,
      'quantity', oi.quantity,
      'unit_price', oi.unit_price_snapshot,
      'total_price', oi.total_price_snapshot,
      'station_name', oi.station_name_snapshot,
      'notes', oi.notes,
      'status', oi.status,
      'options', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'group_name', oio.option_group_name_snapshot,
          'value_name', oio.option_value_name_snapshot,
          'price_delta', oio.price_delta_snapshot
        ))
        FROM public.order_item_options oio
        WHERE oio.order_item_id = oi.id
      ), '[]'::jsonb)
    )
  ), '[]'::jsonb)
  INTO v_items
  FROM public.order_items oi
  WHERE oi.order_id = v_order.id;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'from_status', ose.from_status,
      'to_status', ose.to_status,
      'reason', ose.reason,
      'created_at', ose.created_at
    ) ORDER BY ose.created_at ASC
  ), '[]'::jsonb)
  INTO v_events
  FROM public.order_status_events ose
  WHERE ose.order_id = v_order.id;

  RETURN jsonb_build_object(
    'id', v_order.id,
    'order_number', v_order.order_number,
    'public_token', v_order.public_token,
    'table_number', v_order.table_number_snapshot,
    'status', v_order.status,
    'payment_status', v_order.payment_status,
    'subtotal', v_order.subtotal,
    'discount', v_order.discount,
    'tax', v_order.tax,
    'service_charge', v_order.service_charge,
    'total', v_order.total,
    'customer_notes', v_order.customer_notes,
    'created_at', v_order.created_at,
    'updated_at', v_order.updated_at,
    'restaurant_name', COALESCE(v_settings.name, 'TableTap'),
    'currency', COALESCE(v_settings.currency, 'INR'),
    'restaurant_phone', v_settings.phone,
    'items', v_items,
    'events', v_events
  );
END;
$$;

-- 9.4 Session Orders Read by Table Session Token
CREATE OR REPLACE FUNCTION public.get_session_orders(p_session_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_session RECORD;
  v_orders JSONB;
BEGIN
  SELECT * INTO v_session
  FROM public.table_sessions
  WHERE session_token = p_session_token
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'orders', '[]'::jsonb);
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', o.id,
      'order_number', o.order_number,
      'public_token', o.public_token,
      'status', o.status,
      'payment_status', o.payment_status,
      'total', o.total,
      'created_at', o.created_at
    ) ORDER BY o.created_at DESC
  ), '[]'::jsonb)
  INTO v_orders
  FROM public.orders o
  WHERE o.table_session_id = v_session.id;

  RETURN jsonb_build_object(
    'valid', true,
    'session_status', v_session.status,
    'bill_requested', v_session.bill_requested,
    'orders', v_orders
  );
END;
$$;

-- 9.5 Customer Request Bill
CREATE OR REPLACE FUNCTION public.request_table_bill(p_session_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_session RECORD;
BEGIN
  UPDATE public.table_sessions
  SET bill_requested = true,
      bill_requested_at = COALESCE(bill_requested_at, clock_timestamp())
  WHERE session_token = p_session_token
    AND status = 'open'
  RETURNING * INTO v_session;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'No open table session found.');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'session_id', v_session.id,
    'bill_requested_at', v_session.bill_requested_at
  );
END;
$$;

-- 9.6 Session Context Lookup for Customer Menu Header
CREATE OR REPLACE FUNCTION public.resolve_session_context(p_session_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_row RECORD;
BEGIN
  SELECT
    ts.id AS session_id,
    ts.table_id,
    ts.status,
    t.table_number,
    t.label AS table_label,
    t.active AS table_active
  INTO v_row
  FROM public.table_sessions ts
  JOIN public.tables t ON t.id = ts.table_id
  WHERE ts.session_token = p_session_token
    AND ts.status = 'open'
  LIMIT 1;

  IF NOT FOUND OR NOT v_row.table_active THEN
    RETURN jsonb_build_object('valid', false);
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'session_id', v_row.session_id,
    'table_id', v_row.table_id,
    'table_number', v_row.table_number,
    'table_label', v_row.table_label
  );
END;
$$;

-- 9.7 Kitchen / Admin Order Status Transition with Audit Trail
CREATE OR REPLACE FUNCTION public.update_order_status_secure(
  p_order_id UUID,
  p_new_status order_status,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_order RECORD;
  v_role user_role;
BEGIN
  v_role := public.get_current_user_role();
  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: staff authentication required';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_order.status IN ('completed'::order_status, 'cancelled'::order_status) THEN
    RAISE EXCEPTION 'Cannot transition order from terminal state %', v_order.status;
  END IF;

  IF p_new_status = 'cancelled'::order_status AND v_role = 'kitchen'::user_role
     AND v_order.status NOT IN ('new'::order_status, 'accepted'::order_status) THEN
    RAISE EXCEPTION 'Kitchen operators can only cancel orders prior to active preparation';
  END IF;

  UPDATE public.orders
  SET status = p_new_status,
      accepted_at = CASE WHEN p_new_status = 'accepted'::order_status AND accepted_at IS NULL THEN clock_timestamp() ELSE accepted_at END,
      preparing_at = CASE WHEN p_new_status = 'preparing'::order_status AND preparing_at IS NULL THEN clock_timestamp() ELSE preparing_at END,
      ready_at = CASE WHEN p_new_status = 'ready'::order_status AND ready_at IS NULL THEN clock_timestamp() ELSE ready_at END,
      completed_at = CASE WHEN p_new_status = 'completed'::order_status AND completed_at IS NULL THEN clock_timestamp() ELSE completed_at END,
      cancelled_at = CASE WHEN p_new_status = 'cancelled'::order_status AND cancelled_at IS NULL THEN clock_timestamp() ELSE cancelled_at END,
      cancellation_reason = CASE WHEN p_new_status = 'cancelled'::order_status THEN COALESCE(NULLIF(TRIM(p_reason), ''), 'Cancelled by staff') ELSE cancellation_reason END
  WHERE id = p_order_id;

  IF p_new_status IN ('preparing'::order_status, 'ready'::order_status, 'cancelled'::order_status) THEN
    UPDATE public.order_items
    SET status = CASE
      WHEN p_new_status = 'preparing'::order_status AND status = 'pending'::order_item_status THEN 'preparing'::order_item_status
      WHEN p_new_status = 'ready'::order_status AND status IN ('pending'::order_item_status, 'preparing'::order_item_status) THEN 'ready'::order_item_status
      WHEN p_new_status = 'cancelled'::order_status THEN 'cancelled'::order_item_status
      ELSE status
    END
    WHERE order_id = p_order_id;
  END IF;

  INSERT INTO public.order_status_events (order_id, from_status, to_status, actor_user_id, reason)
  VALUES (p_order_id, v_order.status, p_new_status, auth.uid(), NULLIF(TRIM(COALESCE(p_reason, '')), ''));

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'from_status', v_order.status,
    'to_status', p_new_status
  );
END;
$$;

-- 9.8 Station Item Status Update
CREATE OR REPLACE FUNCTION public.update_order_item_status_secure(
  p_order_item_id UUID,
  p_new_status order_item_status
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_item RECORD;
  v_order RECORD;
  v_all_ready BOOLEAN;
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Unauthorized: staff authentication required';
  END IF;

  SELECT * INTO v_item FROM public.order_items WHERE id = p_order_item_id LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order item not found';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = v_item.order_id;

  UPDATE public.order_items
  SET status = p_new_status
  WHERE id = p_order_item_id;

  IF p_new_status = 'preparing'::order_item_status AND v_order.status IN ('new'::order_status, 'accepted'::order_status) THEN
    PERFORM public.update_order_status_secure(v_order.id, 'preparing'::order_status, 'Station started item preparation');
  ELSIF p_new_status = 'ready'::order_item_status THEN
    SELECT NOT EXISTS (
      SELECT 1 FROM public.order_items
      WHERE order_id = v_order.id
        AND status NOT IN ('ready'::order_item_status, 'cancelled'::order_item_status)
    ) INTO v_all_ready;

    IF v_all_ready AND v_order.status IN ('new'::order_status, 'accepted'::order_status, 'preparing'::order_status) THEN
      PERFORM public.update_order_status_secure(v_order.id, 'ready'::order_status, 'All station items marked ready');
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'order_item_id', p_order_item_id,
    'status', p_new_status
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 10. SINGLE-RESTAURANT ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.restaurant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preparation_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.option_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.option_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_option_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.table_qr_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.table_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_item_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Restaurant Settings
CREATE POLICY "Public can view restaurant settings"
  ON public.restaurant_settings FOR SELECT
  USING (true);

CREATE POLICY "Admin can manage restaurant settings"
  ON public.restaurant_settings FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Profiles
CREATE POLICY "Users can view own profile or admins view all"
  ON public.profiles FOR SELECT
  USING (id = auth.uid() OR public.is_admin());

CREATE POLICY "Users can update own profile or admins manage all"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid() OR public.is_admin())
  WITH CHECK (id = auth.uid() OR public.is_admin());

-- Categories
CREATE POLICY "Public can view active categories"
  ON public.categories FOR SELECT
  USING (active = true OR public.is_staff());

CREATE POLICY "Admin can manage categories"
  ON public.categories FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Preparation Stations
CREATE POLICY "Staff can view preparation stations"
  ON public.preparation_stations FOR SELECT
  USING (public.is_staff());

CREATE POLICY "Admin can manage preparation stations"
  ON public.preparation_stations FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Products & Variants
CREATE POLICY "Public can view active products"
  ON public.products FOR SELECT
  USING (active = true OR public.is_staff());

CREATE POLICY "Admin can manage products"
  ON public.products FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Public can view active product variants"
  ON public.product_variants FOR SELECT
  USING (
    (active = true AND EXISTS (
      SELECT 1 FROM public.products p WHERE p.id = product_id AND p.active = true
    )) OR public.is_staff()
  );

CREATE POLICY "Admin can manage product variants"
  ON public.product_variants FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Option Groups, Option Values & Product Option Mappings
CREATE POLICY "Public can view active option groups"
  ON public.option_groups FOR SELECT
  USING (active = true OR public.is_staff());

CREATE POLICY "Admin can manage option groups"
  ON public.option_groups FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Public can view active option values"
  ON public.option_values FOR SELECT
  USING (active = true OR public.is_staff());

CREATE POLICY "Admin can manage option values"
  ON public.option_values FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Public can view product option mappings"
  ON public.product_option_groups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_id AND (p.active = true OR public.is_staff())
    )
  );

CREATE POLICY "Admin can manage product option mappings"
  ON public.product_option_groups FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Tables, QR Tokens & Dining Sessions (Restricted strictly to Staff / Admin; Guests use RPCs)
CREATE POLICY "Staff can view tables"
  ON public.tables FOR SELECT
  USING (public.is_staff());

CREATE POLICY "Admin can manage tables"
  ON public.tables FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin can manage QR tokens"
  ON public.table_qr_tokens FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Staff can view table sessions"
  ON public.table_sessions FOR SELECT
  USING (public.is_staff());

CREATE POLICY "Admin can manage table sessions"
  ON public.table_sessions FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Orders, Items, Options, Audit Events
CREATE POLICY "Staff can view orders"
  ON public.orders FOR SELECT
  USING (public.is_staff());

CREATE POLICY "Staff can update orders"
  ON public.orders FOR UPDATE
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

CREATE POLICY "Admin can insert orders directly"
  ON public.orders FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Staff can view order items"
  ON public.order_items FOR SELECT
  USING (public.is_staff());

CREATE POLICY "Staff can update order items"
  ON public.order_items FOR UPDATE
  USING (public.is_staff());

CREATE POLICY "Staff can view order item options"
  ON public.order_item_options FOR SELECT
  USING (public.is_staff());

CREATE POLICY "Staff can view order status events"
  ON public.order_status_events FOR SELECT
  USING (public.is_staff());

CREATE POLICY "Staff can insert order status events"
  ON public.order_status_events FOR INSERT
  WITH CHECK (public.is_staff());

-- Payments
CREATE POLICY "Admin can view payments"
  ON public.payments FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admin can manage payments"
  ON public.payments FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- 11. STORAGE BUCKET & SINGLE-RESTAURANT OBJECT POLICIES
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('restaurant-assets', 'restaurant-assets', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Read Access for Restaurant Assets" ON storage.objects;
CREATE POLICY "Public Read Access for Restaurant Assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'restaurant-assets');

DROP POLICY IF EXISTS "Admin Can Upload Restaurant Assets" ON storage.objects;
CREATE POLICY "Admin Can Upload Restaurant Assets"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'restaurant-assets' AND public.is_admin());

DROP POLICY IF EXISTS "Admin Can Update Restaurant Assets" ON storage.objects;
CREATE POLICY "Admin Can Update Restaurant Assets"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'restaurant-assets' AND public.is_admin());

DROP POLICY IF EXISTS "Admin Can Delete Restaurant Assets" ON storage.objects;
CREATE POLICY "Admin Can Delete Restaurant Assets"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'restaurant-assets' AND public.is_admin());

-- ------------------------------------------------------------------------------
-- 12. REALTIME PUBLICATION & PERMISSION GRANTS
-- ------------------------------------------------------------------------------
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.order_items REPLICA IDENTITY FULL;
ALTER TABLE public.order_status_events REPLICA IDENTITY FULL;
ALTER TABLE public.table_sessions REPLICA IDENTITY FULL;

DO $$
DECLARE
  rt_table TEXT;
  rt_tables TEXT[] := ARRAY['orders', 'order_items', 'order_status_events', 'table_sessions'];
BEGIN
  FOREACH rt_table IN ARRAY rt_tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = rt_table
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', rt_table);
    END IF;
  END LOOP;
END $$;

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_table_qr(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_customer_order(TEXT, UUID, JSONB, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_order_by_public_token(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_session_orders(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.request_table_bill(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_session_context(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_order_status_secure(UUID, order_status, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_order_item_status_secure(UUID, order_item_status) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated;

-- ------------------------------------------------------------------------------
-- 13. FIRST ADMIN BOOTSTRAP HELPER (Run with your Admin user's email after signup)
-- ------------------------------------------------------------------------------
-- To promote your first Supabase Auth user to 'admin' after creating the user in
-- Supabase Auth -> Users (or signing up), run:
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'your-admin-email@example.com';

-- ------------------------------------------------------------------------------
-- 14. ROLLBACK & VERIFICATION CHECKLIST
-- ------------------------------------------------------------------------------
-- Legacy multi-tenant tables (`public.restaurants`, `public.restaurant_memberships`)
-- are intentionally preserved (with RLS enabled and zero permissive policies) rather
-- than dropped so zero historical configuration data is lost.
-- Once you verify your single-restaurant setup is running smoothly, you may optionally
-- archive or drop those legacy tables manually.
--
-- Verification Queries (Run in SQL Editor after executing this migration):
--   1. SELECT COUNT(*) FROM public.restaurant_settings; -- Should be 1
--   2. SELECT id, email, role, active FROM public.profiles;
--   3. SELECT table_number, capacity, active FROM public.tables;
--   4. SELECT status, COUNT(*) FROM public.orders GROUP BY status;
--   5. SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
-- ==============================================================================
