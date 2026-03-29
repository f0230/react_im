-- ============================================================
-- Finance refactor:
-- - explicit period snapshots
-- - company fund ledger
-- - worker compensation via work logs + seniority
-- - adjustment periods for late transactions
-- - immutability guards for closed periods
-- ============================================================

-- -----------------------------------------------
-- 1. Extend existing finance tables
-- -----------------------------------------------
ALTER TABLE public.finance_periods
    ADD COLUMN IF NOT EXISTS period_type TEXT;

UPDATE public.finance_periods
SET period_type = 'regular'
WHERE period_type IS NULL;

ALTER TABLE public.finance_periods
    ALTER COLUMN period_type SET DEFAULT 'regular',
    ALTER COLUMN period_type SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'finance_periods_period_type_check'
    ) THEN
        ALTER TABLE public.finance_periods
            ADD CONSTRAINT finance_periods_period_type_check
            CHECK (period_type IN ('regular', 'adjustment'));
    END IF;
END $$;

ALTER TABLE public.finance_periods
    ADD COLUMN IF NOT EXISTS parent_period_id UUID REFERENCES public.finance_periods(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_finance_periods_parent_period_id
    ON public.finance_periods(parent_period_id);

ALTER TABLE public.finance_transactions
    ADD COLUMN IF NOT EXISTS funding_source TEXT;

UPDATE public.finance_transactions
SET funding_source = 'external'
WHERE funding_source IS NULL;

ALTER TABLE public.finance_transactions
    ALTER COLUMN funding_source SET DEFAULT 'external',
    ALTER COLUMN funding_source SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'finance_transactions_funding_source_check'
    ) THEN
        ALTER TABLE public.finance_transactions
            ADD CONSTRAINT finance_transactions_funding_source_check
            CHECK (funding_source IN ('external', 'company_fund'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_finance_transactions_funding_source
    ON public.finance_transactions(funding_source);

-- -----------------------------------------------
-- 2. Snapshot, fund and worker compensation tables
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.finance_period_snapshots (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    period_id                   UUID NOT NULL UNIQUE REFERENCES public.finance_periods(id) ON DELETE CASCADE,
    total_income                NUMERIC(15,2) NOT NULL DEFAULT 0,
    total_expenses              NUMERIC(15,2) NOT NULL DEFAULT 0,
    net_profit                  NUMERIC(15,2) NOT NULL DEFAULT 0,
    admin_pool                  NUMERIC(15,2) NOT NULL DEFAULT 0,
    workers_pool                NUMERIC(15,2) NOT NULL DEFAULT 0,
    company_pool                NUMERIC(15,2) NOT NULL DEFAULT 0,
    company_fund_balance_before NUMERIC(15,2) NOT NULL DEFAULT 0,
    company_fund_balance_after  NUMERIC(15,2) NOT NULL DEFAULT 0,
    transaction_count           INTEGER NOT NULL DEFAULT 0,
    config_snapshot             JSONB NOT NULL DEFAULT '{}'::JSONB,
    notes                       TEXT,
    closed_by                   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    closed_at                   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_finance_period_snapshots_closed_at
    ON public.finance_period_snapshots(closed_at DESC);

CREATE TABLE IF NOT EXISTS public.finance_company_fund_movements (
    id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    period_id              UUID REFERENCES public.finance_periods(id) ON DELETE SET NULL,
    transaction_id         UUID UNIQUE REFERENCES public.finance_transactions(id) ON DELETE CASCADE,
    legacy_distribution_id UUID REFERENCES public.finance_distributions(id) ON DELETE SET NULL,
    movement_type          TEXT NOT NULL CHECK (movement_type IN ('credit', 'debit')),
    movement_source        TEXT NOT NULL CHECK (
        movement_source IN (
            'period_close',
            'expense_funding',
            'manual_adjustment',
            'legacy_backfill_credit',
            'legacy_backfill_debit'
        )
    ),
    amount                 NUMERIC(15,2) NOT NULL CHECK (amount > 0),
    currency               TEXT NOT NULL DEFAULT 'USD',
    movement_date          DATE NOT NULL DEFAULT CURRENT_DATE,
    description            TEXT,
    notes                  TEXT,
    created_by             UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at             TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (legacy_distribution_id, movement_source)
);

CREATE INDEX IF NOT EXISTS idx_finance_company_fund_movements_period
    ON public.finance_company_fund_movements(period_id);

CREATE INDEX IF NOT EXISTS idx_finance_company_fund_movements_date
    ON public.finance_company_fund_movements(movement_date DESC);

CREATE TABLE IF NOT EXISTS public.worker_task_types (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code        TEXT NOT NULL UNIQUE,
    name        TEXT NOT NULL,
    category    TEXT NOT NULL,
    base_points NUMERIC(8,2) NOT NULL CHECK (base_points > 0),
    description TEXT,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.worker_work_logs (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_id             UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    project_id            UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    period_id             UUID NOT NULL REFERENCES public.finance_periods(id) ON DELETE CASCADE,
    task_type_id          UUID NOT NULL REFERENCES public.worker_task_types(id) ON DELETE RESTRICT,
    task_code             TEXT,
    task_name             TEXT,
    task_description      TEXT NOT NULL,
    hours_spent           NUMERIC(7,2),
    quantity              NUMERIC(8,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
    points_override       NUMERIC(8,2),
    criticality_level     TEXT NOT NULL DEFAULT 'normal' CHECK (
        criticality_level IN ('normal', 'importante', 'critica', 'emergencia')
    ),
    status                TEXT NOT NULL DEFAULT 'approved' CHECK (
        status IN ('pending', 'approved', 'rejected')
    ),
    approved_by           UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    approved_at           TIMESTAMP WITH TIME ZONE,
    worked_date           DATE NOT NULL,
    base_points_snapshot  NUMERIC(8,2) NOT NULL DEFAULT 0,
    criticality_multiplier NUMERIC(5,2) NOT NULL DEFAULT 1,
    calculated_points     NUMERIC(10,2) NOT NULL DEFAULT 0,
    notes                 TEXT,
    created_by            UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_worker_work_logs_period
    ON public.worker_work_logs(period_id);

CREATE INDEX IF NOT EXISTS idx_worker_work_logs_worker
    ON public.worker_work_logs(worker_id);

CREATE INDEX IF NOT EXISTS idx_worker_work_logs_project
    ON public.worker_work_logs(project_id);

CREATE INDEX IF NOT EXISTS idx_worker_work_logs_worked_date
    ON public.worker_work_logs(worked_date DESC);

CREATE TABLE IF NOT EXISTS public.worker_seniority_snapshots (
    id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    period_id          UUID NOT NULL REFERENCES public.finance_periods(id) ON DELETE CASCADE,
    months_worked      INTEGER NOT NULL DEFAULT 0,
    seniority_tier     TEXT NOT NULL,
    multiplier_applied NUMERIC(5,2) NOT NULL,
    created_at         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (worker_id, period_id)
);

CREATE TABLE IF NOT EXISTS public.finance_worker_period_compensations (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    period_id           UUID NOT NULL REFERENCES public.finance_periods(id) ON DELETE CASCADE,
    worker_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    distribution_id     UUID REFERENCES public.finance_distributions(id) ON DELETE SET NULL,
    raw_points          NUMERIC(10,2) NOT NULL DEFAULT 0,
    weighted_points     NUMERIC(10,2) NOT NULL DEFAULT 0,
    share_percentage    NUMERIC(10,4) NOT NULL DEFAULT 0,
    workers_pool_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    amount_earned       NUMERIC(15,2) NOT NULL DEFAULT 0,
    hours_spent         NUMERIC(10,2),
    task_count          INTEGER NOT NULL DEFAULT 0,
    months_worked       INTEGER NOT NULL DEFAULT 0,
    seniority_tier      TEXT NOT NULL,
    multiplier_applied  NUMERIC(5,2) NOT NULL DEFAULT 1,
    calculation_breakdown JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (period_id, worker_id)
);

ALTER TABLE public.finance_distributions
    ADD COLUMN IF NOT EXISTS calculation_source TEXT,
    ADD COLUMN IF NOT EXISTS calculation_breakdown JSONB NOT NULL DEFAULT '{}'::JSONB,
    ADD COLUMN IF NOT EXISTS source_snapshot_id UUID REFERENCES public.finance_period_snapshots(id) ON DELETE SET NULL;

UPDATE public.finance_distributions
SET calculation_source = CASE
    WHEN recipient_type = 'company' THEN 'legacy_company_distribution'
    WHEN recipient_type = 'worker' THEN 'legacy_manual_weight'
    ELSE 'admin_percentage'
END
WHERE calculation_source IS NULL;

ALTER TABLE public.finance_distributions
    ALTER COLUMN calculation_source SET DEFAULT 'legacy_manual_weight',
    ALTER COLUMN calculation_source SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'finance_distributions_calculation_source_check'
    ) THEN
        ALTER TABLE public.finance_distributions
            ADD CONSTRAINT finance_distributions_calculation_source_check
            CHECK (
                calculation_source IN (
                    'admin_percentage',
                    'worker_points',
                    'legacy_manual_weight',
                    'legacy_company_distribution'
                )
            );
    END IF;
END $$;

-- -----------------------------------------------
-- 3. RLS for new tables
-- -----------------------------------------------
ALTER TABLE public.finance_period_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_company_fund_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_task_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_work_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_seniority_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_worker_period_compensations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'finance_period_snapshots'
          AND policyname = 'Admins can manage finance_period_snapshots'
    ) THEN
        CREATE POLICY "Admins can manage finance_period_snapshots"
        ON public.finance_period_snapshots FOR ALL
        TO authenticated
        USING (public.fn_is_admin())
        WITH CHECK (public.fn_is_admin());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'finance_company_fund_movements'
          AND policyname = 'Admins can manage finance_company_fund_movements'
    ) THEN
        CREATE POLICY "Admins can manage finance_company_fund_movements"
        ON public.finance_company_fund_movements FOR ALL
        TO authenticated
        USING (public.fn_is_admin())
        WITH CHECK (public.fn_is_admin());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'worker_task_types'
          AND policyname = 'Admins can manage worker_task_types'
    ) THEN
        CREATE POLICY "Admins can manage worker_task_types"
        ON public.worker_task_types FOR ALL
        TO authenticated
        USING (public.fn_is_admin())
        WITH CHECK (public.fn_is_admin());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'worker_task_types'
          AND policyname = 'Authenticated can view worker_task_types'
    ) THEN
        CREATE POLICY "Authenticated can view worker_task_types"
        ON public.worker_task_types FOR SELECT
        TO authenticated
        USING (TRUE);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'worker_work_logs'
          AND policyname = 'Admins can manage worker_work_logs'
    ) THEN
        CREATE POLICY "Admins can manage worker_work_logs"
        ON public.worker_work_logs FOR ALL
        TO authenticated
        USING (public.fn_is_admin())
        WITH CHECK (public.fn_is_admin());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'worker_seniority_snapshots'
          AND policyname = 'Admins can manage worker_seniority_snapshots'
    ) THEN
        CREATE POLICY "Admins can manage worker_seniority_snapshots"
        ON public.worker_seniority_snapshots FOR ALL
        TO authenticated
        USING (public.fn_is_admin())
        WITH CHECK (public.fn_is_admin());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'finance_worker_period_compensations'
          AND policyname = 'Admins can manage finance_worker_period_compensations'
    ) THEN
        CREATE POLICY "Admins can manage finance_worker_period_compensations"
        ON public.finance_worker_period_compensations FOR ALL
        TO authenticated
        USING (public.fn_is_admin())
        WITH CHECK (public.fn_is_admin());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'finance_worker_period_compensations'
          AND policyname = 'Workers can view their own finance_worker_period_compensations'
    ) THEN
        CREATE POLICY "Workers can view their own finance_worker_period_compensations"
        ON public.finance_worker_period_compensations FOR SELECT
        TO authenticated
        USING (worker_id = auth.uid());
    END IF;
