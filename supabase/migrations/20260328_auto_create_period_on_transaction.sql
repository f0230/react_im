-- ============================================================
-- Auto-create period when a paid invoice generates a transaction
-- ============================================================
-- Replaces sync_paid_invoice_to_finance() so that if no period
-- exists for the transaction month, one is created automatically.
-- Users never need to create periods manually.
-- ============================================================

CREATE OR REPLACE FUNCTION public.sync_paid_invoice_to_finance()
RETURNS TRIGGER AS $$
DECLARE
    v_transaction_date DATE;
    v_period_id UUID;
    v_description TEXT;
    v_month_start DATE;
    v_month_end DATE;
    v_period_name TEXT;
BEGIN
    v_transaction_date := COALESCE(NEW.due_date, NEW.paid_at, NEW.updated_at, NEW.created_at)::DATE;

    -- Try to find an existing period that covers this date
    SELECT id
    INTO v_period_id
    FROM finance_periods
    WHERE start_date <= v_transaction_date
      AND end_date >= v_transaction_date
    ORDER BY start_date DESC
    LIMIT 1;

    -- If no period exists for this month, create one automatically
    IF v_period_id IS NULL THEN
        v_month_start := DATE_TRUNC('month', v_transaction_date)::DATE;
        v_month_end   := (v_month_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
        v_period_name := INITCAP(TO_CHAR(v_month_start, 'TMMonth YYYY'));

        INSERT INTO finance_periods (name, start_date, end_date, status, created_by)
        VALUES (v_period_name, v_month_start, v_month_end, 'open', auth.uid())
        RETURNING id INTO v_period_id;
    END IF;

    v_description := CASE
        WHEN COALESCE(TRIM(NEW.description), '') <> '' THEN
            CONCAT('Cobro factura ', NEW.invoice_number, ' - ', TRIM(NEW.description))
        ELSE
            CONCAT('Cobro factura ', NEW.invoice_number)
    END;

    IF NEW.status = 'paid' THEN
        INSERT INTO finance_transactions (
            type,
            amount,
            currency,
            description,
            category,
            transaction_date,
            project_id,
            invoice_id,
            period_id,
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
            'Ingreso sincronizado automaticamente desde facturacion.',
            auth.uid(),
            'invoice_auto'
        )
        ON CONFLICT (invoice_id) DO UPDATE SET
            type = 'income',
            amount = EXCLUDED.amount,
            currency = EXCLUDED.currency,
            description = EXCLUDED.description,
            category = EXCLUDED.category,
            transaction_date = EXCLUDED.transaction_date,
            project_id = EXCLUDED.project_id,
            period_id = EXCLUDED.period_id,
            notes = EXCLUDED.notes,
            source = 'invoice_auto',
            updated_at = NOW();
    ELSE
        DELETE FROM finance_transactions
        WHERE invoice_id = NEW.id
          AND source = 'invoice_auto';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Also auto-assign period when a transaction is inserted/updated manually
-- (covers the case where someone adds a transaction from the ledger, not from an invoice)
CREATE OR REPLACE FUNCTION public.auto_assign_period_on_transaction()
RETURNS TRIGGER AS $$
DECLARE
    v_period_id UUID;
    v_month_start DATE;
    v_month_end DATE;
    v_period_name TEXT;
BEGIN
    -- Only act if period_id is not already set
    IF NEW.period_id IS NOT NULL THEN
        RETURN NEW;
    END IF;

    -- Try to find an existing period
    SELECT id INTO v_period_id
    FROM finance_periods
    WHERE start_date <= NEW.transaction_date
      AND end_date >= NEW.transaction_date
    ORDER BY start_date DESC
    LIMIT 1;

    -- If none exists, create it
    IF v_period_id IS NULL THEN
        v_month_start := DATE_TRUNC('month', NEW.transaction_date)::DATE;
        v_month_end   := (v_month_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
        v_period_name := INITCAP(TO_CHAR(v_month_start, 'TMMonth YYYY'));

        INSERT INTO finance_periods (name, start_date, end_date, status, created_by)
        VALUES (v_period_name, v_month_start, v_month_end, 'open', auth.uid())
        RETURNING id INTO v_period_id;
    END IF;

    NEW.period_id := v_period_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Attach the trigger to finance_transactions (BEFORE so we can modify NEW)
DROP TRIGGER IF EXISTS trg_auto_assign_period ON finance_transactions;
CREATE TRIGGER trg_auto_assign_period
BEFORE INSERT OR UPDATE OF transaction_date
ON finance_transactions
FOR EACH ROW
EXECUTE FUNCTION public.auto_assign_period_on_transaction();

-- Backfill: assign orphaned transactions to existing or new periods
DO $$
DECLARE
    v_tx RECORD;
    v_period_id UUID;
    v_month_start DATE;
    v_month_end DATE;
    v_period_name TEXT;
BEGIN
    FOR v_tx IN
        SELECT id, transaction_date
        FROM finance_transactions
        WHERE period_id IS NULL
        ORDER BY transaction_date
    LOOP
        SELECT id INTO v_period_id
        FROM finance_periods
        WHERE start_date <= v_tx.transaction_date
          AND end_date >= v_tx.transaction_date
        LIMIT 1;

        IF v_period_id IS NULL THEN
            v_month_start := DATE_TRUNC('month', v_tx.transaction_date)::DATE;
            v_month_end   := (v_month_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
            v_period_name := INITCAP(TO_CHAR(v_month_start, 'TMMonth YYYY'));

            INSERT INTO finance_periods (name, start_date, end_date, status)
            VALUES (v_period_name, v_month_start, v_month_end, 'open')
            RETURNING id INTO v_period_id;
        END IF;

        UPDATE finance_transactions
        SET period_id = v_period_id
        WHERE id = v_tx.id;
    END LOOP;
END $$;
