-- Add missing columns to appointments table
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS client_phone VARCHAR(50),
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Ensure event_type_id is consistent
ALTER TABLE appointments 
ALTER COLUMN event_type_id TYPE VARCHAR(255);

-- Add index for scheduled_at for better sorting performance
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_at ON appointments(scheduled_at);
