-- 1. Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, role)
  values (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'New User'), 
    new.raw_user_meta_data->>'avatar_url',
    'client'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- 2. Trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3. RLS Policies (Fixing the blocking issue)
alter table public.profiles enable row level security;

-- Remove potential old conflicting policies
drop policy if exists "Public profiles are viewable by everyone." on public.profiles;
drop policy if exists "Users can insert their own profile." on public.profiles;
drop policy if exists "Users can update own profile." on public.profiles;
drop policy if exists "Users can see own profile" on public.profiles;

-- Create simple, permissive policies for profiles
create policy "Users can see own profile" 
on public.profiles for select 
using ( auth.uid() = id );

create policy "Users can update own profile" 
on public.profiles for update 
using ( auth.uid() = id );

-- Optional: Allow reading all profiles if you need to show other users (e.g. admin)
-- create policy "Authenticated users can see all profiles"
-- on public.profiles for select
-- using ( auth.role() = 'authenticated' );

-- 4. Manual Fix for your current user
-- If your profile exists but has issues, this ensures role is set
update public.profiles set role = 'client' where role is null;
