-- Fix appointments table schema
-- 0. Ensure base columns exist (in case table was created with partial schema)
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS cal_booking_id VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS cal_metadata JSONB,
ADD COLUMN IF NOT EXISTS client_id UUID,
ADD COLUMN IF NOT EXISTS project_id UUID,
ADD COLUMN IF NOT EXISTS user_id UUID,
ADD COLUMN IF NOT EXISTS event_type_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'scheduled',
ADD COLUMN IF NOT EXISTS client_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS client_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS meeting_link VARCHAR(500);

-- 3. Ensure foreign key to clients exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'appointments_client_id_fkey' 
        AND table_name = 'appointments'
    ) THEN
        ALTER TABLE appointments
        ADD CONSTRAINT appointments_client_id_fkey
        FOREIGN KEY (client_id)
        REFERENCES clients(id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- 4. Ensure foreign key to projects exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'appointments_project_id_fkey' 
        AND table_name = 'appointments'
    ) THEN
        ALTER TABLE appointments
        ADD CONSTRAINT appointments_project_id_fkey
        FOREIGN KEY (project_id)
        REFERENCES projects(id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- 5. Ensure foreign key to users exists (optional but good practice)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'appointments_user_id_fkey' 
        AND table_name = 'appointments'
    ) THEN
        ALTER TABLE appointments
        ADD CONSTRAINT appointments_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES auth.users(id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- 6. Add any missing indexes
CREATE INDEX IF NOT EXISTS idx_appointments_cal_booking_id ON appointments(cal_booking_id);

