-- Project reports: PDF uploads + structured metrics + AI-ready context snapshots

CREATE TABLE IF NOT EXISTS public.project_reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    period_start date NOT NULL,
    period_end date NOT NULL,
    pdf_path text NOT NULL,
    pdf_url text NOT NULL,
    pdf_name text NOT NULL,
    file_size bigint,
    metrics_jsonb jsonb NOT NULL DEFAULT '{}'::jsonb,
    operational_comment text,
    ai_context_text text,
    source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'imported')),
    created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT project_reports_period_check CHECK (period_end >= period_start)
);

CREATE INDEX IF NOT EXISTS idx_project_reports_project_id
    ON public.project_reports(project_id);

CREATE INDEX IF NOT EXISTS idx_project_reports_period_end
    ON public.project_reports(period_end DESC);

ALTER TABLE public.project_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view project_reports" ON public.project_reports;
CREATE POLICY "Users can view project_reports" ON public.project_reports
FOR SELECT TO authenticated
USING (
    public.fn_has_project_access(project_id, auth.uid())
);

DROP POLICY IF EXISTS "Users can insert project_reports" ON public.project_reports;
DROP POLICY IF EXISTS "Admins and workers can insert project_reports" ON public.project_reports;
CREATE POLICY "Admins and workers can insert project_reports" ON public.project_reports
FOR INSERT TO authenticated
WITH CHECK (
    public.fn_has_project_access(project_id, auth.uid())
    AND created_by = auth.uid()
    AND EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND role IN ('admin', 'worker')
    )
);

DROP POLICY IF EXISTS "Users can update own project_reports" ON public.project_reports;
DROP POLICY IF EXISTS "Admins and workers can update project_reports" ON public.project_reports;
CREATE POLICY "Admins and workers can update project_reports" ON public.project_reports
FOR UPDATE TO authenticated
USING (
    public.fn_has_project_access(project_id, auth.uid())
    AND EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND role IN ('admin', 'worker')
    )
)
WITH CHECK (
    public.fn_has_project_access(project_id, auth.uid())
    AND EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND role IN ('admin', 'worker')
    )
);

DROP POLICY IF EXISTS "Users can delete own project_reports" ON public.project_reports;
DROP POLICY IF EXISTS "Admins and workers can delete project_reports" ON public.project_reports;
CREATE POLICY "Admins and workers can delete project_reports" ON public.project_reports
FOR DELETE TO authenticated
USING (
    public.fn_has_project_access(project_id, auth.uid())
    AND EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND role IN ('admin', 'worker')
    )
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_proc
        WHERE proname = 'set_project_reports_updated_at'
          AND pronamespace = 'public'::regnamespace
    ) THEN
        CREATE FUNCTION public.set_project_reports_updated_at()
        RETURNS trigger
        LANGUAGE plpgsql
        AS $fn$
        BEGIN
            NEW.updated_at = now();
            RETURN NEW;
        END;
        $fn$;
    END IF;
END$$;

DROP TRIGGER IF EXISTS trg_project_reports_updated_at ON public.project_reports;
CREATE TRIGGER trg_project_reports_updated_at
BEFORE UPDATE ON public.project_reports
FOR EACH ROW
EXECUTE FUNCTION public.set_project_reports_updated_at();

INSERT INTO storage.buckets (id, name, public)
VALUES ('project-reports', 'project-reports', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Project reports are public" ON storage.objects;
CREATE POLICY "Project reports are public" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'project-reports');

DROP POLICY IF EXISTS "Users can upload project report files" ON storage.objects;
CREATE POLICY "Users can upload project report files" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'project-reports'
    AND EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND role IN ('admin', 'worker')
    )
    AND EXISTS (
        SELECT 1
        FROM public.projects p
        WHERE p.id::text = split_part(name, '/', 1)
          AND public.fn_has_project_access(p.id, auth.uid())
    )
);

DROP POLICY IF EXISTS "Users can update project report files" ON storage.objects;
CREATE POLICY "Users can update project report files" ON storage.objects
FOR UPDATE TO authenticated
USING (
    bucket_id = 'project-reports'
    AND EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND role IN ('admin', 'worker')
    )
    AND EXISTS (
        SELECT 1
        FROM public.projects p
        WHERE p.id::text = split_part(name, '/', 1)
          AND public.fn_has_project_access(p.id, auth.uid())
    )
)
WITH CHECK (
    bucket_id = 'project-reports'
    AND EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND role IN ('admin', 'worker')
    )
    AND EXISTS (
        SELECT 1
        FROM public.projects p
        WHERE p.id::text = split_part(name, '/', 1)
          AND public.fn_has_project_access(p.id, auth.uid())
    )
);

DROP POLICY IF EXISTS "Users can delete project report files" ON storage.objects;
CREATE POLICY "Users can delete project report files" ON storage.objects
FOR DELETE TO authenticated
USING (
    bucket_id = 'project-reports'
    AND EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND role IN ('admin', 'worker')
    )
    AND EXISTS (
        SELECT 1
        FROM public.projects p
        WHERE p.id::text = split_part(name, '/', 1)
          AND public.fn_has_project_access(p.id, auth.uid())
    )
);

COMMENT ON TABLE public.project_reports IS
'Stores per-project report snapshots with PDF, metrics and AI context text.';
