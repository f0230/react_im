-- Slack notifications for team chat + WhatsApp (Supabase)
-- Run in Supabase SQL editor after pg_net is enabled.
-- Requires: create extension if not exists pg_net;
--
-- Configure DB settings (SQL):
--   alter database postgres set app.settings.slack_notify_url = 'https://your-host/api/slack-notify';
--   alter database postgres set app.settings.slack_notify_secret = 'your-secret';
-- Then reconnect session or restart to apply settings.

create extension if not exists pg_net;

create or replace function public.notify_slack()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    notify_url text := current_setting('app.settings.slack_notify_url', true);
    notify_secret text := current_setting('app.settings.slack_notify_secret', true);
    headers jsonb := jsonb_build_object('Content-Type', 'application/json');
    payload jsonb;
begin
    if notify_url is null or notify_url = '' then
        return new;
    end if;

    if notify_secret is not null and notify_secret <> '' then
        headers := headers || jsonb_build_object('x-slack-notify-secret', notify_secret);
    end if;

    payload := jsonb_build_object(
        'table', TG_TABLE_NAME,
        'event', TG_OP,
        'record', row_to_json(NEW)
    );

    perform net.http_post(
        url => notify_url,
        headers => headers,
        body => payload
    );

    return new;
end;
$$;

do $$
begin
    if to_regclass('public.team_channels') is not null then
        execute 'drop trigger if exists team_channels_notify_slack on public.team_channels;';
        execute 'create trigger team_channels_notify_slack after insert on public.team_channels for each row execute function public.notify_slack();';
    end if;

    if to_regclass('public.team_channel_members') is not null then
        execute 'drop trigger if exists team_channel_members_notify_slack on public.team_channel_members;';
        execute 'create trigger team_channel_members_notify_slack after insert on public.team_channel_members for each row execute function public.notify_slack();';
    end if;

    if to_regclass('public.team_messages') is not null then
        execute 'drop trigger if exists team_messages_notify_slack on public.team_messages;';
        execute 'create trigger team_messages_notify_slack after insert on public.team_messages for each row execute function public.notify_slack();';
    end if;

    if to_regclass('public.whatsapp_messages') is not null then
        execute 'drop trigger if exists whatsapp_messages_notify_slack on public.whatsapp_messages;';
        execute 'create trigger whatsapp_messages_notify_slack after insert on public.whatsapp_messages for each row execute function public.notify_slack();';
    end if;
end;
$$;
