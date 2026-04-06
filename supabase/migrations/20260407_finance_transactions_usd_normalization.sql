-- ============================================================
-- Normalize finance transactions to USD for reporting and closes
-- ============================================================

ALTER TABLE public.finance_transactions
    ADD COLUMN IF NOT EXISTS amount_usd NUMERIC(15,2),
    ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(15,6);

UPDATE public.finance_transactions
SET
    amount_usd = amount,
    exchange_rate = 1
WHERE COALESCE(currency, 'USD') = 'USD'
  AND (amount_usd IS NULL OR exchange_rate IS NULL OR exchange_rate <= 0);

UPDATE public.finance_transactions
SET amount_usd = ROUND(amount / exchange_rate, 2)
WHERE COALESCE(currency, 'USD') <> 'USD'
  AND amount_usd IS NULL
  AND exchange_rate IS NOT NULL
  AND exchange_rate > 0;

UPDATE public.finance_transactions ft
SET
    amount_usd = COALESCE(i.amount_usd, ft.amount_usd),
    exchange_rate = COALESCE(i.exchange_rate, ft.exchange_rate, CASE WHEN COALESCE(i.currency, 'USD') = 'USD' THEN 1 ELSE NULL END)
FROM public.invoices i
WHERE ft.invoice_id = i.id
  AND (ft.amount_usd IS NULL OR ft.exchange_rate IS NULL OR ft.exchange_rate <= 0);

CREATE OR REPLACE FUNCTION public.get_finance_reporting_amount(
    p_amount NUMERIC,
    p_currency TEXT DEFAULT 'USD',
    p_amount_usd NUMERIC DEFAULT NULL,
    p_exchange_rate NUMERIC DEFAULT NULL
) RETURNS NUMERIC AS $$
    SELECT COALESCE(
        ROUND(
            COALESCE(
                p_amount_usd,
                CASE
                    WHEN COALESCE(p_currency, 'USD') = 'USD' THEN p_amount
                    WHEN p_exchange_rate IS NOT NULL AND p_exchange_rate > 0 THEN p_amount / p_exchange_rate
                    ELSE p_amount
                END
            ),
            2
        ),
        0
    )::NUMERIC(15,2);
