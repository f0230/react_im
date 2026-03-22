CREATE TABLE IF NOT EXISTS public.briefs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    cal_booking_uid VARCHAR(255),

    etapa TEXT,
    objetivo_principal TEXT,
    servicio_interes TEXT,
    facturacion_mensual TEXT,
    canal_principal TEXT,
    activos_digitales TEXT,
    presupuesto TEXT,
    urgencia TEXT,

    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para búsqueda y match con appointments
CREATE INDEX IF NOT EXISTS idx_briefs_cal_booking_uid ON public.briefs(cal_booking_uid);
CREATE INDEX IF NOT EXISTS idx_briefs_appointment_id ON public.briefs(appointment_id);
CREATE INDEX IF NOT EXISTS idx_briefs_completed_at ON public.briefs(completed_at);

-- Auto-match: si llega un brief con cal_booking_uid, vincular al appointment
CREATE OR REPLACE FUNCTION public.fn_briefs_match_appointment()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.cal_booking_uid IS NOT NULL AND NEW.appointment_id IS NULL THEN
        SELECT id INTO NEW.appointment_id
        FROM public.appointments
        WHERE cal_booking_uid = NEW.cal_booking_uid
        LIMIT 1;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_briefs_match_appointment ON public.briefs;
CREATE TRIGGER trg_briefs_match_appointment
    BEFORE INSERT ON public.briefs
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_briefs_match_appointment();

-- updated_at automático
CREATE OR REPLACE FUNCTION public.set_briefs_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_briefs_updated_at ON public.briefs;
CREATE TRIGGER trg_briefs_updated_at
    BEFORE UPDATE ON public.briefs
    FOR EACH ROW
    EXECUTE FUNCTION public.set_briefs_updated_at();

-- RLS: anónimos pueden insertar (formulario público), admins pueden todo
ALTER TABLE public.briefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert briefs" ON public.briefs
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "Admins can manage briefs" ON public.briefs
    FOR ALL TO authenticated
    USING (public.fn_is_admin())
    WITH CHECK (public.fn_is_admin());
