-- Remove NOT NULL constraint from client_id and user_id in projects table if they exist
-- This allows projects to be created without an explicit client_id, relying instead
-- on the new project_clients many-to-many relationship.

ALTER TABLE public.projects ALTER COLUMN client_id DROP NOT NULL;
ALTER TABLE public.projects ALTER COLUMN user_id DROP NOT NULL;
