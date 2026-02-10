-- Internal team chat tables + RLS policies (Supabase)
-- Run in Supabase SQL editor.

create table if not exists public.team_channels (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    slug text not null unique,
    description text,
    is_public boolean not null default false,
    created_by uuid references public.profiles(id) on delete set null,
    created_at timestamptz not null default now()
);

alter table public.team_channels
    add column if not exists is_public boolean not null default false;

create index if not exists team_channels_name_idx on public.team_channels (name);

create table if not exists public.team_channel_members (
    id uuid primary key default gen_random_uuid(),
    channel_id uuid not null references public.team_channels(id) on delete cascade,
    member_id uuid not null references public.profiles(id) on delete cascade,
    added_by uuid references public.profiles(id) on delete set null,
    created_at timestamptz not null default now(),
    unique (channel_id, member_id)
);

create index if not exists team_channel_members_channel_idx on public.team_channel_members (channel_id);
create index if not exists team_channel_members_member_idx on public.team_channel_members (member_id);

-- Helper: membership check without RLS recursion
create or replace function public.is_team_member(p_channel_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.team_channel_members
        where channel_id = p_channel_id
          and member_id = p_user_id
    );
$$;

-- Ensure channel creator is added as member
create or replace function public.add_channel_creator_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if new.created_by is not null then
        insert into public.team_channel_members (channel_id, member_id, added_by)
        values (new.id, new.created_by, new.created_by)
        on conflict do nothing;
    end if;
    return new;
end;
$$;

drop trigger if exists team_channels_add_member on public.team_channels;
create trigger team_channels_add_member
after insert on public.team_channels
for each row
execute function public.add_channel_creator_member();

create table if not exists public.team_messages (
    id uuid primary key default gen_random_uuid(),
    channel_id uuid not null references public.team_channels(id) on delete cascade,
    author_id uuid not null references public.profiles(id) on delete restrict,
    author_name text,
    message_type text not null default 'text',
    media_url text,
    file_name text,
    body text not null,
    created_at timestamptz not null default now()
);

alter table public.team_messages
    add column if not exists author_name text;
alter table public.team_messages
    add column if not exists message_type text not null default 'text';
alter table public.team_messages
    add column if not exists media_url text;
alter table public.team_messages
    add column if not exists file_name text;

create index if not exists team_messages_channel_idx on public.team_messages (channel_id, created_at);

-- Storage configuration for chat media (audio/images)
-- Note: This requires access to the storage schema.
insert into storage.buckets (id, name, public)
values ('chat-media', 'chat-media', true)
on conflict (id) do nothing;

drop policy if exists "chat_media_public_read" on storage.objects;
create policy "chat_media_public_read"
on storage.objects for select
using (bucket_id = 'chat-media');

drop policy if exists "chat_media_upload" on storage.objects;
create policy "chat_media_upload"
on storage.objects for insert
with check (bucket_id = 'chat-media' and auth.role() = 'authenticated');

drop policy if exists "chat_media_delete" on storage.objects;
create policy "chat_media_delete"
on storage.objects for delete
using (bucket_id = 'chat-media' and auth.role() = 'authenticated');

-- Ensure author_name is captured on insert (works even if profiles RLS is strict)
create or replace function public.set_team_message_author_name()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    resolved_name text;
begin
    if new.author_name is null then
        select coalesce(full_name, email, 'Equipo')
        into resolved_name
        from public.profiles
        where id = new.author_id;

        new.author_name := coalesce(resolved_name, 'Equipo');
    end if;
    return new;
end;
$$;

drop trigger if exists team_messages_set_author_name on public.team_messages;
create trigger team_messages_set_author_name
before insert on public.team_messages
for each row
execute function public.set_team_message_author_name();

alter table public.team_channels enable row level security;
alter table public.team_channel_members enable row level security;
alter table public.team_messages enable row level security;

-- Allow admins/workers to read channels
drop policy if exists "team_channels_read" on public.team_channels;
create policy "team_channels_read" on public.team_channels
for select
using (
    exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role in ('admin', 'worker')
    )
    and (
        is_public = true
        or created_by = auth.uid()
        or public.is_team_member(team_channels.id, auth.uid())
    )
);

-- Only admins can create/update channels (adjust if needed)
drop policy if exists "team_channels_insert" on public.team_channels;
create policy "team_channels_insert" on public.team_channels
for insert
with check (
    exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'admin'
    )
);

drop policy if exists "team_channels_update" on public.team_channels;
create policy "team_channels_update" on public.team_channels
for update
using (
    exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'admin'
    )
);

-- Channel members policies
drop policy if exists "team_channel_members_read" on public.team_channel_members;
create policy "team_channel_members_read" on public.team_channel_members
for select
using (
    exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role in ('admin', 'worker')
    )
    and public.is_team_member(team_channel_members.channel_id, auth.uid())
);

drop policy if exists "team_channel_members_insert" on public.team_channel_members;
create policy "team_channel_members_insert" on public.team_channel_members
for insert
with check (
    exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'admin'
    )
);

drop policy if exists "team_channel_members_delete" on public.team_channel_members;
create policy "team_channel_members_delete" on public.team_channel_members
for delete
using (
    exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'admin'
    )
);

-- Allow admins/workers to read and send messages
drop policy if exists "team_messages_read" on public.team_messages;
create policy "team_messages_read" on public.team_messages
for select
using (
    exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role in ('admin', 'worker')
    )
    and (
        exists (
            select 1
            from public.team_channels c
            where c.id = channel_id
              and c.is_public = true
        )
        or public.is_team_member(channel_id, auth.uid())
    )
);

