-- Add Figma project integration columns to projects table
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS figma_project_id TEXT DEFAULT NULL;

COMMENT ON COLUMN projects.figma_project_id IS 'Figma project numeric ID (e.g. 546654917 from figma.com/files/project/546654917)';

