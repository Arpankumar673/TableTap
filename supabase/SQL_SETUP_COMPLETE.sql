-- ==============================================================================
-- TABLETAP — COMPLETE MULTI-TENANT SAAS DATABASE INITIALIZATION SCRIPT
-- File: supabase/SQL_SETUP_COMPLETE.sql
--
-- Execution Instructions:
-- 1. Open your Supabase Project Dashboard -> SQL Editor
-- 2. Create a "New query"
-- 3. Paste the entire contents of this file and click "Run"
-- 4. Verify tables, functions, storage bucket, and policies are created
--
-- Security Architecture:
-- - Multi-tenant isolation keyed by `restaurant_id`
-- - Strict Row Level Security (RLS) enabled on ALL public tables
-- - Default-deny posture with explicit role-scoped policies (owner, admin, kitchen)
-- - Unguessable hashed tokens for QR codes and table sessions
-- - Server-side transactional pricing & order snapshot RPCs
-- - Safe idempotent statements (does not drop existing tables or user data)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. EXTENSIONS
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 2. CUSTOM ENUMS & TYPES (Idempotent Creation)
-- ------------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('owner', 'admin', 'kitchen');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE dietary_type AS ENUM ('veg', 'non-veg', 'vegan', 'egg');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE order_status AS ENUM (
    'pending',
    'accepted',
    'preparing',
    'ready',
    'served',
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
-- 3. UTILITY TRIGGER FUNCTION (updated_at automation)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = clock_timestamp();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- 4. CORE TABLES (Multi-Tenant Schema)
-- ------------------------------------------------------------------------------

-- 4.1 Restaurants (Tenant Root)
CREATE TABLE IF NOT EXISTS public.restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  slug VARCHAR(80) NOT NULL UNIQUE,
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
  active BOOLEAN NOT NULL DEFAULT true,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- Safe additive columns in case Phase 1 table already exists
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS email VARCHAR(150);
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS opening_hours JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS is_accepting_orders BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_restaurants_slug ON public.restaurants(slug);
CREATE INDEX IF NOT EXISTS idx_restaurants_active ON public.restaurants(active);

-- 4.2 Profiles (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(150),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- 4.3 Restaurant Memberships (Minimum RBAC: owner, admin, kitchen)
CREATE TABLE IF NOT EXISTS public.restaurant_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'admin',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(restaurant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_memberships_user ON public.restaurant_memberships(user_id, active);
CREATE INDEX IF NOT EXISTS idx_memberships_restaurant ON public.restaurant_memberships(restaurant_id, role);

-- 4.4 Menu Categories
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(120) NOT NULL,
  description TEXT,
  image_url TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(restaurant_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_categories_restaurant ON public.categories(restaurant_id, sort_order) WHERE active = true;

-- 4.5 Preparation Stations (Pizza, Grill, Beverages, Desserts, Main Kitchen)
CREATE TABLE IF NOT EXISTS public.preparation_stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name VARCHAR(80) NOT NULL,
  description TEXT,
  color_hex VARCHAR(16) NOT NULL DEFAULT '#1B5E3A',
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(restaurant_id, name)
);

ALTER TABLE public.preparation_stations ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.preparation_stations ADD COLUMN IF NOT EXISTS color_hex VARCHAR(16) NOT NULL DEFAULT '#1B5E3A';

CREATE INDEX IF NOT EXISTS idx_stations_restaurant ON public.preparation_stations(restaurant_id, sort_order);

-- 4.6 Products
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  station_id UUID REFERENCES public.preparation_stations(id) ON DELETE SET NULL,
  name VARCHAR(150) NOT NULL,
  slug VARCHAR(180) NOT NULL,
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
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(restaurant_id, slug)
);

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS prep_time_minutes INT NOT NULL DEFAULT 15;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id, sort_order, active, available);
CREATE INDEX IF NOT EXISTS idx_products_restaurant ON public.products(restaurant_id, active, available);
CREATE INDEX IF NOT EXISTS idx_products_station ON public.products(station_id);

-- 4.7 Product Variants (Sizes, Portions, Crusts with distinct canonical pricing)
CREATE TABLE IF NOT EXISTS public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_variants_product ON public.product_variants(product_id, sort_order) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_variants_restaurant ON public.product_variants(restaurant_id);

-- 4.8 Customization Option Groups (Add-ons, Extra Toppings, Removals, Cheese)
CREATE TABLE IF NOT EXISTS public.option_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  required BOOLEAN NOT NULL DEFAULT false,
  min_select INT NOT NULL DEFAULT 0 CHECK (min_select >= 0),
  max_select INT NOT NULL DEFAULT 1 CHECK (max_select >= min_select),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

ALTER TABLE public.option_groups ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.option_groups ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.option_groups ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp();

CREATE INDEX IF NOT EXISTS idx_option_groups_restaurant ON public.option_groups(restaurant_id);

-- 4.9 Customization Option Values
CREATE TABLE IF NOT EXISTS public.option_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  option_group_id UUID NOT NULL REFERENCES public.option_groups(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  price_delta NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (price_delta >= 0),
  is_default BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

ALTER TABLE public.option_values ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE;
ALTER TABLE public.option_values ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp();

CREATE INDEX IF NOT EXISTS idx_option_values_group ON public.option_values(option_group_id, sort_order) WHERE active = true;

-- 4.10 Product-Option Group Mapping
CREATE TABLE IF NOT EXISTS public.product_option_groups (
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  option_group_id UUID NOT NULL REFERENCES public.option_groups(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, option_group_id)
);

CREATE INDEX IF NOT EXISTS idx_product_option_groups_group ON public.product_option_groups(option_group_id);

-- 4.11 Restaurant Tables
CREATE TABLE IF NOT EXISTS public.restaurant_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  table_number VARCHAR(20) NOT NULL,
  label VARCHAR(60),
  capacity INT NOT NULL DEFAULT 4 CHECK (capacity > 0),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(restaurant_id, table_number)
);

CREATE INDEX IF NOT EXISTS idx_tables_restaurant ON public.restaurant_tables(restaurant_id, active);

-- 4.12 Table QR Tokens (Hashed Unguessable Credentials)
CREATE TABLE IF NOT EXISTS public.table_qr_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  table_id UUID NOT NULL REFERENCES public.restaurant_tables(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  token_prefix VARCHAR(16),
  qr_token_secret TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  revoked_at TIMESTAMPTZ
);

ALTER TABLE public.table_qr_tokens ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE;
ALTER TABLE public.table_qr_tokens ADD COLUMN IF NOT EXISTS token_prefix VARCHAR(16);
ALTER TABLE public.table_qr_tokens ADD COLUMN IF NOT EXISTS qr_token_secret TEXT;

CREATE INDEX IF NOT EXISTS idx_qr_tokens_active ON public.table_qr_tokens(token_hash) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_qr_tokens_table ON public.table_qr_tokens(table_id, active);

-- 4.13 Table Dining Sessions
CREATE TABLE IF NOT EXISTS public.table_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  table_id UUID NOT NULL REFERENCES public.restaurant_tables(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  status session_status NOT NULL DEFAULT 'open',
  bill_requested BOOLEAN NOT NULL DEFAULT false,
  bill_requested_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  closed_at TIMESTAMPTZ
);

ALTER TABLE public.table_sessions ADD COLUMN IF NOT EXISTS bill_requested BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.table_sessions ADD COLUMN IF NOT EXISTS bill_requested_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_sessions_active ON public.table_sessions(restaurant_id, table_id) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_sessions_token ON public.table_sessions(session_token) WHERE status = 'open';

-- 4.14 Orders Header
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  table_session_id UUID NOT NULL REFERENCES public.table_sessions(id) ON DELETE RESTRICT,
  table_id UUID REFERENCES public.restaurant_tables(id) ON DELETE SET NULL,
  table_number_snapshot VARCHAR(20),
  order_number VARCHAR(30) NOT NULL,
  public_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  status order_status NOT NULL DEFAULT 'pending',
  subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0),
  discount NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (discount >= 0),
  tax NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (tax >= 0),
  service_charge NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (service_charge >= 0),
  total NUMERIC(10, 2) NOT NULL CHECK (total >= 0),
  payment_status payment_status NOT NULL DEFAULT 'unpaid',
  idempotency_key UUID NOT NULL,
  customer_notes TEXT,
  accepted_at TIMESTAMPTZ,
  preparing_at TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  served_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(restaurant_id, order_number),
  UNIQUE(restaurant_id, idempotency_key)
);

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS table_id UUID REFERENCES public.restaurant_tables(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS table_number_snapshot VARCHAR(20);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS preparing_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS ready_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS served_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_restaurant_status ON public.orders(restaurant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_created ON public.orders(restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_session ON public.orders(table_session_id);
CREATE INDEX IF NOT EXISTS idx_orders_public_token ON public.orders(public_token);

-- 4.15 Order Items (Immutable Purchase Snapshot)
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
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

ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS variant_name_snapshot VARCHAR(100);
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS station_id UUID REFERENCES public.preparation_stations(id) ON DELETE SET NULL;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp();

CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_restaurant_status ON public.order_items(restaurant_id, status);

-- 4.16 Order Item Options Snapshot
CREATE TABLE IF NOT EXISTS public.order_item_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id UUID NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  option_group_name_snapshot VARCHAR(100) NOT NULL,
  option_value_name_snapshot VARCHAR(100) NOT NULL,
  price_delta_snapshot NUMERIC(10, 2) NOT NULL DEFAULT 0.00
);

CREATE INDEX IF NOT EXISTS idx_order_item_options_item ON public.order_item_options(order_item_id);

-- 4.17 Order Status Audit History
CREATE TABLE IF NOT EXISTS public.order_status_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  from_status order_status,
  to_status order_status NOT NULL,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

ALTER TABLE public.order_status_events ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_order_status_events ON public.order_status_events(order_id, created_at);

-- 4.18 Payments
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
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

ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS provider_order_id TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS provider_signature TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp();

CREATE INDEX IF NOT EXISTS idx_payments_order ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_restaurant ON public.payments(restaurant_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_provider_order ON public.payments(provider_order_id);

-- ------------------------------------------------------------------------------
-- 5. TRIGGERS (Auto-Timestamp & Auth Profile Sync)
-- ------------------------------------------------------------------------------

-- 5.1 Attach updated_at triggers safely
DO $$
DECLARE
  t_name TEXT;
  target_tables TEXT[] := ARRAY[
    'restaurants',
    'profiles',
    'restaurant_memberships',
    'categories',
    'products',
    'product_variants',
    'option_groups',
    'restaurant_tables',
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

-- 5.2 Auto-create profile when a new Supabase Auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    NEW.raw_user_meta_data->>'avatar_url'
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
-- 6. SECURITY & AUTHORIZATION HELPER FUNCTIONS
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_user_restaurant_role(target_restaurant_id UUID)
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT role
  FROM public.restaurant_memberships
  WHERE restaurant_id = target_restaurant_id
    AND user_id = auth.uid()
    AND active = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_restaurant_member(target_restaurant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.restaurant_memberships
    WHERE restaurant_id = target_restaurant_id
      AND user_id = auth.uid()
      AND active = true
  );
$$;

-- ------------------------------------------------------------------------------
-- 7. SECURE SERVER-SIDE BUSINESS LOGIC RPCS
-- ------------------------------------------------------------------------------

-- 7.1 Atomic Restaurant Onboarding
CREATE OR REPLACE FUNCTION public.onboard_restaurant(
  p_name VARCHAR,
  p_slug VARCHAR,
  p_currency VARCHAR DEFAULT 'INR',
  p_timezone VARCHAR DEFAULT 'Asia/Kolkata',
  p_phone VARCHAR DEFAULT NULL,
  p_address TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id UUID;
  v_restaurant_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to onboard a restaurant';
  END IF;

  INSERT INTO public.restaurants (name, slug, currency, timezone, phone, address)
  VALUES (p_name, LOWER(TRIM(p_slug)), p_currency, p_timezone, p_phone, p_address)
  RETURNING id INTO v_restaurant_id;

  INSERT INTO public.restaurant_memberships (restaurant_id, user_id, role, active)
  VALUES (v_restaurant_id, v_user_id, 'owner', true);

  -- Create default preparation stations
  INSERT INTO public.preparation_stations (restaurant_id, name, color_hex, sort_order)
  VALUES
    (v_restaurant_id, 'Main Kitchen', '#1B5E3A', 1),
    (v_restaurant_id, 'Pizza', '#D93829', 2),
    (v_restaurant_id, 'Grill', '#F58220', 3),
    (v_restaurant_id, 'Beverages', '#0369A1', 4),
    (v_restaurant_id, 'Desserts', '#9333EA', 5);

  RETURN jsonb_build_object(
    'restaurant_id', v_restaurant_id,
    'slug', LOWER(TRIM(p_slug)),
    'role', 'owner'
  );
END;
$$;

-- 7.2 Secure QR Resolution & Table Session Retrieval/Creation
CREATE OR REPLACE FUNCTION public.resolve_table_qr(p_token_hash TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_token RECORD;
  v_session RECORD;
  v_new_session_token TEXT;
BEGIN
  SELECT
    qr.id AS qr_id,
    qr.table_id,
    t.restaurant_id,
    t.table_number,
    t.label AS table_label,
    t.active AS table_active,
    r.name AS restaurant_name,
    r.slug AS restaurant_slug,
    r.active AS restaurant_active,
    r.is_accepting_orders,
    r.currency,
    r.tax_rate,
    r.service_charge_rate,
    r.logo_url
  INTO v_token
  FROM public.table_qr_tokens qr
  JOIN public.restaurant_tables t ON t.id = qr.table_id
  JOIN public.restaurants r ON r.id = t.restaurant_id
  WHERE qr.token_hash = p_token_hash
    AND qr.active = true
    AND qr.revoked_at IS NULL
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invalid or revoked table QR code.');
  END IF;

  IF NOT v_token.restaurant_active THEN
    RETURN jsonb_build_object('valid', false, 'error', 'This restaurant is currently inactive.');
  END IF;

  IF NOT v_token.table_active THEN
    RETURN jsonb_build_object('valid', false, 'error', 'This table is currently deactivated.');
  END IF;

  -- Look for an existing open table session
  SELECT *
  INTO v_session
  FROM public.table_sessions
  WHERE table_id = v_token.table_id
    AND status = 'open'
  ORDER BY opened_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    v_new_session_token := encode(gen_random_bytes(32), 'hex');
    INSERT INTO public.table_sessions (restaurant_id, table_id, session_token, status)
    VALUES (v_token.restaurant_id, v_token.table_id, v_new_session_token, 'open')
    RETURNING * INTO v_session;
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'restaurant_id', v_token.restaurant_id,
    'restaurant_name', v_token.restaurant_name,
    'restaurant_slug', v_token.restaurant_slug,
    'is_accepting_orders', v_token.is_accepting_orders,
    'currency', v_token.currency,
    'tax_rate', v_token.tax_rate,
    'service_charge_rate', v_token.service_charge_rate,
    'table_id', v_token.table_id,
    'table_number', v_token.table_number,
    'table_label', v_token.table_label,
    'session_id', v_session.id,
    'session_token', v_session.session_token
  );
END;
$$;

-- 7.3 Transactional Server-Validated Customer Order Placement
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
  v_restaurant RECORD;
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
  v_station RECORD;
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

  SELECT * INTO v_restaurant
  FROM public.restaurants
  WHERE id = v_session.restaurant_id AND active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Restaurant not found or inactive.';
  END IF;

  IF NOT v_restaurant.is_accepting_orders THEN
    RAISE EXCEPTION 'Restaurant is currently not accepting new orders.';
  END IF;

  SELECT * INTO v_table
  FROM public.restaurant_tables
  WHERE id = v_session.table_id AND active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Table is currently inactive.';
  END IF;

  -- 2. Idempotency protection
  SELECT id, order_number, public_token, status, total
  INTO v_existing_order
  FROM public.orders
  WHERE restaurant_id = v_restaurant.id
    AND idempotency_key = p_idempotency_key
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

  -- 4. Lock per-restaurant for collision-free sequential order number
  PERFORM pg_advisory_xact_lock(hashtext(v_restaurant.id::text));
  SELECT COUNT(*) INTO v_count FROM public.orders WHERE restaurant_id = v_restaurant.id;
  v_order_number := 'TT-' || LPAD((v_count + 1001)::TEXT, 4, '0');
  v_public_token := encode(gen_random_bytes(16), 'hex');

  -- Pre-insert header (totals updated after item calculation)
  INSERT INTO public.orders (
    restaurant_id, table_session_id, table_id, table_number_snapshot,
    order_number, public_token, status, subtotal, discount, tax, service_charge, total,
    payment_status, idempotency_key, customer_notes
  )
  VALUES (
    v_restaurant.id, v_session.id, v_table.id, v_table.table_number,
    v_order_number, v_public_token, 'pending', 0, 0, 0, 0, 0,
    'unpaid', p_idempotency_key, NULLIF(TRIM(COALESCE(p_customer_notes, '')), '')
  )
  RETURNING id INTO v_order_id;

  -- 5. Process & verify every line item against canonical database prices
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_qty := COALESCE((v_item->>'quantity')::INT, 0);
    IF v_qty < 1 OR v_qty > 50 THEN
      RAISE EXCEPTION 'Item quantity must be between 1 and 50.';
    END IF;

    SELECT * INTO v_product
    FROM public.products
    WHERE id = (v_item->>'product_id')::UUID
      AND restaurant_id = v_restaurant.id
      AND active = true
      AND available = true;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product % is unavailable or does not belong to this restaurant.', v_item->>'product_id';
    END IF;

    v_unit_base := v_product.base_price;
    v_variant_name := NULL;

    -- Check variant if supplied
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

    -- Resolve preparation station snapshot
    v_station_name := 'Main Kitchen';
    IF v_product.station_id IS NOT NULL THEN
      SELECT name INTO v_station_name FROM public.preparation_stations WHERE id = v_product.station_id;
    END IF;

    -- Validate required option groups attached to product
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

    -- Sum selected option values
    v_options_sum := 0.00;
    IF jsonb_typeof(v_item->'option_value_ids') = 'array' THEN
      FOR v_opt_id IN
        SELECT (elem)::UUID FROM jsonb_array_elements_text(v_item->'option_value_ids') AS elem
      LOOP
        SELECT ov.id, ov.name, ov.price_delta, og.name AS group_name
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
      restaurant_id, order_id, product_id, variant_id,
      product_name_snapshot, variant_name_snapshot,
      quantity, unit_price_snapshot, total_price_snapshot,
      station_id, station_name_snapshot, notes, status
    )
    VALUES (
      v_restaurant.id, v_order_id, v_product.id,
      NULLIF(v_item->>'variant_id', '')::UUID,
      v_product.name, v_variant_name,
      v_qty, v_unit_price, v_line_total,
      v_product.station_id, v_station_name,
      NULLIF(TRIM(COALESCE(v_item->>'notes', '')), ''),
      'pending'
    )
    RETURNING id INTO v_order_item_id;

    -- Snapshot selected options
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

  -- 6. Calculate final canonical totals
  v_tax := ROUND(v_subtotal * (v_restaurant.tax_rate / 100.0), 2);
  v_service_charge := ROUND(v_subtotal * (v_restaurant.service_charge_rate / 100.0), 2);
  v_total := ROUND(v_subtotal + v_tax + v_service_charge, 2);

  UPDATE public.orders
  SET subtotal = v_subtotal,
      tax = v_tax,
      service_charge = v_service_charge,
      total = v_total
  WHERE id = v_order_id;

  -- 7. Record initial audit event
  INSERT INTO public.order_status_events (
    restaurant_id, order_id, from_status, to_status, reason
  )
  VALUES (
    v_restaurant.id, v_order_id, NULL, 'pending', 'Order submitted by table guest'
  );

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'public_token', v_public_token,
    'status', 'pending',
    'subtotal', v_subtotal,
    'tax', v_tax,
    'service_charge', v_service_charge,
    'total', v_total,
    'duplicate', false
  );
END;
$$;

-- 7.4 Safe Customer Order Tracking Read by Public Token
CREATE OR REPLACE FUNCTION public.get_order_by_public_token(p_public_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_order RECORD;
  v_items JSONB;
  v_events JSONB;
BEGIN
  SELECT
    o.*,
    r.name AS restaurant_name,
    r.slug AS restaurant_slug,
    r.currency AS restaurant_currency,
    r.phone AS restaurant_phone
  INTO v_order
  FROM public.orders o
  JOIN public.restaurants r ON r.id = o.restaurant_id
  WHERE o.public_token = p_public_token
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

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
    'restaurant_name', v_order.restaurant_name,
    'restaurant_slug', v_order.restaurant_slug,
    'currency', v_order.restaurant_currency,
    'restaurant_phone', v_order.restaurant_phone,
    'items', v_items,
    'events', v_events
  );
END;
$$;

-- 7.5 Safe Session Orders Read by Session Token
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

-- 7.6 Customer Request Bill for Active Session
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

-- 7.6b Safe Session Context Lookup for Menu Header
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
    ts.restaurant_id,
    ts.table_id,
    ts.status,
    rt.table_number,
    rt.label AS table_label,
    rt.active AS table_active
  INTO v_row
  FROM public.table_sessions ts
  JOIN public.restaurant_tables rt ON rt.id = ts.table_id
  WHERE ts.session_token = p_session_token
    AND ts.status = 'open'
  LIMIT 1;

  IF NOT FOUND OR NOT v_row.table_active THEN
    RETURN jsonb_build_object('valid', false);
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'session_id', v_row.session_id,
    'restaurant_id', v_row.restaurant_id,
    'table_id', v_row.table_id,
    'table_number', v_row.table_number,
    'table_label', v_row.table_label
  );
END;
$$;

-- 7.7 Prevent Unauthorized Tenant ID Reassignment
CREATE OR REPLACE FUNCTION public.prevent_restaurant_id_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.restaurant_id IS DISTINCT FROM OLD.restaurant_id THEN
    RAISE EXCEPTION 'Security violation: restaurant_id cannot be modified after creation';
  END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  t_name TEXT;
  tenant_tables TEXT[] := ARRAY[
    'categories',
    'preparation_stations',
    'products',
    'product_variants',
    'option_groups',
    'restaurant_tables',
    'table_sessions',
    'orders',
    'order_items'
  ];
BEGIN
  FOREACH t_name IN ARRAY tenant_tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_immutable_tenant ON public.%I;', t_name, t_name);
    EXECUTE format(
      'CREATE TRIGGER trg_%I_immutable_tenant BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.prevent_restaurant_id_change();',
      t_name, t_name
    );
  END LOOP;
END $$;

-- 7.8 Secure Kitchen / Admin Order Status Update with Audit Trail
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
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  v_role := public.get_user_restaurant_role(v_order.restaurant_id);
  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: user does not belong to this restaurant';
  END IF;

  IF v_order.status = 'completed' OR v_order.status = 'cancelled' THEN
    RAISE EXCEPTION 'Cannot transition order from terminal state %', v_order.status;
  END IF;

  IF p_new_status = 'cancelled' AND v_role = 'kitchen' AND v_order.status NOT IN ('pending', 'accepted') THEN
    RAISE EXCEPTION 'Kitchen operators can only cancel orders prior to active preparation';
  END IF;

  UPDATE public.orders
  SET status = p_new_status,
      accepted_at = CASE WHEN p_new_status = 'accepted' AND accepted_at IS NULL THEN clock_timestamp() ELSE accepted_at END,
      preparing_at = CASE WHEN p_new_status = 'preparing' AND preparing_at IS NULL THEN clock_timestamp() ELSE preparing_at END,
      ready_at = CASE WHEN p_new_status = 'ready' AND ready_at IS NULL THEN clock_timestamp() ELSE ready_at END,
      served_at = CASE WHEN p_new_status = 'served' AND served_at IS NULL THEN clock_timestamp() ELSE served_at END,
      completed_at = CASE WHEN p_new_status = 'completed' AND completed_at IS NULL THEN clock_timestamp() ELSE completed_at END,
      cancelled_at = CASE WHEN p_new_status = 'cancelled' AND cancelled_at IS NULL THEN clock_timestamp() ELSE cancelled_at END,
      cancellation_reason = CASE WHEN p_new_status = 'cancelled' THEN COALESCE(NULLIF(TRIM(p_reason), ''), 'Cancelled by staff') ELSE cancellation_reason END
  WHERE id = p_order_id;

  -- Synchronize item states on bulk transitions when applicable
  IF p_new_status IN ('preparing', 'ready', 'cancelled') THEN
    UPDATE public.order_items
    SET status = CASE
      WHEN p_new_status = 'preparing' AND status = 'pending' THEN 'preparing'::order_item_status
      WHEN p_new_status = 'ready' AND status IN ('pending', 'preparing') THEN 'ready'::order_item_status
      WHEN p_new_status = 'cancelled' THEN 'cancelled'::order_item_status
      ELSE status
    END
    WHERE order_id = p_order_id;
  END IF;

  INSERT INTO public.order_status_events (
    restaurant_id, order_id, from_status, to_status, actor_user_id, reason
  )
  VALUES (
    v_order.restaurant_id, p_order_id, v_order.status, p_new_status, auth.uid(), NULLIF(TRIM(COALESCE(p_reason, '')), '')
  );

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'from_status', v_order.status,
    'to_status', p_new_status
  );
END;
$$;

-- 7.9 Secure Station-Level Order Item Status Update
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
  v_role user_role;
  v_all_ready BOOLEAN;
BEGIN
  SELECT * INTO v_item FROM public.order_items WHERE id = p_order_item_id LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order item not found';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = v_item.order_id;
  v_role := public.get_user_restaurant_role(v_order.restaurant_id);
  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: user does not belong to this restaurant';
  END IF;

  UPDATE public.order_items
  SET status = p_new_status
  WHERE id = p_order_item_id;

  -- Automatically advance parent order to preparing or ready based on active items
  IF p_new_status = 'preparing' AND v_order.status IN ('pending', 'accepted') THEN
    PERFORM public.update_order_status_secure(v_order.id, 'preparing', 'Station started item preparation');
  ELSIF p_new_status = 'ready' THEN
    SELECT NOT EXISTS (
      SELECT 1 FROM public.order_items
      WHERE order_id = v_order.id
        AND status NOT IN ('ready', 'cancelled')
    ) INTO v_all_ready;

    IF v_all_ready AND v_order.status IN ('pending', 'accepted', 'preparing') THEN
      PERFORM public.update_order_status_secure(v_order.id, 'ready', 'All station items marked ready');
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
-- 8. ROW LEVEL SECURITY (RLS) ENABLEMENT & POLICIES
-- ------------------------------------------------------------------------------

ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preparation_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.option_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.option_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_option_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.table_qr_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.table_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_item_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Drop old Phase 1 policies cleanly before recreating comprehensive RLS policies
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

-- 8.1 Restaurants
CREATE POLICY "Public can view active restaurants"
  ON public.restaurants FOR SELECT
  USING (active = true OR public.is_restaurant_member(id));

CREATE POLICY "Authenticated users can create restaurants"
  ON public.restaurants FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Owners and Admins can update restaurant"
  ON public.restaurants FOR UPDATE
  USING (public.get_user_restaurant_role(id) IN ('owner', 'admin'))
  WITH CHECK (public.get_user_restaurant_role(id) IN ('owner', 'admin'));

CREATE POLICY "Owners can delete restaurant"
  ON public.restaurants FOR DELETE
  USING (public.get_user_restaurant_role(id) = 'owner');

-- 8.2 Profiles
CREATE POLICY "Users can view own profile or fellow members"
  ON public.profiles FOR SELECT
  USING (
    id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.restaurant_memberships rm1
      JOIN public.restaurant_memberships rm2 ON rm1.restaurant_id = rm2.restaurant_id
      WHERE rm1.user_id = auth.uid() AND rm2.user_id = public.profiles.id
        AND rm1.active = true AND rm2.active = true
    )
  );

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 8.3 Restaurant Memberships
CREATE POLICY "Members can view memberships in their restaurant"
  ON public.restaurant_memberships FOR SELECT
  USING (
    user_id = auth.uid() OR
    public.get_user_restaurant_role(restaurant_id) IN ('owner', 'admin')
  );

