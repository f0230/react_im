-- Allow project owners and assigned client leaders to update project basic info (customization columns)
CREATE POLICY "Owners and leaders can update projects" ON public.projects
FOR UPDATE
TO authenticated
USING (
    fn_has_project_access(id, auth.uid())
)
WITH CHECK (
    fn_has_project_access(id, auth.uid())
);

-- Note: We use the existing fn_has_project_access which already handles:
-- 1. Admins
-- 2. Project creator (user_id)
-- 3. Company leader (if project.client_id matches)
-- 4. Assigned workers
-- 5. Assigned client users
