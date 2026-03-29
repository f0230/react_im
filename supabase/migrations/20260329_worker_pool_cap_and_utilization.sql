-- ============================================================
-- Worker pool cap unlocked by weighted points
-- ============================================================
-- Turns pct_workers into a maximum pool, not an automatic full payout.
-- The earned portion depends on absolute weighted points reached in the period.
-- Any unearned remainder flows back into the company fund credit.
-- ============================================================

ALTER TABLE public.finance_config
    ADD COLUMN IF NOT EXISTS workers_target_weighted_points NUMERIC(12,2);

UPDATE public.finance_config
SET workers_target_weighted_points = 100
WHERE workers_target_weighted_points IS NULL
   OR workers_target_weighted_points <= 0;

ALTER TABLE public.finance_config
    ALTER COLUMN workers_target_weighted_points SET DEFAULT 100,
    ALTER COLUMN workers_target_weighted_points SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'finance_config_workers_target_weighted_points_check'
    ) THEN
        ALTER TABLE public.finance_config
            ADD CONSTRAINT finance_config_workers_target_weighted_points_check
            CHECK (workers_target_weighted_points > 0);
    END IF;
END $$;

ALTER TABLE public.finance_period_snapshots
    ADD COLUMN IF NOT EXISTS workers_pool_cap NUMERIC(15,2),
    ADD COLUMN IF NOT EXISTS workers_pool_earned NUMERIC(15,2),
    ADD COLUMN IF NOT EXISTS workers_pool_unallocated NUMERIC(15,2),
    ADD COLUMN IF NOT EXISTS workers_total_weighted_points NUMERIC(15,4),
    ADD COLUMN IF NOT EXISTS workers_target_weighted_points NUMERIC(12,2),
    ADD COLUMN IF NOT EXISTS workers_pool_utilization_ratio NUMERIC(10,4),
    ADD COLUMN IF NOT EXISTS company_pool_base NUMERIC(15,2),
    ADD COLUMN IF NOT EXISTS company_pool_from_workers NUMERIC(15,2);

UPDATE public.finance_period_snapshots
SET
    workers_pool_cap = COALESCE(workers_pool_cap, workers_pool, 0),
    workers_pool_earned = COALESCE(workers_pool_earned, workers_pool, 0),
    workers_pool_unallocated = COALESCE(workers_pool_unallocated, 0),
    workers_target_weighted_points = COALESCE(
        workers_target_weighted_points,
        (SELECT fc.workers_target_weighted_points FROM public.finance_config fc LIMIT 1),
        100
    ),
    company_pool_base = COALESCE(company_pool_base, company_pool, 0),
    company_pool_from_workers = COALESCE(company_pool_from_workers, 0);

UPDATE public.finance_period_snapshots fps
SET workers_total_weighted_points = COALESCE((
    SELECT ROUND(COALESCE(SUM(fwpc.weighted_points), 0), 4)
    FROM public.finance_worker_period_compensations fwpc
    WHERE fwpc.period_id = fps.period_id
), 0);

UPDATE public.finance_period_snapshots
SET workers_pool_utilization_ratio = CASE
    WHEN COALESCE(workers_pool_cap, 0) > 0
        THEN LEAST(ROUND(COALESCE(workers_pool_earned, 0) / NULLIF(workers_pool_cap, 0), 4), 1)
    ELSE 0
END;

ALTER TABLE public.finance_period_snapshots
    ALTER COLUMN workers_pool_cap SET DEFAULT 0,
    ALTER COLUMN workers_pool_earned SET DEFAULT 0,
    ALTER COLUMN workers_pool_unallocated SET DEFAULT 0,
    ALTER COLUMN workers_total_weighted_points SET DEFAULT 0,
    ALTER COLUMN workers_target_weighted_points SET DEFAULT 100,
    ALTER COLUMN workers_pool_utilization_ratio SET DEFAULT 0,
    ALTER COLUMN company_pool_base SET DEFAULT 0,
    ALTER COLUMN company_pool_from_workers SET DEFAULT 0;

