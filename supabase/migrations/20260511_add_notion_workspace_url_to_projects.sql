-- Add a direct Notion workspace/page link per project.
-- This is different from notion_*_db_id columns, which are used to read
-- specific Notion databases through the API.
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS notion_workspace_url TEXT DEFAULT NULL;

COMMENT ON COLUMN projects.notion_workspace_url IS
  'External link to the Notion workspace or project page shown in the portal.';
