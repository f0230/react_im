
-- Migration: Fix infinite recursion in RLS policies for Profiles
-- This migration replaces direct subqueries on 'profiles' with SECURITY DEFINER functions.

-- 1. Helper function to check if current user is an admin without triggering RLS recursion
CREATE OR REPLACE FUNCTION public.fn_is_admin()
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Helper function to check if current user is a leader
CREATE OR REPLACE FUNCTION public.fn_is_client_leader()
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND is_client_leader = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Fix Profiles Policies
DROP POLICY IF EXISTS "Public can view leader names" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT TO authenticated
USING (id = auth.uid());

CREATE POLICY "Public can view leader names" ON public.profiles
FOR SELECT TO anon, authenticated
USING (
    is_client_leader = true 
    OR id = auth.uid()
    OR public.fn_is_admin()
);

CREATE POLICY "Admins can manage all profiles" ON public.profiles
FOR ALL TO authenticated
USING (public.fn_is_admin());

-- 4. Update other tables that were using recursive lookups to profiles
-- client_invitations
DROP POLICY IF EXISTS "Admins can manage invitations" ON public.client_invitations;
CREATE POLICY "Admins can manage invitations" ON public.client_invitations
FOR ALL TO authenticated USING (public.fn_is_admin());

-- 5. Update fn_has_project_access to use these helpers if needed, 
-- although it's already SECURITY DEFINER so it's less prone to recursion.
-- But it's good practice.

COMMENT ON FUNCTION public.fn_is_admin IS 'Helper for RLS to check admin status without recursion.';
COMMENT ON FUNCTION public.fn_is_client_leader IS 'Helper for RLS to check client leader status without recursion.';
