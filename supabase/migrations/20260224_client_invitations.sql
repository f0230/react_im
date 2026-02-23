-- 1. Create client_invitations table
CREATE TABLE IF NOT EXISTS public.client_invitations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    email text NOT NULL,
    token text NOT NULL UNIQUE,
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL DEFAULT now() + interval '7 days'
);

-- 2. Add is_client_leader column to profiles
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_client_leader') THEN
        ALTER TABLE public.profiles ADD COLUMN is_client_leader boolean DEFAULT false;
    END IF;
END $$;

-- Make existing clients the leaders of their respective clients
UPDATE public.profiles p
SET is_client_leader = true
WHERE p.role = 'client' 
  AND p.client_id IS NOT NULL 
  AND EXISTS (SELECT 1 FROM public.clients c WHERE c.id = p.client_id AND c.user_id = p.id);

-- 3. Enable RLS immediately to prevent accidental public access
ALTER TABLE public.client_invitations ENABLE ROW LEVEL SECURITY;

-- 4. Set up Policies

-- Admins can do everything
CREATE POLICY "Admins can manage invitations" ON public.client_invitations
FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Client Leaders can view their own invitations
CREATE POLICY "Leaders can view their client invitations" ON public.client_invitations
FOR SELECT TO authenticated USING (
    client_id IN (SELECT client_id FROM public.profiles WHERE id = auth.uid() AND is_client_leader = true)
);

-- Client Leaders can create invitations
CREATE POLICY "Leaders can insert invitations" ON public.client_invitations
FOR INSERT TO authenticated WITH CHECK (
    client_id IN (SELECT client_id FROM public.profiles WHERE id = auth.uid() AND is_client_leader = true)
);

-- Client Leaders can delete invitations (revoke)
CREATE POLICY "Leaders can delete invitations" ON public.client_invitations
FOR DELETE TO authenticated USING (
    client_id IN (SELECT client_id FROM public.profiles WHERE id = auth.uid() AND is_client_leader = true)
);

-- Public can view valid invitations if they have the token (needed before they log in)
CREATE POLICY "Public can view invitations by token" ON public.client_invitations
FOR SELECT TO anon, authenticated USING (
    expires_at > now()
);

-- Authenticated users who match the email of the invite can delete the invite (after accepting it)
CREATE POLICY "Invited users can delete their own invite" ON public.client_invitations
FOR DELETE TO authenticated USING (
    email = auth.email()
);

COMMENT ON TABLE public.client_invitations IS 'Invitations for new members to join a client team';
COMMENT ON COLUMN public.profiles.is_client_leader IS 'Indicates if the user is the primary creator/leader of the client team. True for the main client, false for team members';
