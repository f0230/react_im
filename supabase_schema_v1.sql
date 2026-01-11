-- Create a table for public profiles using Supabase Auth
create table public.profiles (
  id uuid references auth.users not null primary key,
  email text unique not null,
  full_name text,
  avatar_url text,
  phone text,
  role text check (role in ('client', 'worker', 'admin')) default 'client',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.profiles enable row level security;

-- Create policies
create policy "Public profiles are viewable by everyone." on public.profiles
  for select using (true);

create policy "Users can insert their own profile." on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile." on public.profiles
  for update using (auth.uid() = id);

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to call the function on signup
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Create Projects Table
create table public.projects (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references public.profiles(id) not null,
  name text not null,
  description text,
  status text check (status in ('planning', 'in-progress', 'review', 'completed')) default 'planning',
  start_date date,
  end_date date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  figma_url text
);

-- Enable RLS on Projects
alter table public.projects enable row level security;

-- Policies for Projects
-- Admins can do everything
create policy "Admins can do everything on projects" on public.projects
  for all using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Clients can view their own projects
create policy "Clients can view own projects" on public.projects
  for select using (
    client_id = auth.uid()
  );

-- Workers can view all projects (for now, or refine to assigned only later)
create policy "Workers can view all projects" on public.projects
  for select using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'worker'
    )
  );
