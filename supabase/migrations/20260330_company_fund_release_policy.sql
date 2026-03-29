-- ============================================================
-- Company fund release policy
-- - configurable reserve floor
-- - optional auto release of accumulated surplus
-- - explicit snapshot + ledger + compensation entries
-- ============================================================

-- -----------------------------------------------
-- 1. Config extensions
-- -----------------------------------------------
ALTER TABLE public.finance_config
    ADD COLUMN IF NOT EXISTS company_fund_release_enabled BOOLEAN,
    ADD COLUMN IF NOT EXISTS company_fund_reserve_floor NUMERIC(15,2);

UPDATE public.finance_config
SET
    company_fund_release_enabled = COALESCE(company_fund_release_enabled, FALSE),
    company_fund_reserve_floor = COALESCE(company_fund_reserve_floor, 0);

ALTER TABLE public.finance_config
    ALTER COLUMN company_fund_release_enabled SET DEFAULT FALSE,
    ALTER COLUMN company_fund_release_enabled SET NOT NULL,
    ALTER COLUMN company_fund_reserve_floor SET DEFAULT 0,
    ALTER COLUMN company_fund_reserve_floor SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'finance_config_company_fund_reserve_floor_check'
    ) THEN
        ALTER TABLE public.finance_config
            ADD CONSTRAINT finance_config_company_fund_reserve_floor_check
            CHECK (company_fund_reserve_floor >= 0);
    END IF;
END $$;

-- -----------------------------------------------
-- 2. Snapshot fields for release tracking
-- -----------------------------------------------
ALTER TABLE public.finance_period_snapshots
    ADD COLUMN IF NOT EXISTS company_fund_release_amount NUMERIC(15,2),
    ADD COLUMN IF NOT EXISTS company_fund_release_admin_pool NUMERIC(15,2),
    ADD COLUMN IF NOT EXISTS company_fund_release_workers_pool NUMERIC(15,2),
    ADD COLUMN IF NOT EXISTS company_fund_reserve_floor NUMERIC(15,2),
    ADD COLUMN IF NOT EXISTS company_fund_balance_after_release NUMERIC(15,2);

UPDATE public.finance_period_snapshots
SET
    company_fund_release_amount = COALESCE(company_fund_release_amount, 0),
    company_fund_release_admin_pool = COALESCE(company_fund_release_admin_pool, 0),
    company_fund_release_workers_pool = COALESCE(company_fund_release_workers_pool, 0),
    company_fund_reserve_floor = COALESCE(company_fund_reserve_floor, 0),
    company_fund_balance_after_release = COALESCE(company_fund_balance_after_release, company_fund_balance_before);

ALTER TABLE public.finance_period_snapshots
    ALTER COLUMN company_fund_release_amount SET DEFAULT 0,
    ALTER COLUMN company_fund_release_amount SET NOT NULL,
    ALTER COLUMN company_fund_release_admin_pool SET DEFAULT 0,
    ALTER COLUMN company_fund_release_admin_pool SET NOT NULL,
    ALTER COLUMN company_fund_release_workers_pool SET DEFAULT 0,
    ALTER COLUMN company_fund_release_workers_pool SET NOT NULL,
    ALTER COLUMN company_fund_reserve_floor SET DEFAULT 0,
    ALTER COLUMN company_fund_reserve_floor SET NOT NULL,
    ALTER COLUMN company_fund_balance_after_release SET DEFAULT 0,
    ALTER COLUMN company_fund_balance_after_release SET NOT NULL;

-- -----------------------------------------------
-- 3. Constraint / index updates
-- -----------------------------------------------
ALTER TABLE public.finance_company_fund_movements
    DROP CONSTRAINT IF EXISTS finance_company_fund_movements_movement_source_check;

ALTER TABLE public.finance_company_fund_movements
    ADD CONSTRAINT finance_company_fund_movements_movement_source_check
    CHECK (
        movement_source IN (
            'period_close',
            'period_release',
            'expense_funding',
            'manual_adjustment',
            'legacy_backfill_credit',
            'legacy_backfill_debit'
        )
    );

ALTER TABLE public.finance_distributions
    DROP CONSTRAINT IF EXISTS finance_distributions_calculation_source_check;

ALTER TABLE public.finance_distributions
    ADD CONSTRAINT finance_distributions_calculation_source_check
    CHECK (
        calculation_source IN (
            'admin_percentage',
            'worker_points',
            'company_fund_release',
            'legacy_manual_weight',
            'legacy_company_distribution'
        )
    );

