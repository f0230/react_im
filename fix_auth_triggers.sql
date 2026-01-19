-- Function to handle new user signup with better error handling and defaults
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, role)
  values (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'New User'), 
    new.raw_user_meta_data->>'avatar_url',
    'client' -- Default role
  )
  on conflict (id) do nothing; -- Prevent errors if retry happens
  return new;
end;
$$ language plpgsql security definer;

-- Re-create the trigger to ensure it uses the latest function definition
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Ensure profiles table exists and has correct columns (idempotent check)
-- This part is just a safeguard, assuming table exists from previous schema
-- If you need to fix roles for existing users with null roles:
update public.profiles set role = 'client' where role is null;
