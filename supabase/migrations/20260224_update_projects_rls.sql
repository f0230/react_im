-- Migration: Fix RLS Recursion and support many-to-many client assignments
-- This migration replaces problematic recursive policies with non-recursive ones using a SECURITY DEFINER function.

-- 1. Create a SECURITY DEFINER function to check project access
-- This function runs with the privileges of the creator (bypass RLS)
-- and therefore can query projects, project_clients, etc. without recursion.
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
            OR client_id = v_profile_client_id
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

    -- Check many-to-many client assignments (Company-wide for team members)
    IF v_profile_client_id IS NOT NULL AND EXISTS (
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

    -- Check explicit client user assignments
    IF EXISTS (
        SELECT 1 FROM public.project_client_users 
        WHERE project_id = p_id AND user_id = u_id
    ) THEN
        RETURN true;
    END IF;

    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Apply non-recursive policies to projects
DROP POLICY IF EXISTS "Users can select projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view assigned projects" ON public.projects;
DROP POLICY IF EXISTS "Clients can view their own projects" ON public.projects;
DROP POLICY IF EXISTS "Workers can view assigned projects" ON public.projects;
DROP POLICY IF EXISTS "Admins can view all projects" ON public.projects;
DROP POLICY IF EXISTS "Allow select for owners and assigned" ON public.projects;

CREATE POLICY "Users can select projects" ON public.projects
FOR SELECT TO authenticated USING (
    fn_has_project_access(id, auth.uid())
);

-- 3. Apply non-recursive policies to project_clients
DROP POLICY IF EXISTS "Users can view project_clients for their projects" ON public.project_clients;
DROP POLICY IF EXISTS "Admins can manage project_clients" ON public.project_clients;

CREATE POLICY "Admins can manage project_clients" ON public.project_clients
FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Users can view project_clients" ON public.project_clients
FOR SELECT TO authenticated USING (
    fn_has_project_access(project_id, auth.uid())
);

-- 4. Apply non-recursive policies to project_client_users
DROP POLICY IF EXISTS "Users can view project_client_users for their projects" ON public.project_client_users;
DROP POLICY IF EXISTS "Admins can manage project_client_users" ON public.project_client_users;

CREATE POLICY "Admins can manage project_client_users" ON public.project_client_users
FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Users can view project_client_users" ON public.project_client_users
FOR SELECT TO authenticated USING (
    fn_has_project_access(project_id, auth.uid())
);

-- 5. Apply non-recursive policies to project_assignments
DROP POLICY IF EXISTS "Clients can view assignments for their projects" ON public.project_assignments;
DROP POLICY IF EXISTS "Workers can view assigned projects" ON public.project_assignments;

CREATE POLICY "Users can view project_assignments" ON public.project_assignments
FOR SELECT TO authenticated USING (
    fn_has_project_access(project_id, auth.uid())
);

-- 6. Apply non-recursive policies to services (Tasks)
DROP POLICY IF EXISTS "Users can view services of projects they differ data" ON public.services;
DROP POLICY IF EXISTS "Admins and workers can update services" ON public.services;

CREATE POLICY "Users can view services" ON public.services
FOR SELECT TO authenticated USING (
    fn_has_project_access(project_id, auth.uid())
);

CREATE POLICY "Admins and workers can manage services" ON public.services
FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'worker'))
);

-- 7. Apply non-recursive policies to service_files
DROP POLICY IF EXISTS "Users can view files of services they have access to" ON public.service_files;
DROP POLICY IF EXISTS "Admins and workers can upload files to services" ON public.service_files;

CREATE POLICY "Users can view service_files" ON public.service_files
FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.services s 
        WHERE s.id = service_id AND fn_has_project_access(s.project_id, auth.uid())
    )
);

CREATE POLICY "Authenticated users can manage service_files" ON public.service_files
FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'worker'))
    OR uploaded_by = auth.uid()
);

-- 8. Apply non-recursive policies to service_comments
DROP POLICY IF EXISTS "Users can view comments of services they have access to" ON public.service_comments;
DROP POLICY IF EXISTS "Users can post comments on services they have access to" ON public.service_comments;

CREATE POLICY "Users can view service_comments" ON public.service_comments
FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.services s 
        WHERE s.id = service_id AND fn_has_project_access(s.project_id, auth.uid())
    )
);

CREATE POLICY "Users can manage their own comments" ON public.service_comments
FOR ALL TO authenticated USING (
    author_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Users can post comments to accessible services" ON public.service_comments
FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.services s 
        WHERE s.id = service_id AND fn_has_project_access(s.project_id, auth.uid())
    )
);

-- 9. Apply non-recursive policies to invoices
DROP POLICY IF EXISTS "Clients can view their own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Workers can view invoices of assigned projects" ON public.invoices;
DROP POLICY IF EXISTS "Admins can do everything on invoices" ON public.invoices;

CREATE POLICY "Users can view invoices" ON public.invoices
FOR SELECT TO authenticated USING (
    fn_has_project_access(project_id, auth.uid())
);

CREATE POLICY "Admins can manage invoices" ON public.invoices
FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 10. Apply non-recursive policies to appointments
DROP POLICY IF EXISTS "Users can view own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can insert own appointments" ON public.appointments;

CREATE POLICY "Users can view appointments" ON public.appointments
FOR SELECT TO authenticated USING (
    user_id = auth.uid()
    OR (project_id IS NOT NULL AND fn_has_project_access(project_id, auth.uid()))
);

CREATE POLICY "Users can insert appointments" ON public.appointments
FOR INSERT TO authenticated WITH CHECK (
    user_id = auth.uid()
);

-- 11. Add comments
COMMENT ON FUNCTION public.fn_has_project_access IS 'Centralized check for project access to avoid RLS recursion.';
