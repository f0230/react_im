ALTER TABLE public.project_reports
ADD COLUMN IF NOT EXISTS extraction_confidence double precision,
ADD COLUMN IF NOT EXISTS extraction_warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS source_evidence jsonb NOT NULL DEFAULT '[]'::jsonb;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'project_reports_extraction_confidence_check'
          AND conrelid = 'public.project_reports'::regclass
    ) THEN
        ALTER TABLE public.project_reports
        ADD CONSTRAINT project_reports_extraction_confidence_check
        CHECK (
            extraction_confidence IS NULL
            OR (extraction_confidence >= 0 AND extraction_confidence <= 1)
        );
    END IF;
END$$;

UPDATE public.project_reports
SET extraction_warnings = '[]'::jsonb
WHERE extraction_warnings IS NULL;

UPDATE public.project_reports
SET source_evidence = '[]'::jsonb
WHERE source_evidence IS NULL;