CREATE POLICY "Owners can insert memberships"
  ON public.restaurant_memberships FOR INSERT
  WITH CHECK (public.get_user_restaurant_role(restaurant_id) = 'owner');

CREATE POLICY "Owners can update memberships"
  ON public.restaurant_memberships FOR UPDATE
  USING (public.get_user_restaurant_role(restaurant_id) = 'owner')
  WITH CHECK (public.get_user_restaurant_role(restaurant_id) = 'owner');

CREATE POLICY "Owners can delete memberships"
  ON public.restaurant_memberships FOR DELETE
  USING (public.get_user_restaurant_role(restaurant_id) = 'owner');

-- 8.4 Categories
CREATE POLICY "Public can view active categories of active restaurants"
  ON public.categories FOR SELECT
  USING (
    (active = true AND EXISTS (
      SELECT 1 FROM public.restaurants r WHERE r.id = restaurant_id AND r.active = true
    )) OR public.is_restaurant_member(restaurant_id)
  );

CREATE POLICY "Owners and Admins can manage categories"
  ON public.categories FOR ALL
  USING (public.get_user_restaurant_role(restaurant_id) IN ('owner', 'admin'))
  WITH CHECK (public.get_user_restaurant_role(restaurant_id) IN ('owner', 'admin'));

-- 8.5 Preparation Stations
CREATE POLICY "Members can view preparation stations"
  ON public.preparation_stations FOR SELECT
  USING (public.is_restaurant_member(restaurant_id));

