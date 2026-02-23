-- Add customization columns to projects table
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS figma_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS jam_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT NULL;

COMMENT ON COLUMN projects.figma_url IS 'External link to Figma design file';
COMMENT ON COLUMN projects.jam_url IS 'External link to Figma Jam file';
COMMENT ON COLUMN projects.avatar_url IS 'URL for the project profile image';
