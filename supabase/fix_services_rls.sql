-- 1. Ensure services table has responsible_id column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'services' AND column_name = 'responsible_id'
    ) THEN
        ALTER TABLE public.services ADD COLUMN responsible_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 2. Helper function to check project access without RLS recursion
CREATE OR REPLACE FUNCTION public.check_project_access(p_id uuid, u_id uuid)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = p_id
        AND (
            p.user_id = u_id 
            OR p.client_id IN (SELECT id FROM public.clients WHERE user_id = u_id)
            OR EXISTS (SELECT 1 FROM public.project_assignments pa WHERE pa.project_id = p.id AND pa.worker_id = u_id)
            OR EXISTS (SELECT 1 FROM public.profiles WHERE id = u_id AND role = 'admin')
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update services update policy
-- We use USING for the policy and WITH CHECK if needed, but for UPDATE, USING is the filter for what can be updated.
DROP POLICY IF EXISTS "Admins and workers can update services" ON public.services;
CREATE POLICY "Admins and workers can update services" ON public.services
    FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'worker')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'worker')
        )
    );

-- 4. Profiles visibility
DROP POLICY IF EXISTS "View profiles" ON public.profiles;
CREATE POLICY "View profiles" ON public.profiles
    FOR SELECT USING (auth.role() = 'authenticated');

-- 5. Project assignments visibility (Using the helper to avoid recursion)
DROP POLICY IF EXISTS "Clients can view assignments for their projects" ON public.project_assignments;
CREATE POLICY "Clients can view assignments for their projects" ON public.project_assignments
    FOR SELECT USING (
        public.check_project_access(project_id, auth.uid())
    );

-- 6. Service files deletion policy
DROP POLICY IF EXISTS "Admins and workers can delete service files" ON public.service_files;
CREATE POLICY "Admins and workers can delete service files" ON public.service_files
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'worker')
        )
    );

-- 7. Storage deletion policy for service-attachments
-- Ensure workers and admins can delete from storage
DROP POLICY IF EXISTS "Authenticated users can delete" ON storage.objects;
CREATE POLICY "Authenticated users can delete" ON storage.objects 
    FOR DELETE USING (
        bucket_id = 'service-attachments' 
        AND auth.role() = 'authenticated'
        AND EXISTS (
             SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'worker')
        )
    );
