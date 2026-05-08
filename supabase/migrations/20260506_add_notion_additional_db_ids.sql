-- Add notion database IDs for tasks and campaigns per project.
-- Run after 20260403_add_notion_db_id_to_projects.sql (which added notion_db_id for meetings).

alter table projects
  add column if not exists notion_tasks_db_id text default null,
  add column if not exists notion_campaigns_db_id text default null;

comment on column projects.notion_tasks_db_id is
  'Notion database ID for this project''s tasks. '
  'Obtain from the Notion database URL: notion.so/<workspace>/<DATABASE_ID>?v=...';

comment on column projects.notion_campaigns_db_id is
  'Notion database ID for this project''s campaigns. '
  'Obtain from the Notion database URL: notion.so/<workspace>/<DATABASE_ID>?v=...';
