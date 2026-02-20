-- Make project notification triggers compatible with projects schemas
-- that use name/project_name instead of title.

CREATE OR REPLACE FUNCTION public.on_service_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_project_title text;
    v_client_id uuid;
    v_client_user_id uuid;
    v_recipient_ids uuid[];
BEGIN
    SELECT
        COALESCE(
            to_jsonb(p) ->> 'title',
            to_jsonb(p) ->> 'name',
            to_jsonb(p) ->> 'project_name',
            'Proyecto sin título'
        ),
        p.client_id
    INTO v_project_title, v_client_id
    FROM public.projects p
    WHERE p.id = NEW.project_id;

    SELECT user_id INTO v_client_user_id
    FROM public.clients
    WHERE id = v_client_id;

    v_recipient_ids := ARRAY(
        SELECT id FROM public.profiles WHERE role = 'admin'
        UNION
        SELECT worker_id FROM public.project_assignments WHERE project_id = NEW.project_id
        UNION
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

CREATE OR REPLACE FUNCTION public.on_service_comment_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_service_title text;
    v_project_id uuid;
    v_project_title text;
    v_client_id uuid;
    v_client_user_id uuid;
    v_task_responsible_id uuid;
    v_recipient_ids uuid[];
    v_author_name text;
BEGIN
    SELECT
        s.title,
        s.project_id,
        s.responsible_id,
        COALESCE(
            to_jsonb(p) ->> 'title',
            to_jsonb(p) ->> 'name',
            to_jsonb(p) ->> 'project_name',
            'Proyecto sin título'
        ),
        p.client_id
    INTO v_service_title, v_project_id, v_task_responsible_id, v_project_title, v_client_id
    FROM public.services s
    JOIN public.projects p ON p.id = s.project_id
    WHERE s.id = NEW.service_id;

    SELECT user_id INTO v_client_user_id
    FROM public.clients
    WHERE id = v_client_id;

    SELECT full_name INTO v_author_name
    FROM public.profiles
    WHERE id = NEW.author_id;

    v_recipient_ids := ARRAY(
        SELECT id FROM public.profiles WHERE role = 'admin'
        UNION
        SELECT v_task_responsible_id WHERE v_task_responsible_id IS NOT NULL
        UNION
        SELECT worker_id FROM public.project_assignments WHERE project_id = v_project_id
        UNION
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

CREATE OR REPLACE FUNCTION public.on_project_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_client_user_id uuid;
    v_project_title text;
    v_recipient_ids uuid[];
BEGIN
    v_project_title := COALESCE(
        to_jsonb(NEW) ->> 'title',
        to_jsonb(NEW) ->> 'name',
        to_jsonb(NEW) ->> 'project_name',
        'Proyecto sin título'
    );

    SELECT user_id INTO v_client_user_id
    FROM public.clients
    WHERE id = NEW.client_id;

    v_recipient_ids := ARRAY(
        SELECT id FROM public.profiles WHERE role = 'admin'
        UNION
        SELECT v_client_user_id WHERE v_client_user_id IS NOT NULL
    );

    PERFORM public.create_notifications(
        v_recipient_ids,
        'new_project',
        'Nuevo Proyecto: ' || v_project_title,
        'Se ha registrado un nuevo proyecto.',
        jsonb_build_object('project_id', NEW.id)
    );

    RETURN NEW;
END;
$$;