CREATE POLICY "Owners and Admins can manage preparation stations"
  ON public.preparation_stations FOR ALL
  USING (public.get_user_restaurant_role(restaurant_id) IN ('owner', 'admin'))
  WITH CHECK (public.get_user_restaurant_role(restaurant_id) IN ('owner', 'admin'));

-- 8.6 Products
CREATE POLICY "Public can view active products of active restaurants"
  ON public.products FOR SELECT
  USING (
    (active = true AND EXISTS (
      SELECT 1 FROM public.restaurants r WHERE r.id = restaurant_id AND r.active = true
    )) OR public.is_restaurant_member(restaurant_id)
  );

CREATE POLICY "Owners and Admins can manage products"
  ON public.products FOR ALL
  USING (public.get_user_restaurant_role(restaurant_id) IN ('owner', 'admin'))
  WITH CHECK (public.get_user_restaurant_role(restaurant_id) IN ('owner', 'admin'));

-- 8.7 Product Variants
CREATE POLICY "Public can view active product variants"
  ON public.product_variants FOR SELECT
  USING (
    (active = true AND EXISTS (
      SELECT 1 FROM public.products p
      JOIN public.restaurants r ON r.id = p.restaurant_id
      WHERE p.id = product_id AND p.active = true AND r.active = true
    )) OR public.is_restaurant_member(restaurant_id)
  );

