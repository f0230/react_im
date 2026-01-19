-- ========================================================
-- RESET COMPLETO DE RLS (JWT BASED - NO RECURSION)
-- ========================================================

-- 1. FUNCIÓN DE SINCRONIZACIÓN (Arregla el error de la columna raw_app_meta_data)
CREATE OR REPLACE FUNCTION sync_user_role_to_auth()
RETURNS void AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = 
    CASE 
      WHEN raw_app_meta_data IS NULL THEN jsonb_build_object('role', p.role)
      ELSE raw_app_meta_data || jsonb_build_object('role', p.role)
    END
  FROM public.profiles p
  WHERE auth.users.id = p.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ejecutar sincronización para usuarios actuales
SELECT sync_user_role_to_auth();

-- 2. LIMPIEZA DE POLÍTICAS EXISTENTES
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public' 
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- 3. POLÍTICAS JWT-BASED (Ultra rápidas, sin consultar tablas)
-- Usamos: ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text)

-- --- PROFILES ---
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT 
USING ( id = auth.uid() OR ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) IN ('admin', 'worker') );

CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE 
USING ( id = auth.uid() );

-- --- CLIENTS ---
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clients_access" ON public.clients FOR ALL
USING ( user_id = auth.uid() OR ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) IN ('admin', 'worker') );

-- --- APPOINTMENTS ---
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "appointments_access" ON public.appointments FOR SELECT
USING ( user_id = auth.uid() OR ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) IN ('admin', 'worker') );

-- --- PROJECTS ---
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "projects_select" ON public.projects FOR SELECT
USING ( client_id = auth.uid() OR ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) IN ('admin', 'worker') );

CREATE POLICY "projects_admin" ON public.projects FOR ALL
USING ( ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin' );

-- --- WHATSAPP & OTHER TABLES ---
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "whatsapp_access" ON public.whatsapp_messages FOR ALL
USING ( ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) IN ('admin', 'worker') );

ALTER TABLE public.whatsapp_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "whatsapp_threads_access" ON public.whatsapp_threads FOR ALL
USING ( ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) IN ('admin', 'worker') );

ALTER TABLE public.thread_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "thread_projects_access" ON public.thread_projects FOR ALL
USING ( ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) IN ('admin', 'worker') );
