-- 1. Asegurar tabla appointments
create table if not exists public.appointments (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id uuid references public.profiles(id), -- Puede ser nullable si soportas anónimos temporalmente
  summary text not null,
  description text,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone not null,
  status text check (status in ('scheduled', 'cancelled', 'completed')) default 'scheduled',
  meet_link text,
  google_event_id text 
);

-- 2. Asegurar RLS habilitado
alter table public.appointments enable row level security;
alter table public.clients enable row level security;

-- 3. Políticas de Visualización (Frontend)
-- Permitir al usuario ver sus propias citas
create policy "Users can view own appointments" on public.appointments
  for select using ( auth.uid() = user_id );

-- 4. Opcional: Políticas de visualización/escritura para admins
-- (Supongamos que el 'role' está en public.profiles)
create policy "Admins/Workers view all" on public.appointments
  for select using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'worker')
    )
  );

-- NOTA: No necesitamos políticas de INSERT para el flujo normal
-- porque el backend usa Service Role (admin) para crear las citas.
