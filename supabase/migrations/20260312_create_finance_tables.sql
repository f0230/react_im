-- ============================================================
-- Finance & Dividends Module
-- ============================================================
-- Tables: finance_config, finance_periods, finance_transactions,
--         finance_worker_contributions, finance_distributions
-- Function: close_period(p_period_id UUID)
-- ============================================================

-- -----------------------------------------------
-- 1. finance_config (singleton — one row always)
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS finance_config (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Distribution percentages (must sum to 100)
    pct_francisco         NUMERIC(5,2) NOT NULL DEFAULT 40.00,
    pct_federico          NUMERIC(5,2) NOT NULL DEFAULT 30.00,
    pct_workers           NUMERIC(5,2) NOT NULL DEFAULT 15.00,
    pct_company           NUMERIC(5,2) NOT NULL DEFAULT 15.00,
    CONSTRAINT pct_sum_100 CHECK (
        ROUND(pct_francisco + pct_federico + pct_workers + pct_company, 2) = 100.00
    ),
    -- Links to actual admin profiles (set from Settings page)
    francisco_profile_id  UUID REFERENCES profiles(id) ON DELETE SET NULL,
    federico_profile_id   UUID REFERENCES profiles(id) ON DELETE SET NULL,
    -- Default currency for distributions
    default_currency      TEXT NOT NULL DEFAULT 'USD',
    updated_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by            UUID REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_finance_config_singleton
ON finance_config ((true));

-- Seed the single config row
INSERT INTO finance_config (pct_francisco, pct_federico, pct_workers, pct_company)
SELECT 40.00, 30.00, 15.00, 15.00
WHERE NOT EXISTS (SELECT 1 FROM finance_config);

-- RLS
ALTER TABLE finance_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage finance_config"
ON finance_config FOR ALL
TO authenticated
USING (public.fn_is_admin())
WITH CHECK (public.fn_is_admin());


-- -----------------------------------------------
-- 2. finance_periods — billing periods (monthly or custom)
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS finance_periods (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name           TEXT NOT NULL,           -- e.g. "Marzo 2026"
    start_date     DATE NOT NULL,
    end_date       DATE NOT NULL,
    status         TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    -- Snapshot computed and stored at close time
    total_income   NUMERIC(15,2) NOT NULL DEFAULT 0,
    total_expenses NUMERIC(15,2) NOT NULL DEFAULT 0,
    net_profit     NUMERIC(15,2) NOT NULL DEFAULT 0,
    created_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    closed_at      TIMESTAMP WITH TIME ZONE
);

-- RLS
ALTER TABLE finance_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage finance_periods"
ON finance_periods FOR ALL
TO authenticated
USING (public.fn_is_admin())
WITH CHECK (public.fn_is_admin());


-- -----------------------------------------------
-- 3. finance_transactions — the general ledger
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS finance_transactions (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type             TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    amount           NUMERIC(15,2) NOT NULL CHECK (amount > 0),
    currency         TEXT NOT NULL DEFAULT 'USD',
    description      TEXT,
    category         TEXT NOT NULL,
    -- Date of actual cash movement (not created_at)
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    -- Optional linkage
    project_id       UUID REFERENCES projects(id) ON DELETE SET NULL,
    invoice_id       UUID REFERENCES invoices(id) ON DELETE SET NULL,
    period_id        UUID REFERENCES finance_periods(id) ON DELETE SET NULL,
    -- For expenses: vendor or recipient
    paid_to          TEXT,
    notes            TEXT,
    created_by       UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ftx_type       ON finance_transactions(type);
CREATE INDEX IF NOT EXISTS idx_ftx_period     ON finance_transactions(period_id);
CREATE INDEX IF NOT EXISTS idx_ftx_date       ON finance_transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_ftx_project    ON finance_transactions(project_id);

-- RLS
ALTER TABLE finance_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage finance_transactions"
ON finance_transactions FOR ALL
TO authenticated
USING (public.fn_is_admin())
WITH CHECK (public.fn_is_admin());

-- Trigger for updated_at
CREATE TRIGGER update_finance_transactions_updated_at
    BEFORE UPDATE ON finance_transactions
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();


-- -----------------------------------------------
-- 4. finance_worker_contributions — per-period worker weights
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS finance_worker_contributions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    period_id           UUID NOT NULL REFERENCES finance_periods(id) ON DELETE CASCADE,
    worker_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    project_id          UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    -- Admin-assigned weight (0-100). Share = own_weight / sum(all weights in period)
    contribution_weight NUMERIC(5,2) NOT NULL DEFAULT 0
                        CHECK (contribution_weight >= 0 AND contribution_weight <= 100),
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(period_id, worker_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_fwc_period ON finance_worker_contributions(period_id);
CREATE INDEX IF NOT EXISTS idx_fwc_worker ON finance_worker_contributions(worker_id);

-- RLS
ALTER TABLE finance_worker_contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage finance_worker_contributions"
ON finance_worker_contributions FOR ALL
TO authenticated
USING (public.fn_is_admin())
WITH CHECK (public.fn_is_admin());


-- -----------------------------------------------
-- 5. finance_distributions — per-person allocation per period
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS finance_distributions (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    period_id      UUID NOT NULL REFERENCES finance_periods(id) ON DELETE CASCADE,
    -- NULL for company fund rows
    profile_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
    recipient_type TEXT NOT NULL CHECK (recipient_type IN ('admin', 'worker', 'company')),
    amount_earned  NUMERIC(15,2) NOT NULL DEFAULT 0,
    amount_paid    NUMERIC(15,2) NOT NULL DEFAULT 0,
    -- Generated: always consistent with amount_paid updates
    amount_pending NUMERIC(15,2) GENERATED ALWAYS AS (amount_earned - amount_paid) STORED,
    currency       TEXT NOT NULL DEFAULT 'USD',
    paid_at        TIMESTAMP WITH TIME ZONE,
    paid_by        UUID REFERENCES profiles(id) ON DELETE SET NULL,
    notes          TEXT,
    created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fd_profile ON finance_distributions(profile_id);
CREATE INDEX IF NOT EXISTS idx_fd_period  ON finance_distributions(period_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_fd_unique_profile_recipient
ON finance_distributions(period_id, profile_id, recipient_type)
WHERE profile_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_fd_unique_company_recipient
ON finance_distributions(period_id, recipient_type)
WHERE profile_id IS NULL;

-- RLS
ALTER TABLE finance_distributions ENABLE ROW LEVEL SECURITY;

-- Admins: full access
CREATE POLICY "Admins can manage finance_distributions"
ON finance_distributions FOR ALL
TO authenticated
USING (public.fn_is_admin())
WITH CHECK (public.fn_is_admin());

-- Workers: read only their own rows
CREATE POLICY "Workers can view their own distributions"
ON finance_distributions FOR SELECT
TO authenticated
USING (
    profile_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'worker'
    )
);


-- -----------------------------------------------
-- 6. close_period() — atomic period closing function
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION public.close_period(p_period_id UUID)
RETURNS void AS $$
DECLARE
    v_total_income   NUMERIC(15,2);
    v_total_expenses NUMERIC(15,2);
    v_net_profit     NUMERIC(15,2);
    v_config         finance_config%ROWTYPE;
    v_workers_pool   NUMERIC(15,2);
    v_total_weight   NUMERIC;
    v_worker         RECORD;
    v_worker_share   NUMERIC(15,2);
BEGIN
    -- Guard: period must exist and be open
    IF NOT EXISTS (
        SELECT 1 FROM finance_periods
        WHERE id = p_period_id AND status = 'open'
    ) THEN
        RAISE EXCEPTION 'Period % does not exist or is already closed', p_period_id;
    END IF;

    -- Caller must be admin
    IF NOT public.fn_is_admin() THEN
        RAISE EXCEPTION 'Only admins can close periods';
    END IF;

    -- Sum income and expenses for this period
    SELECT
        COALESCE(SUM(CASE WHEN type = 'income'  THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)
    INTO v_total_income, v_total_expenses
    FROM finance_transactions
    WHERE period_id = p_period_id;

    v_net_profit := v_total_income - v_total_expenses;

    -- Load config
    SELECT * INTO v_config FROM finance_config LIMIT 1;

    -- Stamp totals and close the period
    UPDATE finance_periods SET
        total_income   = v_total_income,
        total_expenses = v_total_expenses,
        net_profit     = v_net_profit,
        status         = 'closed',
        closed_at      = NOW()
    WHERE id = p_period_id;

    -- Francisco distribution
    IF v_config.francisco_profile_id IS NOT NULL THEN
        INSERT INTO finance_distributions
            (period_id, profile_id, recipient_type, amount_earned, currency)
        VALUES
            (p_period_id,
             v_config.francisco_profile_id,
             'admin',
             ROUND(v_net_profit * v_config.pct_francisco / 100, 2),
             v_config.default_currency)
        ON CONFLICT DO NOTHING;
    END IF;

    -- Federico distribution
    IF v_config.federico_profile_id IS NOT NULL THEN
        INSERT INTO finance_distributions
            (period_id, profile_id, recipient_type, amount_earned, currency)
        VALUES
            (p_period_id,
             v_config.federico_profile_id,
             'admin',
             ROUND(v_net_profit * v_config.pct_federico / 100, 2),
             v_config.default_currency)
        ON CONFLICT DO NOTHING;
    END IF;

    -- Company fund (profile_id = NULL)
    INSERT INTO finance_distributions
        (period_id, profile_id, recipient_type, amount_earned, currency)
    VALUES
        (p_period_id,
         NULL,
         'company',
         ROUND(v_net_profit * v_config.pct_company / 100, 2),
         v_config.default_currency)
    ON CONFLICT DO NOTHING;

    -- Workers pool: distribute proportionally by contribution weight
    v_workers_pool := ROUND(v_net_profit * v_config.pct_workers / 100, 2);

    SELECT COALESCE(SUM(contribution_weight), 0)
    INTO v_total_weight
    FROM finance_worker_contributions
    WHERE period_id = p_period_id;

    IF v_total_weight > 0 THEN
        FOR v_worker IN
            SELECT
                worker_id,
                SUM(contribution_weight) AS total_weight
            FROM finance_worker_contributions
            WHERE period_id = p_period_id
            GROUP BY worker_id
        LOOP
            v_worker_share := ROUND(
                v_workers_pool * v_worker.total_weight / v_total_weight,
                2
            );
            INSERT INTO finance_distributions
                (period_id, profile_id, recipient_type, amount_earned, currency)
            VALUES
                (p_period_id,
                 v_worker.worker_id,
                 'worker',
                 v_worker_share,
                 v_config.default_currency)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
