-- Migration: Fix Client Team Project Access
-- This ensures that client team members (is_client_leader = false) only see projects explicitly assigned to them
-- via project_client_users, rather than all projects belonging to their client_id.
-- Also allows Client Leaders to manage assignments of their team members to projects.

CREATE OR REPLACE FUNCTION public.fn_has_project_access(p_id uuid, u_id uuid)
RETURNS boolean AS $$
DECLARE
    v_role text;
    v_profile_client_id uuid;
    v_is_client_leader boolean;
BEGIN
    -- Get user role, client_id, and leader status from profile
    SELECT role, client_id, is_client_leader INTO v_role, v_profile_client_id, v_is_client_leader
    FROM public.profiles
    WHERE id = u_id;

    -- Admin: Always access
    IF v_role = 'admin' THEN
        RETURN true;
    END IF;

    -- Check project table directly (Creator or Primary Client owner)
    IF EXISTS (
        SELECT 1 FROM public.projects 
        WHERE id = p_id 
        AND (
            user_id = u_id 
            OR (client_id = v_profile_client_id AND v_is_client_leader = true)
            OR client_id IN (SELECT id FROM public.clients WHERE user_id = u_id)
        )
    ) THEN
        RETURN true;
    END IF;

    -- Check worker assignments
    IF EXISTS (
        SELECT 1 FROM public.project_assignments 
        WHERE project_id = p_id AND worker_id = u_id
    ) THEN
        RETURN true;
    END IF;

    -- Check many-to-many client assignments (Company-wide for client leaders)
    IF v_profile_client_id IS NOT NULL AND v_is_client_leader = true AND EXISTS (
        SELECT 1 FROM public.project_clients 
        WHERE project_id = p_id AND client_id = v_profile_client_id
    ) THEN
        RETURN true;
    END IF;

    -- Check many-to-many client assignments (For the primary client owner/user)
    IF EXISTS (
        SELECT 1 FROM public.project_clients pc
        JOIN public.clients c ON pc.client_id = c.id
        WHERE pc.project_id = p_id AND c.user_id = u_id
    ) THEN
        RETURN true;
    END IF;

    -- Check explicit client user assignments (For non-leader team members)
    IF EXISTS (
        SELECT 1 FROM public.project_client_users 
        WHERE project_id = p_id AND user_id = u_id
    ) THEN
        RETURN true;
    END IF;

    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update RLS for project_client_users to allow Client Leaders to manage assignments
DROP POLICY IF EXISTS "Client leaders can manage project_client_users" ON public.project_client_users;
DROP POLICY IF EXISTS "Client leaders can insert project_client_users" ON public.project_client_users;
DROP POLICY IF EXISTS "Client leaders can delete project_client_users" ON public.project_client_users;

CREATE POLICY "Client leaders can insert project_client_users" ON public.project_client_users
FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role = 'client' AND p.is_client_leader = true
        AND fn_has_project_access(project_id, auth.uid())
    )
    AND EXISTS (
        SELECT 1 FROM public.profiles target
        WHERE target.id = user_id 
        AND target.client_id = (SELECT client_id FROM public.profiles WHERE id = auth.uid())
    )
);

CREATE POLICY "Client leaders can delete project_client_users" ON public.project_client_users
FOR DELETE TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role = 'client' AND p.is_client_leader = true
        AND fn_has_project_access(project_id, auth.uid())
    )
    AND EXISTS (
        SELECT 1 FROM public.profiles target
        WHERE target.id = user_id 
        AND target.client_id = (SELECT client_id FROM public.profiles WHERE id = auth.uid())
    )
);