$$ LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.get_period_financial_totals(p_period_id UUID)
RETURNS TABLE (
    total_income NUMERIC,
    total_expenses NUMERIC,
    net_profit NUMERIC,
    transaction_count INTEGER
) AS $$
    SELECT
        COALESCE(SUM(
            CASE
                WHEN type = 'income' THEN public.get_finance_reporting_amount(amount, currency, amount_usd, exchange_rate)
                ELSE 0
            END
        ), 0)::NUMERIC(15,2) AS total_income,
        COALESCE(SUM(
            CASE
                WHEN type = 'expense' THEN public.get_finance_reporting_amount(amount, currency, amount_usd, exchange_rate)
                ELSE 0
            END
        ), 0)::NUMERIC(15,2) AS total_expenses,
        (
            COALESCE(SUM(
                CASE
                    WHEN type = 'income' THEN public.get_finance_reporting_amount(amount, currency, amount_usd, exchange_rate)
                    ELSE 0
                END
            ), 0) -
            COALESCE(SUM(
                CASE
                    WHEN type = 'expense' THEN public.get_finance_reporting_amount(amount, currency, amount_usd, exchange_rate)
                    ELSE 0
                END
            ), 0)
        )::NUMERIC(15,2) AS net_profit,
        COUNT(*)::INTEGER AS transaction_count
    FROM public.finance_transactions
    WHERE period_id = p_period_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_period_project_value_context(
    p_period_id UUID,
    p_project_id UUID
) RETURNS TABLE (
    project_income NUMERIC,
    total_period_income NUMERIC,
    project_revenue_contribution NUMERIC,
    project_value_multiplier NUMERIC
) AS $$
    WITH income_totals AS (
        SELECT
            COALESCE(SUM(public.get_finance_reporting_amount(ft.amount, ft.currency, ft.amount_usd, ft.exchange_rate)), 0)::NUMERIC(15,2) AS total_period_income,
            COALESCE(SUM(
                CASE
                    WHEN ft.project_id = p_project_id
                        THEN public.get_finance_reporting_amount(ft.amount, ft.currency, ft.amount_usd, ft.exchange_rate)
                    ELSE 0
                END
            ), 0)::NUMERIC(15,2) AS project_income
        FROM public.finance_transactions ft
        WHERE ft.period_id = p_period_id
          AND ft.type = 'income'
    )
    SELECT
        CASE
            WHEN p_project_id IS NULL THEN NULL
            ELSE income_totals.project_income
        END AS project_income,
        income_totals.total_period_income,
        CASE
            WHEN p_project_id IS NULL OR income_totals.total_period_income <= 0 THEN NULL
            ELSE ROUND(
                income_totals.project_income / NULLIF(income_totals.total_period_income, 0),
                4
            )::NUMERIC(5,4)
        END AS project_revenue_contribution,
        CASE
            WHEN p_project_id IS NULL OR income_totals.total_period_income <= 0 THEN 1.0::NUMERIC(5,2)
            ELSE GREATEST(
                ROUND(
                    (
                        income_totals.project_income
                        / NULLIF(income_totals.total_period_income, 0)
                    ) * 2,
                    2
                )::NUMERIC(5,2),
                0.5::NUMERIC(5,2)
            )
        END AS project_value_multiplier
    FROM income_totals;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

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
    period_income_summary AS (
        SELECT
            COALESCE(SUM(public.get_finance_reporting_amount(ft.amount, ft.currency, ft.amount_usd, ft.exchange_rate)), 0)::NUMERIC(15,2) AS total_period_income
        FROM public.finance_transactions ft
        WHERE ft.period_id = p_period_id
          AND ft.type = 'income'
    ),
    project_income_totals AS (
        SELECT
            ft.project_id,
            COALESCE(SUM(public.get_finance_reporting_amount(ft.amount, ft.currency, ft.amount_usd, ft.exchange_rate)), 0)::NUMERIC(15,2) AS project_income
        FROM public.finance_transactions ft
        WHERE ft.period_id = p_period_id
          AND ft.type = 'income'
          AND ft.project_id IS NOT NULL
        GROUP BY ft.project_id
    ),
    project_ids AS (
        SELECT DISTINCT wwl.project_id
        FROM public.worker_work_logs wwl
        WHERE wwl.period_id = p_period_id
          AND wwl.status = 'approved'
          AND wwl.project_id IS NOT NULL
        UNION
        SELECT DISTINCT ft.project_id
        FROM public.finance_transactions ft
        WHERE ft.period_id = p_period_id
          AND ft.type = 'income'
          AND ft.project_id IS NOT NULL
    ),
    project_income_distribution AS (
        SELECT
            project_ids.project_id,
            projects.name AS project_name,
            COALESCE(project_income_totals.project_income, 0)::NUMERIC(15,2) AS project_income,
            period_income_summary.total_period_income,
            CASE
                WHEN period_income_summary.total_period_income > 0 THEN ROUND(
                    COALESCE(project_income_totals.project_income, 0)
                    / NULLIF(period_income_summary.total_period_income, 0),
                    4
                )::NUMERIC(5,4)
                ELSE NULL
            END AS project_revenue_contribution,
            CASE
                WHEN period_income_summary.total_period_income <= 0 THEN 1.0::NUMERIC(5,2)
                ELSE GREATEST(
                    ROUND(
                        (
                            COALESCE(project_income_totals.project_income, 0)
                            / NULLIF(period_income_summary.total_period_income, 0)
                        ) * 2,
                        2
                    )::NUMERIC(5,2),
                    0.5::NUMERIC(5,2)
                )
            END AS project_value_multiplier
        FROM project_ids
        CROSS JOIN period_income_summary
        LEFT JOIN project_income_totals
            ON project_income_totals.project_id = project_ids.project_id
        LEFT JOIN public.projects projects
            ON projects.id = project_ids.project_id
    ),
    project_distribution_json AS (
        SELECT COALESCE(
            JSONB_AGG(
                JSONB_BUILD_OBJECT(
                    'project_id', pid.project_id,
                    'project_name', pid.project_name,
                    'project_income', pid.project_income,
                    'total_period_income', pid.total_period_income,
                    'project_revenue_contribution', pid.project_revenue_contribution,
                    'project_value_multiplier', pid.project_value_multiplier
                )
                ORDER BY pid.project_revenue_contribution DESC NULLS LAST, pid.project_income DESC, pid.project_name
            ),
            '[]'::JSONB
        ) AS project_income_distribution
        FROM project_income_distribution pid
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
                    'task_type_ids', wwl.task_type_ids,
                    'task_code', wwl.task_code,
                    'task_name', wwl.task_name,
                    'task_types', COALESCE(
                        CASE
                            WHEN JSONB_TYPEOF(wwl.task_types_snapshot) = 'array'
                                 AND JSONB_ARRAY_LENGTH(wwl.task_types_snapshot) > 0
                                THEN wwl.task_types_snapshot
                            ELSE NULL
                        END,
                        JSONB_BUILD_ARRAY(
                            JSONB_BUILD_OBJECT(
                                'id', wwl.task_type_id,
                                'code', wwl.task_code,
                                'name', wwl.task_name,
                                'base_points', wwl.base_points_snapshot
                            )
                        )
                    ),
                    'task_description', wwl.task_description,
                    'quantity', wwl.quantity,
                    'points_override', wwl.points_override,
                    'base_points_snapshot', wwl.base_points_snapshot,
                    'criticality_level', wwl.criticality_level,
                    'criticality_multiplier', wwl.criticality_multiplier,
                    'project_value_multiplier', wwl.project_value_multiplier,
                    'project_revenue_contribution', wwl.project_revenue_contribution,
                    'project_income', CASE
                        WHEN wwl.project_id IS NULL THEN NULL
                        ELSE COALESCE(pid.project_income, 0)
                    END,
                    'total_period_income', pis.total_period_income,
                    'project_value_reason', CASE
                        WHEN wwl.project_id IS NULL THEN 'no_project'
                        WHEN pis.total_period_income <= 0 THEN 'zero_period_income'
                        WHEN wwl.project_revenue_contribution IS NULL
                             AND COALESCE(wwl.project_value_multiplier, 1.0) = 1.0
                            THEN 'legacy_neutral_default'
                        WHEN COALESCE(wwl.project_revenue_contribution, 0) <= 0 THEN 'project_without_income_floor'
                        ELSE 'project_income_share'
                    END,
                    'calculated_points', wwl.calculated_points,
                    'worked_date', wwl.worked_date
                )
                ORDER BY wwl.worked_date, wwl.created_at
            ) AS logs_breakdown
        FROM public.worker_work_logs wwl
        CROSS JOIN period_income_summary pis
        LEFT JOIN project_income_distribution pid
            ON pid.project_id = wwl.project_id
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
            'total_period_income', period_income_summary.total_period_income,
            'project_income_distribution', project_distribution_json.project_income_distribution,
            'logs', ranked.logs_breakdown
        ) AS calculation_breakdown
    FROM ranked
    CROSS JOIN pool_summary
    CROSS JOIN period_income_summary
    CROSS JOIN project_distribution_json
    ORDER BY ranked.weighted_points DESC, ranked.worker_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

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
        amount_usd,
        exchange_rate,
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
        COALESCE(NEW.amount_usd, CASE WHEN COALESCE(NEW.currency, 'USD') = 'USD' THEN NEW.amount ELSE NULL END),
        COALESCE(NEW.exchange_rate, CASE WHEN COALESCE(NEW.currency, 'USD') = 'USD' THEN 1 ELSE NULL END),
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
        amount_usd = EXCLUDED.amount_usd,
        exchange_rate = EXCLUDED.exchange_rate,
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

CREATE OR REPLACE FUNCTION public.close_period(p_period_id UUID)
RETURNS void AS $$
DECLARE
    v_config public.finance_config%ROWTYPE;
    v_unconverted_count INTEGER := 0;
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

    SELECT COUNT(*)
    INTO v_unconverted_count
    FROM public.finance_transactions ft
    WHERE ft.period_id = p_period_id
      AND COALESCE(ft.currency, 'USD') <> 'USD'
      AND (
          ft.amount_usd IS NULL
          OR ft.exchange_rate IS NULL
          OR ft.exchange_rate <= 0
      );

    IF v_unconverted_count > 0 THEN
        RAISE EXCEPTION 'Hay % movimiento(s) en moneda extranjera sin normalizar. Editalos y guardalos de nuevo antes de cerrar el período.', v_unconverted_count;
    END IF;

    IF to_regprocedure('public.close_period_impl(uuid)') IS NULL THEN
        RAISE EXCEPTION 'close_period_impl(uuid) is missing';
    END IF;

    PERFORM public.close_period_impl(p_period_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
