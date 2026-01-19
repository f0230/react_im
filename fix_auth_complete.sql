-- ========================================
-- PASO 1: Arreglar usuarios existentes
-- ========================================
-- Asignar rol 'client' a todos los usuarios que no tienen rol
UPDATE public.profiles 
SET role = 'client' 
WHERE role IS NULL;

-- ========================================
-- PASO 2: Crear/Actualizar el Trigger
-- ========================================
-- Función que se ejecuta cuando alguien se registra
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, role)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Usuario'),
    new.raw_user_meta_data->>'avatar_url',
    'client'  -- Rol por defecto
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    role = COALESCE(public.profiles.role, 'client');  -- Si ya existe pero sin rol, asignar 'client'
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Eliminar trigger viejo si existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Crear el trigger nuevo
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- ========================================
-- PASO 3: Verificar que funcionó
-- ========================================
-- Ejecuta esto después para confirmar:
-- SELECT id, email, role, created_at FROM public.profiles ORDER BY created_at DESC LIMIT 10;
