-- Slack notifications for team chat + WhatsApp (Supabase)
-- Run in Supabase SQL editor after pg_net is enabled.
-- Requires: create extension if not exists pg_net;
--
-- Store settings in DB (no alter database permissions required):
--   insert into public.app_settings (key, value)
--   values
--     ('slack_notify_url', 'https://your-host/api/slack-notify'),
--     ('slack_notify_secret', 'your-secret')
--   on conflict (key) do update set value = excluded.value;

create extension if not exists pg_net;

create table if not exists public.app_settings (
    key text primary key,
    value text not null,
    updated_at timestamptz not null default now()
);

create or replace function public.get_app_setting(p_key text)
returns text
language sql
security definer
set search_path = public
as $$
    select value from public.app_settings where key = p_key;
$$;

create or replace function public.notify_slack()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    notify_url text := public.get_app_setting('slack_notify_url');
    notify_secret text := public.get_app_setting('slack_notify_secret');
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