CREATE POLICY "Owners and Admins can manage product variants"
  ON public.product_variants FOR ALL
  USING (public.get_user_restaurant_role(restaurant_id) IN ('owner', 'admin'))
  WITH CHECK (public.get_user_restaurant_role(restaurant_id) IN ('owner', 'admin'));

-- 8.8 Option Groups & Values & Mappings
CREATE POLICY "Public can view active option groups"
  ON public.option_groups FOR SELECT
  USING (active = true OR public.is_restaurant_member(restaurant_id));

CREATE POLICY "Owners and Admins can manage option groups"
  ON public.option_groups FOR ALL
  USING (public.get_user_restaurant_role(restaurant_id) IN ('owner', 'admin'))
  WITH CHECK (public.get_user_restaurant_role(restaurant_id) IN ('owner', 'admin'));

CREATE POLICY "Public can view active option values"
  ON public.option_values FOR SELECT
  USING (
    active = true OR EXISTS (
      SELECT 1 FROM public.option_groups og
      WHERE og.id = option_group_id AND public.is_restaurant_member(og.restaurant_id)
    )
  );

CREATE POLICY "Owners and Admins can manage option values"
  ON public.option_values FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.option_groups og
      WHERE og.id = option_group_id AND public.get_user_restaurant_role(og.restaurant_id) IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.option_groups og
      WHERE og.id = option_group_id AND public.get_user_restaurant_role(og.restaurant_id) IN ('owner', 'admin')
    )
  );

