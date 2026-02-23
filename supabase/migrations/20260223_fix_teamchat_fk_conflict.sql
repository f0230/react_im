-- Fix the 409 error on project creation by changing the team channel creation from BEFORE to AFTER trigger
-- since the team_channels foreign key to projects fails if the project isn't inserted yet.

CREATE OR REPLACE FUNCTION public.fn_create_project_channel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_project_name  text;
    v_slug          text;
    v_channel_id    uuid;
BEGIN
    v_project_name := COALESCE(NULLIF(trim(NEW.name), ''), 'Proyecto ' || left(NEW.id::text, 8));

    v_slug := regexp_replace(
                  lower(trim(v_project_name)),
                  '[^a-z0-9]+', '-', 'g'
              );
    v_slug := left(v_slug, 60) || '-' || left(NEW.id::text, 8);

    INSERT INTO public.team_channels (name, slug, project_id, created_by)
    VALUES (v_project_name, v_slug, NEW.id, NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid)
    RETURNING id INTO v_channel_id;

    -- Link the channel back to the project (using an update since we are now in AFTER trigger)
    UPDATE public.projects 
    SET team_channel_id = v_channel_id 
    WHERE id = NEW.id;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_project_channel ON public.projects;
CREATE TRIGGER trg_create_project_channel
    AFTER INSERT ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_create_project_channel();
