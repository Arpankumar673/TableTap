-- ==============================================================================
-- TABLETAP — INITIAL DATABASE SCHEMA & MULTI-TENANT RLS POLICIES
-- Version: 1.0.0
-- Aligned with PRD, TRD and Database Design (06_DATABASE_DESIGN.md)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS
CREATE TYPE user_role AS ENUM ('owner', 'admin', 'kitchen');

CREATE TYPE dietary_type AS ENUM ('veg', 'non-veg', 'vegan', 'egg');

CREATE TYPE order_status AS ENUM (
  'pending',     -- Order submitted by customer, awaiting kitchen acknowledgment
  'accepted',    -- Acknowledged by kitchen
  'preparing',   -- Food preparation in progress
  'ready',       -- Order prepared and ready to serve
  'served',      -- Delivered to table
  'completed',   -- Session finalized and bill closed
  'cancelled'    -- Cancelled by kitchen or admin
);

CREATE TYPE order_item_status AS ENUM (
  'pending',
  'preparing',
  'ready',
  'cancelled'
);

CREATE TYPE payment_status AS ENUM (
  'unpaid',
  'pending',
  'paid',
  'failed',
  'refunded',
  'partially_refunded'
);

CREATE TYPE session_status AS ENUM ('open', 'closed');

-- 3. CORE MULTI-TENANT TABLES

-- 3.1 Restaurants (Tenants)
CREATE TABLE restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  slug VARCHAR(80) NOT NULL UNIQUE,
  logo_url TEXT,
  cover_image_url TEXT,
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  timezone VARCHAR(60) NOT NULL DEFAULT 'Asia/Kolkata',
  tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 5.00 CHECK (tax_rate >= 0),
  service_charge_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (service_charge_rate >= 0),
  phone VARCHAR(30),
  address TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX idx_restaurants_slug ON restaurants(slug);

-- 3.2 Restaurant Memberships (Minimal Authorization for Owners, Admins, Kitchen)
CREATE TABLE restaurant_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'admin',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(restaurant_id, user_id)
);

CREATE INDEX idx_memberships_user ON restaurant_memberships(user_id, active);
CREATE INDEX idx_memberships_restaurant ON restaurant_memberships(restaurant_id, role);

-- 3.3 Physical Tables
CREATE TABLE restaurant_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  table_number VARCHAR(20) NOT NULL,
  label VARCHAR(60),
  capacity INT NOT NULL DEFAULT 4 CHECK (capacity > 0),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(restaurant_id, table_number)
);

CREATE INDEX idx_tables_restaurant ON restaurant_tables(restaurant_id, active);

-- 3.4 Table QR Tokens (Rotatable & Revocable Tokens)
CREATE TABLE table_qr_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL REFERENCES restaurant_tables(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX idx_qr_tokens_active ON table_qr_tokens(token_hash) WHERE active = true;

-- 3.5 Table Sessions (Active Dine-In Dining Sessions)
CREATE TABLE table_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  table_id UUID NOT NULL REFERENCES restaurant_tables(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  status session_status NOT NULL DEFAULT 'open',
  opened_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  closed_at TIMESTAMPTZ
);

CREATE INDEX idx_sessions_active ON table_sessions(restaurant_id, table_id) WHERE status = 'open';

-- 3.6 Menu Categories
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
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

CREATE INDEX idx_categories_restaurant ON categories(restaurant_id, sort_order) WHERE active = true;

-- 3.7 Preparation Stations (e.g. Pizza, Grill, Bar, Desserts)
CREATE TABLE preparation_stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name VARCHAR(80) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(restaurant_id, name)
);

CREATE INDEX idx_stations_restaurant ON preparation_stations(restaurant_id, sort_order);