CREATE POLICY "Public can view product option mappings"
  ON public.product_option_groups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_id AND (p.active = true OR public.is_restaurant_member(p.restaurant_id))
    )
  );

CREATE POLICY "Owners and Admins can manage product option mappings"
  ON public.product_option_groups FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_id AND public.get_user_restaurant_role(p.restaurant_id) IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_id AND public.get_user_restaurant_role(p.restaurant_id) IN ('owner', 'admin')
    )
  );

-- 8.9 Restaurant Tables
CREATE POLICY "Members can view restaurant tables"
  ON public.restaurant_tables FOR SELECT
  USING (public.is_restaurant_member(restaurant_id));

CREATE POLICY "Owners and Admins can manage tables"
  ON public.restaurant_tables FOR ALL
  USING (public.get_user_restaurant_role(restaurant_id) IN ('owner', 'admin'))
  WITH CHECK (public.get_user_restaurant_role(restaurant_id) IN ('owner', 'admin'));

-- 8.10 Table QR Tokens (Restricted strictly to Owners & Admins; public resolves via RPC only)
CREATE POLICY "Owners and Admins can manage QR tokens"
  ON public.table_qr_tokens FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.restaurant_tables rt
      WHERE rt.id = table_id AND public.get_user_restaurant_role(rt.restaurant_id) IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.restaurant_tables rt
      WHERE rt.id = table_id AND public.get_user_restaurant_role(rt.restaurant_id) IN ('owner', 'admin')
    )
  );

