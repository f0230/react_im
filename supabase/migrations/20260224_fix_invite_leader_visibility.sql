-- Migration: Allow public to view leader names for invitations
-- This is needed for the /invite page to show the inviter's name to unauthenticated users.

-- 1. Profiles Policies
DROP POLICY IF EXISTS "Public can view leader names" ON public.profiles;
CREATE POLICY "Public can view leader names" ON public.profiles
FOR SELECT TO anon, authenticated
USING (
    is_client_leader = true 
    OR id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 2. Client Policies
DROP POLICY IF EXISTS "Public can view clients with valid invitations" ON public.clients;
CREATE POLICY "Public can view clients with valid invitations" ON public.clients
FOR SELECT TO anon, authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.client_invitations 
        WHERE client_id = public.clients.id 
        AND expires_at > now()
    )
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR user_id = auth.uid()
);

-- 3. In case Profiles doesn't have an admin policy yet
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
CREATE POLICY "Admins can manage all profiles" ON public.profiles
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
