-- Enable realtime DELETE payloads for service_posts
-- Without REPLICA IDENTITY FULL, DELETE events arrive with empty payload.old
-- so the client-side filter (payload.old.id) never matches.
ALTER TABLE public.service_posts REPLICA IDENTITY FULL;

-- Add to the realtime publication if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename = 'service_posts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.service_posts;
  END IF;
END $$;
