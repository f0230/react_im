-- ============================================
-- BLOTATO INTEGRATION - CUENTAS CONECTADAS (caché global, sin API key en DB)
-- La API key vive únicamente en .env como BLOTATO_API_KEY
-- ============================================

CREATE TABLE IF NOT EXISTS public.project_blotato_config (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

    -- Caché global de todas las cuentas Blotato (se actualiza al sincronizar)
    connected_accounts jsonb DEFAULT '[]'::jsonb,

    -- IDs de cuentas Blotato asignadas a ESTE proyecto
    assigned_account_ids text[] DEFAULT '{}',

    -- Metadata
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    created_by uuid REFERENCES public.profiles(id),

    UNIQUE(project_id)
);

-- Agrega la columna si la tabla ya existía sin ella (idempotente)
ALTER TABLE public.project_blotato_config
ADD COLUMN IF NOT EXISTS assigned_account_ids text[] DEFAULT '{}';

COMMENT ON COLUMN public.project_blotato_config.assigned_account_ids IS 'IDs de cuentas Blotato (de connected_accounts) asignadas a este proyecto específico';

COMMENT ON TABLE public.project_blotato_config IS 'Cache de cuentas Blotato por proyecto (API key solo en .env)';
COMMENT ON COLUMN public.project_blotato_config.connected_accounts IS 'Cache de cuentas sociales conectadas desde Blotato';

-- ============================================
-- BLOTATO INTEGRATION - PUBLICACIONES PROGRAMADAS POR PROYECTO
-- ============================================

CREATE TABLE IF NOT EXISTS public.service_posts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id uuid REFERENCES public.services(id) ON DELETE CASCADE,
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

    -- Agrupa posts creados juntos (uno por cuenta al publicar en múltiples cuentas)
    post_group_id uuid,

    -- Contenido del post
    content_text text NOT NULL,
    media_urls text[] DEFAULT '{}',

    -- Configuración Blotato
    account_id text NOT NULL,
    platform text NOT NULL,
    target_config jsonb DEFAULT '{}'::jsonb,

    -- Estado y Scheduling
    status text NOT NULL DEFAULT 'draft',
    blotato_submission_id text,
    scheduled_time timestamptz,
    published_at timestamptz,
    public_url text,
    error_message text,

    -- Metadata
    created_by uuid REFERENCES public.profiles(id),
    updated_by uuid REFERENCES public.profiles(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    CONSTRAINT valid_platform CHECK (platform IN (
        'twitter', 'linkedin', 'instagram', 'facebook',
        'tiktok', 'pinterest', 'threads', 'bluesky', 'youtube'
    )),
    CONSTRAINT valid_status CHECK (status IN (
        'draft', 'scheduled', 'publishing', 'published', 'failed', 'cancelled'
    ))
);

-- Agrega columna si la tabla ya existía sin ella (idempotente)
ALTER TABLE public.service_posts
ADD COLUMN IF NOT EXISTS post_group_id uuid;

COMMENT ON TABLE public.service_posts IS 'Publicaciones programadas en redes sociales via Blotato';
COMMENT ON COLUMN public.service_posts.service_id IS 'Tarea asociada (opcional, puede ser a nivel de proyecto)';
COMMENT ON COLUMN public.service_posts.target_config IS 'Config específica por plataforma (pageId, boardId, privacyLevel, etc)';

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_service_posts_service_id ON public.service_posts(service_id);
CREATE INDEX IF NOT EXISTS idx_service_posts_project_id ON public.service_posts(project_id);
CREATE INDEX IF NOT EXISTS idx_service_posts_status ON public.service_posts(status);
CREATE INDEX IF NOT EXISTS idx_service_posts_scheduled_time ON public.service_posts(scheduled_time);

-- ============================================
-- RLS
-- ============================================

ALTER TABLE public.project_blotato_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_posts ENABLE ROW LEVEL SECURITY;

-- project_blotato_config policies
DROP POLICY IF EXISTS "project_blotato_config_select" ON public.project_blotato_config;
CREATE POLICY "project_blotato_config_select"
    ON public.project_blotato_config FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.projects p
        LEFT JOIN public.project_clients pc ON pc.project_id = p.id
        LEFT JOIN public.project_assignments pa ON pa.project_id = p.id
        LEFT JOIN public.project_client_users pcu ON pcu.project_id = p.id
        WHERE p.id = project_blotato_config.project_id
        AND (p.user_id = auth.uid()
             OR pc.client_id = (SELECT client_id FROM public.profiles WHERE id = auth.uid())
             OR pa.worker_id = auth.uid()
             OR pcu.user_id = auth.uid()
             OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin')
    ));

