-- ============================================================
-- Catálogo Simplificado de Tareas DTE
-- Objetivo: Compensación justa por rol y responsabilidad
-- Estructura: Rol → Nivel → Responsabilidad
-- Total: ~35 tareas (vs 149 originales)
-- ============================================================

-- ============================================================
-- 1. DESACTIVAR TODAS LAS TAREAS ACTUALES
-- ============================================================

UPDATE public.worker_task_types SET is_active = false;

-- ============================================================
-- 2. PAID MEDIA (Performance)
-- Diferenciación: Setup vs Gestión | Plataforma vs Multiplataforma
-- ============================================================

INSERT INTO public.worker_task_types (code, name, category, base_points, description, is_active)
VALUES
    -- Setup Inicial (trabajo puntual, alto valor)
    ('perf_meta_setup', 'Setup Meta Ads', 'paid_media', 6, 
     'Configuración inicial completa: Business Manager, pixel, estructura de campañas, primeros anuncios. Incluye una plataforma (FB/IG).',
     true),
    
    ('perf_google_setup', 'Setup Google Ads', 'paid_media', 6, 
     'Configuración inicial: Search, Display o YouTube. Incluye tracking, keywords, primeros anuncios.',
     true),
    
    ('perf_email_setup', 'Setup Email Marketing', 'paid_media', 5, 
     'Configuración de plataforma, templates, primeros flujos automatizados.',
     true),
    
    -- Gestión Mensual (trabajo recurrente)
    ('perf_meta_management', 'Gestión Meta Ads', 'paid_media', 5, 
     'Optimización mensual: ajustes de campañas, testing, reporting. Requiere campañas activas.',
     true),
    
    ('perf_google_management', 'Gestión Google Ads', 'paid_media', 5, 
     'Optimización mensual: ajustes de pujas, keywords, testing, reporting.',
     true),
    
    ('perf_email_management', 'Gestión Email Marketing', 'paid_media', 4, 
     'Envío de newsletters, optimización de flujos, segmentación, reporting mensual.',
     true),
    
    -- Especializado/Avanzado
    ('perf_tracking_advanced', 'Tracking Avanzado / CAPI', 'paid_media', 7, 
     'Configuración técnica compleja: Server-Side API, GA4 avanzado, integraciones. Requiere conocimiento técnico.',
     true),
    
    ('perf_multichannel_strategy', 'Estrategia Multicanal', 'paid_media', 8, 
     'Planificación de estrategia paid cross-platform. Investigación, funnels, distribución de presupuesto.',
     true)
    
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    base_points = EXCLUDED.base_points,
    description = EXCLUDED.description,
    is_active = true;

-- ============================================================
-- 3. SOCIAL MEDIA (Orgánico)
-- Diferenciación: Ejecución vs Estrategia | Volumen
-- ============================================================

INSERT INTO public.worker_task_types (code, name, category, base_points, description, is_active)
VALUES
    -- Ejecución Operativa (junior/standard)
    ('social_content_creation', 'Creación de Contenido Social', 'social_media', 3, 
     'Producción de posts: copy + diseño básico. Entrega lista para publicar.',
     true),
    
    ('social_scheduling', 'Programación y Publicación', 'social_media', 2, 
     'Carga en plataformas, scheduling, publicación manual de stories.',
     true),
    
    ('social_community_exec', 'Community Management Ejecutivo', 'social_media', 3, 
     'Respuesta a comentarios y DMs, moderación diaria. Interacción con seguidores.',
     true),
    
    -- Estrategia y Dirección (senior)
    ('social_strategy', 'Estrategia de Social Media', 'social_media', 6, 
     'Definición de pilares de contenido, calendario editorial, planificación mensual.',
     true),
    
    ('social_crisis_management', 'Gestión de Crisis / Reputación', 'social_media', 6, 
     'Manejo de situaciones de crisis, comunicados, moderación intensiva.',
     true),
    
    ('social_influencer_coord', 'Coordinación de Influencers', 'social_media', 4, 
     'Outreach, negociación, briefings, seguimiento de colaboraciones.',
     true)
    
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    base_points = EXCLUDED.base_points,
    description = EXCLUDED.description,
    is_active = true;

-- ============================================================
-- 4. COPY & CONTENIDO
-- Diferenciación: Formato | Complejidad
-- ============================================================

INSERT INTO public.worker_task_types (code, name, category, base_points, description, is_active)
VALUES
    -- Copy Operativo (rápido, corto)
    ('copy_social_ads', 'Copy para Redes y Ads', 'copywriting', 2, 
     'Captions, headlines, textos cortos para publicaciones y publicidad.',
     true),
    
    ('copy_email', 'Copy para Email', 'copywriting', 2, 
     'Asuntos, cuerpo de email, CTAs para newsletters y flujos.',
     true),
    
    -- Copy Estratégico (más complejo)
    ('copy_web_longform', 'Copy Web y Landing Pages', 'copywriting', 4, 
     'Textos para sitios web: home, landings, secciones de producto.',
     true),
    
    ('copy_blog_article', 'Artículos y Blog', 'copywriting', 4, 
     'Artículos de 800-1500 palabras, optimizados SEO.',
     true),
    
    ('copy_brand_strategy', 'Copy de Marca / Storytelling', 'copywriting', 6, 
     'Narrativa de marca, propuesta de valor, messaging framework.',
     true),
    
    ('copy_script_video', 'Guiones para Video', 'copywriting', 3, 
     'Estructura, textos y dirección para videos y reels.',
     true)
    
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    base_points = EXCLUDED.base_points,
    description = EXCLUDED.description,
    is_active = true;

