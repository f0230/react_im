-- Remove Figma integration columns and tables
ALTER TABLE projects DROP COLUMN IF EXISTS figma_project_id;

-- Drop figma-specific tables if they were created
DROP TABLE IF EXISTS user_figma_teams;
DROP TABLE IF EXISTS figma_sync_status;
