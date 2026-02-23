-- Ensure projects table has customization columns and proper policies
DO $$ 
BEGIN
    -- Add columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'figma_url') THEN
        ALTER TABLE projects ADD COLUMN figma_url TEXT DEFAULT NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'jam_url') THEN
        ALTER TABLE projects ADD COLUMN jam_url TEXT DEFAULT NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'avatar_url') THEN
        ALTER TABLE projects ADD COLUMN avatar_url TEXT DEFAULT NULL;
    END IF;

    -- Ensure 'name' or 'title' columns are handled
    -- Usually 'name' is used in this project, but let's be sure.
END $$;

-- Enable RLS if not enabled
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Drop existing update policy if it exists to avoid conflicts
DROP POLICY IF EXISTS "Admins can update all projects" ON projects;
DROP POLICY IF EXISTS "Enable update for admins" ON projects;

-- Add policy for admins to update projects
CREATE POLICY "Admins can update all projects" ON projects 
FOR UPDATE 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
);

-- Add comments
COMMENT ON COLUMN projects.figma_url IS 'External link to Figma design file';
COMMENT ON COLUMN projects.jam_url IS 'External link to Figma Jam file';
COMMENT ON COLUMN projects.avatar_url IS 'URL for the project profile image';
