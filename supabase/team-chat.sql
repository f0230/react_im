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
