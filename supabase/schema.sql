-- ENABLE EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABLES
CREATE TABLE tables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_number INTEGER UNIQUE NOT NULL,
    qr_code_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.5. GLOBAL SETTINGS
CREATE TABLE settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initial Settings
INSERT INTO settings (key, value) VALUES 
('billing', '{"gst_enabled": true, "gst_percentage": 5, "discount_enabled": false, "discount_percentage": 0}');

-- 2. CATEGORIES
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. MENU ITEMS
CREATE TABLE menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) DEFAULT 0, -- Standard price field
    image_url TEXT,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. MENU ITEM VARIANTS
CREATE TABLE menu_item_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- e.g., 'Half', 'Full', 'Regular'
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ORDERS
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_id UUID REFERENCES tables(id),
    subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(10, 2) DEFAULT 0,
    tax_amount NUMERIC(10, 2) DEFAULT 0,
    total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount >= 0),
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed')),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'online')),
    razorpay_order_id TEXT,
    razorpay_payment_id TEXT,
    invoice_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. ORDER ITEMS
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id UUID REFERENCES menu_items(id),
    variant_id UUID REFERENCES menu_item_variants(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    instructions TEXT,
    price_at_time NUMERIC(10, 2) NOT NULL -- Snapshotted price for historical accuracy
);

-- 7. FEEDBACK
CREATE TABLE feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. WAITER CALLS
CREATE TABLE waiter_calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_id UUID REFERENCES tables(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PERFORMANCE INDEXES
CREATE INDEX idx_orders_table_id ON orders(table_id);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_menu_items_category_id ON menu_items(category_id);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_menu_item_variants_menu_item ON menu_item_variants(menu_item_id);
CREATE INDEX idx_waiter_calls_status ON waiter_calls(status) WHERE status = 'pending';

-- ROW LEVEL SECURITY (RLS) POLICIES

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- SETTINGS POLICIES
CREATE POLICY "Public can view settings" ON settings FOR SELECT USING (true);
CREATE POLICY "Admins have full access on settings" ON settings FOR ALL USING (auth.role() = 'authenticated');

-- PUBLIC READ ACCESS (For Customers)
CREATE POLICY "Public can view tables" ON tables FOR SELECT USING (true);
CREATE POLICY "Public can view categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Public can view menu items" ON menu_items FOR SELECT USING (true);
CREATE POLICY "Admins have full access on menu items" ON menu_items FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Public can view variants" ON menu_item_variants FOR SELECT USING (true);

-- CUSTOMER INSERT ACCESS
CREATE POLICY "Public can create orders" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can create order items" ON order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can submit feedback" ON feedback FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can call waiter" ON waiter_calls FOR INSERT WITH CHECK (true);

-- ADMIN ACCESS (Full Access for Authenticated Admins)
CREATE POLICY "Admins have full access on everything" ON tables FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins have full access on categories" ON categories FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins have full access on menu items" ON menu_items FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins have full access on variants" ON menu_item_variants FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins have full access on orders" ON orders FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins have full access on order items" ON order_items FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins have full access on feedback" ON feedback FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins have full access on waiter calls" ON waiter_calls FOR ALL USING (auth.role() = 'authenticated');
