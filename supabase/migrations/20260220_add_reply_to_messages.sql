-- Agrega la columna reply_to_id a las tablas de mensajes de equipo y clientes
-- Esto permite el funcionamiento de responder a mensajes específicos ("reply")

ALTER TABLE public.team_messages 
ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES public.team_messages(id) ON DELETE SET NULL;

ALTER TABLE public.client_messages 
ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES public.client_messages(id) ON DELETE SET NULL;
