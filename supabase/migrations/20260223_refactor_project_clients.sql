-- Migration to support multiple clients and client teams per project
-- 1. Create project_clients table for many-to-many relationship between projects and client entities
CREATE TABLE IF NOT EXISTS public.project_clients (
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
    client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (project_id, client_id)
);

-- 2. Create project_client_users table for team members of the client assigned to the project
CREATE TABLE IF NOT EXISTS public.project_client_users (
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (project_id, user_id)
);

-- 3. Add client_id to profiles to group users into client entities
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'client_id') THEN
        ALTER TABLE public.profiles ADD COLUMN client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 4. Migrate existing project->client data to the new many-to-many table
INSERT INTO public.project_clients (project_id, client_id)
SELECT id, client_id FROM public.projects WHERE client_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 5. Enable RLS on new tables
ALTER TABLE public.project_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_client_users ENABLE ROW LEVEL SECURITY;

-- 6. Policies for project_clients
DROP POLICY IF EXISTS "Admins can manage project_clients" ON public.project_clients;
CREATE POLICY "Admins can manage project_clients" ON public.project_clients
FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Users can view project_clients for their projects" ON public.project_clients
FOR SELECT TO authenticated USING (
    project_id IN (
        SELECT id FROM public.projects WHERE user_id = auth.uid()
        OR client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM public.project_assignments WHERE project_id = project_id AND worker_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 7. Policies for project_client_users
DROP POLICY IF EXISTS "Admins can manage project_client_users" ON public.project_client_users;
CREATE POLICY "Admins can manage project_client_users" ON public.project_client_users
FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Users can view project_client_users for their projects" ON public.project_client_users
FOR SELECT TO authenticated USING (
    project_id IN (
        SELECT id FROM public.projects WHERE user_id = auth.uid()
        OR client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM public.project_assignments WHERE project_id = project_id AND worker_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 8. Add comments
COMMENT ON TABLE public.project_clients IS 'Links projects to one or more client entities';
COMMENT ON TABLE public.project_client_users IS 'Links projects to specific users from the client side (client team)';
COMMENT ON COLUMN public.profiles.client_id IS 'Indicates which client entity this profile belongs to';
