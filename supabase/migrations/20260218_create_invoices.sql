-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    invoice_number TEXT UNIQUE NOT NULL,
    description TEXT,
    amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    currency TEXT NOT NULL DEFAULT 'USD',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
    due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Policies
-- Admin can do everything
CREATE POLICY "Admins can do everything on invoices"
ON invoices FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- Clients can only view their own invoices
CREATE POLICY "Clients can view their own invoices"
ON invoices FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM clients
        WHERE clients.id = invoices.client_id
        AND clients.user_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM projects
        WHERE projects.id = invoices.project_id
        AND projects.user_id = auth.uid()
    )
);

-- Workers can view invoices of projects they are assigned to
CREATE POLICY "Workers can view invoices of assigned projects"
ON invoices FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM project_assignments
        WHERE project_assignments.project_id = invoices.project_id
        AND project_assignments.worker_id = auth.uid()
    )
);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
