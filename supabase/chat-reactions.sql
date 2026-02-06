-- Message reactions for team, client, and whatsapp chats
-- Run in Supabase SQL editor.

-- -----------------------------------------------------------------------------
-- Team message reactions (only if team chat tables exist)
-- -----------------------------------------------------------------------------
do $$
begin
    if to_regclass('public.team_messages') is not null then
        execute $sql$
            create table if not exists public.team_message_reactions (
                id uuid primary key default gen_random_uuid(),
                message_id uuid not null references public.team_messages(id) on delete cascade,
                user_id uuid not null references public.profiles(id) on delete cascade,
                emoji text not null,
                created_at timestamptz not null default now(),
                unique (message_id, user_id, emoji)
            );

            create index if not exists team_message_reactions_message_idx on public.team_message_reactions (message_id);
            create index if not exists team_message_reactions_user_idx on public.team_message_reactions (user_id);
            create index if not exists team_message_reactions_message_emoji_idx on public.team_message_reactions (message_id, emoji);

            alter table public.team_message_reactions enable row level security;

            drop policy if exists "team_message_reactions_select" on public.team_message_reactions;
            create policy "team_message_reactions_select" on public.team_message_reactions
            for select
            using (
                exists (
                    select 1
                    from public.profiles p
                    where p.id = auth.uid()
                      and p.role in ('admin', 'worker')
                )
                and exists (
                    select 1
                    from public.team_messages tm
                    where tm.id = team_message_reactions.message_id
                      and (
                          exists (
                              select 1
                              from public.team_channels c
                              where c.id = tm.channel_id
                                and c.is_public = true
                          )
                          or public.is_team_member(tm.channel_id, auth.uid())
                      )
                )
            );

            drop policy if exists "team_message_reactions_insert" on public.team_message_reactions;
            create policy "team_message_reactions_insert" on public.team_message_reactions
            for insert
            with check (
                user_id = auth.uid()
                and exists (
                    select 1
                    from public.profiles p
                    where p.id = auth.uid()
                      and p.role in ('admin', 'worker')
                )
                and exists (
                    select 1
                    from public.team_messages tm
                    where tm.id = team_message_reactions.message_id
                      and (
                          exists (
                              select 1
                              from public.team_channels c
                              where c.id = tm.channel_id
                                and c.is_public = true
                          )
                          or public.is_team_member(tm.channel_id, auth.uid())
                      )
                )
            );

            drop policy if exists "team_message_reactions_delete" on public.team_message_reactions;
            create policy "team_message_reactions_delete" on public.team_message_reactions
            for delete
            using (
                user_id = auth.uid()
                and exists (
                    select 1
                    from public.team_messages tm
                    where tm.id = team_message_reactions.message_id
                      and (
                          exists (
                              select 1
                              from public.team_channels c
                              where c.id = tm.channel_id
                                and c.is_public = true
                          )
                          or public.is_team_member(tm.channel_id, auth.uid())
                      )
                )
            );
        $sql$;
    end if;
end $$;

