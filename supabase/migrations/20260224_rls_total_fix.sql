
-- Migration: Comprehensive RLS Recursion Fix for Projects and Clients
-- This migration ensures NO direct recursive calls to tables within their own RLS policies.

-- 1. Redefine helper functions if not exists (from previous migration for safety)
CREATE OR REPLACE FUNCTION public.fn_is_admin()
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Update CLIENTS policies to use the helper (Prevents recursion)
DROP POLICY IF EXISTS "Public can view clients with valid invitations" ON public.clients;
CREATE POLICY "Public can view clients with valid invitations" ON public.clients
FOR SELECT TO anon, authenticated
USING (
    user_id = auth.uid()
    OR public.fn_is_admin()
    OR EXISTS (
        SELECT 1 FROM public.client_invitations 
        WHERE client_id = public.clients.id 
        AND expires_at > now()
    )
);

-- 3. Simplify and fix fn_has_project_access
-- Reduced complexity and ensured NO recursive RLS triggers.
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
        -- 1. Access if they are assigned to it (project_client_users)
        IF EXISTS (SELECT 1 FROM public.project_client_users WHERE project_id = p_id AND user_id = u_id) THEN
            RETURN true;
        END IF;

        -- 2. If leader, check company-wide assignment
        IF v_is_client_leader = true AND v_profile_client_id IS NOT NULL THEN
            IF EXISTS (SELECT 1 FROM public.project_clients WHERE project_id = p_id AND client_id = v_profile_client_id) THEN
                RETURN true;
            END IF;
            -- Check legacy column
            IF EXISTS (SELECT 1 FROM public.projects WHERE id = p_id AND client_id = v_profile_client_id) THEN
                RETURN true;
            END IF;
        END IF;

        -- 3. Check if they are the direct creator/owner of the project
        IF EXISTS (SELECT 1 FROM public.projects WHERE id = p_id AND user_id = u_id) THEN
            RETURN true;
        END IF;
        
        -- 4. Check if they own the client associated with the project
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

-- 4. Re-apply policies to ensure they are clean
DROP POLICY IF EXISTS "Users can select projects" ON public.projects;
CREATE POLICY "Users can select projects" ON public.projects
FOR SELECT TO authenticated USING (
    fn_has_project_access(id, auth.uid())
);

DROP POLICY IF EXISTS "Users can view project_clients" ON public.project_clients;
CREATE POLICY "Users can view project_clients" ON public.project_clients
FOR SELECT TO authenticated USING (
    fn_has_project_access(project_id, auth.uid())
);

DROP POLICY IF EXISTS "Users can view project_client_users" ON public.project_client_users;
CREATE POLICY "Users can view project_client_users" ON public.project_client_users
FOR SELECT TO authenticated USING (
    fn_has_project_access(project_id, auth.uid())
);

-- Additional insurance for Workers and Admins on clients
DROP POLICY IF EXISTS "Staff can view all clients" ON public.clients;
CREATE POLICY "Staff can view all clients" ON public.clients
FOR SELECT TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'worker'))
);

COMMENT ON FUNCTION public.fn_has_project_access IS 'Optimized project access check without RLS recursion.';
