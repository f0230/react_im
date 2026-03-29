-- ============================================================
-- Dynamic workers target scaled by active workers
-- ============================================================
-- Keeps the existing configured target as the base target for
-- a reference period with 4 active workers.
-- The effective target then scales proportionally with the
-- number of workers that actually logged approved work.
-- ============================================================

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
    v_base_target_weighted_points NUMERIC(12,2);
    v_reference_active_workers NUMERIC(12,2) := 4;
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
            v_base_target_weighted_points
        FROM public.get_period_financial_totals(p_period_id) totals
        CROSS JOIN public.finance_config fc
        LIMIT 1;
    ELSE
        v_workers_pool_cap := COALESCE(p_workers_pool, 0);

        SELECT GREATEST(COALESCE(fc.workers_target_weighted_points, 100), 1)
        INTO v_base_target_weighted_points
        FROM public.finance_config fc
        LIMIT 1;
    END IF;

    v_workers_pool_cap := COALESCE(v_workers_pool_cap, 0);
    v_base_target_weighted_points := GREATEST(COALESCE(v_base_target_weighted_points, 100), 1);

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
    active_workers AS (
        SELECT COUNT(*)::NUMERIC AS active_worker_count
        FROM work_summary
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
            ROUND(
                GREATEST(
                    v_base_target_weighted_points
                    * GREATEST(COALESCE(active_workers.active_worker_count, 0), 1)
                    / NULLIF(v_reference_active_workers, 0),
                    1
                ),
                2
            ) AS target_weighted_points
        FROM totals
        CROSS JOIN active_workers
    ),
    pool_activation AS (
        SELECT
            normalized.total_weighted_points,
            normalized.target_weighted_points,
            CASE
                WHEN v_workers_pool_cap <= 0 THEN 0
                WHEN normalized.target_weighted_points <= 0 THEN 1
                ELSE LEAST(normalized.total_weighted_points / normalized.target_weighted_points, 1)
            END AS pool_utilization_ratio
        FROM normalized
    )
    SELECT
        v_workers_pool_cap,
        ROUND(v_workers_pool_cap * pool_activation.pool_utilization_ratio, 2) AS workers_pool_earned,
        ROUND(v_workers_pool_cap - ROUND(v_workers_pool_cap * pool_activation.pool_utilization_ratio, 2), 2) AS workers_pool_unallocated,
        pool_activation.total_weighted_points,
        pool_activation.target_weighted_points,
        ROUND(pool_activation.pool_utilization_ratio, 4)
    FROM pool_activation;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;
