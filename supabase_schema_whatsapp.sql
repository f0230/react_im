-- WhatsApp threads (one per client phone / wa_id)
create table public.whatsapp_threads (
  id uuid default uuid_generate_v4() primary key,
  wa_id text not null unique,
  client_name text,
  client_phone text,
  last_message text,
  last_message_at timestamp with time zone,
  status text check (status in ('open', 'pending', 'closed')) default 'open',
  assigned_to uuid references public.profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists whatsapp_threads_wa_id_idx on public.whatsapp_threads (wa_id);
create index if not exists whatsapp_threads_assigned_to_idx on public.whatsapp_threads (assigned_to);

-- WhatsApp messages (inbound/outbound)
create table public.whatsapp_messages (
  id uuid default uuid_generate_v4() primary key,
  wa_id text not null,
  direction text check (direction in ('inbound', 'outbound')) not null,
  message_id text unique,
  type text,
  body text,
  timestamp timestamp with time zone,
  status text,
  status_timestamp timestamp with time zone,
  raw jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists whatsapp_messages_wa_id_idx on public.whatsapp_messages (wa_id);
create index if not exists whatsapp_messages_message_id_idx on public.whatsapp_messages (message_id);
create index if not exists whatsapp_messages_timestamp_idx on public.whatsapp_messages (timestamp);

alter table public.whatsapp_threads enable row level security;
alter table public.whatsapp_messages enable row level security;

-- Threads policies
create policy "Admins and Workers can view threads"
  on public.whatsapp_threads for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'worker')
    )
  );

create policy "Admins and Workers can insert threads"
  on public.whatsapp_threads for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'worker')
    )
  );

create policy "Admins and Workers can update threads"
  on public.whatsapp_threads for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'worker')
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'worker')
    )
  );

-- Messages policies
create policy "Admins and Workers can view messages"
  on public.whatsapp_messages for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'worker')
    )
  );

create policy "Admins and Workers can insert messages"
  on public.whatsapp_messages for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'worker')
    )
  );

create policy "Admins and Workers can update messages"
  on public.whatsapp_messages for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'worker')
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'worker')
    )
  );
