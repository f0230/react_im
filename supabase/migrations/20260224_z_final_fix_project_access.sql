
-- Migration: Final fix for project access and leader/member distinction
-- This migration ensures that non-leaders ONLY see projects they are explicitly assigned to,
-- and leaders see projects belonging to their company.

-- 1. Ensure fn_has_project_access is strictly defined
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

    -- Worker: Access if assigned in project_assignments
    IF v_role = 'worker' THEN
        RETURN EXISTS (
            SELECT 1 FROM public.project_assignments 
            WHERE project_id = p_id AND worker_id = u_id
        );
    END IF;

    -- Client access logic
    IF v_role = 'client' THEN
        -- A. Access if they literally created the project (user_id matches)
        IF EXISTS (SELECT 1 FROM public.projects WHERE id = p_id AND user_id = u_id) THEN
            RETURN true;
        END IF;

        -- B. Access if they are explicitly assigned to it (project_client_users)
        -- This is the PRIMARY way for non-leaders to see projects.
        IF EXISTS (SELECT 1 FROM public.project_client_users WHERE project_id = p_id AND user_id = u_id) THEN
            RETURN true;
        END IF;

        -- C. If they are a LEADER, they also see projects belonging to their company
        IF v_is_client_leader = true AND v_profile_client_id IS NOT NULL THEN
            -- Check if company is assigned via many-to-many project_clients
            IF EXISTS (SELECT 1 FROM public.project_clients WHERE project_id = p_id AND client_id = v_profile_client_id) THEN
                RETURN true;
            END IF;

            -- Check legacy direct client_id column on projects table
            IF EXISTS (SELECT 1 FROM public.projects WHERE id = p_id AND client_id = v_profile_client_id) THEN
                RETURN true;
            END IF;
        END IF;

        -- D. If they are the "owner" of a client entity (user_id in clients table)
        -- they should see everything of that company
        IF EXISTS (
            SELECT 1 FROM public.projects p
            JOIN public.clients c ON (p.client_id = c.id OR EXISTS (SELECT 1 FROM public.project_clients pc WHERE pc.project_id = p.id AND pc.client_id = c.id))
            WHERE p.id = p_id AND c.user_id = u_id
        ) THEN
            RETURN true;
        END IF;
    END IF;

    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Clean up profiles data
-- Ensure that users who are part of a team but NOT the primary creator are marked as NOT leaders.
-- Unless they were explicitly promoted, but by default, team members shouldn't see everything.
UPDATE public.profiles p
SET is_client_leader = false
WHERE role = 'client'
  AND client_id IS NOT NULL
  AND is_client_leader = true -- current leaders
  AND NOT EXISTS (SELECT 1 FROM public.clients c WHERE c.id = p.client_id AND c.user_id = p.id); -- not the owner

-- 3. Ensure the SELECT policy on projects is using our refined function
DROP POLICY IF EXISTS "Users can select projects" ON public.projects;
CREATE POLICY "Users can select projects" ON public.projects
FOR SELECT TO authenticated USING (
    fn_has_project_access(id, auth.uid())
);

-- 4. Ensure non-leaders can also view related objects ONLY if they have project access
-- Most of these already use fn_has_project_access, but let's be sure about tasks/files.

DROP POLICY IF EXISTS "Users can view services" ON public.services;
CREATE POLICY "Users can view services" ON public.services
FOR SELECT TO authenticated USING (
    fn_has_project_access(project_id, auth.uid())
);

DROP POLICY IF EXISTS "Users can view invoices" ON public.invoices;
CREATE POLICY "Users can view invoices" ON public.invoices
FOR SELECT TO authenticated USING (
    fn_has_project_access(project_id, auth.uid())
);

COMMENT ON FUNCTION public.fn_has_project_access IS 'Strict project access check: Non-leaders ONLY see explicit assignments. Leaders see company projects.';
