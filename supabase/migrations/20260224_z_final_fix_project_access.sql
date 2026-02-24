
-- FINAL FAIL-SAFE PROJECT ACCESS FUNCTION
-- This version is designed to be extremely resilient, checking all possible links 
-- between a user and a project (Direct, Company-wide, Leader-owned, Worker-assigned).

CREATE OR REPLACE FUNCTION public.fn_has_project_access(p_id uuid, u_id uuid)
RETURNS boolean AS $$
DECLARE
    v_role text;
    v_profile_client_id uuid;
    v_is_client_leader boolean;
BEGIN
    -- 1. Gather user context (Internal fetch bypasses RLS)
    SELECT role, client_id, is_client_leader 
    INTO v_role, v_profile_client_id, v_is_client_leader
    FROM public.profiles
    WHERE id = u_id;

    -- A. Admin: Immediate access
    IF v_role = 'admin' THEN
        RETURN true;
    END IF;

    -- B. Direct Table Check: Creator of the project
    IF EXISTS (SELECT 1 FROM public.projects WHERE id = p_id AND user_id = u_id) THEN
        RETURN true;
    END IF;

    -- C. Shared Assignment Checks (Workers and Specific Client Users)
    -- This covers workers assigned in project_assignments AND users assigned in project_client_users
    IF EXISTS (SELECT 1 FROM public.project_assignments WHERE project_id = p_id AND worker_id = u_id) THEN
        RETURN true;
    END IF;
    
    IF EXISTS (SELECT 1 FROM public.project_client_users WHERE project_id = p_id AND user_id = u_id) THEN
        RETURN true;
    END IF;

    -- D. Company-Wide Access (For all Client-role members)
    IF v_role = 'client' THEN
        
        -- 1. Check projects assigned to the company ID in their profile
        IF v_profile_client_id IS NOT NULL THEN
            -- Check many-to-many junction
            IF EXISTS (SELECT 1 FROM public.project_clients WHERE project_id = p_id AND client_id = v_profile_client_id) THEN
                RETURN true;
            END IF;
            -- Check legacy direct link
            IF EXISTS (SELECT 1 FROM public.projects WHERE id = p_id AND client_id = v_profile_client_id) THEN
                RETURN true;
            END IF;
        END IF;

        -- 2. Leader Check: Check projects assigned to any company they OWN (linked via clients.user_id)
        -- We do this separately because leaders often have client_id=NULL in their profiles
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

    END IF;

    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.fn_has_project_access IS 'Final robust project access logic: Checks creators, assignments (staff/client), and company ownership (leaders/members).';
