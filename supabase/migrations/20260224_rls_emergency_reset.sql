
-- Migration: Emergency RLS Reset for Projects and Clients
-- This migration uses the most basic, non-recursive policies to restore system stability.

-- 1. Redefine helper functions with maximum safety
CREATE OR REPLACE FUNCTION public.fn_is_admin()
RETURNS boolean AS $$
DECLARE
    v_role text;
BEGIN
    SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
    RETURN v_role = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.fn_is_worker()
RETURNS boolean AS $$
DECLARE
    v_role text;
BEGIN
    SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
    RETURN v_role = 'worker';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. RESET CLIENTS POLICIES (Simplified)
DROP POLICY IF EXISTS "Public can view clients with valid invitations" ON public.clients;
DROP POLICY IF EXISTS "Staff can view all clients" ON public.clients;
DROP POLICY IF EXISTS "Clients can view their own record" ON public.clients;

-- Most basic policy for clients: Admins/Workers see all, users see their own
CREATE POLICY "Staff and owners can view clients" ON public.clients
FOR SELECT TO authenticated
USING (
    user_id = auth.uid() 
    OR public.fn_is_admin() 
    OR public.fn_is_worker()
);

-- 3. RESET PROJECTS POLICIES (Simplified)
DROP POLICY IF EXISTS "Users can select projects" ON public.projects;
DROP POLICY IF EXISTS "Admins can view all projects" ON public.projects;
DROP POLICY IF EXISTS "Admins can update all projects" ON public.projects;

-- Admin access (bypass recursion by using helper)
CREATE POLICY "Admins full access projects" ON public.projects
FOR ALL TO authenticated
USING (public.fn_is_admin());

-- Basic select policy for others (no joins, no subqueries inside USING)
CREATE POLICY "Users can select projects basic" ON public.projects
FOR SELECT TO authenticated
USING (
    user_id = auth.uid() 
    OR public.fn_is_worker() -- In a crisis, we let workers see all to restore visibility
    OR client_id IN (SELECT client_id FROM public.profiles WHERE id = auth.uid())
);

-- 4. FIX fn_has_project_access (Minimalist version)
CREATE OR REPLACE FUNCTION public.fn_has_project_access(p_id uuid, u_id uuid)
RETURNS boolean AS $$
DECLARE
    v_role text;
    v_client_id uuid;
    v_is_leader boolean;
BEGIN
    -- Read from profiles table (bypasses RLS because it's SECURITY DEFINER)
    SELECT role, client_id, is_client_leader 
    INTO v_role, v_client_id, v_is_leader
    FROM public.profiles WHERE id = u_id;

    IF v_role = 'admin' THEN RETURN true; END IF;
    
    -- Check if it's the creator
    IF EXISTS (SELECT 1 FROM public.projects WHERE id = p_id AND user_id = u_id) THEN 
        RETURN true; 
    END IF;

    -- Check project assignments (Workers)
    IF v_role = 'worker' AND EXISTS (SELECT 1 FROM public.project_assignments WHERE project_id = p_id AND worker_id = u_id) THEN
        RETURN true;
    END IF;

    -- Check client assignments
    IF v_role = 'client' THEN
        -- Explicit assignment
        IF EXISTS (SELECT 1 FROM public.project_client_users WHERE project_id = p_id AND user_id = u_id) THEN
            RETURN true;
        END IF;
        
        -- Company-wide for leaders
        IF v_is_leader = true AND v_client_id IS NOT NULL THEN
            IF EXISTS (SELECT 1 FROM public.project_clients WHERE project_id = p_id AND client_id = v_client_id) THEN
                RETURN true;
            END IF;
            IF EXISTS (SELECT 1 FROM public.projects WHERE id = p_id AND client_id = v_client_id) THEN
                RETURN true;
            END IF;
        END IF;
    END IF;

    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Re-apply to related tables
DROP POLICY IF EXISTS "Users can view project_clients" ON public.project_clients;
CREATE POLICY "Users can view project_clients" ON public.project_clients
FOR SELECT TO authenticated USING (fn_has_project_access(project_id, auth.uid()));

DROP POLICY IF EXISTS "Users can view project_client_users" ON public.project_client_users;
CREATE POLICY "Users can view project_client_users" ON public.project_client_users
FOR SELECT TO authenticated USING (fn_has_project_access(project_id, auth.uid()));

COMMENT ON FUNCTION public.fn_has_project_access IS 'Emergency stable version of project access check.';
