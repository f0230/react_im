-- Per-project Meta OAuth connection and account mapping
CREATE TABLE IF NOT EXISTS public.project_meta_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    connected_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,

    meta_user_id TEXT NOT NULL,
    meta_user_name TEXT,

    -- User token (used server-side to sync pages / ad accounts)
    user_access_token TEXT NOT NULL,
    user_token_expires_at TIMESTAMPTZ,

    -- Snapshot of accounts granted to the user
    page_accounts JSONB NOT NULL DEFAULT '[]'::jsonb,
    ad_accounts JSONB NOT NULL DEFAULT '[]'::jsonb,
    granted_scopes TEXT[] NOT NULL DEFAULT '{}'::text[],

    -- Project-level selected entities
    selected_page_id TEXT,
    selected_page_name TEXT,
    selected_page_access_token TEXT,
    selected_ig_id TEXT,
    selected_ig_username TEXT,
    selected_ad_account_id TEXT,
    selected_ad_account_name TEXT,

    last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT project_meta_connections_project_unique UNIQUE(project_id)
);

CREATE INDEX IF NOT EXISTS idx_project_meta_connections_project_id
    ON public.project_meta_connections(project_id);

CREATE INDEX IF NOT EXISTS idx_project_meta_connections_connected_by
    ON public.project_meta_connections(connected_by);

ALTER TABLE public.project_meta_connections ENABLE ROW LEVEL SECURITY;

-- No direct client-side access. All operations go through server-side endpoints.
-- Service role bypasses RLS for secure token handling.

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_project_meta_connections_updated_at ON public.project_meta_connections;
CREATE TRIGGER update_project_meta_connections_updated_at
    BEFORE UPDATE ON public.project_meta_connections
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

COMMENT ON TABLE public.project_meta_connections IS
'Stores the Meta OAuth connection per project, including selected page/ad account and server-side tokens.';

COMMENT ON COLUMN public.project_meta_connections.user_access_token IS
'Meta User Access Token. Sensitive. Server-only usage.';

COMMENT ON COLUMN public.project_meta_connections.selected_page_access_token IS
'Meta Page Access Token for the selected page. Sensitive. Server-only usage.';
