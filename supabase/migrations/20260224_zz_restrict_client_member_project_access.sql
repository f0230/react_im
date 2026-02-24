-- Restrict non-leader client members to explicit project assignments.
-- Leaders (client owners) keep company-wide visibility.

CREATE OR REPLACE FUNCTION public.fn_has_project_access(p_id uuid, u_id uuid)
RETURNS boolean AS $$
DECLARE
    v_role text;
    v_owner_client_id uuid;
BEGIN
    SELECT role
    INTO v_role
    FROM public.profiles
    WHERE id = u_id;

    -- Admin can access everything.
    IF v_role = 'admin' THEN
        RETURN true;
    END IF;

    -- Project creator can always access.
    IF EXISTS (
        SELECT 1
        FROM public.projects
        WHERE id = p_id
          AND user_id = u_id
    ) THEN
        RETURN true;
    END IF;

    -- Assigned workers can access.
    IF EXISTS (
        SELECT 1
        FROM public.project_assignments
        WHERE project_id = p_id
          AND worker_id = u_id
    ) THEN
        RETURN true;
    END IF;

    -- Only clients continue from this point.
    IF v_role <> 'client' THEN
        RETURN false;
    END IF;

    -- Explicit per-user assignment for client team members.
    IF EXISTS (
        SELECT 1
        FROM public.project_client_users
        WHERE project_id = p_id
          AND user_id = u_id
    ) THEN
        RETURN true;
    END IF;

    -- Client owner (leader) can see projects linked to their company.
    SELECT c.id
    INTO v_owner_client_id
    FROM public.clients c
    WHERE c.user_id = u_id
    ORDER BY c.created_at DESC
    LIMIT 1;

    IF v_owner_client_id IS NULL THEN
        RETURN false;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.project_clients
        WHERE project_id = p_id
          AND client_id = v_owner_client_id
    ) THEN
        RETURN true;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.projects
        WHERE id = p_id
          AND client_id = v_owner_client_id
    ) THEN
        RETURN true;
    END IF;

    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.fn_has_project_access IS
'Project access: admin all, workers by assignment, client leaders by owned company, client members only by explicit project_client_users assignment.';
