
-- Migration: Ensure new users are leaders by default
-- This makes normal registration result in a "Leader" profile, forcing them to complete onboarding.

ALTER TABLE public.profiles ALTER COLUMN is_client_leader SET DEFAULT true;

-- Fix any current users that might be stuck as "false" without being in a team
UPDATE public.profiles 
SET is_client_leader = true 
WHERE role = 'client' 
  AND client_id IS NULL 
  AND is_client_leader = false;
