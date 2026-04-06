-- ============================================================
-- Prevent duplicate founder profile assignments from breaking
-- finance period closure distributions.
-- ============================================================

ALTER TABLE public.finance_config
    DROP CONSTRAINT IF EXISTS finance_config_distinct_founder_profiles_check;

ALTER TABLE public.finance_config
    ADD CONSTRAINT finance_config_distinct_founder_profiles_check
    CHECK (
        francisco_profile_id IS NULL
        OR federico_profile_id IS NULL
        OR francisco_profile_id <> federico_profile_id
    ) NOT VALID;

DO $$
BEGIN
    IF to_regprocedure('public.close_period(uuid)') IS NOT NULL
       AND to_regprocedure('public.close_period_impl(uuid)') IS NULL
    THEN
        EXECUTE 'ALTER FUNCTION public.close_period(UUID) RENAME TO close_period_impl';
    END IF;
END $$;

CREATE OR REPLACE FUNCTION public.close_period(p_period_id UUID)
RETURNS void AS $$
DECLARE
    v_config public.finance_config%ROWTYPE;
BEGIN
    IF NOT public.fn_is_admin() THEN
        RAISE EXCEPTION 'Only admins can close periods';
    END IF;

    SELECT *
    INTO v_config
    FROM public.finance_config
    LIMIT 1;

    IF v_config.id IS NULL THEN
        RAISE EXCEPTION 'Finance configuration is missing';
    END IF;

    IF v_config.francisco_profile_id IS NOT NULL
       AND v_config.federico_profile_id IS NOT NULL
       AND v_config.francisco_profile_id = v_config.federico_profile_id
    THEN
        RAISE EXCEPTION 'Francisco y Federico deben estar asignados a perfiles distintos antes de cerrar el período.';
    END IF;

    IF to_regprocedure('public.close_period_impl(uuid)') IS NULL THEN
        RAISE EXCEPTION 'close_period_impl(uuid) is missing';
    END IF;

    PERFORM public.close_period_impl(p_period_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