-- 3.8 Products
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  station_id UUID REFERENCES preparation_stations(id) ON DELETE SET NULL,
  name VARCHAR(150) NOT NULL,
  slug VARCHAR(180) NOT NULL,
  description TEXT,
  image_url TEXT,
  base_price NUMERIC(10, 2) NOT NULL CHECK (base_price >= 0),
  dietary_type dietary_type NOT NULL DEFAULT 'veg',
  is_popular BOOLEAN NOT NULL DEFAULT false,
  is_chef_special BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(restaurant_id, slug)
);

CREATE INDEX idx_products_category ON products(category_id, sort_order, active, available)
  INCLUDE (name, base_price, dietary_type);
CREATE INDEX idx_products_restaurant ON products(restaurant_id, active, available);

-- 3.9 Customization Option Groups (e.g. "Size", "Crust", "Toppings")
CREATE TABLE option_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  required BOOLEAN NOT NULL DEFAULT false,
  min_select INT NOT NULL DEFAULT 0 CHECK (min_select >= 0),
  max_select INT NOT NULL DEFAULT 1 CHECK (max_select >= min_select),
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 3.10 Customization Option Values
CREATE TABLE option_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  option_group_id UUID NOT NULL REFERENCES option_groups(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  price_delta NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (price_delta >= 0),
  is_default BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE INDEX idx_option_values_group ON option_values(option_group_id, sort_order) WHERE active = true;

-- 3.11 Product Option Groups Mapping
CREATE TABLE product_option_groups (
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  option_group_id UUID NOT NULL REFERENCES option_groups(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, option_group_id)
);

-- 3.12 Orders Header
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  table_session_id UUID NOT NULL REFERENCES table_sessions(id) ON DELETE RESTRICT,
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(restaurant_id, order_number),
  UNIQUE(restaurant_id, idempotency_key)
);

CREATE INDEX idx_orders_restaurant_status ON orders(restaurant_id, status, created_at DESC);
CREATE INDEX idx_orders_session ON orders(table_session_id);
CREATE INDEX idx_orders_public_token ON orders(public_token);

-- 3.13 Order Items (Immutable Purchase Snapshot)
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name_snapshot VARCHAR(150) NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price_snapshot NUMERIC(10, 2) NOT NULL CHECK (unit_price_snapshot >= 0),
  total_price_snapshot NUMERIC(10, 2) NOT NULL CHECK (total_price_snapshot >= 0),
  station_name_snapshot VARCHAR(80),
  notes TEXT,
  status order_item_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_status ON order_items(status);

-- 3.14 Order Item Options Snapshot
CREATE TABLE order_item_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  option_group_name_snapshot VARCHAR(100) NOT NULL,
  option_value_name_snapshot VARCHAR(100) NOT NULL,
  price_delta_snapshot NUMERIC(10, 2) NOT NULL DEFAULT 0.00
);

CREATE INDEX idx_order_item_options_item ON order_item_options(order_item_id);

-- 3.15 Order Status Transition Audit Events
CREATE TABLE order_status_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status order_status,
  to_status order_status NOT NULL,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX idx_order_status_events ON order_status_events(order_id, created_at);

-- 3.16 Payments
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  provider VARCHAR(30) NOT NULL DEFAULT 'counter',
  provider_payment_id TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX idx_payments_order ON payments(order_id);

-- ==============================================================================
-- 4. ROW LEVEL SECURITY (RLS) & AUTHORIZATION HELPER FUNCTIONS
-- ==============================================================================

-- Helper function: Get active role of authenticated user in restaurant
CREATE OR REPLACE FUNCTION get_user_restaurant_role(target_restaurant_id UUID)
RETURNS user_role AS $$
  SELECT role
  FROM restaurant_memberships
  WHERE restaurant_id = target_restaurant_id
    AND user_id = auth.uid()
    AND active = true
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Enable RLS across all tables
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_qr_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE preparation_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE option_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE option_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_option_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_item_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- 4.1 Restaurants Policies
CREATE POLICY "Public can view active restaurants by slug"
  ON restaurants FOR SELECT
  USING (active = true);

CREATE POLICY "Owners and Admins can update restaurant profile"
  ON restaurants FOR UPDATE
  USING (get_user_restaurant_role(id) IN ('owner', 'admin'));

