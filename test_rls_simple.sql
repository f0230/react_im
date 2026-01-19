-- ========================================================
-- SIMPLIFIED RLS TEST (SOLO DUEÑOS)
-- ========================================================

-- 1. Borrar todas las políticas existentes en profiles
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_access" ON public.profiles;
DROP POLICY IF EXISTS "profiles_owner_select" ON public.profiles;
DROP POLICY IF EXISTS "Users can see own profile" ON public.profiles;

-- 2. Crear las políticas más simples del universo
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Select básico por ID
CREATE POLICY "profiles_owner_select" ON public.profiles 
FOR SELECT USING (auth.uid() = id);

-- Update básico por ID
CREATE POLICY "profiles_owner_update" ON public.profiles 
FOR UPDATE USING (auth.uid() = id);

-- 3. Dar permiso temporal a anon/authenticated para ver perfiles (solo para descartar problemas de roles)
-- Esto NO es recursivo
CREATE POLICY "profiles_authenticated_select" ON public.profiles 
FOR SELECT TO authenticated USING (true); -- <--- TEMPORAL: Todos los logueados ven todos los perfiles

-- 4. Verificar qué está pasando con el rol
SELECT id, email, role, (auth.jwt() -> 'app_metadata') as app_metadata
FROM public.profiles 
WHERE email = 'f02301111@gmail.com';
