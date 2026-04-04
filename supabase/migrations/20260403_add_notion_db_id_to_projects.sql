-- Add notion_db_id column to projects table.
-- This links each project to its Notion meetings database.
-- Set via the Supabase table editor (or a future project settings UI).

alter table projects
  add column if not exists notion_db_id text default null;

comment on column projects.notion_db_id is
  'Notion database ID for this project''s meeting notes. '
  'Obtain from the Notion database URL: notion.so/<workspace>/<DATABASE_ID>?v=...';
