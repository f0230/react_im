-- Persist AI planning data per task/service
ALTER TABLE public.services
ADD COLUMN IF NOT EXISTS ai_planning jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS ai_planning_updated_at timestamptz;

COMMENT ON COLUMN public.services.ai_planning IS 'Structured planning payload for task AI workflow (phase1 + phase2).';
COMMENT ON COLUMN public.services.ai_planning_updated_at IS 'Timestamp of last AI planning update.';
