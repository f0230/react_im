-- ============================================================
-- Support multiple task types per worker work log
-- - keeps task_type_id as primary/legacy compatibility field
-- - adds task_type_ids + task_types_snapshot for explicit audit
-- - recalculates work log points from the sum of selected task types
-- ============================================================

ALTER TABLE public.worker_work_logs
    ADD COLUMN IF NOT EXISTS task_type_ids UUID[],
    ADD COLUMN IF NOT EXISTS task_types_snapshot JSONB;

UPDATE public.worker_work_logs wwl
SET
    task_type_ids = COALESCE(
        NULLIF(wwl.task_type_ids, '{}'::UUID[]),
        ARRAY[wwl.task_type_id]
    ),
    task_types_snapshot = COALESCE(
        CASE
            WHEN JSONB_TYPEOF(wwl.task_types_snapshot) = 'array'
                 AND JSONB_ARRAY_LENGTH(wwl.task_types_snapshot) > 0
                THEN wwl.task_types_snapshot
            ELSE NULL
        END,
        (
            SELECT COALESCE(JSONB_AGG(
                JSONB_BUILD_OBJECT(
                    'id', wtt.id,
                    'code', wtt.code,
                    'name', wtt.name,
                    'category', wtt.category,
                    'base_points', wtt.base_points,
                    'description', wtt.description
                )
                ORDER BY wtt.name
            ), '[]'::JSONB)
            FROM public.worker_task_types wtt
            WHERE wtt.id = ANY(COALESCE(NULLIF(wwl.task_type_ids, '{}'::UUID[]), ARRAY[wwl.task_type_id]))
        )
    );

ALTER TABLE public.worker_work_logs
    ALTER COLUMN task_type_ids SET DEFAULT ARRAY[]::UUID[],
    ALTER COLUMN task_type_ids SET NOT NULL,
    ALTER COLUMN task_types_snapshot SET DEFAULT '[]'::JSONB,
    ALTER COLUMN task_types_snapshot SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'worker_work_logs_task_type_ids_not_empty'
    ) THEN
        ALTER TABLE public.worker_work_logs
            ADD CONSTRAINT worker_work_logs_task_type_ids_not_empty
            CHECK (COALESCE(array_length(task_type_ids, 1), 0) > 0);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_worker_work_logs_task_type_ids
    ON public.worker_work_logs
    USING GIN(task_type_ids);

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
    NEW.calculated_points := ROUND(
        COALESCE(NEW.points_override, v_base_points_total) *
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
