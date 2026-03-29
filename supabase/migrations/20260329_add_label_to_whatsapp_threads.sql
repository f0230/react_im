-- Add label column to whatsapp_threads for persistent conversation classification
ALTER TABLE public.whatsapp_threads
    ADD COLUMN IF NOT EXISTS label TEXT;

-- Ensure status column exists (used by inbox closed filter)
ALTER TABLE public.whatsapp_threads
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'open';

-- Reopen closed threads automatically when a new inbound message arrives
CREATE OR REPLACE FUNCTION public.reopen_closed_thread_on_message()
RETURNS TRIGGER AS $$
BEGIN
    -- Only reopen on inbound messages (client wrote back)
    IF NEW.direction = 'inbound' THEN
        UPDATE public.whatsapp_threads
        SET status = 'open'
        WHERE wa_id = NEW.wa_id
          AND status = 'closed';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_reopen_closed_thread ON public.whatsapp_messages;
CREATE TRIGGER trg_reopen_closed_thread
    AFTER INSERT ON public.whatsapp_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.reopen_closed_thread_on_message();
