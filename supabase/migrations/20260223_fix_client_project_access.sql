-- Fix: Rebuild fn_has_project_access to cover ALL client access paths robustly.
-- This ensures team members (invited clients) and client leaders can always see their projects.

CREATE OR REPLACE FUNCTION public.fn_has_project_access(p_id uuid, u_id uuid)
RETURNS boolean AS $$
DECLARE
    v_role text;
    v_profile_client_id uuid;
BEGIN
    -- Get user role and client_id from profile
    SELECT role, client_id INTO v_role, v_profile_client_id
    FROM public.profiles
    WHERE id = u_id;

    -- 1. Admin: Always has access
    IF v_role = 'admin' THEN
        RETURN true;
    END IF;

    -- 2. Worker assigned to this project
    IF EXISTS (
        SELECT 1 FROM public.project_assignments
        WHERE project_id = p_id AND worker_id = u_id
    ) THEN
        RETURN true;
    END IF;

    -- 3. Client leader: owns a `clients` row (clients.user_id = u_id)
    --    and that client is linked to the project via project_clients
    IF EXISTS (
        SELECT 1 FROM public.project_clients pc
        JOIN public.clients c ON pc.client_id = c.id
        WHERE pc.project_id = p_id AND c.user_id = u_id
    ) THEN
        RETURN true;
    END IF;

    -- 4. Client team member: profile.client_id links them to a client
    --    that is assigned to the project via project_clients
    IF v_profile_client_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.project_clients
        WHERE project_id = p_id AND client_id = v_profile_client_id
    ) THEN
        RETURN true;
    END IF;

    -- 5. Explicit per-user assignment via project_client_users (e.g. sub-contractor)
    IF EXISTS (
        SELECT 1 FROM public.project_client_users
        WHERE project_id = p_id AND user_id = u_id
    ) THEN
        RETURN true;
    END IF;

    -- 6. Legacy: project has a direct client_id column pointing to a client
    --    that belongs to this user (covers old projects before the N:N migration)
    IF EXISTS (
        SELECT 1 FROM public.projects p
        JOIN public.clients c ON p.client_id = c.id
        WHERE p.id = p_id AND c.user_id = u_id
    ) THEN
        RETURN true;
    END IF;

    -- 7. Legacy: project.client_id matches the user's own profile.client_id
    IF v_profile_client_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.projects
        WHERE id = p_id AND client_id = v_profile_client_id
    ) THEN
        RETURN true;
    END IF;

    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.fn_has_project_access IS 'Centralized check for project access. Covers admin, worker, client leader (via clients.user_id), client team member (via profile.client_id -> project_clients), explicit user assignment (project_client_users), and legacy direct client_id.';
