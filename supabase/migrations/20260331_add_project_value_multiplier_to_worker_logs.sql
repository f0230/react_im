-- ============================================================
-- Project value multiplier for worker compensation
-- - stores project revenue contribution per work log
-- - applies project value multiplier on insert/update
-- - enriches worker compensation preview breakdown
-- ============================================================

ALTER TABLE public.worker_work_logs
    ADD COLUMN IF NOT EXISTS project_value_multiplier NUMERIC(5,2),
    ADD COLUMN IF NOT EXISTS project_revenue_contribution NUMERIC(5,4);

UPDATE public.worker_work_logs
SET project_value_multiplier = 1.0
WHERE project_value_multiplier IS NULL;

ALTER TABLE public.worker_work_logs
    ALTER COLUMN project_value_multiplier SET DEFAULT 1.0,
    ALTER COLUMN project_value_multiplier SET NOT NULL;

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
            COALESCE(SUM(ft.amount), 0)::NUMERIC(15,2) AS total_period_income,
            COALESCE(SUM(CASE WHEN ft.project_id = p_project_id THEN ft.amount ELSE 0 END), 0)::NUMERIC(15,2) AS project_income
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

CREATE OR REPLACE FUNCTION public.sync_worker_work_log_fields()
RETURNS TRIGGER AS $$
DECLARE
    v_period public.finance_periods%ROWTYPE;
    v_input_task_type_ids UUID[];
    v_requested_task_count INTEGER := 0;
    v_resolved_task_type_ids UUID[];
    v_resolved_task_count INTEGER := 0;
    v_base_points_total NUMERIC(8,2) := 0;
    v_first_task_code TEXT;
    v_first_task_name TEXT;
    v_task_types_snapshot JSONB := '[]'::JSONB;
    v_project_revenue_contribution NUMERIC(5,4);
    v_project_value_multiplier NUMERIC(5,2) := 1.0;
BEGIN
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

    v_input_task_type_ids := COALESCE(NEW.task_type_ids, ARRAY[]::UUID[]);

    IF COALESCE(array_length(v_input_task_type_ids, 1), 0) = 0 THEN
        IF NEW.task_type_id IS NOT NULL THEN
            v_input_task_type_ids := ARRAY[NEW.task_type_id];
        ELSE
            RAISE EXCEPTION 'Seleccioná al menos un tipo de tarea.';
        END IF;
    END IF;

    WITH normalized_input AS (
        SELECT DISTINCT ON (task_id)
            task_id,
            ord
        FROM UNNEST(v_input_task_type_ids) WITH ORDINALITY AS selected(task_id, ord)
        WHERE task_id IS NOT NULL
        ORDER BY task_id, ord
    ),
    selected_task_types AS (
        SELECT
            normalized_input.ord,
            wtt.id,
            wtt.code,
            wtt.name,
            wtt.category,
            wtt.base_points,
            wtt.description
        FROM normalized_input
        JOIN public.worker_task_types wtt
            ON wtt.id = normalized_input.task_id
        ORDER BY normalized_input.ord
    )
    SELECT
        (SELECT COUNT(*) FROM normalized_input),
        COALESCE(ARRAY_AGG(selected_task_types.id ORDER BY selected_task_types.ord), ARRAY[]::UUID[]),
        COUNT(selected_task_types.id),
        COALESCE(ROUND(SUM(selected_task_types.base_points), 2), 0),
        (ARRAY_AGG(selected_task_types.code ORDER BY selected_task_types.ord))[1],
        (ARRAY_AGG(selected_task_types.name ORDER BY selected_task_types.ord))[1],
        COALESCE(JSONB_AGG(
            JSONB_BUILD_OBJECT(
                'id', selected_task_types.id,
                'code', selected_task_types.code,
                'name', selected_task_types.name,
                'category', selected_task_types.category,
                'base_points', selected_task_types.base_points,
                'description', selected_task_types.description
            )
            ORDER BY selected_task_types.ord
        ), '[]'::JSONB)
    INTO
        v_requested_task_count,
        v_resolved_task_type_ids,
        v_resolved_task_count,
        v_base_points_total,
        v_first_task_code,
        v_first_task_name,
        v_task_types_snapshot
    FROM selected_task_types;

    IF v_requested_task_count <= 0 OR v_resolved_task_count <= 0 THEN
        RAISE EXCEPTION 'Seleccioná al menos un tipo de tarea válido.';
    END IF;

    IF v_requested_task_count <> v_resolved_task_count THEN
        RAISE EXCEPTION 'Uno o más tipos de tarea no existen.';
    END IF;

    SELECT
        context.project_revenue_contribution,
        context.project_value_multiplier
    INTO
        v_project_revenue_contribution,
        v_project_value_multiplier
    FROM public.get_period_project_value_context(NEW.period_id, NEW.project_id) context;

    NEW.task_type_ids := v_resolved_task_type_ids;
    NEW.task_type_id := v_resolved_task_type_ids[1];
    NEW.task_code := CASE
        WHEN v_resolved_task_count = 1 THEN v_first_task_code
        ELSE CONCAT(v_first_task_code, ' +', v_resolved_task_count - 1)
    END;
    NEW.task_name := CASE
        WHEN v_resolved_task_count = 1 THEN v_first_task_name
        ELSE CONCAT(v_first_task_name, ' +', v_resolved_task_count - 1, ' tarea(s)')
    END;
    NEW.task_types_snapshot := v_task_types_snapshot;
    NEW.base_points_snapshot := v_base_points_total;
    NEW.criticality_multiplier := CASE NEW.criticality_level
        WHEN 'importante' THEN 1.3
        WHEN 'critica' THEN 1.8
        WHEN 'emergencia' THEN 2.5
        ELSE 1.0
    END;
    NEW.project_revenue_contribution := v_project_revenue_contribution;
    NEW.project_value_multiplier := COALESCE(v_project_value_multiplier, 1.0);
    NEW.calculated_points := ROUND(
        COALESCE(NEW.points_override, v_base_points_total) *
        NEW.criticality_multiplier *
        COALESCE(NEW.quantity, 1) *
        NEW.project_value_multiplier,
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
            COALESCE(SUM(ft.amount), 0)::NUMERIC(15,2) AS total_period_income
        FROM public.finance_transactions ft
        WHERE ft.period_id = p_period_id
          AND ft.type = 'income'
    ),
    project_income_totals AS (
        SELECT
            ft.project_id,
            COALESCE(SUM(ft.amount), 0)::NUMERIC(15,2) AS project_income
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
