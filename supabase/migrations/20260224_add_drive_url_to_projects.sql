-- Add drive_url column to projects table
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS drive_url TEXT DEFAULT NULL;

COMMENT ON COLUMN projects.drive_url IS 'External link to Google Drive folder';
