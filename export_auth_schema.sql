-- ========================================================
-- CONSULTA DE DIAGNÓSTICO DE AUTH Y RLS
-- ========================================================

-- 1. Ver todas las POLÍTICAS RLS activas en el esquema público
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual, 
    with_check
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. Ver las TABLAS relevantes y su estructura
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'clients', 'appointments', 'projects')
ORDER BY table_name, ordinal_position;

-- 3. Ver FUNCIONES personalizadas (triggers y helpers de rol)
SELECT 
    n.nspname as schema,
    p.proname as function_name,
    pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
AND (
    p.proname LIKE '%user%' OR 
    p.proname LIKE '%role%' OR 
    p.proname LIKE '%auth%'
);

-- 4. Ver TRIGGERS activos
SELECT 
    event_object_table AS table_name, 
    trigger_name, 
    event_manipulation AS event, 
    action_statement AS definition, 
    action_timing AS timing
FROM information_schema.triggers 
WHERE event_object_schema = 'public' 
OR event_object_schema = 'auth';
