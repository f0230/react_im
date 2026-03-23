-- Enable Supabase Realtime for all notification-related tables.
-- Without this, postgres_changes subscriptions connect but never receive events.
--
-- Run in Supabase SQL Editor.
-- Idempotent: skips tables already in the publication.

DO $$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'notifications',
        'team_messages',
        'team_channel_reads',
        'whatsapp_messages',
        'whatsapp_thread_reads',
        'client_messages',
        'client_message_reads'
    ]
    LOOP
        -- Only add if the table exists AND is not already in the publication
        IF to_regclass('public.' || t) IS NOT NULL
           AND NOT EXISTS (
               SELECT 1
               FROM pg_publication_tables
               WHERE pubname = 'supabase_realtime'
                 AND schemaname = 'public'
                 AND tablename = t
           )
        THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
        END IF;
    END LOOP;
END $$;
