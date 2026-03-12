ALTER TABLE finance_transactions
ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual'
CHECK (source IN ('manual', 'invoice_auto'));

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'finance_transactions_invoice_id_unique'
    ) THEN
        ALTER TABLE finance_transactions
        ADD CONSTRAINT finance_transactions_invoice_id_unique UNIQUE (invoice_id);
    END IF;
END $$;

CREATE OR REPLACE FUNCTION public.sync_paid_invoice_to_finance()
RETURNS TRIGGER AS $$
DECLARE
    v_transaction_date DATE;
    v_period_id UUID;
    v_description TEXT;
BEGIN
    v_transaction_date := COALESCE(NEW.paid_at, NEW.updated_at, NEW.created_at)::DATE;

    SELECT id
    INTO v_period_id
    FROM finance_periods
    WHERE start_date <= v_transaction_date
      AND end_date >= v_transaction_date
    ORDER BY start_date DESC
    LIMIT 1;

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

DROP TRIGGER IF EXISTS trg_sync_paid_invoice_to_finance ON invoices;
CREATE TRIGGER trg_sync_paid_invoice_to_finance
AFTER INSERT OR UPDATE OF status, amount, currency, description, project_id, paid_at
ON invoices
FOR EACH ROW
EXECUTE FUNCTION public.sync_paid_invoice_to_finance();

CREATE OR REPLACE FUNCTION public.delete_synced_invoice_finance_transaction()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM finance_transactions
    WHERE invoice_id = OLD.id
      AND source = 'invoice_auto';

    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_delete_synced_invoice_finance_transaction ON invoices;
CREATE TRIGGER trg_delete_synced_invoice_finance_transaction
AFTER DELETE ON invoices
FOR EACH ROW
EXECUTE FUNCTION public.delete_synced_invoice_finance_transaction();

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
SELECT
    'income',
    i.amount,
    i.currency,
    CASE
        WHEN COALESCE(TRIM(i.description), '') <> '' THEN
            CONCAT('Cobro factura ', i.invoice_number, ' - ', TRIM(i.description))
        ELSE
            CONCAT('Cobro factura ', i.invoice_number)
    END,
    'client_payment',
    COALESCE(i.paid_at, i.updated_at, i.created_at)::DATE,
    i.project_id,
    i.id,
    (
        SELECT fp.id
        FROM finance_periods fp
        WHERE fp.start_date <= COALESCE(i.paid_at, i.updated_at, i.created_at)::DATE
          AND fp.end_date >= COALESCE(i.paid_at, i.updated_at, i.created_at)::DATE
        ORDER BY fp.start_date DESC
        LIMIT 1
    ),
    'Ingreso sincronizado automaticamente desde facturacion.',
    NULL,
    'invoice_auto'
FROM invoices i
WHERE i.status = 'paid'
ON CONFLICT (invoice_id) DO UPDATE SET
    type = EXCLUDED.type,
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
