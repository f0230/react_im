ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE;

UPDATE invoices
SET paid_at = COALESCE(paid_at, updated_at, created_at)
WHERE status = 'paid'
  AND paid_at IS NULL;
