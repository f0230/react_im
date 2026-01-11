-- Create Clients Table
create table public.clients (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  full_name text not null,
  company_name text,
  email text,
  phone text,
  status text check (status in ('lead', 'active', 'inactive', 'archived')) default 'lead',
  source text, -- e.g., 'website', 'referral', 'whatsapp'
  notes text,
  user_id uuid references public.profiles(id) -- Opcional: si el cliente tiene usuario en el sistema
);

-- Enable RLS
alter table public.clients enable row level security;

-- Policies
create policy "Admins and Workers can view all clients" on public.clients
  for select using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'worker')
    )
  );

create policy "Admins and Workers can insert/update clients" on public.clients
  for all using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'worker')
    )
  );

-- Clients can view their own record (if linked) - Future proofing
create policy "Clients can view own record" on public.clients
  for select using (
    user_id = auth.uid()
  );
