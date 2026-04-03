ALTER TABLE public.project_blotato_config
ADD COLUMN IF NOT EXISTS assigned_accounts jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.project_blotato_config.assigned_accounts IS 'Destinos de publicacion asignados al proyecto. Permite multiples paginas por cuenta (ej. Facebook pageId).';

UPDATE public.project_blotato_config
SET assigned_accounts = COALESCE(
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', account->>'id',
        'platform', account->>'platform',
        'username', account->>'username',
        'fullname', account->>'fullname',
        'profileImageUrl', account->>'profileImageUrl',
        'targetConfig', '{}'::jsonb
      )
    )
    FROM jsonb_array_elements(COALESCE(connected_accounts, '[]'::jsonb)) AS account
    WHERE (account->>'id') = ANY(COALESCE(assigned_account_ids, ARRAY[]::text[]))
  ),
  '[]'::jsonb
)
WHERE COALESCE(jsonb_array_length(assigned_accounts), 0) = 0
  AND COALESCE(array_length(assigned_account_ids, 1), 0) > 0;
