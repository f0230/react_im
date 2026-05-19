-- Fix get_unread_previews_v1 to allow admins to see all channels
-- Admins should see notifications from all channels, not just public or joined ones

create or replace function public.get_unread_previews_v1(limit_per_source int default 6)
returns table (
    source text,
    title text,
    preview text,
    event_at timestamptz,
    unread_count bigint,
    channel_id uuid,
    wa_id text,
    author text
)
language sql
security definer
set search_path = public
as $$
    with accessible_channels as (
        select c.id, c.name
        from public.team_channels c
        where (
            exists (
                select 1
                from public.profiles p
                where p.id = auth.uid()
                  and p.role in ('admin', 'worker')
            )
        )
        and (
            exists (
                select 1
                from public.profiles p
                where p.id = auth.uid()
                  and p.role = 'admin'
            )
            or c.is_public = true 
            or public.is_team_member(c.id, auth.uid())
        )
    ),
    team_last as (
        select
            tm.channel_id,
            max(tm.created_at) as last_message_at,
            (array_agg(tm.body order by tm.created_at desc))[1] as last_body,
            (array_agg(tm.author_name order by tm.created_at desc))[1] as last_author
        from public.team_messages tm
        join accessible_channels ac on ac.id = tm.channel_id
        group by tm.channel_id
    ),
    team_unread as (
        select
            tm.channel_id,
            count(*) as unread_count
        from public.team_messages tm
        left join public.team_channel_reads tcr
            on tcr.channel_id = tm.channel_id
           and tcr.user_id = auth.uid()
        join accessible_channels ac on ac.id = tm.channel_id
        where tm.created_at > coalesce(tcr.last_read_at, '1970-01-01'::timestamptz)
          and tm.author_id <> auth.uid()
        group by tm.channel_id
    ),
    team_rows as (
        select
            'team'::text as source,
            ac.name as title,
            coalesce(tl.last_body, '') as preview,
            tl.last_message_at as event_at,
            coalesce(tu.unread_count, 0) as unread_count,
            ac.id as channel_id,
            null::text as wa_id,
            tl.last_author as author
        from accessible_channels ac
        left join team_last tl on tl.channel_id = ac.id
        left join team_unread tu on tu.channel_id = ac.id
        where coalesce(tu.unread_count, 0) > 0
        order by tl.last_message_at desc
        limit limit_per_source
    ),
    whatsapp_unread as (
        select
            wm.wa_id,
            max(wm.timestamp) as last_inbound_at,
            count(*) as unread_count
        from public.whatsapp_messages wm
        left join public.whatsapp_thread_reads wtr
            on wtr.wa_id = wm.wa_id
           and wtr.user_id = auth.uid()
        where wm.timestamp > coalesce(wtr.last_read_at, '1970-01-01'::timestamptz)
          and wm.direction <> 'outbound'
          and exists (
              select 1
              from public.profiles p
              where p.id = auth.uid()
                and p.role in ('admin', 'worker')
          )
        group by wm.wa_id
    ),
    whatsapp_last as (
        select
            wm.wa_id,
            max(wm.timestamp) as last_message_at,
            (array_agg(wm.body order by wm.timestamp desc))[1] as last_body
        from public.whatsapp_messages wm
        group by wm.wa_id
    ),
    whatsapp_rows as (
        select
            'whatsapp'::text as source,
            coalesce(t.client_name, t.client_phone, t.wa_id) as title,
            coalesce(wl.last_body, '') as preview,
            wl.last_message_at as event_at,
            wu.unread_count as unread_count,
            null::uuid as channel_id,
            wu.wa_id as wa_id,
            null::text as author
        from whatsapp_unread wu
        join public.whatsapp_threads t on t.wa_id = wu.wa_id
        left join whatsapp_last wl on wl.wa_id = wu.wa_id
        order by wl.last_message_at desc
        limit limit_per_source
    )
    select * from team_rows
    union all
    select * from whatsapp_rows
    order by event_at desc;
$$;
