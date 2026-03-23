-- Appointment in-app notifications + extend Slack triggers to cover
-- notifications, appointments, and client_messages tables.
--
-- Run in Supabase SQL Editor.

-- ─── 1. Appointment notification trigger ────────────────────────────────────

CREATE OR REPLACE FUNCTION public.on_appointment_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_recipient_ids uuid[];
    v_title text;
    v_body text;
BEGIN
    v_title := 'Nueva Cita: ' || COALESCE(NEW.event_type_name, 'Reunión');
    v_body  := COALESCE(NEW.client_name, NEW.client_email, 'Cliente')
               || ' — '
               || to_char(NEW.scheduled_at AT TIME ZONE COALESCE(NEW.booking_time_zone, 'America/Montevideo'),
                          'DD/MM/YYYY HH24:MI');

    -- Notify all admins + the assigned user (if any)
    v_recipient_ids := ARRAY(
        SELECT id FROM public.profiles WHERE role = 'admin'
        UNION
        SELECT NEW.user_id WHERE NEW.user_id IS NOT NULL
    );

    PERFORM public.create_notifications(
        v_recipient_ids,
        'new_appointment',
        v_title,
        v_body,
        jsonb_build_object(
            'appointment_id', NEW.id,
            'project_id', NEW.project_id,
            'client_id', NEW.client_id,
            'scheduled_at', NEW.scheduled_at
        )
    );

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_on_appointment_created ON public.appointments;
CREATE TRIGGER tr_on_appointment_created
AFTER INSERT ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.on_appointment_created();

-- ─── 2. Extend Slack notify_slack() triggers ────────────────────────────────
-- Add triggers for tables that currently don't notify Slack:
--   notifications (project/task/comment events)
--   appointments
--   client_messages (inbound only handled in API)

DO $$
BEGIN
    -- notifications table → Slack
    IF to_regclass('public.notifications') IS NOT NULL THEN
        EXECUTE 'DROP TRIGGER IF EXISTS notifications_notify_slack ON public.notifications;';
        EXECUTE 'CREATE TRIGGER notifications_notify_slack
                 AFTER INSERT ON public.notifications
                 FOR EACH ROW EXECUTE FUNCTION public.notify_slack();';
    END IF;

    -- appointments table → Slack
    IF to_regclass('public.appointments') IS NOT NULL THEN
        EXECUTE 'DROP TRIGGER IF EXISTS appointments_notify_slack ON public.appointments;';
        EXECUTE 'CREATE TRIGGER appointments_notify_slack
                 AFTER INSERT ON public.appointments
                 FOR EACH ROW EXECUTE FUNCTION public.notify_slack();';
    END IF;

    -- client_messages table → Slack
    IF to_regclass('public.client_messages') IS NOT NULL THEN
        EXECUTE 'DROP TRIGGER IF EXISTS client_messages_notify_slack ON public.client_messages;';
        EXECUTE 'CREATE TRIGGER client_messages_notify_slack
                 AFTER INSERT ON public.client_messages
                 FOR EACH ROW EXECUTE FUNCTION public.notify_slack();';
    END IF;
END $$;
