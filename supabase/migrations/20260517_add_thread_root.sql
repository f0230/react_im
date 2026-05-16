-- Agrega soporte para hilos en team_messages.
-- thread_root_id: apunta al mensaje raíz del hilo (distinto de reply_to_id que es inline reply).
ALTER TABLE public.team_messages
ADD COLUMN IF NOT EXISTS thread_root_id uuid REFERENCES public.team_messages(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS team_messages_thread_root_idx ON public.team_messages(thread_root_id);
