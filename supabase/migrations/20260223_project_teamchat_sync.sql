-- ============================================================
-- Migration: Project ↔ TeamChat automatic sync
-- ============================================================
-- Each project gets exactly ONE team_channel.
-- Members of that channel are always in sync with:
--   · project_assignments (workers / admins assigned to the project)
--   · project_client_users (client-side users assigned to the project)
--
-- Rules:
--   1. When a project is INSERT-ed → a team_channel is created automatically.
--   2. When a project is renamed   → the team_channel name is updated.
--   3. When a row is INSERT-ed into project_assignments → that worker is
--      automatically added to team_channel_members.
--   4. When a row is DELETE-d from project_assignments → that worker is
--      removed from team_channel_members.
--   5. Same mirror behaviour for project_client_users.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 0. Add team_channel_id column to projects (nullable FK)
-- ────────────────────────────────────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'projects' AND column_name = 'team_channel_id'
    ) THEN
        ALTER TABLE public.projects
            ADD COLUMN team_channel_id uuid REFERENCES public.team_channels(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- 1. FUNCTION: create a team_channel when a project is created
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_create_project_channel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_project_name  text;
    v_slug          text;
    v_channel_id    uuid;
BEGIN
    -- The projects table uses the 'name' column
    v_project_name := COALESCE(NULLIF(trim(NEW.name), ''), 'Proyecto ' || left(NEW.id::text, 8));

    -- Build a URL-safe slug
    v_slug := regexp_replace(
                  lower(trim(v_project_name)),
                  '[^a-z0-9]+', '-', 'g'
              );
    v_slug := left(v_slug, 60) || '-' || left(NEW.id::text, 8);

    -- Create the channel (created_by can be NULL during a migration / backfill)
    INSERT INTO public.team_channels (name, slug, project_id, created_by)
    VALUES (v_project_name, v_slug, NEW.id, NULLIF(auth.uid()::text, '')::uuid)
    RETURNING id INTO v_channel_id;

    -- Link the channel back to the project using UPDATE (since we are now in AFTER INSERT action)
    UPDATE public.projects 
    SET team_channel_id = v_channel_id
    WHERE id = NEW.id;

    -- NEW: Add all existing admins to the new channel automatically
    INSERT INTO public.team_channel_members (channel_id, member_id, added_by)
    SELECT v_channel_id, p.id, NULLIF(auth.uid()::text, '')::uuid
    FROM public.profiles p
    WHERE p.role = 'admin'
    ON CONFLICT (channel_id, member_id) DO NOTHING;

    RETURN NEW;
END;
$$;

-- Drop if exists, then re-create
DROP TRIGGER IF EXISTS trg_create_project_channel ON public.projects;
CREATE TRIGGER trg_create_project_channel
    AFTER INSERT ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_create_project_channel();

-- ────────────────────────────────────────────────────────────
-- 2. FUNCTION: rename channel when project name changes
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_rename_project_channel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.name IS DISTINCT FROM OLD.name AND NEW.team_channel_id IS NOT NULL THEN
        UPDATE public.team_channels
        SET name = COALESCE(NULLIF(trim(NEW.name), ''), 'Proyecto ' || left(NEW.id::text, 8))
        WHERE id = NEW.team_channel_id;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rename_project_channel ON public.projects;
CREATE TRIGGER trg_rename_project_channel
    AFTER UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_rename_project_channel();

-- ────────────────────────────────────────────────────────────
-- 3. FUNCTION: sync project_assignments → team_channel_members
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_sync_assignment_to_channel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_channel_id uuid;
BEGIN
    -- Resolve the channel linked to the project
    SELECT team_channel_id INTO v_channel_id
    FROM public.projects
    WHERE id = COALESCE(NEW.project_id, OLD.project_id);

    IF v_channel_id IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.team_channel_members (channel_id, member_id, added_by)
        VALUES (v_channel_id, NEW.worker_id, NEW.worker_id)
        ON CONFLICT (channel_id, member_id) DO NOTHING;
        RETURN NEW;
    END IF;

    IF TG_OP = 'DELETE' THEN
        DELETE FROM public.team_channel_members
        WHERE channel_id = v_channel_id AND member_id = OLD.worker_id;
        RETURN OLD;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_assignment_to_channel ON public.project_assignments;
CREATE TRIGGER trg_sync_assignment_to_channel
    AFTER INSERT OR DELETE ON public.project_assignments
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_sync_assignment_to_channel();

-- ────────────────────────────────────────────────────────────
-- 4. FUNCTION: sync project_client_users → team_channel_members
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_sync_client_user_to_channel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_channel_id uuid;
BEGIN
    SELECT team_channel_id INTO v_channel_id
    FROM public.projects
    WHERE id = COALESCE(NEW.project_id, OLD.project_id);

    IF v_channel_id IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.team_channel_members (channel_id, member_id, added_by)
        VALUES (v_channel_id, NEW.user_id, NEW.user_id)
        ON CONFLICT (channel_id, member_id) DO NOTHING;
        RETURN NEW;
    END IF;

    IF TG_OP = 'DELETE' THEN
        DELETE FROM public.team_channel_members
        WHERE channel_id = v_channel_id AND member_id = OLD.user_id;
        RETURN OLD;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_client_user_to_channel ON public.project_client_users;
CREATE TRIGGER trg_sync_client_user_to_channel
    AFTER INSERT OR DELETE ON public.project_client_users
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_sync_client_user_to_channel();

-- ────────────────────────────────────────────────────────────
-- 5. BACKFILL: create channels for projects that don't have one
--    NOTE: uses only the 'name' column which is the actual column
--    in the projects table (no 'title' or 'project_name' columns)
-- ────────────────────────────────────────────────────────────
DO $$
DECLARE
    r               record;
    v_project_name  text;
    v_slug          text;
    v_channel_id    uuid;
BEGIN
    FOR r IN
        SELECT id, name, user_id FROM public.projects WHERE team_channel_id IS NULL
    LOOP
        v_project_name := COALESCE(NULLIF(trim(r.name), ''), 'Proyecto ' || left(r.id::text, 8));
        v_slug := regexp_replace(lower(trim(v_project_name)), '[^a-z0-9]+', '-', 'g');
        v_slug := left(v_slug, 60) || '-' || left(r.id::text, 8);

        -- Re-use existing channel linked to this project if one already exists
        SELECT id INTO v_channel_id
        FROM public.team_channels
        WHERE project_id = r.id
        LIMIT 1;

        IF v_channel_id IS NULL THEN
            -- Use NULL for created_by: this is a backfill with no active auth session.
            -- The user_id on the project might be a client user not present in profiles.
            INSERT INTO public.team_channels (name, slug, project_id, created_by)
            VALUES (v_project_name, v_slug, r.id, NULL)
            RETURNING id INTO v_channel_id;
        END IF;

        UPDATE public.projects SET team_channel_id = v_channel_id WHERE id = r.id;
    END LOOP;
END;
$$;

-- ────────────────────────────────────────────────────────────
-- 6. BACKFILL: sync existing project members into their channels
-- ────────────────────────────────────────────────────────────

-- From project_assignments (workers)
INSERT INTO public.team_channel_members (channel_id, member_id, added_by)
SELECT
    p.team_channel_id,
    pa.worker_id,
    pa.worker_id
FROM public.project_assignments pa
JOIN public.projects p ON p.id = pa.project_id
WHERE p.team_channel_id IS NOT NULL
  AND pa.worker_id IS NOT NULL
ON CONFLICT (channel_id, member_id) DO NOTHING;

-- From project_client_users (client-side users)
INSERT INTO public.team_channel_members (channel_id, member_id, added_by)
SELECT
    p.team_channel_id,
    pcu.user_id,
    pcu.user_id
FROM public.project_client_users pcu
JOIN public.projects p ON p.id = pcu.project_id
WHERE p.team_channel_id IS NOT NULL
  AND pcu.user_id IS NOT NULL
ON CONFLICT (channel_id, member_id) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- 7. Comments
-- ────────────────────────────────────────────────────────────
COMMENT ON COLUMN public.projects.team_channel_id IS
    'FK to the team_channel that belongs exclusively to this project. Created automatically on INSERT.';