-- ============================================================
-- 5. DISEÑO GRÁFICO
-- Diferenciación: Complejidad | Uso final
-- ============================================================

INSERT INTO public.worker_task_types (code, name, category, base_points, description, is_active)
VALUES
    -- Diseño de Producción (operativo)
    ('design_social_post', 'Diseño para Redes Sociales', 'design', 2, 
     'Posts estáticos, stories, carruseles simples para social media.',
     true),
    
    ('design_ads_creatives', 'Creatividades Publicitarias', 'design', 3, 
     'Banners, ads display, piezas para pauta pagada.',
     true),
    
    ('design_presentations', 'Presentaciones y Decks', 'design', 4, 
     'Diseño de pitch decks, presentaciones comerciales.',
     true),
    
    -- Diseño de Identidad (estrategico)
    ('design_brand_identity', 'Identidad de Marca', 'design', 10, 
     'Sistema visual completo: logo, colores, tipografía, manual básico.',
     true),
    
    ('design_brand_refresh', 'Refresh / Evolución de Marca', 'design', 8, 
     'Modernización de identidad existente sin cambio radical.',
     true),
    
    ('design_editorial_packaging', 'Editorial / Packaging', 'design', 6, 
     'Diseño de catálogos, revistas, packaging de producto.',
     true),
    
    ('design_illustration_custom', 'Ilustración Personalizada', 'design', 5, 
     'Ilustraciones digitales a medida para marca.',
     true)
    
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    base_points = EXCLUDED.base_points,
    description = EXCLUDED.description,
    is_active = true;

-- ============================================================
-- 6. VIDEO & MOTION
-- Diferenciación: Técnica | Complejidad | Tiempo
-- ============================================================

INSERT INTO public.worker_task_types (code, name, category, base_points, description, is_active)
VALUES
    -- Edición (técnica pero más estandarizada)
    ('video_editing_social', 'Edición Video Social', 'video', 3, 
     'Edición de reels, TikToks, videos cortos para redes. Incluye color básico y audio.',
     true),
    
    ('video_editing_longform', 'Edición Video Long-form', 'video', 6, 
     'Edición de videos extensos: entrevistas, documentales, cursos.',
     true),
    
    ('video_subtitles_motion', 'Subtítulos y Motion Básico', 'video', 3, 
     'Subtítulos animados, lower thirds, transiciones simples.',
     true),
    
    -- Motion y Animación (más especializado)
    ('video_motion_graphics', 'Motion Graphics', 'video', 8, 
     'Animación 2D compleja, gráficos animados, composiciones.',
     true),
    
    ('video_animation_2d', 'Animación 2D / Frame by Frame', 'video', 10, 
     'Animación frame by frame, personajes, storytelling animado.',
     true),
    
    ('video_3d_cgi', '3D / CGI', 'video', 15, 
     'Modelado, texturizado, animación 3D, renders.',
     true),
    
    -- Producción
    ('video_production_coordination', 'Coordinación de Producción', 'video', 4, 
     'Logística de filmación, scouting, coordinación de equipo y locación.',
     true)
    
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    base_points = EXCLUDED.base_points,
    description = EXCLUDED.description,
    is_active = true;

-- ============================================================
-- 7. WEB & DIGITAL
-- Diferenciación: Tecnología | Alcance
-- ============================================================

INSERT INTO public.worker_task_types (code, name, category, base_points, description, is_active)
VALUES
    -- Diseño Web
    ('web_ui_ux_design', 'Diseño UI/UX Web', 'web_digital', 7, 
     'Diseño de interfaces, wireframes, prototipos, experiencia de usuario.',
     true),
    
    ('web_landing_design', 'Diseño Landing Page', 'web_digital', 5, 
     'Diseño de página de aterrizaje optimizada para conversión.',
     true),
    
    -- Desarrollo (diferenciado por complejidad)
    ('web_dev_wordpress', 'Desarrollo WordPress / CMS', 'web_digital', 7, 
     'Sitios en WordPress, Shopify, o CMS. Temas personalizados.',
     true),
    
    ('web_dev_custom', 'Desarrollo Web Custom', 'web_digital', 10, 
     'Desarrollo a medida con React/Vue/Angular. Frontend complejo.',
     true),
    
    ('web_ecommerce', 'E-commerce Setup', 'web_digital', 9, 
     'Configuración completa de tienda online: productos, pagos, envíos.',
     true),
    
    -- Técnico/Especializado
    ('web_tracking_analytics', 'Tracking y Analytics', 'web_digital', 6, 
     'Setup de GA4, GTM, eventos, conversiones.',
     true),
    
    ('web_seo_technical', 'SEO Técnico', 'web_digital', 6, 
     'Optimización de velocidad, indexación, schema markup.',
     true),
    
    ('web_automations_integrations', 'Automatizaciones Web', 'web_digital', 7, 
     'Chatbots, flujos automáticos, integraciones API, Zapier.',
     true),
    
    ('web_maintenance', 'Mantenimiento Web Mensual', 'web_digital', 3, 
     'Actualizaciones, backups, seguridad, fixes menores.',
     true)
    
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    base_points = EXCLUDED.base_points,
    description = EXCLUDED.description,
    is_active = true;