UPDATE public.finance_period_snapshots
SET
    workers_pool_cap = COALESCE(workers_pool_cap, 0),
    workers_pool_earned = COALESCE(workers_pool_earned, 0),
    workers_pool_unallocated = COALESCE(workers_pool_unallocated, 0),
    workers_total_weighted_points = COALESCE(workers_total_weighted_points, 0),
    workers_target_weighted_points = COALESCE(workers_target_weighted_points, 100),
    workers_pool_utilization_ratio = COALESCE(workers_pool_utilization_ratio, 0),
    company_pool_base = COALESCE(company_pool_base, 0),
    company_pool_from_workers = COALESCE(company_pool_from_workers, 0);

ALTER TABLE public.finance_period_snapshots
    ALTER COLUMN workers_pool_cap SET NOT NULL,
    ALTER COLUMN workers_pool_earned SET NOT NULL,
    ALTER COLUMN workers_pool_unallocated SET NOT NULL,
    ALTER COLUMN workers_total_weighted_points SET NOT NULL,
    ALTER COLUMN workers_target_weighted_points SET NOT NULL,
    ALTER COLUMN workers_pool_utilization_ratio SET NOT NULL,
    ALTER COLUMN company_pool_base SET NOT NULL,
    ALTER COLUMN company_pool_from_workers SET NOT NULL;

ALTER TABLE public.finance_worker_period_compensations
    ADD COLUMN IF NOT EXISTS workers_pool_cap_amount NUMERIC(15,2),
    ADD COLUMN IF NOT EXISTS workers_pool_unallocated_amount NUMERIC(15,2),
    ADD COLUMN IF NOT EXISTS period_total_weighted_points NUMERIC(15,4),
    ADD COLUMN IF NOT EXISTS target_weighted_points NUMERIC(12,2),
    ADD COLUMN IF NOT EXISTS pool_utilization_ratio NUMERIC(10,4);

UPDATE public.finance_worker_period_compensations fwpc
SET
    workers_pool_cap_amount = COALESCE(
        workers_pool_cap_amount,
        (
            SELECT COALESCE(fps.workers_pool_cap, fps.workers_pool, fwpc.workers_pool_amount)
            FROM public.finance_period_snapshots fps
            WHERE fps.period_id = fwpc.period_id
        ),
        fwpc.workers_pool_amount,
        0
    ),
    workers_pool_unallocated_amount = COALESCE(
        workers_pool_unallocated_amount,
        (
            SELECT COALESCE(fps.workers_pool_unallocated, 0)
            FROM public.finance_period_snapshots fps
            WHERE fps.period_id = fwpc.period_id
        ),
        0
    ),
    period_total_weighted_points = COALESCE(
        period_total_weighted_points,
        (
            SELECT COALESCE(fps.workers_total_weighted_points, 0)
            FROM public.finance_period_snapshots fps
            WHERE fps.period_id = fwpc.period_id
        ),
        0
    ),
    target_weighted_points = COALESCE(
        target_weighted_points,
        (
            SELECT COALESCE(fps.workers_target_weighted_points, 100)
            FROM public.finance_period_snapshots fps
            WHERE fps.period_id = fwpc.period_id
        ),
        (SELECT fc.workers_target_weighted_points FROM public.finance_config fc LIMIT 1),
        100
    ),
    pool_utilization_ratio = COALESCE(
        pool_utilization_ratio,
        CASE
            WHEN COALESCE((
                SELECT COALESCE(fps.workers_pool_cap, fps.workers_pool, fwpc.workers_pool_amount)
                FROM public.finance_period_snapshots fps
                WHERE fps.period_id = fwpc.period_id
            ), fwpc.workers_pool_amount, 0) > 0
                THEN LEAST(
                    ROUND(
                        COALESCE(fwpc.workers_pool_amount, 0) /
                        NULLIF(COALESCE((
                            SELECT COALESCE(fps.workers_pool_cap, fps.workers_pool, fwpc.workers_pool_amount)
                            FROM public.finance_period_snapshots fps
                            WHERE fps.period_id = fwpc.period_id
                        ), fwpc.workers_pool_amount, 0), 0),
                        4
                    ),
                    1
                )
            ELSE 0
        END
    );

ALTER TABLE public.finance_worker_period_compensations
    ALTER COLUMN workers_pool_cap_amount SET DEFAULT 0,
    ALTER COLUMN workers_pool_unallocated_amount SET DEFAULT 0,
    ALTER COLUMN period_total_weighted_points SET DEFAULT 0,
    ALTER COLUMN target_weighted_points SET DEFAULT 100,
    ALTER COLUMN pool_utilization_ratio SET DEFAULT 0;

