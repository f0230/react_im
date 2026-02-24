
-- Migration: Fix Client Portal Visibility
-- This ensures that ALL client team members can see projects where their company is assigned,
-- while maintaining the restriction that only leaders see projects that are NOT explicitly assigned (legacy projects).

CREATE OR REPLACE FUNCTION public.fn_has_project_access(p_id uuid, u_id uuid)
RETURNS boolean AS $$
DECLARE
    v_role text;
    v_profile_client_id uuid;
    v_is_client_leader boolean;
BEGIN
    -- Get user metadata from profile (Bypasses RLS)
    SELECT role, client_id, is_client_leader INTO v_role, v_profile_client_id, v_is_client_leader
    FROM public.profiles
    WHERE id = u_id;

    -- A. Admin: Always access
    IF v_role = 'admin' THEN
        RETURN true;
    END IF;

    -- B. Worker: Access if assigned in project_assignments
    IF v_role = 'worker' THEN
        RETURN EXISTS (
            SELECT 1 FROM public.project_assignments 
            WHERE project_id = p_id AND worker_id = u_id
        );
    END IF;

    -- C. Client access logic
    IF v_role = 'client' THEN
        -- 1. Access if they are individually assigned (project_client_users)
        IF EXISTS (SELECT 1 FROM public.project_client_users WHERE project_id = p_id AND user_id = u_id) THEN
            RETURN true;
        END IF;

        -- 2. Access if their COMPANY is explicitly assigned (project_clients)
        -- FIXED: Removed v_is_client_leader check here so team members can see company projects
        IF v_profile_client_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.project_clients 
            WHERE project_id = p_id AND client_id = v_profile_client_id
        ) THEN
            RETURN true;
        END IF;

        -- 3. Access if they are the direct creator of the project
        IF EXISTS (SELECT 1 FROM public.projects WHERE id = p_id AND user_id = u_id) THEN
            RETURN true;
        END IF;

        -- 4. Access if they are the OWNER of any client company assigned to the project
        -- (This covers leaders seeing projects of companies they own)
        IF EXISTS (
            SELECT 1 FROM public.clients c 
            WHERE c.user_id = u_id 
            AND (
                EXISTS (SELECT 1 FROM public.projects p2 WHERE p2.id = p_id AND p2.client_id = c.id)
                OR EXISTS (SELECT 1 FROM public.project_clients pc2 WHERE pc2.project_id = p_id AND pc2.client_id = c.id)
            )
        ) THEN
            RETURN true;
        END IF;

        -- 5. Special case: If they are a LEADER, they also see projects with their client_id (legacy column)
        -- even if not in the many-to-many project_clients table.
        -- This honors the "only assigned projects for members" request.
        IF v_is_client_leader = true AND v_profile_client_id IS NOT NULL THEN
             IF EXISTS (SELECT 1 FROM public.projects WHERE id = p_id AND client_id = v_profile_client_id) THEN
                RETURN true;
            END IF;
        END IF;
    END IF;

    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.fn_has_project_access IS 'Fixed project access: Everyone in a company sees explicitly assigned company projects. Only leaders see non-assigned company-linked projects.';