-- 4.2 Memberships Policies
CREATE POLICY "Users can view memberships for their restaurant"
  ON restaurant_memberships FOR SELECT
  USING (
    user_id = auth.uid() OR
    get_user_restaurant_role(restaurant_id) IN ('owner', 'admin')
  );

CREATE POLICY "Owners can manage restaurant memberships"
  ON restaurant_memberships FOR ALL
  USING (get_user_restaurant_role(restaurant_id) = 'owner');

-- 4.3 Categories Policies
CREATE POLICY "Public can view active categories for active restaurants"
  ON categories FOR SELECT
  USING (active = true);

CREATE POLICY "Admins and Owners can manage categories"
  ON categories FOR ALL
  USING (get_user_restaurant_role(restaurant_id) IN ('owner', 'admin'));

-- 4.4 Products Policies
CREATE POLICY "Public can view active products"
  ON products FOR SELECT
  USING (active = true);

CREATE POLICY "Admins and Owners can manage products"
  ON products FOR ALL
  USING (get_user_restaurant_role(restaurant_id) IN ('owner', 'admin'));

-- 4.5 Option Groups and Values Policies
CREATE POLICY "Public can view option groups"
  ON option_groups FOR SELECT
  TO PUBLIC USING (true);

CREATE POLICY "Admins and Owners can manage option groups"
  ON option_groups FOR ALL
  USING (get_user_restaurant_role(restaurant_id) IN ('owner', 'admin'));

CREATE POLICY "Public can view active option values"
  ON option_values FOR SELECT
  TO PUBLIC USING (active = true);

CREATE POLICY "Admins and Owners can manage option values"
  ON option_values FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM option_groups
      WHERE option_groups.id = option_values.option_group_id
        AND get_user_restaurant_role(option_groups.restaurant_id) IN ('owner', 'admin')
    )
  );

-- 4.6 Tables and QR Tokens
CREATE POLICY "Admins and Owners can manage tables"
  ON restaurant_tables FOR ALL
  USING (get_user_restaurant_role(restaurant_id) IN ('owner', 'admin'));

CREATE POLICY "Kitchen can view tables"
  ON restaurant_tables FOR SELECT
  USING (get_user_restaurant_role(restaurant_id) = 'kitchen');

-- 4.7 Orders & Kitchen Display Policies
CREATE POLICY "Kitchen, Admins and Owners can view restaurant orders"
  ON orders FOR SELECT
  USING (get_user_restaurant_role(restaurant_id) IN ('owner', 'admin', 'kitchen'));

CREATE POLICY "Kitchen, Admins and Owners can update order status"
  ON orders FOR UPDATE
  USING (get_user_restaurant_role(restaurant_id) IN ('owner', 'admin', 'kitchen'));

CREATE POLICY "Kitchen and Admins can view order items"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
        AND get_user_restaurant_role(orders.restaurant_id) IN ('owner', 'admin', 'kitchen')
    )
  );

CREATE POLICY "Kitchen can update order items"
  ON order_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
        AND get_user_restaurant_role(orders.restaurant_id) IN ('owner', 'admin', 'kitchen')
    )
  );

CREATE POLICY "Kitchen and Admins can view order item options"
  ON order_item_options FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM order_items
      JOIN orders ON orders.id = order_items.order_id
      WHERE order_items.id = order_item_options.order_item_id
        AND get_user_restaurant_role(orders.restaurant_id) IN ('owner', 'admin', 'kitchen')
    )
  );

CREATE POLICY "Members can view order status events"
  ON order_status_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_status_events.order_id
        AND get_user_restaurant_role(orders.restaurant_id) IN ('owner', 'admin', 'kitchen')
    )
  );

CREATE POLICY "Members can insert status events"
  ON order_status_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_status_events.order_id
        AND get_user_restaurant_role(orders.restaurant_id) IN ('owner', 'admin', 'kitchen')
    )
  );