-- 8.11 Table Sessions (Restricted to restaurant staff; guests use scoped RPC)
CREATE POLICY "Members can view table sessions"
  ON public.table_sessions FOR SELECT
  USING (public.is_restaurant_member(restaurant_id));

CREATE POLICY "Owners and Admins can manage table sessions"
  ON public.table_sessions FOR ALL
  USING (public.get_user_restaurant_role(restaurant_id) IN ('owner', 'admin'))
  WITH CHECK (public.get_user_restaurant_role(restaurant_id) IN ('owner', 'admin'));

-- 8.12 Orders (Tenant-isolated for Staff; Public tracks via RPC/token)
CREATE POLICY "Members can view restaurant orders"
  ON public.orders FOR SELECT
  USING (public.is_restaurant_member(restaurant_id));

CREATE POLICY "Kitchen, Admins and Owners can update orders"
  ON public.orders FOR UPDATE
  USING (public.is_restaurant_member(restaurant_id))
  WITH CHECK (public.is_restaurant_member(restaurant_id));

CREATE POLICY "Admins and Owners can insert orders directly"
  ON public.orders FOR INSERT
  WITH CHECK (public.get_user_restaurant_role(restaurant_id) IN ('owner', 'admin'));

-- 8.13 Order Items & Options & Status History
CREATE POLICY "Members can view restaurant order items"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND public.is_restaurant_member(o.restaurant_id)
    )
  );

