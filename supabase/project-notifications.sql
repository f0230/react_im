-- triggers and functions for notifications on projects, tasks and comments
-- Run this in the Supabase SQL Editor.

-- 1. Helper Function to create notifications for multiple users
CREATE OR REPLACE FUNCTION public.create_notifications(
    p_recipient_ids uuid[],
    p_type text,
    p_title text,
    p_body text,
    p_data jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_recipient_id uuid;
    v_actor_id uuid := auth.uid();
BEGIN
    FOREACH v_recipient_id IN ARRAY p_recipient_ids
    LOOP
        -- Don't notify the person who triggered the event
        IF v_recipient_id IS NOT NULL AND v_recipient_id <> coalesce(v_actor_id, '00000000-0000-0000-0000-000000000000'::uuid) THEN
            INSERT INTO public.notifications (recipient_id, type, title, body, data)
            VALUES (v_recipient_id, p_type, p_title, p_body, p_data)
            ON CONFLICT DO NOTHING;
        END IF;
    END LOOP;
END;
$$;

-- 2. Trigger Function for New Task (Service)
CREATE OR REPLACE FUNCTION public.on_service_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_project_title text;
    v_client_user_id uuid;
    v_recipient_ids uuid[];
BEGIN
    -- Get project info
    SELECT title, client_id INTO v_project_title, v_client_user_id
    FROM public.projects
    WHERE id = NEW.project_id;
    
    -- Get client's user_id if client_id is a reference to public.clients
    SELECT user_id INTO v_client_user_id FROM public.clients WHERE id = v_client_user_id;

    -- Collect recipients:
    v_recipient_ids := ARRAY(
        -- 1. All Admins
        SELECT id FROM public.profiles WHERE role = 'admin'
        UNION
        -- 2. All Workers assigned to the project
        SELECT worker_id FROM public.project_assignments WHERE project_id = NEW.project_id
        UNION
        -- 3. The Client
        SELECT v_client_user_id WHERE v_client_user_id IS NOT NULL
    );

    PERFORM public.create_notifications(
        v_recipient_ids,
        'new_task',
        'Nueva Tarea: ' || NEW.title,
        'Se ha creado una nueva tarea en el proyecto ' || v_project_title,
        jsonb_build_object('project_id', NEW.project_id, 'service_id', NEW.id)
    );

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_on_service_created ON public.services;
CREATE TRIGGER tr_on_service_created
AFTER INSERT ON public.services
FOR EACH ROW EXECUTE FUNCTION public.on_service_created();

-- 3. Trigger Function for Task Responsible Assignment
CREATE OR REPLACE FUNCTION public.on_service_responsible_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NEW.responsible_id IS NOT NULL AND (OLD.responsible_id IS NULL OR NEW.responsible_id <> OLD.responsible_id) THEN
        PERFORM public.create_notifications(
            ARRAY[NEW.responsible_id],
            'task_assignment',
            'Tarea Asignada: ' || NEW.title,
            'Se te ha asignado como responsable de esta tarea.',
            jsonb_build_object('project_id', NEW.project_id, 'service_id', NEW.id)
        );
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_on_service_responsible_changed ON public.services;
CREATE TRIGGER tr_on_service_responsible_changed
AFTER UPDATE OF responsible_id ON public.services
FOR EACH ROW EXECUTE FUNCTION public.on_service_responsible_changed();

-- 4. Trigger Function for New Comment
CREATE OR REPLACE FUNCTION public.on_service_comment_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_service_title text;
    v_project_id uuid;
    v_project_title text;
    v_client_user_id uuid;
    v_task_responsible_id uuid;
    v_recipient_ids uuid[];
    v_author_name text;
BEGIN
    -- Get service and project info
    SELECT s.title, s.project_id, s.responsible_id, p.title, p.client_id
    INTO v_service_title, v_project_id, v_task_responsible_id, v_project_title, v_client_user_id
    FROM public.services s
    JOIN public.projects p ON p.id = s.project_id
    WHERE s.id = NEW.service_id;
    
    -- Get client's user_id
    SELECT user_id INTO v_client_user_id FROM public.clients WHERE id = v_client_user_id;

    -- Get author name
    SELECT full_name INTO v_author_name FROM public.profiles WHERE id = NEW.author_id;

    -- Collect recipients:
    v_recipient_ids := ARRAY(
        -- 1. All Admins
        SELECT id FROM public.profiles WHERE role = 'admin'
        UNION
        -- 2. Task Responsible
        SELECT v_task_responsible_id WHERE v_task_responsible_id IS NOT NULL
        UNION
        -- 3. All Workers assigned to the project
        SELECT worker_id FROM public.project_assignments WHERE project_id = v_project_id
        UNION
        -- 4. The Client
        SELECT v_client_user_id WHERE v_client_user_id IS NOT NULL
    );

    PERFORM public.create_notifications(
        v_recipient_ids,
        'new_comment',
        'Nuevo Comentario en ' || v_service_title,
        v_author_name || ': ' || LEFT(NEW.body, 50) || CASE WHEN length(NEW.body) > 50 THEN '...' ELSE '' END,
        jsonb_build_object('project_id', v_project_id, 'service_id', NEW.service_id, 'comment_id', NEW.id)
    );

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_on_service_comment_created ON public.service_comments;
CREATE TRIGGER tr_on_service_comment_created
AFTER INSERT ON public.service_comments
FOR EACH ROW EXECUTE FUNCTION public.on_service_comment_created();

-- 5. Trigger Function for New Project
CREATE OR REPLACE FUNCTION public.on_project_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_client_user_id uuid;
    v_recipient_ids uuid[];
BEGIN
    -- Get client's user_id
    SELECT user_id INTO v_client_user_id FROM public.clients WHERE id = NEW.client_id;

    -- Collect recipients:
    v_recipient_ids := ARRAY(
        -- 1. All Admins
        SELECT id FROM public.profiles WHERE role = 'admin'
        UNION
        -- 2. The Client
        SELECT v_client_user_id WHERE v_client_user_id IS NOT NULL
    );

    PERFORM public.create_notifications(
        v_recipient_ids,
        'new_project',
        'Nuevo Proyecto: ' || NEW.title,
        'Se ha registrado un nuevo proyecto.',
        jsonb_build_object('project_id', NEW.id)
    );

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_on_project_created ON public.projects;
CREATE TRIGGER tr_on_project_created
AFTER INSERT ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.on_project_created();
