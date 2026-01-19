-- ========================================================
-- SOLUCIÓN FINAL: SINCRONIZACIÓN AUTOMÁTICA Y ADMIN FIX
-- ========================================================

-- 1. Promover a Francisco (u otro usuario) a admin
-- Cambia el ID si necesitas dárselo a otro, pero Francisco (f02301111@gmail.com) es:
UPDATE public.profiles 
SET role = 'admin' 
WHERE id = '387373b1-4538-45bf-a637-5fee0fc9cba6';

-- 2. Función para sincronizar CUALQUIER cambio de rol de Profiles -> Auth Metadata
CREATE OR REPLACE FUNCTION public.sync_profile_role_to_auth()
RETURNS trigger AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', NEW.role)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger para que sea automático
DROP TRIGGER IF EXISTS on_profile_role_update ON public.profiles;
CREATE TRIGGER on_profile_role_update
  AFTER UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_role_to_auth();

-- 4. Ejecutar sincronización manual inicial para todos los usuarios
UPDATE auth.users
SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', p.role)
FROM public.profiles p
WHERE auth.users.id = p.id;

-- 5. Asegurar que los nuevos usuarios también tengan el rol en Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Insertamos en profiles con rol client por defecto
  INSERT INTO public.profiles (id, email, full_name, avatar_url, role)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'avatar_url', 
    'client'
  );

  -- También lo inyectamos en auth.users.raw_app_meta_data para el RLS
  UPDATE auth.users 
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role": "client"}'::jsonb
  WHERE id = new.id;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
