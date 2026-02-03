-- Enable Admins to view all appointments
-- This policy checks the 'profiles' table for the 'admin' role.

DO $$
BEGIN
    -- Drop policy if exists to ensure clean state or update
    DROP POLICY IF EXISTS "Admins can view all appointments" ON appointments;
    
    CREATE POLICY "Admins can view all appointments" ON appointments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin' -- Ensure your profile has this role!
        )
    );
END $$;