END $$;

-- -----------------------------------------------
-- 4. Seed worker task catalog
-- -----------------------------------------------
INSERT INTO public.worker_task_types (code, name, category, base_points, description)
VALUES
    ('design_logo', 'Diseño de logo', 'diseno', 3, 'Diseño de identidad puntual'),
    ('design_ui_complete', 'Diseño UI completo', 'diseno', 10, 'Pantallas o sistemas visuales completos'),
    ('design_social_simple', 'Diseño para redes simple', 'diseno', 2, 'Pieza gráfica simple'),
    ('dev_landing_simple', 'Landing simple', 'dev', 5, 'Implementación de landing o página simple'),
    ('dev_feature_complex', 'Feature compleja', 'dev', 15, 'Desarrollo de funcionalidad compleja'),
    ('dev_bugfix', 'Bugfix', 'dev', 1, 'Corrección puntual'),
    ('dev_architecture', 'Arquitectura / refactor crítico', 'dev', 20, 'Trabajo de arquitectura o refactor estructural'),
    ('copy_blog', 'Contenido blog', 'contenido', 2, 'Artículo o pieza corta'),
    ('copy_website', 'Copy website', 'contenido', 5, 'Copy estructural para sitio'),
    ('brand_strategy', 'Estrategia de marca', 'contenido', 8, 'Investigación y estrategia'),
    ('video_edit_simple', 'Edición de video simple', 'video', 4, 'Edición corta o formato simple'),
    ('motion_complex', 'Motion complejo', 'video', 12, 'Animación o motion avanzado'),
    ('animation_3d', 'Animación 3D', 'video', 18, 'Producción 3D'),
    ('project_management', 'Project management', 'gestion', 8, 'Gestión operativa de proyecto'),
    ('client_meeting', 'Reunión con cliente', 'gestion', 2, 'Instancia operativa o comercial'),
    ('qa_testing', 'QA / Testing', 'gestion', 4, 'QA manual o validación')
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    base_points = EXCLUDED.base_points,
    description = EXCLUDED.description,
    is_active = TRUE;

