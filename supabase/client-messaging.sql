-- Client <-> admin/worker messaging
-- Run this script in Supabase SQL editor.

create table if not exists public.client_messages (
    id uuid primary key default gen_random_uuid(),
    client_id uuid not null references public.clients(id) on delete cascade,
    sender_id uuid not null references auth.users(id) on delete cascade,
    sender_role text not null check (sender_role in ('admin', 'worker', 'client')),
    body text not null,
    created_at timestamptz not null default now()
);

create index if not exists client_messages_client_idx
    on public.client_messages (client_id, created_at);

alter table public.client_messages enable row level security;

drop policy if exists "client_messages_select" on public.client_messages;
create policy "client_messages_select" on public.client_messages
for select
using (
    exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role in ('admin', 'worker')
    )
    or exists (
        select 1
        from public.clients c
        where c.id = client_messages.client_id
          and c.user_id = auth.uid()
    )
);

drop policy if exists "client_messages_insert" on public.client_messages;
create policy "client_messages_insert" on public.client_messages
for insert
with check (
    sender_id = auth.uid()
    and (
        (
            sender_role in ('admin', 'worker')
            and exists (
                select 1
                from public.profiles p
                where p.id = auth.uid()
                  and p.role in ('admin', 'worker')
            )
        )
        or (
            sender_role = 'client'
            and exists (
                select 1
                from public.clients c
                where c.id = client_messages.client_id
                  and c.user_id = auth.uid()
            )
        )
    )
);