DROP POLICY IF EXISTS "project_blotato_config_insert" ON public.project_blotato_config;
CREATE POLICY "project_blotato_config_insert"
    ON public.project_blotato_config FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.projects p
        LEFT JOIN public.project_assignments pa ON pa.project_id = p.id
        WHERE p.id = project_blotato_config.project_id
        AND (p.user_id = auth.uid()
             OR pa.worker_id = auth.uid()
             OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'worker'))
    ));

DROP POLICY IF EXISTS "project_blotato_config_update" ON public.project_blotato_config;
CREATE POLICY "project_blotato_config_update"
    ON public.project_blotato_config FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM public.projects p
        LEFT JOIN public.project_assignments pa ON pa.project_id = p.id
        WHERE p.id = project_blotato_config.project_id
        AND (p.user_id = auth.uid()
             OR pa.worker_id = auth.uid()
             OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'worker'))
    ));

-- service_posts policies
DROP POLICY IF EXISTS "service_posts_select" ON public.service_posts;
CREATE POLICY "service_posts_select"
    ON public.service_posts FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.projects p
        LEFT JOIN public.project_clients pc ON pc.project_id = p.id
        LEFT JOIN public.project_assignments pa ON pa.project_id = p.id
        LEFT JOIN public.project_client_users pcu ON pcu.project_id = p.id
        WHERE p.id = service_posts.project_id
        AND (p.user_id = auth.uid()
             OR pc.client_id = (SELECT client_id FROM public.profiles WHERE id = auth.uid())
             OR pa.worker_id = auth.uid()
             OR pcu.user_id = auth.uid()
             OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin')
    ));

DROP POLICY IF EXISTS "service_posts_insert" ON public.service_posts;
CREATE POLICY "service_posts_insert"
    ON public.service_posts FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.projects p
        LEFT JOIN public.project_clients pc ON pc.project_id = p.id
        LEFT JOIN public.project_assignments pa ON pa.project_id = p.id
        LEFT JOIN public.project_client_users pcu ON pcu.project_id = p.id
        WHERE p.id = service_posts.project_id
        AND (p.user_id = auth.uid()
             OR pc.client_id = (SELECT client_id FROM public.profiles WHERE id = auth.uid())
             OR pa.worker_id = auth.uid()
             OR pcu.user_id = auth.uid()
             OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin')
    ));

DROP POLICY IF EXISTS "service_posts_update" ON public.service_posts;
CREATE POLICY "service_posts_update"
    ON public.service_posts FOR UPDATE
    USING (created_by = auth.uid()
           OR EXISTS (
               SELECT 1 FROM public.projects p
               LEFT JOIN public.project_assignments pa ON pa.project_id = p.id
               WHERE p.id = service_posts.project_id
               AND (pa.worker_id = auth.uid()
                    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'worker'))
           ));

DROP POLICY IF EXISTS "service_posts_delete" ON public.service_posts;
CREATE POLICY "service_posts_delete"
    ON public.service_posts FOR DELETE
    USING (created_by = auth.uid()
           OR EXISTS (
               SELECT 1 FROM public.projects p
               LEFT JOIN public.project_assignments pa ON pa.project_id = p.id
               WHERE p.id = service_posts.project_id
               AND (pa.worker_id = auth.uid()
                    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'worker'))
           ));

-- ============================================
-- STORAGE BUCKET para media de publicaciones
-- ============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'social-media',
    'social-media',
    true,
    104857600, -- 100MB
    ARRAY['image/jpeg','image/png','image/gif','image/webp','video/mp4','video/quicktime','video/webm']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "social_media_upload" ON storage.objects;
CREATE POLICY "social_media_upload"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'social-media');

DROP POLICY IF EXISTS "social_media_read" ON storage.objects;
CREATE POLICY "social_media_read"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'social-media');

DROP POLICY IF EXISTS "social_media_delete" ON storage.objects;
CREATE POLICY "social_media_delete"
    ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'social-media' AND auth.uid()::text = (storage.foldername(name))[1]);