DROP INDEX IF EXISTS public.idx_fd_unique_profile_recipient;

CREATE UNIQUE INDEX IF NOT EXISTS idx_fd_unique_profile_recipient_source
ON public.finance_distributions(period_id, profile_id, recipient_type, calculation_source)
WHERE profile_id IS NOT NULL;

-- -----------------------------------------------
-- 4. close_period() with explicit company fund release
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION public.close_period(p_period_id UUID)
RETURNS void AS $$
DECLARE
    v_period                           public.finance_periods%ROWTYPE;
    v_total_income                     NUMERIC(15,2);
    v_total_expenses                   NUMERIC(15,2);
    v_net_profit                       NUMERIC(15,2);
    v_transaction_count                INTEGER;
    v_config                           public.finance_config%ROWTYPE;
    v_francisco_amount                 NUMERIC(15,2);
    v_federico_amount                  NUMERIC(15,2);
    v_workers_pool_cap                 NUMERIC(15,2);
    v_workers_pool_earned              NUMERIC(15,2);
    v_workers_pool_unallocated         NUMERIC(15,2);
    v_workers_total_weighted_points    NUMERIC(15,4);
    v_workers_target_points            NUMERIC(12,2);
    v_workers_pool_utilization_ratio   NUMERIC(10,4);
    v_company_pool_base                NUMERIC(15,2);
    v_company_pool_total_credit        NUMERIC(15,2);
    v_company_fund_before              NUMERIC(15,2);
    v_company_fund_release_amount      NUMERIC(15,2) := 0;
    v_company_fund_release_admin_pool  NUMERIC(15,2) := 0;
    v_company_fund_release_workers_pool NUMERIC(15,2) := 0;
    v_company_fund_after_release       NUMERIC(15,2);
    v_company_fund_after               NUMERIC(15,2);
    v_company_fund_reserve_floor       NUMERIC(15,2);
    v_snapshot_id                      UUID;
    v_distribution_id                  UUID;
    v_allocated_workers                NUMERIC(15,2) := 0;
    v_worker_amount                    NUMERIC(15,2);
    v_allocated_release_workers        NUMERIC(15,2) := 0;
    v_worker_release_amount            NUMERIC(15,2);
    v_worker_preview                   RECORD;
    v_workers_release_eligible         BOOLEAN := FALSE;
    v_release_distribution_base        NUMERIC(10,2) := 0;
    v_release_francisco_amount         NUMERIC(15,2) := 0;
    v_release_federico_amount          NUMERIC(15,2) := 0;
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
    v_company_fund_reserve_floor := GREATEST(COALESCE(v_config.company_fund_reserve_floor, 0), 0);
    v_workers_release_eligible := COALESCE(v_workers_total_weighted_points, 0) > 0;
    v_release_distribution_base := COALESCE(v_config.pct_francisco, 0)
        + COALESCE(v_config.pct_federico, 0)
        + CASE
            WHEN v_workers_release_eligible THEN COALESCE(v_config.pct_workers, 0)
            ELSE 0
        END;

    IF COALESCE(v_config.company_fund_release_enabled, FALSE)
       AND v_release_distribution_base > 0
    THEN
        v_company_fund_release_amount := ROUND(
            GREATEST(v_company_fund_before - v_company_fund_reserve_floor, 0),
            2
        );
    END IF;

    IF v_company_fund_release_amount > 0 AND v_release_distribution_base > 0 THEN
        v_release_francisco_amount := CASE
            WHEN COALESCE(v_config.pct_francisco, 0) > 0
                THEN ROUND(v_company_fund_release_amount * v_config.pct_francisco / v_release_distribution_base, 2)
            ELSE 0
        END;

        IF v_workers_release_eligible THEN
            v_release_federico_amount := CASE
                WHEN COALESCE(v_config.pct_federico, 0) > 0
                    THEN ROUND(v_company_fund_release_amount * v_config.pct_federico / v_release_distribution_base, 2)
                ELSE 0
            END;
            v_company_fund_release_workers_pool := ROUND(
                GREATEST(v_company_fund_release_amount - v_release_francisco_amount - v_release_federico_amount, 0),
                2
            );
        ELSE
            v_release_federico_amount := ROUND(
                GREATEST(v_company_fund_release_amount - v_release_francisco_amount, 0),
                2
            );
            v_company_fund_release_workers_pool := 0;
        END IF;

        v_company_fund_release_admin_pool := ROUND(v_release_francisco_amount + v_release_federico_amount, 2);
    END IF;

    v_company_fund_after_release := ROUND(v_company_fund_before - v_company_fund_release_amount, 2);
    v_company_fund_after := ROUND(v_company_fund_after_release + v_company_pool_total_credit, 2);

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
        company_fund_release_amount,
        company_fund_release_admin_pool,
        company_fund_release_workers_pool,
        company_fund_reserve_floor,
        company_fund_balance_before,
        company_fund_balance_after_release,
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
        v_company_fund_release_amount,
        v_company_fund_release_admin_pool,
        v_company_fund_release_workers_pool,
        v_company_fund_reserve_floor,
        v_company_fund_before,
        v_company_fund_after_release,
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
            'workers_target_weighted_points', v_config.workers_target_weighted_points,
            'company_fund_release_enabled', v_config.company_fund_release_enabled,
            'company_fund_reserve_floor', v_config.company_fund_reserve_floor
        ),
        auth.uid(),
        NOW(),
        CASE
            WHEN v_company_fund_release_amount > 0
                THEN CONCAT(
                    'Release fondo empresa: ',
                    v_company_fund_release_amount,
                    '. Colchón protegido: ',
                    v_company_fund_reserve_floor,
                    '. Crédito neto al fondo del período: ',
                    v_company_pool_total_credit,
                    '.'
                )
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
        company_fund_release_amount = EXCLUDED.company_fund_release_amount,
        company_fund_release_admin_pool = EXCLUDED.company_fund_release_admin_pool,
        company_fund_release_workers_pool = EXCLUDED.company_fund_release_workers_pool,
        company_fund_reserve_floor = EXCLUDED.company_fund_reserve_floor,
        company_fund_balance_before = EXCLUDED.company_fund_balance_before,
        company_fund_balance_after_release = EXCLUDED.company_fund_balance_after_release,
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
      AND movement_source IN ('period_close', 'period_release');

    IF v_company_fund_release_amount > 0 THEN
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
            'debit',
            'period_release',
            v_company_fund_release_amount,
            v_config.default_currency,
            CURRENT_DATE,
            CONCAT('Liberación fondo empresa - ', v_period.name),
            CONCAT(
                'Saldo antes: ',
                v_company_fund_before,
                '. Colchón protegido: ',
                v_company_fund_reserve_floor,
                '. Pool admins release: ',
                v_company_fund_release_admin_pool,
                '. Pool workers release: ',
                v_company_fund_release_workers_pool,
                '.'
            ),
            auth.uid()
        );
    END IF;

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

    IF v_release_francisco_amount > 0 THEN
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
            v_release_francisco_amount,
            v_config.default_currency,
            'company_fund_release',
            JSONB_BUILD_OBJECT(
                'release_amount', v_company_fund_release_amount,
                'reserve_floor', v_company_fund_reserve_floor,
                'release_pool', v_company_fund_release_admin_pool,
                'role', 'francisco'
            ),
            v_snapshot_id
        );
    END IF;

    IF v_release_federico_amount > 0 THEN
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
            v_release_federico_amount,
            v_config.default_currency,
            'company_fund_release',
            JSONB_BUILD_OBJECT(
                'release_amount', v_company_fund_release_amount,
                'reserve_floor', v_company_fund_reserve_floor,
                'release_pool', v_company_fund_release_admin_pool,
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

        IF v_company_fund_release_workers_pool > 0 THEN
            IF v_worker_preview.total_rows = v_worker_preview.row_num THEN
                v_worker_release_amount := ROUND(v_company_fund_release_workers_pool - v_allocated_release_workers, 2);
            ELSE
                v_worker_release_amount := ROUND(
                    v_company_fund_release_workers_pool * v_worker_preview.share_percentage / 100,
                    2
                );
                v_allocated_release_workers := v_allocated_release_workers + v_worker_release_amount;
            END IF;

            IF GREATEST(v_worker_release_amount, 0) > 0 THEN
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
                    GREATEST(v_worker_release_amount, 0),
                    v_config.default_currency,
                    'company_fund_release',
                    v_worker_preview.calculation_breakdown || JSONB_BUILD_OBJECT(
                        'release_amount', v_company_fund_release_amount,
                        'reserve_floor', v_company_fund_reserve_floor,
                        'release_pool', v_company_fund_release_workers_pool,
                        'share_percentage', v_worker_preview.share_percentage,
                        'final_amount_earned', GREATEST(v_worker_release_amount, 0),
                        'release_type', 'worker_bonus'
                    ),
                    v_snapshot_id
                );
            END IF;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