UPDATE public.finance_worker_period_compensations
SET
    workers_pool_cap_amount = COALESCE(workers_pool_cap_amount, 0),
    workers_pool_unallocated_amount = COALESCE(workers_pool_unallocated_amount, 0),
    period_total_weighted_points = COALESCE(period_total_weighted_points, 0),
    target_weighted_points = COALESCE(target_weighted_points, 100),
    pool_utilization_ratio = COALESCE(pool_utilization_ratio, 0);

ALTER TABLE public.finance_worker_period_compensations
    ALTER COLUMN workers_pool_cap_amount SET NOT NULL,
    ALTER COLUMN workers_pool_unallocated_amount SET NOT NULL,
    ALTER COLUMN period_total_weighted_points SET NOT NULL,
    ALTER COLUMN target_weighted_points SET NOT NULL,
    ALTER COLUMN pool_utilization_ratio SET NOT NULL;

DROP FUNCTION IF EXISTS public.close_period(UUID);
DROP FUNCTION IF EXISTS public.get_period_worker_compensation_preview(UUID, NUMERIC);
DROP FUNCTION IF EXISTS public.get_period_worker_pool_summary(UUID, NUMERIC);

CREATE OR REPLACE FUNCTION public.get_period_worker_pool_summary(
    p_period_id UUID,
    p_workers_pool NUMERIC DEFAULT NULL
) RETURNS TABLE (
    workers_pool_cap NUMERIC,
    workers_pool_earned NUMERIC,
    workers_pool_unallocated NUMERIC,
    total_weighted_points NUMERIC,
    target_weighted_points NUMERIC,
    pool_utilization_ratio NUMERIC
) AS $$
DECLARE
    v_workers_pool_cap NUMERIC(15,2);
    v_target_weighted_points NUMERIC(12,2);