-- -----------------------------------------------------------------------------
-- Client message reactions (only if client messaging exists)
-- -----------------------------------------------------------------------------
do $$
begin
    if to_regclass('public.client_messages') is not null then
        execute $sql$
            create table if not exists public.client_message_reactions (
                id uuid primary key default gen_random_uuid(),
                message_id uuid not null references public.client_messages(id) on delete cascade,
                user_id uuid not null references auth.users(id) on delete cascade,
                emoji text not null,
                created_at timestamptz not null default now(),
                unique (message_id, user_id, emoji)
            );

            create index if not exists client_message_reactions_message_idx on public.client_message_reactions (message_id);
            create index if not exists client_message_reactions_user_idx on public.client_message_reactions (user_id);
            create index if not exists client_message_reactions_message_emoji_idx on public.client_message_reactions (message_id, emoji);

            alter table public.client_message_reactions enable row level security;

            drop policy if exists "client_message_reactions_select" on public.client_message_reactions;
            create policy "client_message_reactions_select" on public.client_message_reactions
            for select
            using (
                exists (
                    select 1
                    from public.client_messages cm
                    where cm.id = client_message_reactions.message_id
                      and (
                          exists (
                              select 1
                              from public.profiles p
                              where p.id = auth.uid()
                                and p.role in ('admin', 'worker')
                          )
                          or exists (
                              select 1
                              from public.clients c
                              where c.id = cm.client_id
                                and c.user_id = auth.uid()
                          )
                      )
                )
            );

            drop policy if exists "client_message_reactions_insert" on public.client_message_reactions;
            create policy "client_message_reactions_insert" on public.client_message_reactions
            for insert
            with check (
                user_id = auth.uid()
                and exists (
                    select 1
                    from public.client_messages cm
                    where cm.id = client_message_reactions.message_id
                      and (
                          exists (
                              select 1
                              from public.profiles p
                              where p.id = auth.uid()
                                and p.role in ('admin', 'worker')
                          )
                          or exists (
                              select 1
                              from public.clients c
                              where c.id = cm.client_id
                                and c.user_id = auth.uid()
                          )
                      )
                )
            );

            drop policy if exists "client_message_reactions_delete" on public.client_message_reactions;
            create policy "client_message_reactions_delete" on public.client_message_reactions
            for delete
            using (
                user_id = auth.uid()
                and exists (
                    select 1
                    from public.client_messages cm
                    where cm.id = client_message_reactions.message_id
                      and (
                          exists (
                              select 1
                              from public.profiles p
                              where p.id = auth.uid()
                                and p.role in ('admin', 'worker')
                          )
                          or exists (
                              select 1
                              from public.clients c
                              where c.id = cm.client_id
                                and c.user_id = auth.uid()
                          )
                      )
                )
            );
        $sql$;
    end if;
end $$;

-- -----------------------------------------------------------------------------
-- Whatsapp message reactions (staff only, only if whatsapp exists)
-- -----------------------------------------------------------------------------
do $$
begin
    if to_regclass('public.whatsapp_messages') is not null then
        execute $sql$
            create table if not exists public.whatsapp_message_reactions (
                id uuid primary key default gen_random_uuid(),
                message_id uuid not null references public.whatsapp_messages(id) on delete cascade,
                user_id uuid not null references public.profiles(id) on delete cascade,
                emoji text not null,
                created_at timestamptz not null default now(),
                unique (message_id, user_id, emoji)
            );

            create index if not exists whatsapp_message_reactions_message_idx on public.whatsapp_message_reactions (message_id);
            create index if not exists whatsapp_message_reactions_user_idx on public.whatsapp_message_reactions (user_id);
            create index if not exists whatsapp_message_reactions_message_emoji_idx on public.whatsapp_message_reactions (message_id, emoji);

            alter table public.whatsapp_message_reactions enable row level security;

            drop policy if exists "whatsapp_message_reactions_select" on public.whatsapp_message_reactions;
            create policy "whatsapp_message_reactions_select" on public.whatsapp_message_reactions
            for select
            using (
                exists (
                    select 1
                    from public.profiles p
                    where p.id = auth.uid()
                      and p.role in ('admin', 'worker')
                )
            );

            drop policy if exists "whatsapp_message_reactions_insert" on public.whatsapp_message_reactions;
            create policy "whatsapp_message_reactions_insert" on public.whatsapp_message_reactions
            for insert
            with check (
                user_id = auth.uid()
                and exists (
                    select 1
                    from public.profiles p
                    where p.id = auth.uid()
                      and p.role in ('admin', 'worker')
                )
            );

            drop policy if exists "whatsapp_message_reactions_delete" on public.whatsapp_message_reactions;
            create policy "whatsapp_message_reactions_delete" on public.whatsapp_message_reactions
            for delete
            using (
                user_id = auth.uid()
                and exists (
                    select 1
                    from public.profiles p
                    where p.id = auth.uid()
                      and p.role in ('admin', 'worker')
                )
            );
        $sql$;
    end if;
end $$;
