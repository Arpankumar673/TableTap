-- Create tables table if not exists with correct schema
CREATE TABLE IF NOT EXISTS tables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_number INTEGER NOT NULL UNIQUE,
    qr_code_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public can read tables" ON tables
    FOR SELECT USING (true);

-- Admin full access
CREATE POLICY "Admins have full access on tables" ON tables
    FOR ALL USING (auth.role() = 'authenticated');

-- Insert 10 tables for the restaurant
INSERT INTO tables (table_number) 
VALUES (1), (2), (3), (4), (5), (6), (7), (8), (9), (10)
ON CONFLICT (table_number) DO NOTHING;

-- Verification query
SELECT * FROM tables ORDER BY table_number ASC;
