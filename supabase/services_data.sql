-- Create services table
CREATE TABLE IF NOT EXISTS public.services (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    status text DEFAULT 'active', -- active, completed, etc.
    responsible_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Storage configuration for service attachments
-- Note: This usually requires 'storage' schema access.
INSERT INTO storage.buckets (id, name, public) 
VALUES ('service-attachments', 'service-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'service-attachments');
CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'service-attachments' AND auth.role() = 'authenticated');

-- Create service_files table (formerly project_files)
CREATE TABLE IF NOT EXISTS public.service_files (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    file_url text NOT NULL,
    file_name text NOT NULL,
    file_type text,
    file_size bigint,
    uploaded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Create service_comments table (formerly project_comments)
CREATE TABLE IF NOT EXISTS public.service_comments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    body text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_comments ENABLE ROW LEVEL SECURITY;

-- services policies
CREATE POLICY "Users can view services of projects they differ data" ON public.services
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = project_id
            AND (p.user_id = auth.uid() OR p.client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()))
        ) OR EXISTS (
            SELECT 1 FROM public.project_assignments pa
            WHERE pa.project_id = project_id AND pa.worker_id = auth.uid()
        ) OR EXISTS (
            SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can insert services" ON public.services
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- service_files policies
CREATE POLICY "Users can view files of services they have access to" ON public.service_files
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.services s
            JOIN public.projects p ON p.id = s.project_id
            WHERE s.id = service_id
            AND (
                p.user_id = auth.uid() 
                OR p.client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
                OR EXISTS (SELECT 1 FROM public.project_assignments pa WHERE pa.project_id = p.id AND pa.worker_id = auth.uid())
            )
        ) OR EXISTS (
            SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins and workers can upload files to services" ON public.service_files
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'worker')
        )
    );

-- service_comments policies
CREATE POLICY "Users can view comments of services they have access to" ON public.service_comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.services s
            JOIN public.projects p ON p.id = s.project_id
            WHERE s.id = service_id
            AND (
                p.user_id = auth.uid() 
                OR p.client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
                OR EXISTS (SELECT 1 FROM public.project_assignments pa WHERE pa.project_id = p.id AND pa.worker_id = auth.uid())
            )
        ) OR EXISTS (
            SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Users can post comments on services they have access to" ON public.service_comments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.services s
            JOIN public.projects p ON p.id = s.project_id
            WHERE s.id = service_id
            AND (
                p.user_id = auth.uid() 
                OR p.client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
                OR EXISTS (SELECT 1 FROM public.project_assignments pa WHERE pa.project_id = p.id AND pa.worker_id = auth.uid())
            )
        ) OR EXISTS (
            SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );
