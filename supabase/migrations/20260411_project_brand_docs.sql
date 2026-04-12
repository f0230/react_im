-- ============================================================
-- project_brand_docs
-- Per-project knowledge base docs used as brand context when
-- generating AI copies via post-copywriter.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.project_brand_docs (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_by   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  title        TEXT        NOT NULL CHECK (char_length(trim(title)) BETWEEN 1 AND 120),
  doc_type     TEXT        NOT NULL DEFAULT 'general'
               CHECK (doc_type IN ('brand_voice','copy_examples','audience','guidelines','general')),
  content      TEXT        NOT NULL CHECK (char_length(trim(content)) BETWEEN 1 AND 8000),
  is_active    BOOLEAN     NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fast lookup by project (copywriter endpoint + UI listing)
CREATE INDEX IF NOT EXISTS idx_project_brand_docs_project
  ON public.project_brand_docs (project_id, is_active);

-- Auto-bump updated_at on every update
CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_project_brand_docs_updated_at
  BEFORE UPDATE ON public.project_brand_docs
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────

ALTER TABLE public.project_brand_docs ENABLE ROW LEVEL SECURITY;

-- SELECT: any authenticated user who has project access can read
CREATE POLICY "brand_docs_select"
  ON public.project_brand_docs FOR SELECT
  TO authenticated
  USING (public.fn_has_project_access(project_id, auth.uid()));

-- INSERT: admin always; worker only on their assigned projects
CREATE POLICY "brand_docs_insert"
  ON public.project_brand_docs FOR INSERT
  TO authenticated
  WITH CHECK (
    public.fn_is_admin()
    OR (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'worker')
      AND public.fn_has_project_access(project_id, auth.uid())
    )
  );

-- UPDATE: same rules as insert
CREATE POLICY "brand_docs_update"
  ON public.project_brand_docs FOR UPDATE
  TO authenticated
  USING (
    public.fn_is_admin()
    OR (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'worker')
      AND public.fn_has_project_access(project_id, auth.uid())
    )
  );

-- DELETE: same rules as insert
CREATE POLICY "brand_docs_delete"
  ON public.project_brand_docs FOR DELETE
  TO authenticated
  USING (
    public.fn_is_admin()
    OR (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'worker')
      AND public.fn_has_project_access(project_id, auth.uid())
    )
  );

COMMENT ON TABLE public.project_brand_docs IS
  'Knowledge-base documents per project. Used as brand/voice context when generating AI social media copies.';

COMMENT ON COLUMN public.project_brand_docs.doc_type IS
  'One of: brand_voice | copy_examples | audience | guidelines | general';

COMMENT ON COLUMN public.project_brand_docs.content IS
  'Markdown text, max 8 000 chars. Injected verbatim into the copywriter system prompt.';
