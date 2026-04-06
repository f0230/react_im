-- ============================================================
-- Finance: canonical cash accounts model + integrity checks
--
-- 1. finance_accounts       — named real or virtual accounts
-- 2. finance_account_movements — double-entry-style ledger
-- 3. Backfill finance_company_fund_movements → fund account
-- 4. DB constraint: amount_paid <= amount_earned
-- 5. Helper: get_finance_account_balance()
-- ============================================================

-- -----------------------------------------------
-- 1. finance_accounts
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.finance_accounts (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        TEXT NOT NULL,
    -- bank: real bank account
    -- cash: physical cash wallet
    -- fund: internal reserve/fund (e.g. Fondo empresa)
    -- external: owner-funded or external source
    type        TEXT NOT NULL CHECK (type IN ('bank', 'cash', 'fund', 'external')),
    currency    TEXT NOT NULL DEFAULT 'USD',
    is_default  BOOLEAN NOT NULL DEFAULT FALSE,
    notes       TEXT,
    created_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Only one default account per currency
CREATE UNIQUE INDEX IF NOT EXISTS idx_finance_accounts_default_per_currency
    ON public.finance_accounts(currency)
    WHERE is_default = TRUE;

CREATE INDEX IF NOT EXISTS idx_finance_accounts_type
    ON public.finance_accounts(type);

ALTER TABLE public.finance_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage finance_accounts"
ON public.finance_accounts FOR ALL
TO authenticated
USING (public.fn_is_admin())
WITH CHECK (public.fn_is_admin());

-- Seed: company fund/reserve account (maps to existing finance_company_fund_movements)
INSERT INTO public.finance_accounts (name, type, currency, is_default, notes)
SELECT
    'Fondo empresa / Reserva',
    'fund',
    'USD',
    FALSE,
    'Reserva interna. Acumula excedente de períodos cerrados. No representa saldo bancario real.'
WHERE NOT EXISTS (SELECT 1 FROM public.finance_accounts WHERE type = 'fund' AND currency = 'USD');

-- Seed: default cash/bank account
INSERT INTO public.finance_accounts (name, type, currency, is_default, notes)
SELECT
    'Caja / Banco principal',
    'bank',
    'USD',
    TRUE,
    'Cuenta bancaria o caja principal de la empresa. Fuente de verdad para saldo disponible real.'
WHERE NOT EXISTS (
    SELECT 1 FROM public.finance_accounts WHERE is_default = TRUE AND currency = 'USD'
);

-- -----------------------------------------------
-- 2. finance_account_movements
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.finance_account_movements (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id      UUID NOT NULL REFERENCES public.finance_accounts(id) ON DELETE CASCADE,
    direction       TEXT NOT NULL CHECK (direction IN ('credit', 'debit')),
    amount          NUMERIC(15,2) NOT NULL CHECK (amount > 0),
    currency        TEXT NOT NULL DEFAULT 'USD',
    -- reference_type describes what created this movement
    reference_type  TEXT CHECK (
        reference_type IN ('transaction', 'distribution_payment', 'fund_movement', 'transfer', 'manual')
    ),
    reference_id    UUID,  -- FK to the originating record (loose reference for flexibility)
    description     TEXT,
    movement_date   DATE NOT NULL DEFAULT CURRENT_DATE,
    created_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_finance_account_movements_account_date
    ON public.finance_account_movements(account_id, movement_date DESC);

CREATE INDEX IF NOT EXISTS idx_finance_account_movements_reference
    ON public.finance_account_movements(reference_type, reference_id)
    WHERE reference_id IS NOT NULL;

ALTER TABLE public.finance_account_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage finance_account_movements"
ON public.finance_account_movements FOR ALL
TO authenticated
USING (public.fn_is_admin())
WITH CHECK (public.fn_is_admin());

-- -----------------------------------------------
-- 3. Backfill: import existing company fund movements
--    into the new finance_account_movements table.
--    This makes the fund account balance consistent
--    with the existing finance_company_fund_movements ledger.
-- -----------------------------------------------
INSERT INTO public.finance_account_movements (
    account_id,
    direction,
    amount,
    currency,
    reference_type,
    reference_id,
    description,
    movement_date,
    created_at
)
SELECT
    (SELECT id FROM public.finance_accounts WHERE type = 'fund' AND currency = 'USD' LIMIT 1),
    CASE WHEN fcfm.movement_type = 'credit' THEN 'credit' ELSE 'debit' END,
    fcfm.amount,
    COALESCE(fcfm.currency, 'USD'),
    'fund_movement',
    fcfm.id,
    COALESCE(fcfm.description, fcfm.movement_source),
    fcfm.movement_date,
    fcfm.created_at
FROM public.finance_company_fund_movements fcfm
WHERE NOT EXISTS (
    SELECT 1
    FROM public.finance_account_movements fam
    WHERE fam.reference_type = 'fund_movement'
      AND fam.reference_id = fcfm.id
);

-- -----------------------------------------------
-- 4. Integrity constraint: amount_paid <= amount_earned
--    Guards against overpayment of distributions.
--    Added only if all existing data satisfies it.
-- -----------------------------------------------
DO $$
BEGIN
    -- Check if constraint already exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'finance_distributions_amount_paid_le_earned'
    ) THEN
        RETURN;
    END IF;

    -- Only add if existing data is clean
    IF EXISTS (
        SELECT 1 FROM public.finance_distributions
        WHERE amount_paid > amount_earned
    ) THEN
        RAISE WARNING
            'Skipping amount_paid <= amount_earned constraint: found rows where amount_paid > amount_earned. Fix the data first.';
        RETURN;
    END IF;

    ALTER TABLE public.finance_distributions
        ADD CONSTRAINT finance_distributions_amount_paid_le_earned
        CHECK (amount_paid <= amount_earned);
END $$;

-- -----------------------------------------------
-- 5. Helper: compute balance of an account up to a date
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION public.get_finance_account_balance(
    p_account_id UUID,
    p_as_of_date DATE DEFAULT CURRENT_DATE
) RETURNS NUMERIC AS $$
    SELECT COALESCE(
        SUM(
            CASE direction
                WHEN 'credit' THEN amount
                ELSE -amount
            END
        ),
        0
    )::NUMERIC(15,2)
    FROM public.finance_account_movements
    WHERE account_id = p_account_id
      AND movement_date <= p_as_of_date;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;