-- ============================================================
-- 8. ESTRATEGIA & CONSULTORÍA
-- Diferenciación: Alcance | Entregable
-- ============================================================

INSERT INTO public.worker_task_types (code, name, category, base_points, description, is_active)
VALUES
    -- Investigación y Análisis
    ('strategy_marketing_plan', 'Plan de Marketing', 'strategy', 8, 
     'Estrategia completa: análisis, objetivos, canales, presupuesto, timeline.',
     true),
    
    ('strategy_brand_consulting', 'Consultoría de Marca', 'strategy', 7, 
     'Diagnóstico, posicionamiento, diferenciación, propuesta de valor.',
     true),
    
    ('strategy_customer_research', 'Investigación de Cliente', 'strategy', 6, 
     'Entrevistas, encuestas, customer journey, user personas.',
     true),
    
    ('strategy_competitor_analysis', 'Análisis de Competencia', 'strategy', 5, 
     'Benchmark, análisis de mercado, oportunidades identificadas.',
     true),
    
    -- Workshops y Facilitación
    ('strategy_workshop_facilitation', 'Facilitación de Workshop', 'strategy', 7, 
     'Diseño, facilitación y documentación de workshops de co-creación.',
     true),
    
    ('strategy_training', 'Capacitación / Training', 'strategy', 5, 
     'Transferencia de conocimiento, capacitación al cliente.',
     true)
    
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    base_points = EXCLUDED.base_points,
    description = EXCLUDED.description,
    is_active = true;

-- ============================================================
-- 9. PROJECT MANAGEMENT & OPERACIONES
-- Diferenciación: Nivel de responsabilidad
-- ============================================================

INSERT INTO public.worker_task_types (code, name, category, base_points, description, is_active)
VALUES
    -- Coordinación Operativa
    ('pm_project_coordination', 'Coordinación de Proyecto', 'project_management', 5, 
     'Seguimiento de tareas, coordinación de equipo, reportes de avance.',
     true),
    
    ('pm_sprint_planning', 'Planning y Sprint Management', 'project_management', 4, 
     'Planificación de sprints, daily standups, retrospectives.',
     true),
    
    ('pm_client_management', 'Gestión de Cliente', 'project_management', 3, 
     'Reuniones con cliente, presentaciones, gestión de feedback.',
     true),
    
    ('pm_qa_review', 'QA y Control de Calidad', 'project_management', 3, 
     'Revisión de entregables, testing, control de calidad antes de envío.',
     true),
    
    -- Liderazgo Estratégico
    ('pm_project_leadership', 'Liderazgo de Proyecto', 'project_management', 7, 
     'Dirección completa: scope, riesgos, stakeholders, toma de decisiones.',
     true),
    
    ('pm_account_direction', 'Dirección de Cuenta', 'project_management', 6, 
     'Relación estratégica con cliente, upselling, planificación a largo plazo.',
     true)
    
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    base_points = EXCLUDED.base_points,
    description = EXCLUDED.description,
    is_active = true;

-- ============================================================
-- 10. CUSTOM / ESPECIALIZADO
-- Para casos fuera del catálogo
-- ============================================================

INSERT INTO public.worker_task_types (code, name, category, base_points, description, is_active)
VALUES
    ('custom_standard', 'Trabajo Especializado (Standard)', 'custom', 4, 
     'Tareas no catalogadas de complejidad media. Usar con descripción detallada.',
     true),
    
    ('custom_complex', 'Trabajo Especializado (Complejo)', 'custom', 8, 
     'Tareas no catalogadas de alta complejidad o especialización. Usar con descripción y justificación de puntos.',
     true),
    
    ('custom_consulting', 'Consultoría Especializada', 'custom', 5, 
     'Asesoría puntual en áreas específicas. Por hora o por entrega.',
     true)
    
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    base_points = EXCLUDED.base_points,
    description = EXCLUDED.description,
    is_active = true;

-- ============================================================
-- RESUMEN DEL NUEVO CATÁLOGO
-- ============================================================
-- Total de tareas activas: ~38
-- Estructura clara por roles y responsabilidades
-- Fácil de entender y usar
-- ============================================================
