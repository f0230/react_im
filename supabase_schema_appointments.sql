-- Create Appointments Table
create table public.appointments (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id uuid references public.profiles(id) not null,
  summary text not null,
  description text,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone not null,
  status text check (status in ('scheduled', 'cancelled', 'completed')) default 'scheduled',
  meet_link text -- Optional, for Google Meet link
);

-- Enable RLS
alter table public.appointments enable row level security;

-- Policies
create policy "Users can view own appointments" on public.appointments
  for select using (
    user_id = auth.uid()
  );

create policy "Admins/Workers can view all appointments" on public.appointments
  for select using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'worker')
    )
  );