CREATE POLICY "Members can update restaurant order items"
  ON public.order_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND public.is_restaurant_member(o.restaurant_id)
    )
  );

CREATE POLICY "Members can view order item options"
  ON public.order_item_options FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.order_items oi
      JOIN public.orders o ON o.id = oi.order_id
      WHERE oi.id = order_item_id AND public.is_restaurant_member(o.restaurant_id)
    )
  );

CREATE POLICY "Members can view order status events"
  ON public.order_status_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND public.is_restaurant_member(o.restaurant_id)
    )
  );

CREATE POLICY "Members can insert order status events"
  ON public.order_status_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND public.is_restaurant_member(o.restaurant_id)
    )
  );

-- 8.14 Payments
CREATE POLICY "Owners and Admins can view payments"
  ON public.payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND public.get_user_restaurant_role(o.restaurant_id) IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners and Admins can manage payments"
  ON public.payments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND public.get_user_restaurant_role(o.restaurant_id) IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND public.get_user_restaurant_role(o.restaurant_id) IN ('owner', 'admin')
    )
  );

-- ------------------------------------------------------------------------------
-- 9. SUPABASE STORAGE BUCKET & OBJECT POLICIES
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('restaurant-assets', 'restaurant-assets', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Read Access for Restaurant Assets" ON storage.objects;
CREATE POLICY "Public Read Access for Restaurant Assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'restaurant-assets');

DROP POLICY IF EXISTS "Restaurant Admins Can Upload Assets" ON storage.objects;
CREATE POLICY "Restaurant Admins Can Upload Assets"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'restaurant-assets'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] IS NOT NULL
    AND public.get_user_restaurant_role(((storage.foldername(name))[1])::UUID) IN ('owner', 'admin')
  );