drop policy if exists "team_messages_insert" on public.team_messages;
create policy "team_messages_insert" on public.team_messages
for insert
with check (
    exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role in ('admin', 'worker')
    )
    and (
        exists (
            select 1
            from public.team_channels c
            where c.id = channel_id
              and c.is_public = true
        )
        or public.is_team_member(channel_id, auth.uid())
    )
);

-- Optional: Only admins can delete messages
drop policy if exists "team_messages_delete" on public.team_messages;
create policy "team_messages_delete" on public.team_messages
for delete
using (
    exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'admin'
    )
);

-- Optional seed channel
insert into public.team_channels (name, slug)
values ('General', 'general')
on conflict (slug) do nothing;

update public.team_channels
set is_public = true
where slug = 'general';

-- Backfill author_name for existing messages
update public.team_messages tm
set author_name = coalesce(p.full_name, p.email, 'Equipo')
from public.profiles p
where tm.author_name is null
  and tm.author_id = p.id;

update public.team_messages
set message_type = 'text'
where message_type is null;

-- -----------------------------------------------------------------------------
-- Unread tracking + notifications
-- -----------------------------------------------------------------------------

create table if not exists public.team_channel_reads (
    channel_id uuid not null references public.team_channels(id) on delete cascade,
    user_id uuid not null references public.profiles(id) on delete cascade,
    last_read_at timestamptz not null default '1970-01-01',
    updated_at timestamptz not null default now(),
    primary key (channel_id, user_id)
);

create index if not exists team_channel_reads_user_idx on public.team_channel_reads (user_id);
create index if not exists team_channel_reads_channel_idx on public.team_channel_reads (channel_id);

create table if not exists public.whatsapp_thread_reads (
    wa_id text not null,
    user_id uuid not null references public.profiles(id) on delete cascade,
    last_read_at timestamptz not null default '1970-01-01',
    updated_at timestamptz not null default now(),
    primary key (wa_id, user_id)
);

create index if not exists whatsapp_thread_reads_user_idx on public.whatsapp_thread_reads (user_id);
create index if not exists whatsapp_thread_reads_wa_id_idx on public.whatsapp_thread_reads (wa_id);

create table if not exists public.notifications (
    id uuid primary key default gen_random_uuid(),
    recipient_id uuid not null references public.profiles(id) on delete cascade,
    type text not null,
    title text,
    body text,
    data jsonb,
    created_at timestamptz not null default now(),
    read_at timestamptz
);

create index if not exists notifications_recipient_idx on public.notifications (recipient_id, created_at desc);
create index if not exists notifications_recipient_unread_idx on public.notifications (recipient_id, read_at);

alter table public.team_channel_reads enable row level security;
alter table public.whatsapp_thread_reads enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "team_channel_reads_select" on public.team_channel_reads;
create policy "team_channel_reads_select" on public.team_channel_reads
for select
using (user_id = auth.uid());

drop policy if exists "team_channel_reads_insert" on public.team_channel_reads;
create policy "team_channel_reads_insert" on public.team_channel_reads
for insert
with check (user_id = auth.uid());

drop policy if exists "team_channel_reads_update" on public.team_channel_reads;
create policy "team_channel_reads_update" on public.team_channel_reads
for update
using (user_id = auth.uid());

drop policy if exists "whatsapp_thread_reads_select" on public.whatsapp_thread_reads;
create policy "whatsapp_thread_reads_select" on public.whatsapp_thread_reads
for select
using (user_id = auth.uid());

drop policy if exists "whatsapp_thread_reads_insert" on public.whatsapp_thread_reads;
create policy "whatsapp_thread_reads_insert" on public.whatsapp_thread_reads
for insert
with check (user_id = auth.uid());

drop policy if exists "whatsapp_thread_reads_update" on public.whatsapp_thread_reads;
create policy "whatsapp_thread_reads_update" on public.whatsapp_thread_reads
for update
using (user_id = auth.uid());

drop policy if exists "notifications_select" on public.notifications;
create policy "notifications_select" on public.notifications
for select
using (recipient_id = auth.uid());

drop policy if exists "notifications_update" on public.notifications;
create policy "notifications_update" on public.notifications
for update
using (recipient_id = auth.uid());

drop policy if exists "notifications_insert_admin" on public.notifications;
create policy "notifications_insert_admin" on public.notifications
for insert
with check (
    exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role in ('admin', 'worker')
    )
);

-- Unread counts (team + whatsapp + notifications)
create or replace function public.get_unread_counts_v1()
returns table (
    unread_team bigint,
    unread_whatsapp bigint,
    unread_notifications bigint
)
language sql
security definer
set search_path = public
as $$
    select
        (
            select count(*) from (
                select tm.channel_id
                from public.team_messages tm
                left join public.team_channel_reads tcr
                    on tcr.channel_id = tm.channel_id
                   and tcr.user_id = auth.uid()
                where tm.created_at > coalesce(tcr.last_read_at, '1970-01-01'::timestamptz)
                  and tm.author_id <> auth.uid()
                  and exists (
                      select 1
                      from public.profiles p
                      where p.id = auth.uid()
                        and p.role in ('admin', 'worker')
                  )
                  and (
                      exists (
                          select 1
                          from public.team_channels c
                          where c.id = tm.channel_id
                            and (c.is_public = true or public.is_team_member(c.id, auth.uid()))
                      )
                  )
                group by tm.channel_id
            ) as team_unread_channels
        ) as unread_team,
        (
            select count(*) from (
                select wm.wa_id
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
            ) as whatsapp_unread_threads
        ) as unread_whatsapp,
        (
            select count(*)
            from public.notifications n
            where n.recipient_id = auth.uid()
              and n.read_at is null
        ) as unread_notifications;
$$;

-- Unread previews for dropdowns
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
        and (c.is_public = true or public.is_team_member(c.id, auth.uid()))
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
