-- 1. Create the SMS Recipients table
CREATE TABLE IF NOT EXISTS sms_recipients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number TEXT UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_phone CHECK (phone_number ~ '^\+[1-9]\d{1,14}$')
);

-- 2. Enable Security (RLS)
ALTER TABLE sms_recipients ENABLE ROW LEVEL SECURITY;

-- 3. Define Access Policies
CREATE POLICY "Admins have full access on sms_recipients" 
ON sms_recipients FOR ALL USING (auth.role() = 'authenticated');

-- 4. Initial Seed (Optional: Move your current admin number here)
-- INSERT INTO sms_recipients (phone_number) VALUES ('+91XXXXXXXXXX');
