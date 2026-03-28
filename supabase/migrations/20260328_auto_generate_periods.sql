-- ============================================================
-- Auto-generate periods from orphaned transactions
-- ============================================================

-- Function to auto-generate periods based on transaction dates
CREATE OR REPLACE FUNCTION public.auto_generate_periods()
RETURNS TABLE (
    month_year TEXT,
    start_date DATE,
    end_date DATE,
    transaction_count BIGINT,
    total_income NUMERIC,
    total_expenses NUMERIC,
    period_id UUID,
    created BOOLEAN
) AS $$
DECLARE
    v_record RECORD;
    v_period_id UUID;
    v_period_name TEXT;
    v_start_date DATE;
    v_end_date DATE;
    v_exists BOOLEAN;
BEGIN
    -- Find all month/year combinations from transactions without periods
    FOR v_record IN
        SELECT 
            DATE_TRUNC('month', transaction_date)::DATE AS month_start,
            TO_CHAR(DATE_TRUNC('month', transaction_date), 'YYYY-MM') AS month_key,
            TO_CHAR(DATE_TRUNC('month', transaction_date), 'TMMonth YYYY') AS period_name,
            COUNT(*) AS tx_count,
            SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS income,
            SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expenses
        FROM finance_transactions
        WHERE period_id IS NULL
        GROUP BY DATE_TRUNC('month', transaction_date)
        ORDER BY month_start DESC
    LOOP
        -- Calculate period dates
        v_start_date := v_record.month_start;
        v_end_date := (v_record.month_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
        v_period_name := INITCAP(v_record.period_name);
        
        -- Check if a period already exists for this date range
        SELECT id INTO v_period_id
        FROM finance_periods
        WHERE start_date <= v_record.month_start 
          AND end_date >= v_record.month_start
        LIMIT 1;
        
        IF v_period_id IS NOT NULL THEN
            -- Period exists, just return info (don't auto-assign)
            v_exists := TRUE;
        ELSE
            -- Create new period
            INSERT INTO finance_periods (
                name,
                start_date,
                end_date,
                status,
                created_by
            ) VALUES (
                v_period_name,
                v_start_date,
                v_end_date,
                'open',
                auth.uid()
            )
            RETURNING id INTO v_period_id;
            v_exists := FALSE;
        END IF;
        
        -- Return the row
        month_year := v_record.month_key;
        start_date := v_start_date;
        end_date := v_end_date;
        transaction_count := v_record.tx_count;
        total_income := v_record.income;
        total_expenses := v_record.expenses;
        period_id := v_period_id;
        created := NOT v_exists;
        
        RETURN NEXT;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to assign orphaned transactions to their corresponding periods
CREATE OR REPLACE FUNCTION public.assign_transactions_to_periods()
RETURNS TABLE (
    transaction_id UUID,
    old_period_id UUID,
    new_period_id UUID,
    transaction_date DATE,
    assigned BOOLEAN
) AS $$
DECLARE
    v_tx RECORD;
    v_period_id UUID;
BEGIN
    -- Only admins can run this
    IF NOT public.fn_is_admin() THEN
        RAISE EXCEPTION 'Only admins can assign transactions to periods';
    END IF;

    FOR v_tx IN
        SELECT 
            ft.id,
            ft.period_id,
            ft.transaction_date
        FROM finance_transactions ft
        WHERE ft.period_id IS NULL
        ORDER BY ft.transaction_date
    LOOP
        -- Find the period that contains this transaction date
        SELECT id INTO v_period_id
        FROM finance_periods
        WHERE start_date <= v_tx.transaction_date 
          AND end_date >= v_tx.transaction_date
          AND status = 'open'
        LIMIT 1;
        
        IF v_period_id IS NOT NULL THEN
            -- Assign transaction to period
            UPDATE finance_transactions
            SET period_id = v_period_id
            WHERE id = v_tx.id;
            
            transaction_id := v_tx.id;
            old_period_id := v_tx.period_id;
            new_period_id := v_period_id;
            transaction_date := v_tx.transaction_date;
            assigned := TRUE;
        ELSE
            transaction_id := v_tx.id;
            old_period_id := v_tx.period_id;
            new_period_id := NULL;
            transaction_date := v_tx.transaction_date;
            assigned := FALSE;
        END IF;
        
        RETURN NEXT;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to get orphaned transactions summary (for UI)
CREATE OR REPLACE FUNCTION public.get_orphaned_transactions_summary()
RETURNS TABLE (
    month_year TEXT,
    month_name TEXT,
    year_num INTEGER,
    month_num INTEGER,
    transaction_count BIGINT,
    total_income NUMERIC,
    total_expenses NUMERIC,
    has_period BOOLEAN,
    period_id UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        TO_CHAR(DATE_TRUNC('month', ft.transaction_date), 'YYYY-MM') AS month_year,
        TO_CHAR(DATE_TRUNC('month', ft.transaction_date), 'TMMonth') AS month_name,
        EXTRACT(YEAR FROM ft.transaction_date)::INTEGER AS year_num,
        EXTRACT(MONTH FROM ft.transaction_date)::INTEGER AS month_num,
        COUNT(*)::BIGINT AS transaction_count,
        SUM(CASE WHEN ft.type = 'income' THEN ft.amount ELSE 0 END) AS total_income,
        SUM(CASE WHEN ft.type = 'expense' THEN ft.amount ELSE 0 END) AS total_expenses,
        EXISTS (
            SELECT 1 FROM finance_periods fp
            WHERE fp.start_date <= DATE_TRUNC('month', ft.transaction_date)::DATE
              AND fp.end_date >= DATE_TRUNC('month', ft.transaction_date)::DATE
        ) AS has_period,
        (
            SELECT id FROM finance_periods fp
            WHERE fp.start_date <= DATE_TRUNC('month', ft.transaction_date)::DATE
              AND fp.end_date >= DATE_TRUNC('month', ft.transaction_date)::DATE
            LIMIT 1
        ) AS period_id
    FROM finance_transactions ft
    WHERE ft.period_id IS NULL
    GROUP BY 
        DATE_TRUNC('month', ft.transaction_date),
        EXTRACT(YEAR FROM ft.transaction_date),
        EXTRACT(MONTH FROM ft.transaction_date)
    ORDER BY year_num DESC, month_num DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