DROP POLICY IF EXISTS "Restaurant Admins Can Update Assets" ON storage.objects;
CREATE POLICY "Restaurant Admins Can Update Assets"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'restaurant-assets'
    AND auth.uid() IS NOT NULL
    AND public.get_user_restaurant_role(((storage.foldername(name))[1])::UUID) IN ('owner', 'admin')
  );

DROP POLICY IF EXISTS "Restaurant Admins Can Delete Assets" ON storage.objects;
CREATE POLICY "Restaurant Admins Can Delete Assets"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'restaurant-assets'
    AND auth.uid() IS NOT NULL
    AND public.get_user_restaurant_role(((storage.foldername(name))[1])::UUID) IN ('owner', 'admin')
  );

-- ------------------------------------------------------------------------------
-- 10. REALTIME PUBLICATION CONFIGURATION (Idempotent)
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

-- ------------------------------------------------------------------------------
-- 11. FUNCTION GRANTS FOR PUBLIC & AUTHENTICATED EXECUTION
-- ------------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_table_qr(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_customer_order(TEXT, UUID, JSONB, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_order_by_public_token(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_session_orders(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.request_table_bill(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_session_context(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.onboard_restaurant(VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_order_status_secure(UUID, order_status, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_order_item_status_secure(UUID, order_item_status) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_restaurant_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_restaurant_member(UUID) TO authenticated;

-- ==============================================================================
-- INITIALIZATION COMPLETE
-- ==============================================================================
