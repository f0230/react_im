CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cal_booking_id VARCHAR(255) NOT NULL,
    cal_booking_uid VARCHAR(255),
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    event_type_id VARCHAR(255),
    event_type_name VARCHAR(255),
    scheduled_at TIMESTAMPTZ NOT NULL,
    start_at TIMESTAMPTZ,
    end_at TIMESTAMPTZ,
    booking_time_zone VARCHAR(64),
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    status VARCHAR(50) NOT NULL DEFAULT 'scheduled',
    client_name VARCHAR(255),
    client_email VARCHAR(255),
    client_phone VARCHAR(64),
    client_phone_normalized VARCHAR(32),
    whatsapp_normalized VARCHAR(32),
    notes TEXT,
    meeting_link VARCHAR(500),
    source VARCHAR(120),
    utm_source VARCHAR(255),
    utm_campaign VARCHAR(255),
    setter_assigned VARCHAR(255),
    last_cal_event VARCHAR(120),
    cal_metadata JSONB,
    raw_payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.appointments
    ADD COLUMN IF NOT EXISTS cal_booking_uid VARCHAR(255),
    ADD COLUMN IF NOT EXISTS event_type_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS start_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS end_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS booking_time_zone VARCHAR(64),
    ADD COLUMN IF NOT EXISTS client_phone_normalized VARCHAR(32),
    ADD COLUMN IF NOT EXISTS whatsapp_normalized VARCHAR(32),
    ADD COLUMN IF NOT EXISTS source VARCHAR(120),
    ADD COLUMN IF NOT EXISTS utm_source VARCHAR(255),
    ADD COLUMN IF NOT EXISTS utm_campaign VARCHAR(255),
    ADD COLUMN IF NOT EXISTS setter_assigned VARCHAR(255),
    ADD COLUMN IF NOT EXISTS last_cal_event VARCHAR(120),
    ADD COLUMN IF NOT EXISTS raw_payload JSONB,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE public.appointments
SET
    start_at = COALESCE(start_at, scheduled_at),
    client_phone_normalized = COALESCE(client_phone_normalized, regexp_replace(client_phone, '[^0-9+]', '', 'g')),
    whatsapp_normalized = COALESCE(whatsapp_normalized, regexp_replace(client_phone, '[^0-9+]', '', 'g')),
    raw_payload = COALESCE(raw_payload, cal_metadata),
    updated_at = COALESCE(updated_at, created_at, NOW())
WHERE
    start_at IS NULL
    OR (client_phone IS NOT NULL AND client_phone_normalized IS NULL)
    OR (client_phone IS NOT NULL AND whatsapp_normalized IS NULL)
    OR raw_payload IS NULL
    OR updated_at IS NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'appointments_cal_booking_id_key'
    ) THEN
        ALTER TABLE public.appointments
            ADD CONSTRAINT appointments_cal_booking_id_key UNIQUE (cal_booking_id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_at ON public.appointments(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_appointments_start_at ON public.appointments(start_at);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_client_email ON public.appointments(LOWER(client_email));
CREATE INDEX IF NOT EXISTS idx_appointments_client_phone_normalized ON public.appointments(client_phone_normalized);
CREATE INDEX IF NOT EXISTS idx_appointments_whatsapp_normalized ON public.appointments(whatsapp_normalized);
CREATE INDEX IF NOT EXISTS idx_appointments_utm_source ON public.appointments(utm_source);
CREATE INDEX IF NOT EXISTS idx_appointments_utm_campaign ON public.appointments(utm_campaign);
CREATE INDEX IF NOT EXISTS idx_appointments_project_id ON public.appointments(project_id);
CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON public.appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON public.appointments(user_id);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can insert appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can view own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can insert own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Admins can manage appointments" ON public.appointments;

CREATE POLICY "Users can view own appointments" ON public.appointments
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage appointments" ON public.appointments
    FOR ALL TO authenticated
    USING (public.fn_is_admin())
    WITH CHECK (public.fn_is_admin());

CREATE OR REPLACE FUNCTION public.set_appointments_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_appointments_updated_at ON public.appointments;
CREATE TRIGGER trg_appointments_updated_at
    BEFORE UPDATE ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION public.set_appointments_updated_at();
