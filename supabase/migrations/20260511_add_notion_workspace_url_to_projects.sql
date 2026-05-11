-- Add a Notion root page per project.
-- notion_page_id is used to read the page contents through the Notion API.
-- notion_page_url is stored only as a fallback/reference to the original page.
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS notion_page_id TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS notion_page_title TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS notion_page_url TEXT DEFAULT NULL;

COMMENT ON COLUMN projects.notion_page_id IS
  'Notion page ID used as the project root page for API rendering in the portal.';

COMMENT ON COLUMN projects.notion_page_title IS
  'Cached title of the selected Notion project page.';

COMMENT ON COLUMN projects.notion_page_url IS
  'Original Notion URL for the selected project page; used as fallback/reference.';
