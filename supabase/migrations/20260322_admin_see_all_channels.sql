-- Allow admins to see ALL team channels regardless of membership.
-- Workers still only see public channels + channels where they are a member/creator.
--
-- Also allows admins to read messages and members from any channel.
--
-- Run in Supabase SQL Editor.

-- 1. Channels: admins see all, workers see public + own membership
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
        -- Admins see every channel
        exists (
            select 1
            from public.profiles p
            where p.id = auth.uid()
              and p.role = 'admin'
        )
        -- Workers need membership, ownership, or public flag
        or is_public = true
        or created_by = auth.uid()
        or public.is_team_member(team_channels.id, auth.uid())
    )
);

-- 2. Messages: admins can read messages from any channel
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
            from public.profiles p
            where p.id = auth.uid()
              and p.role = 'admin'
        )
        or exists (
            select 1
            from public.team_channels c
            where c.id = channel_id
              and (c.is_public = true or public.is_team_member(c.id, auth.uid()))
        )
    )
);

-- 3. Messages insert: admins can write to any channel
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
            from public.profiles p
            where p.id = auth.uid()
              and p.role = 'admin'
        )
        or exists (
            select 1
            from public.team_channels c
            where c.id = channel_id
              and (c.is_public = true or public.is_team_member(c.id, auth.uid()))
        )
    )
);

-- 4. Channel members: admins can see members of any channel
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
    and (
        exists (
            select 1
            from public.profiles p
            where p.id = auth.uid()
              and p.role = 'admin'
        )
        or public.is_team_member(team_channel_members.channel_id, auth.uid())
    )
);