-- -----------------------------------------------
-- 5. Helper functions
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION public.get_period_financial_totals(p_period_id UUID)
RETURNS TABLE (
    total_income NUMERIC,
    total_expenses NUMERIC,
    net_profit NUMERIC,
    transaction_count INTEGER
) AS $$
    SELECT
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0)::NUMERIC(15,2) AS total_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)::NUMERIC(15,2) AS total_expenses,
        (
            COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) -
            COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)
        )::NUMERIC(15,2) AS net_profit,
        COUNT(*)::INTEGER AS transaction_count
    FROM public.finance_transactions
    WHERE period_id = p_period_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_company_fund_balance(p_currency TEXT DEFAULT NULL)
RETURNS NUMERIC AS $$
    SELECT COALESCE(SUM(
        CASE WHEN movement_type = 'credit' THEN amount ELSE -amount END
    ), 0)::NUMERIC(15,2)
    FROM public.finance_company_fund_movements
    WHERE p_currency IS NULL OR currency = p_currency;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.resolve_finance_period_for_date(
    p_transaction_date DATE,
    p_created_by UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_open_period_id UUID;
    v_parent_period  public.finance_periods%ROWTYPE;
    v_month_start    DATE;
    v_month_end      DATE;
    v_period_name    TEXT;
    v_next_adjustment_number INTEGER;
BEGIN
    SELECT fp.id
    INTO v_open_period_id
    FROM public.finance_periods fp
    WHERE fp.start_date <= p_transaction_date
      AND fp.end_date >= p_transaction_date
      AND fp.status = 'open'
    ORDER BY
        CASE WHEN fp.period_type = 'adjustment' THEN 0 ELSE 1 END,
        fp.start_date DESC,
        fp.created_at DESC
    LIMIT 1;

    IF v_open_period_id IS NOT NULL THEN
        RETURN v_open_period_id;
    END IF;

    SELECT fp.*
    INTO v_parent_period
    FROM public.finance_periods fp
    WHERE fp.start_date <= p_transaction_date
      AND fp.end_date >= p_transaction_date
      AND fp.status = 'closed'
      AND fp.period_type = 'regular'
    ORDER BY fp.start_date DESC, fp.closed_at DESC NULLS LAST
    LIMIT 1;

    IF v_parent_period.id IS NULL THEN
        SELECT fp.*
        INTO v_parent_period
        FROM public.finance_periods fp
        WHERE fp.start_date <= p_transaction_date
          AND fp.end_date >= p_transaction_date
          AND fp.status = 'closed'
        ORDER BY fp.closed_at DESC NULLS LAST, fp.start_date DESC
        LIMIT 1;
    END IF;

    IF v_parent_period.id IS NOT NULL THEN
        SELECT COUNT(*) + 1
        INTO v_next_adjustment_number
        FROM public.finance_periods fp
        WHERE fp.parent_period_id = v_parent_period.id
          AND fp.period_type = 'adjustment';

        v_period_name := CASE
            WHEN v_next_adjustment_number = 1 THEN CONCAT('Ajuste ', v_parent_period.name)
            ELSE CONCAT('Ajuste ', v_parent_period.name, ' #', v_next_adjustment_number)
        END;

        INSERT INTO public.finance_periods (
            name,
            start_date,
            end_date,
            status,
            created_by,
            period_type,
            parent_period_id
        )
        VALUES (
            v_period_name,
            v_parent_period.start_date,
            v_parent_period.end_date,
            'open',
            COALESCE(p_created_by, auth.uid()),
            'adjustment',
            v_parent_period.id
        )
        RETURNING id INTO v_open_period_id;

        RETURN v_open_period_id;
    END IF;

    v_month_start := DATE_TRUNC('month', p_transaction_date)::DATE;
    v_month_end := (v_month_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
    v_period_name := INITCAP(TO_CHAR(v_month_start, 'TMMonth YYYY'));

    SELECT fp.id
    INTO v_open_period_id
    FROM public.finance_periods fp
    WHERE fp.start_date = v_month_start
      AND fp.end_date = v_month_end
      AND fp.period_type = 'regular'
      AND fp.status = 'open'
    ORDER BY fp.created_at DESC
    LIMIT 1;

    IF v_open_period_id IS NULL THEN
        INSERT INTO public.finance_periods (
            name,
            start_date,
            end_date,
            status,
            created_by,
            period_type,
            parent_period_id
        )
        VALUES (
            v_period_name,
            v_month_start,
            v_month_end,
            'open',
            COALESCE(p_created_by, auth.uid()),
            'regular',
            NULL
        )
        RETURNING id INTO v_open_period_id;
    END IF;

    RETURN v_open_period_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_worker_seniority(
    p_worker_id UUID,
    p_period_id UUID
) RETURNS TABLE (
    months_worked INTEGER,
    seniority_tier TEXT,
    multiplier_applied NUMERIC
) AS $$
DECLARE
    v_period_start DATE;
BEGIN
    SELECT start_date
    INTO v_period_start
    FROM public.finance_periods
    WHERE id = p_period_id;

    IF v_period_start IS NULL THEN
        RAISE EXCEPTION 'Period % does not exist', p_period_id;
    END IF;

    RETURN QUERY
    WITH worked_periods AS (
        SELECT DISTINCT period_id
        FROM public.finance_worker_period_compensations fwpc
        JOIN public.finance_periods fp ON fp.id = fwpc.period_id
        WHERE fwpc.worker_id = p_worker_id
          AND fp.status = 'closed'
          AND fp.start_date < v_period_start

        UNION

        SELECT DISTINCT period_id
        FROM public.finance_distributions fd
        JOIN public.finance_periods fp ON fp.id = fd.period_id
        WHERE fd.profile_id = p_worker_id
          AND fd.recipient_type = 'worker'
          AND fp.status = 'closed'
          AND fp.start_date < v_period_start

        UNION

        SELECT DISTINCT period_id
        FROM public.finance_worker_contributions fwc
        JOIN public.finance_periods fp ON fp.id = fwc.period_id
        WHERE fwc.worker_id = p_worker_id
          AND fwc.contribution_weight > 0
          AND fp.status = 'closed'
          AND fp.start_date < v_period_start
    ),
    counts AS (
        SELECT COUNT(*)::INTEGER AS worked_months
        FROM worked_periods
    )
    SELECT
        worked_months AS months_worked,
        CASE
            WHEN worked_months >= 24 THEN 'senior'
            WHEN worked_months >= 12 THEN 'semi-senior'
            WHEN worked_months >= 6 THEN 'junior'
            ELSE 'novato'
        END AS seniority_tier,
        CASE
            WHEN worked_months >= 24 THEN 2.0
            WHEN worked_months >= 12 THEN 1.5
            WHEN worked_months >= 6 THEN 1.2
            ELSE 1.0
        END::NUMERIC(5,2) AS multiplier_applied
    FROM counts;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_period_worker_compensation_preview(
    p_period_id UUID,
    p_workers_pool NUMERIC DEFAULT NULL
) RETURNS TABLE (
    worker_id UUID,
    raw_points NUMERIC,
    weighted_points NUMERIC,
    share_percentage NUMERIC,
    estimated_amount NUMERIC,
    task_count INTEGER,
    total_hours NUMERIC,
    months_worked INTEGER,
    seniority_tier TEXT,
    multiplier_applied NUMERIC,
    calculation_breakdown JSONB
) AS $$
DECLARE
    v_workers_pool NUMERIC(15,2);
BEGIN
    IF p_workers_pool IS NULL THEN
        SELECT CASE
            WHEN totals.net_profit > 0
                THEN ROUND(totals.net_profit * COALESCE(fc.pct_workers, 0) / 100, 2)
            ELSE 0
        END
        INTO v_workers_pool
        FROM public.get_period_financial_totals(p_period_id) totals
        CROSS JOIN public.finance_config fc
        LIMIT 1;
    ELSE
        v_workers_pool := COALESCE(p_workers_pool, 0);
    END IF;

    RETURN QUERY
    WITH work_summary AS (
        SELECT
            wwl.worker_id,
            ROUND(COALESCE(SUM(wwl.calculated_points), 0), 2) AS raw_points,
            ROUND(COALESCE(SUM(wwl.hours_spent), 0), 2) AS total_hours,
            COUNT(*)::INTEGER AS task_count,
            JSONB_AGG(
                JSONB_BUILD_OBJECT(
                    'id', wwl.id,
                    'project_id', wwl.project_id,
                    'task_type_id', wwl.task_type_id,
                    'task_code', wwl.task_code,
                    'task_name', wwl.task_name,
                    'task_description', wwl.task_description,
                    'quantity', wwl.quantity,
                    'criticality_level', wwl.criticality_level,
                    'calculated_points', wwl.calculated_points,
                    'worked_date', wwl.worked_date
                )
                ORDER BY wwl.worked_date, wwl.created_at
            ) AS logs_breakdown
        FROM public.worker_work_logs wwl
        WHERE wwl.period_id = p_period_id
          AND wwl.status = 'approved'
        GROUP BY wwl.worker_id
    ),
    weighted AS (
        SELECT
            ws.worker_id,
            ws.raw_points,
            ws.total_hours,
            ws.task_count,
            seniority.months_worked,
            seniority.seniority_tier,
            seniority.multiplier_applied,
            ROUND(ws.raw_points * seniority.multiplier_applied, 4) AS weighted_points,
            ws.logs_breakdown
        FROM work_summary ws
        CROSS JOIN LATERAL public.get_worker_seniority(ws.worker_id, p_period_id) seniority
    ),
    ranked AS (
        SELECT
            weighted.*,
            COALESCE(SUM(weighted.weighted_points) OVER (), 0) AS total_weighted_points
        FROM weighted
    )
    SELECT
        ranked.worker_id,
        ranked.raw_points,
        ranked.weighted_points,
        CASE
            WHEN ranked.total_weighted_points > 0
                THEN ROUND((ranked.weighted_points / ranked.total_weighted_points) * 100, 4)
            ELSE 0
        END AS share_percentage,
        CASE
            WHEN ranked.total_weighted_points > 0
                THEN ROUND(v_workers_pool * ranked.weighted_points / ranked.total_weighted_points, 2)
            ELSE 0
        END AS estimated_amount,
        ranked.task_count,
        ranked.total_hours,
        ranked.months_worked,
        ranked.seniority_tier,
        ranked.multiplier_applied,
        JSONB_BUILD_OBJECT(
            'raw_points', ranked.raw_points,
            'weighted_points', ranked.weighted_points,
            'months_worked', ranked.months_worked,
            'seniority_tier', ranked.seniority_tier,
            'multiplier_applied', ranked.multiplier_applied,
            'task_count', ranked.task_count,
            'total_hours', ranked.total_hours,
            'workers_pool', v_workers_pool,
            'logs', ranked.logs_breakdown
        ) AS calculation_breakdown
    FROM ranked
    ORDER BY ranked.weighted_points DESC, ranked.worker_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE VIEW public.finance_company_fund_summary AS
SELECT
    currency,
    COALESCE(SUM(CASE WHEN movement_type = 'credit' THEN amount ELSE -amount END), 0)::NUMERIC(15,2) AS current_balance,
    COALESCE(SUM(CASE WHEN movement_type = 'credit' THEN amount ELSE 0 END), 0)::NUMERIC(15,2) AS total_credited,
    COALESCE(SUM(CASE WHEN movement_type = 'debit' THEN amount ELSE 0 END), 0)::NUMERIC(15,2) AS total_debited,
    MAX(movement_date) AS last_movement_date
FROM public.finance_company_fund_movements
GROUP BY currency;

-- -----------------------------------------------
-- 6. Validation and sync triggers
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_worker_work_log_fields()
RETURNS TRIGGER AS $$
DECLARE
    v_task_type public.worker_task_types%ROWTYPE;
    v_period public.finance_periods%ROWTYPE;
BEGIN
    SELECT *
    INTO v_task_type
    FROM public.worker_task_types
    WHERE id = NEW.task_type_id;

    IF v_task_type.id IS NULL THEN
        RAISE EXCEPTION 'Task type % does not exist', NEW.task_type_id;
    END IF;

    SELECT *
    INTO v_period
    FROM public.finance_periods
    WHERE id = NEW.period_id;

    IF v_period.id IS NULL THEN
        RAISE EXCEPTION 'Period % does not exist', NEW.period_id;
    END IF;

    IF v_period.status <> 'open' THEN
        RAISE EXCEPTION 'No se pueden registrar o editar work logs en periodos cerrados.';
    END IF;

    IF NEW.worked_date < v_period.start_date OR NEW.worked_date > v_period.end_date THEN
        RAISE EXCEPTION 'La fecha del work log debe quedar dentro del periodo seleccionado.';
    END IF;

    NEW.task_code := v_task_type.code;
    NEW.task_name := v_task_type.name;
    NEW.base_points_snapshot := v_task_type.base_points;
    NEW.criticality_multiplier := CASE NEW.criticality_level
        WHEN 'importante' THEN 1.3
        WHEN 'critica' THEN 1.8
        WHEN 'emergencia' THEN 2.5
        ELSE 1.0
    END;
    NEW.calculated_points := ROUND(
        COALESCE(NEW.points_override, v_task_type.base_points) *
        NEW.criticality_multiplier *
        COALESCE(NEW.quantity, 1),
        2
    );

    IF NEW.status = 'approved' AND NEW.approved_at IS NULL THEN
        NEW.approved_at := NOW();
    ELSIF NEW.status <> 'approved' THEN
        NEW.approved_at := NULL;
    END IF;

    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.prevent_closed_period_work_log_delete()
RETURNS TRIGGER AS $$
DECLARE
    v_period_status TEXT;
BEGIN
    SELECT status
    INTO v_period_status
    FROM public.finance_periods
    WHERE id = OLD.period_id;

    IF v_period_status = 'closed' THEN
        RAISE EXCEPTION 'No se pueden borrar work logs de periodos cerrados.';
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_sync_worker_work_log_fields ON public.worker_work_logs;
CREATE TRIGGER trg_sync_worker_work_log_fields
BEFORE INSERT OR UPDATE ON public.worker_work_logs
FOR EACH ROW
EXECUTE FUNCTION public.sync_worker_work_log_fields();

DROP TRIGGER IF EXISTS update_worker_work_logs_updated_at ON public.worker_work_logs;
CREATE TRIGGER update_worker_work_logs_updated_at
    BEFORE UPDATE ON public.worker_work_logs
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS trg_prevent_closed_period_work_log_delete ON public.worker_work_logs;
CREATE TRIGGER trg_prevent_closed_period_work_log_delete
BEFORE DELETE ON public.worker_work_logs
FOR EACH ROW
EXECUTE FUNCTION public.prevent_closed_period_work_log_delete();

CREATE OR REPLACE FUNCTION public.auto_assign_period_on_transaction()
RETURNS TRIGGER AS $$
DECLARE
    v_period public.finance_periods%ROWTYPE;
BEGIN
    IF NEW.type <> 'expense' THEN
        NEW.funding_source := 'external';
    END IF;

    IF NEW.period_id IS NOT NULL THEN
        SELECT *
        INTO v_period
        FROM public.finance_periods
        WHERE id = NEW.period_id;

        IF v_period.id IS NULL THEN
            RAISE EXCEPTION 'El periodo seleccionado no existe.';
        END IF;

        IF v_period.status <> 'open' THEN
            RAISE EXCEPTION 'No se pueden asociar movimientos a periodos cerrados. Registralo en un periodo de ajuste.';
        END IF;

        IF NEW.transaction_date < v_period.start_date OR NEW.transaction_date > v_period.end_date THEN
            RAISE EXCEPTION 'La fecha del movimiento no entra en el periodo seleccionado.';
        END IF;

        RETURN NEW;
    END IF;

    NEW.period_id := public.resolve_finance_period_for_date(
        NEW.transaction_date,
        COALESCE(NEW.created_by, auth.uid())
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.prevent_closed_period_transaction_mutation()
RETURNS TRIGGER AS $$
DECLARE
    v_period_name TEXT;
BEGIN
    SELECT name
    INTO v_period_name
    FROM public.finance_periods
    WHERE id = OLD.period_id
      AND status = 'closed';

    IF v_period_name IS NOT NULL THEN
        RAISE EXCEPTION 'No se pueden modificar movimientos del periodo cerrado "%". Registrá un ajuste en un periodo abierto.', v_period_name;
    END IF;

    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.validate_company_fund_transaction()
RETURNS TRIGGER AS $$
DECLARE
    v_default_currency TEXT;
    v_available_balance NUMERIC(15,2);
    v_current_amount NUMERIC(15,2);
BEGIN
    IF NEW.funding_source <> 'company_fund' THEN
        RETURN NEW;
    END IF;

    IF NEW.type <> 'expense' THEN
        RAISE EXCEPTION 'Solo los gastos pueden consumirse desde el fondo empresa.';
    END IF;

    SELECT default_currency
    INTO v_default_currency
    FROM public.finance_config
    LIMIT 1;

    IF v_default_currency IS NOT NULL AND NEW.currency <> v_default_currency THEN
        RAISE EXCEPTION 'El fondo empresa solo admite movimientos en %.', v_default_currency;
    END IF;

    SELECT COALESCE(amount, 0)
    INTO v_current_amount
    FROM public.finance_company_fund_movements
    WHERE transaction_id = NEW.id;

    v_available_balance := public.get_company_fund_balance(NEW.currency) + COALESCE(v_current_amount, 0);

    IF v_available_balance < NEW.amount THEN
        RAISE EXCEPTION 'Saldo insuficiente en el fondo empresa. Disponible: % %.', v_available_balance, NEW.currency;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.sync_company_fund_movement_for_transaction()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        DELETE FROM public.finance_company_fund_movements
        WHERE transaction_id = OLD.id;
        RETURN OLD;
    END IF;

    IF NEW.type = 'expense' AND NEW.funding_source = 'company_fund' THEN
        INSERT INTO public.finance_company_fund_movements (
            period_id,
            transaction_id,
            movement_type,
            movement_source,
            amount,
            currency,
            movement_date,
            description,
            notes,
            created_by
        )
        VALUES (
            NEW.period_id,
            NEW.id,
            'debit',
            'expense_funding',
            NEW.amount,
            NEW.currency,
            NEW.transaction_date,
            COALESCE(NEW.description, 'Consumo de fondo empresa'),
            COALESCE(NEW.notes, 'Gasto operativo cubierto con fondo empresa.'),
            COALESCE(NEW.created_by, auth.uid())
        )
        ON CONFLICT (transaction_id) DO UPDATE SET
            period_id = EXCLUDED.period_id,
            amount = EXCLUDED.amount,
            currency = EXCLUDED.currency,
            movement_date = EXCLUDED.movement_date,
            description = EXCLUDED.description,
            notes = EXCLUDED.notes,
            created_by = EXCLUDED.created_by;
    ELSE
        DELETE FROM public.finance_company_fund_movements
        WHERE transaction_id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_auto_assign_period ON public.finance_transactions;
CREATE TRIGGER trg_auto_assign_period
BEFORE INSERT OR UPDATE OF transaction_date, period_id, type, funding_source
ON public.finance_transactions
FOR EACH ROW
EXECUTE FUNCTION public.auto_assign_period_on_transaction();

DROP TRIGGER IF EXISTS trg_prevent_closed_period_transaction_update ON public.finance_transactions;
CREATE TRIGGER trg_prevent_closed_period_transaction_update
BEFORE UPDATE OR DELETE ON public.finance_transactions
FOR EACH ROW
EXECUTE FUNCTION public.prevent_closed_period_transaction_mutation();

DROP TRIGGER IF EXISTS trg_validate_company_fund_transaction ON public.finance_transactions;
CREATE TRIGGER trg_validate_company_fund_transaction
BEFORE INSERT OR UPDATE OF amount, currency, funding_source, type
ON public.finance_transactions
FOR EACH ROW
EXECUTE FUNCTION public.validate_company_fund_transaction();

DROP TRIGGER IF EXISTS trg_sync_company_fund_movement_for_transaction ON public.finance_transactions;
CREATE TRIGGER trg_sync_company_fund_movement_for_transaction
AFTER INSERT OR UPDATE OR DELETE ON public.finance_transactions
FOR EACH ROW
EXECUTE FUNCTION public.sync_company_fund_movement_for_transaction();

CREATE OR REPLACE FUNCTION public.sync_paid_invoice_to_finance()
RETURNS TRIGGER AS $$
DECLARE
    v_transaction_date DATE;
    v_period_id UUID;
    v_description TEXT;
    v_existing_period_name TEXT;
BEGIN
    v_transaction_date := COALESCE(NEW.paid_at, NEW.updated_at, NEW.created_at)::DATE;

    SELECT fp.name
    INTO v_existing_period_name
    FROM public.finance_transactions ft
    JOIN public.finance_periods fp ON fp.id = ft.period_id
    WHERE ft.invoice_id = NEW.id
      AND ft.source = 'invoice_auto'
      AND fp.status = 'closed'
    LIMIT 1;

    IF v_existing_period_name IS NOT NULL THEN
        IF NEW.status <> 'paid' THEN
            RAISE EXCEPTION 'La factura % ya impactó el periodo cerrado "%". Registrá un ajuste financiero en lugar de revertirla.', NEW.invoice_number, v_existing_period_name;
        END IF;

        IF TG_OP = 'UPDATE' AND (
            NEW.amount IS DISTINCT FROM OLD.amount OR
            NEW.currency IS DISTINCT FROM OLD.currency OR
            NEW.project_id IS DISTINCT FROM OLD.project_id OR
            NEW.description IS DISTINCT FROM OLD.description OR
            NEW.paid_at IS DISTINCT FROM OLD.paid_at
        ) THEN
            RAISE EXCEPTION 'La factura % ya impactó el periodo cerrado "%". Registrá un ajuste financiero en lugar de editar su cobro.', NEW.invoice_number, v_existing_period_name;
        END IF;

        RETURN NEW;
    END IF;

    IF NEW.status <> 'paid' THEN
        DELETE FROM public.finance_transactions
        WHERE invoice_id = NEW.id
          AND source = 'invoice_auto';

        RETURN NEW;
    END IF;

    v_period_id := public.resolve_finance_period_for_date(v_transaction_date, auth.uid());

    v_description := CASE
        WHEN COALESCE(TRIM(NEW.description), '') <> '' THEN
            CONCAT('Cobro factura ', NEW.invoice_number, ' - ', TRIM(NEW.description))
        ELSE
            CONCAT('Cobro factura ', NEW.invoice_number)
    END;

    INSERT INTO public.finance_transactions (
        type,
        amount,
        currency,
        description,
        category,
        transaction_date,
        project_id,
        invoice_id,
        period_id,
        funding_source,
        notes,
        created_by,
        source
    )
    VALUES (
        'income',
        NEW.amount,
        NEW.currency,
        v_description,
        'client_payment',
        v_transaction_date,
        NEW.project_id,
        NEW.id,
        v_period_id,
        'external',
        'Ingreso sincronizado automaticamente desde facturacion.',
        auth.uid(),
        'invoice_auto'
    )
    ON CONFLICT (invoice_id) DO UPDATE SET
        type = EXCLUDED.type,
        amount = EXCLUDED.amount,
        currency = EXCLUDED.currency,
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        transaction_date = EXCLUDED.transaction_date,
        project_id = EXCLUDED.project_id,
        period_id = EXCLUDED.period_id,
        funding_source = 'external',
        notes = EXCLUDED.notes,
        source = 'invoice_auto',
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_sync_paid_invoice_to_finance ON public.invoices;
CREATE TRIGGER trg_sync_paid_invoice_to_finance
AFTER INSERT OR UPDATE OF status, amount, currency, description, project_id, paid_at
ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.sync_paid_invoice_to_finance();

CREATE OR REPLACE FUNCTION public.delete_synced_invoice_finance_transaction()
RETURNS TRIGGER AS $$
DECLARE
    v_existing_period_name TEXT;
BEGIN
    SELECT fp.name
    INTO v_existing_period_name
    FROM public.finance_transactions ft
    JOIN public.finance_periods fp ON fp.id = ft.period_id
    WHERE ft.invoice_id = OLD.id
      AND ft.source = 'invoice_auto'
      AND fp.status = 'closed'
    LIMIT 1;

    IF v_existing_period_name IS NOT NULL THEN
        RAISE EXCEPTION 'La factura % no puede eliminarse porque ya impactó el periodo cerrado "%".', OLD.invoice_number, v_existing_period_name;
    END IF;

    DELETE FROM public.finance_transactions
    WHERE invoice_id = OLD.id
      AND source = 'invoice_auto';

    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_delete_synced_invoice_finance_transaction ON public.invoices;
CREATE TRIGGER trg_delete_synced_invoice_finance_transaction
AFTER DELETE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.delete_synced_invoice_finance_transaction();

-- -----------------------------------------------
-- 7. close_period() rewritten around snapshots + fund ledger
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION public.close_period(p_period_id UUID)
RETURNS void AS $$
DECLARE
    v_period                     public.finance_periods%ROWTYPE;
    v_total_income               NUMERIC(15,2);
    v_total_expenses             NUMERIC(15,2);
    v_net_profit                 NUMERIC(15,2);
    v_transaction_count          INTEGER;
    v_config                     public.finance_config%ROWTYPE;
    v_francisco_amount           NUMERIC(15,2);
    v_federico_amount            NUMERIC(15,2);
    v_workers_pool               NUMERIC(15,2);
    v_company_pool               NUMERIC(15,2);
    v_company_fund_before        NUMERIC(15,2);
    v_company_fund_after         NUMERIC(15,2);
    v_snapshot_id                UUID;
    v_distribution_id            UUID;
    v_allocated_workers          NUMERIC(15,2) := 0;
    v_worker_amount              NUMERIC(15,2);
    v_worker_preview             RECORD;
BEGIN
    IF NOT public.fn_is_admin() THEN
        RAISE EXCEPTION 'Only admins can close periods';
    END IF;

    SELECT *
    INTO v_period
    FROM public.finance_periods
    WHERE id = p_period_id
    FOR UPDATE;

    IF v_period.id IS NULL OR v_period.status <> 'open' THEN
        RAISE EXCEPTION 'Period % does not exist or is already closed', p_period_id;
    END IF;

    SELECT *
    INTO v_config
    FROM public.finance_config
    LIMIT 1;

    IF v_config.id IS NULL THEN
        RAISE EXCEPTION 'Finance configuration is missing';
    END IF;

    IF COALESCE(v_config.pct_francisco, 0) > 0 AND v_config.francisco_profile_id IS NULL THEN
        RAISE EXCEPTION 'Definí el perfil de Francisco antes de cerrar el periodo.';
    END IF;

    IF COALESCE(v_config.pct_federico, 0) > 0 AND v_config.federico_profile_id IS NULL THEN
        RAISE EXCEPTION 'Definí el perfil de Federico antes de cerrar el periodo.';
    END IF;

    SELECT
        totals.total_income,
        totals.total_expenses,
        totals.net_profit,
        totals.transaction_count
    INTO
        v_total_income,
        v_total_expenses,
        v_net_profit,
        v_transaction_count
    FROM public.get_period_financial_totals(p_period_id) totals;

    v_francisco_amount := CASE
        WHEN v_net_profit > 0 THEN ROUND(v_net_profit * COALESCE(v_config.pct_francisco, 0) / 100, 2)
        ELSE 0
    END;
    v_federico_amount := CASE
        WHEN v_net_profit > 0 THEN ROUND(v_net_profit * COALESCE(v_config.pct_federico, 0) / 100, 2)
        ELSE 0
    END;
    v_workers_pool := CASE
        WHEN v_net_profit > 0 THEN ROUND(v_net_profit * COALESCE(v_config.pct_workers, 0) / 100, 2)
        ELSE 0
    END;
    v_company_pool := CASE
        WHEN v_net_profit > 0 THEN ROUND(v_net_profit - v_francisco_amount - v_federico_amount - v_workers_pool, 2)
        ELSE 0
    END;

    IF v_workers_pool > 0 AND NOT EXISTS (
        SELECT 1
        FROM public.get_period_worker_compensation_preview(p_period_id, v_workers_pool)
    ) THEN
        RAISE EXCEPTION 'No se puede cerrar el periodo sin work logs aprobados para repartir el pool workers.';
    END IF;

    v_company_fund_before := public.get_company_fund_balance(v_config.default_currency);
    v_company_fund_after := v_company_fund_before + v_company_pool;

    UPDATE public.finance_periods
    SET
        total_income = v_total_income,
        total_expenses = v_total_expenses,
        net_profit = v_net_profit,
        status = 'closed',
        closed_at = NOW()
    WHERE id = p_period_id;

    INSERT INTO public.finance_period_snapshots (
        period_id,
        total_income,
        total_expenses,
        net_profit,
        admin_pool,
        workers_pool,
        company_pool,
        company_fund_balance_before,
        company_fund_balance_after,
        transaction_count,
        config_snapshot,
        closed_by,
        closed_at,
        notes
    )
    VALUES (
        p_period_id,
        v_total_income,
        v_total_expenses,
        v_net_profit,
        v_francisco_amount + v_federico_amount,
        v_workers_pool,
        v_company_pool,
        v_company_fund_before,
        v_company_fund_after,
        COALESCE(v_transaction_count, 0),
        JSONB_BUILD_OBJECT(
            'pct_francisco', v_config.pct_francisco,
            'pct_federico', v_config.pct_federico,
            'pct_workers', v_config.pct_workers,
            'pct_company', v_config.pct_company,
            'default_currency', v_config.default_currency,
            'francisco_profile_id', v_config.francisco_profile_id,
            'federico_profile_id', v_config.federico_profile_id
        ),
        auth.uid(),
        NOW(),
        CASE
            WHEN v_period.period_type = 'adjustment'
                THEN 'Cierre de periodo de ajuste generado automáticamente para movimientos tardíos.'
            ELSE NULL
        END
    )
    ON CONFLICT (period_id) DO UPDATE SET
        total_income = EXCLUDED.total_income,
        total_expenses = EXCLUDED.total_expenses,
        net_profit = EXCLUDED.net_profit,
        admin_pool = EXCLUDED.admin_pool,
        workers_pool = EXCLUDED.workers_pool,
        company_pool = EXCLUDED.company_pool,
        company_fund_balance_before = EXCLUDED.company_fund_balance_before,
        company_fund_balance_after = EXCLUDED.company_fund_balance_after,
        transaction_count = EXCLUDED.transaction_count,
        config_snapshot = EXCLUDED.config_snapshot,
        closed_by = EXCLUDED.closed_by,
        closed_at = EXCLUDED.closed_at,
        notes = EXCLUDED.notes
    RETURNING id INTO v_snapshot_id;

    DELETE FROM public.finance_worker_period_compensations
    WHERE period_id = p_period_id;

    DELETE FROM public.worker_seniority_snapshots
    WHERE period_id = p_period_id;

    DELETE FROM public.finance_distributions
    WHERE period_id = p_period_id
      AND recipient_type IN ('admin', 'worker');

    DELETE FROM public.finance_company_fund_movements
    WHERE period_id = p_period_id
      AND movement_source = 'period_close';

    IF v_company_pool > 0 THEN
        INSERT INTO public.finance_company_fund_movements (
            period_id,
            movement_type,
            movement_source,
            amount,
            currency,
            movement_date,
            description,
            notes,
            created_by
        )
        VALUES (
            p_period_id,
            'credit',
            'period_close',
            v_company_pool,
            v_config.default_currency,
            COALESCE(v_period.closed_at::DATE, CURRENT_DATE),
            CONCAT('Acreditación fondo empresa - ', v_period.name),
            'Crédito generado al cerrar el periodo.',
            auth.uid()
        );
    END IF;

    IF v_francisco_amount > 0 THEN
        INSERT INTO public.finance_distributions (
            period_id,
            profile_id,
            recipient_type,
            amount_earned,
            currency,
            calculation_source,
            calculation_breakdown,
            source_snapshot_id
        )
        VALUES (
            p_period_id,
            v_config.francisco_profile_id,
            'admin',
            v_francisco_amount,
            v_config.default_currency,
            'admin_percentage',
            JSONB_BUILD_OBJECT(
                'percentage', v_config.pct_francisco,
                'net_profit', v_net_profit,
                'role', 'francisco'
            ),
            v_snapshot_id
        );
    END IF;

    IF v_federico_amount > 0 THEN
        INSERT INTO public.finance_distributions (
            period_id,
            profile_id,
            recipient_type,
            amount_earned,
            currency,
            calculation_source,
            calculation_breakdown,
            source_snapshot_id
        )
        VALUES (
            p_period_id,
            v_config.federico_profile_id,
            'admin',
            v_federico_amount,
            v_config.default_currency,
            'admin_percentage',
            JSONB_BUILD_OBJECT(
                'percentage', v_config.pct_federico,
                'net_profit', v_net_profit,
                'role', 'federico'
            ),
            v_snapshot_id
        );
    END IF;

    FOR v_worker_preview IN
        SELECT
            preview.*,
            ROW_NUMBER() OVER (ORDER BY preview.weighted_points DESC, preview.worker_id) AS row_num,
            COUNT(*) OVER () AS total_rows
        FROM public.get_period_worker_compensation_preview(p_period_id, v_workers_pool) preview
    LOOP
        INSERT INTO public.worker_seniority_snapshots (
            worker_id,
            period_id,
            months_worked,
            seniority_tier,
            multiplier_applied
        )
        VALUES (
            v_worker_preview.worker_id,
            p_period_id,
            v_worker_preview.months_worked,
            v_worker_preview.seniority_tier,
            v_worker_preview.multiplier_applied
        );

        IF v_worker_preview.total_rows = v_worker_preview.row_num THEN
            v_worker_amount := ROUND(v_workers_pool - v_allocated_workers, 2);
        ELSE
            v_worker_amount := ROUND(v_workers_pool * v_worker_preview.share_percentage / 100, 2);
            v_allocated_workers := v_allocated_workers + v_worker_amount;
        END IF;

        INSERT INTO public.finance_distributions (
            period_id,
            profile_id,
            recipient_type,
            amount_earned,
            currency,
            calculation_source,
            calculation_breakdown,
            source_snapshot_id
        )
        VALUES (
            p_period_id,
            v_worker_preview.worker_id,
            'worker',
            GREATEST(v_worker_amount, 0),
            v_config.default_currency,
            'worker_points',
            v_worker_preview.calculation_breakdown || JSONB_BUILD_OBJECT(
                'share_percentage', v_worker_preview.share_percentage,
                'final_amount_earned', GREATEST(v_worker_amount, 0)
            ),
            v_snapshot_id
        )
        RETURNING id INTO v_distribution_id;

        INSERT INTO public.finance_worker_period_compensations (
            period_id,
            worker_id,
            distribution_id,
            raw_points,
            weighted_points,
            share_percentage,
            workers_pool_amount,
            amount_earned,
            hours_spent,
            task_count,
            months_worked,
            seniority_tier,
            multiplier_applied,
            calculation_breakdown
        )
        VALUES (
            p_period_id,
            v_worker_preview.worker_id,
            v_distribution_id,
            v_worker_preview.raw_points,
            v_worker_preview.weighted_points,
            v_worker_preview.share_percentage,
            v_workers_pool,
            GREATEST(v_worker_amount, 0),
            v_worker_preview.total_hours,
            v_worker_preview.task_count,
            v_worker_preview.months_worked,
            v_worker_preview.seniority_tier,
            v_worker_preview.multiplier_applied,
            v_worker_preview.calculation_breakdown || JSONB_BUILD_OBJECT(
                'share_percentage', v_worker_preview.share_percentage,
                'final_amount_earned', GREATEST(v_worker_amount, 0)
            )
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- -----------------------------------------------
-- 8. Backfill legacy fund and snapshot data
-- -----------------------------------------------
INSERT INTO public.finance_company_fund_movements (
    period_id,
    legacy_distribution_id,
    movement_type,
    movement_source,
    amount,
    currency,
    movement_date,
    description,
    notes,
    created_by
)
SELECT
    fd.period_id,
    fd.id,
    'credit',
    'legacy_backfill_credit',
    fd.amount_earned,
    fd.currency,
    COALESCE(fp.closed_at::DATE, fd.created_at::DATE),
    CONCAT('Backfill legacy fondo empresa - ', fp.name),
    'Crédito migrado desde finance_distributions.recipient_type = company',
    fd.paid_by
FROM public.finance_distributions fd
LEFT JOIN public.finance_periods fp ON fp.id = fd.period_id
WHERE fd.recipient_type = 'company'
  AND fd.amount_earned > 0
ON CONFLICT (legacy_distribution_id, movement_source) DO NOTHING;

INSERT INTO public.finance_company_fund_movements (
    period_id,
    legacy_distribution_id,
    movement_type,
    movement_source,
    amount,
    currency,
    movement_date,
    description,
    notes,
    created_by
)
SELECT
    fd.period_id,
    fd.id,
    'debit',
    'legacy_backfill_debit',
    fd.amount_paid,
    fd.currency,
    COALESCE(fd.paid_at::DATE, fd.created_at::DATE),
    CONCAT('Backfill legacy consumo fondo empresa - ', fp.name),
    'Consumo migrado desde amount_paid de la distribución legacy de empresa',
    fd.paid_by
FROM public.finance_distributions fd
LEFT JOIN public.finance_periods fp ON fp.id = fd.period_id
WHERE fd.recipient_type = 'company'
  AND fd.amount_paid > 0
ON CONFLICT (legacy_distribution_id, movement_source) DO NOTHING;

INSERT INTO public.finance_period_snapshots (
    period_id,
    total_income,
    total_expenses,
    net_profit,
    admin_pool,
    workers_pool,
    company_pool,
    company_fund_balance_before,
    company_fund_balance_after,
    transaction_count,
    config_snapshot,
    notes,
    closed_by,
    closed_at
)
SELECT
    fp.id,
    COALESCE(fp.total_income, 0),
    COALESCE(fp.total_expenses, 0),
    COALESCE(fp.net_profit, 0),
    COALESCE((
        SELECT SUM(fd.amount_earned)
        FROM public.finance_distributions fd
        WHERE fd.period_id = fp.id
          AND fd.recipient_type = 'admin'
    ), 0),
    COALESCE((
        SELECT SUM(fd.amount_earned)
        FROM public.finance_distributions fd
        WHERE fd.period_id = fp.id
          AND fd.recipient_type = 'worker'
    ), 0),
    COALESCE((
        SELECT SUM(fd.amount_earned)
        FROM public.finance_distributions fd
        WHERE fd.period_id = fp.id
          AND fd.recipient_type = 'company'
    ), 0),
    0,
    COALESCE((
        SELECT SUM(fd.amount_pending)
        FROM public.finance_distributions fd
        WHERE fd.period_id = fp.id
          AND fd.recipient_type = 'company'
    ), 0),
    (
        SELECT COUNT(*)::INTEGER
        FROM public.finance_transactions ft
        WHERE ft.period_id = fp.id
    ),
    JSONB_BUILD_OBJECT('legacy_backfill', TRUE),
    'Snapshot backfilled desde la estructura anterior. Los balances before/after del fondo pueden ser aproximados.',
    fp.created_by,
    COALESCE(fp.closed_at, fp.created_at)
FROM public.finance_periods fp
WHERE fp.status = 'closed'
  AND NOT EXISTS (
      SELECT 1
      FROM public.finance_period_snapshots fps
      WHERE fps.period_id = fp.id
  );

UPDATE public.finance_distributions fd
SET source_snapshot_id = fps.id
FROM public.finance_period_snapshots fps
WHERE fd.period_id = fps.period_id
  AND fd.source_snapshot_id IS NULL;

-- Align open invoice_auto transactions with paid_at-based accounting date.
UPDATE public.finance_transactions ft
SET
    transaction_date = COALESCE(i.paid_at, i.updated_at, i.created_at)::DATE,
    period_id = public.resolve_finance_period_for_date(
        COALESCE(i.paid_at, i.updated_at, i.created_at)::DATE,
        ft.created_by
    ),
    updated_at = NOW()
FROM public.invoices i
WHERE ft.invoice_id = i.id
  AND ft.source = 'invoice_auto'
  AND (
      ft.period_id IS NULL
      OR EXISTS (
          SELECT 1
          FROM public.finance_periods fp
          WHERE fp.id = ft.period_id
            AND fp.status = 'open'
      )
  )
  AND COALESCE(i.paid_at, i.updated_at, i.created_at)::DATE IS NOT NULL
  AND (
      ft.transaction_date IS DISTINCT FROM COALESCE(i.paid_at, i.updated_at, i.created_at)::DATE
      OR ft.period_id IS NULL
  );