BEGIN
    IF p_workers_pool IS NULL THEN
        SELECT
            CASE
                WHEN totals.net_profit > 0
                    THEN ROUND(totals.net_profit * COALESCE(fc.pct_workers, 0) / 100, 2)
                ELSE 0
            END,
            GREATEST(COALESCE(fc.workers_target_weighted_points, 100), 1)
        INTO
            v_workers_pool_cap,
            v_target_weighted_points
        FROM public.get_period_financial_totals(p_period_id) totals
        CROSS JOIN public.finance_config fc
        LIMIT 1;
    ELSE
        v_workers_pool_cap := COALESCE(p_workers_pool, 0);

        SELECT GREATEST(COALESCE(fc.workers_target_weighted_points, 100), 1)
        INTO v_target_weighted_points
        FROM public.finance_config fc
        LIMIT 1;
    END IF;

    v_workers_pool_cap := COALESCE(v_workers_pool_cap, 0);
    v_target_weighted_points := GREATEST(COALESCE(v_target_weighted_points, 100), 1);

    RETURN QUERY
    WITH work_summary AS (
        SELECT
            wwl.worker_id,
            ROUND(COALESCE(SUM(wwl.calculated_points), 0), 2) AS raw_points
        FROM public.worker_work_logs wwl
        WHERE wwl.period_id = p_period_id
          AND wwl.status = 'approved'
        GROUP BY wwl.worker_id
    ),
    weighted AS (
        SELECT
            ws.worker_id,
            ROUND(ws.raw_points * seniority.multiplier_applied, 4) AS weighted_points
        FROM work_summary ws
        CROSS JOIN LATERAL public.get_worker_seniority(ws.worker_id, p_period_id) seniority
    ),
    totals AS (
        SELECT COALESCE(ROUND(SUM(weighted.weighted_points), 4), 0) AS total_weighted_points
        FROM weighted
    ),
    normalized AS (
        SELECT
            totals.total_weighted_points,
            CASE
                WHEN v_workers_pool_cap <= 0 THEN 0
                WHEN v_target_weighted_points <= 0 THEN 1
                ELSE LEAST(totals.total_weighted_points / v_target_weighted_points, 1)
            END AS pool_utilization_ratio
        FROM totals
    )
    SELECT
        v_workers_pool_cap,
        ROUND(v_workers_pool_cap * normalized.pool_utilization_ratio, 2) AS workers_pool_earned,
        ROUND(v_workers_pool_cap - ROUND(v_workers_pool_cap * normalized.pool_utilization_ratio, 2), 2) AS workers_pool_unallocated,
        normalized.total_weighted_points,
        v_target_weighted_points,
        ROUND(normalized.pool_utilization_ratio, 4)
    FROM normalized;
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
    workers_pool_cap NUMERIC,
    workers_pool_earned NUMERIC,
    workers_pool_unallocated NUMERIC,
    total_period_weighted_points NUMERIC,
    target_weighted_points NUMERIC,
    pool_utilization_ratio NUMERIC,
    calculation_breakdown JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH pool_summary AS (
        SELECT * FROM public.get_period_worker_pool_summary(p_period_id, p_workers_pool)
    ),
    work_summary AS (
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
                THEN ROUND(pool_summary.workers_pool_earned * ranked.weighted_points / ranked.total_weighted_points, 2)
            ELSE 0
        END AS estimated_amount,
        ranked.task_count,
        ranked.total_hours,
        ranked.months_worked,
        ranked.seniority_tier,
        ranked.multiplier_applied,
        pool_summary.workers_pool_cap,
        pool_summary.workers_pool_earned,
        pool_summary.workers_pool_unallocated,
        ranked.total_weighted_points,
        pool_summary.target_weighted_points,
        pool_summary.pool_utilization_ratio,
        JSONB_BUILD_OBJECT(
            'raw_points', ranked.raw_points,
            'weighted_points', ranked.weighted_points,
            'months_worked', ranked.months_worked,
            'seniority_tier', ranked.seniority_tier,
            'multiplier_applied', ranked.multiplier_applied,
            'task_count', ranked.task_count,
            'total_hours', ranked.total_hours,
            'workers_pool_cap', pool_summary.workers_pool_cap,
            'workers_pool_earned', pool_summary.workers_pool_earned,
            'workers_pool_unallocated', pool_summary.workers_pool_unallocated,
            'target_weighted_points', pool_summary.target_weighted_points,
            'pool_utilization_ratio', pool_summary.pool_utilization_ratio,
            'logs', ranked.logs_breakdown
        ) AS calculation_breakdown
    FROM ranked
    CROSS JOIN pool_summary
    ORDER BY ranked.weighted_points DESC, ranked.worker_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.close_period(p_period_id UUID)
RETURNS void AS $$
DECLARE
    v_period                         public.finance_periods%ROWTYPE;
    v_total_income                   NUMERIC(15,2);
    v_total_expenses                 NUMERIC(15,2);
    v_net_profit                     NUMERIC(15,2);
    v_transaction_count              INTEGER;
    v_config                         public.finance_config%ROWTYPE;
    v_francisco_amount               NUMERIC(15,2);
    v_federico_amount                NUMERIC(15,2);
    v_workers_pool_cap               NUMERIC(15,2);
    v_workers_pool_earned            NUMERIC(15,2);
    v_workers_pool_unallocated       NUMERIC(15,2);
    v_workers_total_weighted_points  NUMERIC(15,4);
    v_workers_target_points          NUMERIC(12,2);
    v_workers_pool_utilization_ratio NUMERIC(10,4);
    v_company_pool_base              NUMERIC(15,2);
    v_company_pool_total_credit      NUMERIC(15,2);
    v_company_fund_before            NUMERIC(15,2);
    v_company_fund_after             NUMERIC(15,2);
    v_snapshot_id                    UUID;
    v_distribution_id                UUID;
    v_allocated_workers              NUMERIC(15,2) := 0;
    v_worker_amount                  NUMERIC(15,2);
    v_worker_preview                 RECORD;
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
    v_workers_pool_cap := CASE
        WHEN v_net_profit > 0 THEN ROUND(v_net_profit * COALESCE(v_config.pct_workers, 0) / 100, 2)
        ELSE 0
    END;
    v_company_pool_base := CASE
        WHEN v_net_profit > 0 THEN ROUND(v_net_profit - v_francisco_amount - v_federico_amount - v_workers_pool_cap, 2)
        ELSE 0
    END;

    SELECT
        summary.workers_pool_cap,
        summary.workers_pool_earned,
        summary.workers_pool_unallocated,
        summary.total_weighted_points,
        summary.target_weighted_points,
        summary.pool_utilization_ratio
    INTO
        v_workers_pool_cap,
        v_workers_pool_earned,
        v_workers_pool_unallocated,
        v_workers_total_weighted_points,
        v_workers_target_points,
        v_workers_pool_utilization_ratio
    FROM public.get_period_worker_pool_summary(p_period_id, v_workers_pool_cap) summary;

    v_company_pool_total_credit := ROUND(v_company_pool_base + v_workers_pool_unallocated, 2);
    v_company_fund_before := public.get_company_fund_balance(v_config.default_currency);
    v_company_fund_after := v_company_fund_before + v_company_pool_total_credit;

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
        workers_pool_cap,
        workers_pool_earned,
        workers_pool_unallocated,
        workers_total_weighted_points,
        workers_target_weighted_points,
        workers_pool_utilization_ratio,
        company_pool,
        company_pool_base,
        company_pool_from_workers,
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
        v_workers_pool_cap,
        v_workers_pool_cap,
        v_workers_pool_earned,
        v_workers_pool_unallocated,
        v_workers_total_weighted_points,
        v_workers_target_points,
        v_workers_pool_utilization_ratio,
        v_company_pool_total_credit,
        v_company_pool_base,
        v_workers_pool_unallocated,
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
            'federico_profile_id', v_config.federico_profile_id,
            'workers_target_weighted_points', v_config.workers_target_weighted_points
        ),
        auth.uid(),
        NOW(),
        CASE
            WHEN v_period.period_type = 'adjustment'
                THEN 'Cierre de periodo de ajuste generado automáticamente para movimientos tardíos.'
            WHEN v_workers_pool_unallocated > 0
                THEN CONCAT(
                    'Pool workers máximo ',
                    v_workers_pool_cap,
                    '; ganado ',
                    v_workers_pool_earned,
                    '; remanente al fondo empresa ',
                    v_workers_pool_unallocated,
                    '.'
                )
            ELSE NULL
        END
    )
    ON CONFLICT (period_id) DO UPDATE SET
        total_income = EXCLUDED.total_income,
        total_expenses = EXCLUDED.total_expenses,
        net_profit = EXCLUDED.net_profit,
        admin_pool = EXCLUDED.admin_pool,
        workers_pool = EXCLUDED.workers_pool,
        workers_pool_cap = EXCLUDED.workers_pool_cap,
        workers_pool_earned = EXCLUDED.workers_pool_earned,
        workers_pool_unallocated = EXCLUDED.workers_pool_unallocated,
        workers_total_weighted_points = EXCLUDED.workers_total_weighted_points,
        workers_target_weighted_points = EXCLUDED.workers_target_weighted_points,
        workers_pool_utilization_ratio = EXCLUDED.workers_pool_utilization_ratio,
        company_pool = EXCLUDED.company_pool,
        company_pool_base = EXCLUDED.company_pool_base,
        company_pool_from_workers = EXCLUDED.company_pool_from_workers,
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

    IF v_company_pool_total_credit > 0 THEN
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
            v_company_pool_total_credit,
            v_config.default_currency,
            CURRENT_DATE,
            CONCAT('Acreditación fondo empresa - ', v_period.name),
            CONCAT(
                'Base empresa: ',
                v_company_pool_base,
                '. Remanente worker no asignado: ',
                v_workers_pool_unallocated,
                '.'
            ),
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
        FROM public.get_period_worker_compensation_preview(p_period_id, v_workers_pool_cap) preview
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
            v_worker_amount := ROUND(v_workers_pool_earned - v_allocated_workers, 2);
        ELSE
            v_worker_amount := ROUND(v_workers_pool_earned * v_worker_preview.share_percentage / 100, 2);
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
            workers_pool_cap_amount,
            workers_pool_unallocated_amount,
            period_total_weighted_points,
            target_weighted_points,
            pool_utilization_ratio,
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
            v_workers_pool_earned,
            v_workers_pool_cap,
            v_workers_pool_unallocated,
            v_worker_preview.total_period_weighted_points,
            v_worker_preview.target_weighted_points,
            v_worker_preview.pool_utilization_ratio,
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
