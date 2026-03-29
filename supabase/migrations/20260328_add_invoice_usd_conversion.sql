-- Add USD conversion fields to invoices
-- amount remains the original amount in the original currency
-- amount_usd is the converted amount in USD
-- exchange_rate is the rate used for conversion (1 USD = X currency)
ALTER TABLE invoices
    ADD COLUMN IF NOT EXISTS amount_usd NUMERIC(15, 2),
    ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(15, 6);

-- Backfill existing USD invoices: amount_usd = amount, rate = 1
UPDATE invoices
SET amount_usd = amount, exchange_rate = 1.0
WHERE currency = 'USD' AND amount_usd IS NULL;
