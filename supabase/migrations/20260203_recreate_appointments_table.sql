-- CRITICAL FIX: Recreate appointments table to match API code
-- WARNING: This drops the existing 'appointments' table. 
-- Since your screenshot shows it is empty, this is safe and the cleanest fix.

DROP TABLE IF EXISTS appointments CASCADE;

CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Cal.com Integration Fields
    cal_booking_id VARCHAR(255) UNIQUE NOT NULL,
    cal_metadata JSONB,
    
    -- Scheduling Details
    scheduled_at TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER DEFAULT 30,
    status VARCHAR(50) DEFAULT 'scheduled', -- 'scheduled', 'cancelled', 'completed'
    meeting_link VARCHAR(500),
    event_type_id VARCHAR(255),
    
    -- Client Data (Snapshot)
    client_name VARCHAR(255),
    client_email VARCHAR(255),
    client_phone VARCHAR(50),
    notes TEXT,
    
    -- Relationships
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL
);

-- Indices for performance
CREATE INDEX idx_appointments_cal_booking_id ON appointments(cal_booking_id);
CREATE INDEX idx_appointments_user_id ON appointments(user_id);
CREATE INDEX idx_appointments_scheduled_at ON appointments(scheduled_at);

-- Grant permissions (if needed for RLS later, but essential for basic access)
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own appointments
CREATE POLICY "Users can view own appointments" ON appointments
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Admin/Service Role can insert (handled by API usually, but safe to add)
-- Note: The API uses getSupabaseAdmin() which bypasses RLS, so Insert policy is optional for API
-- but good for consistency if Client inserts ever happen.
CREATE POLICY "Users can insert own appointments" ON appointments
    FOR INSERT WITH CHECK (auth.uid() = user_id);
