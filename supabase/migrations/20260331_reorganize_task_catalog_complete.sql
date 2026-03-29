-- ============================================================
-- Reorganización completa del catálogo de tareas DTE
-- Objetivo: Eliminar redundancias, cubrir servicios faltantes,
-- y estructurar por áreas de especialidad claras
-- ============================================================

-- ============================================================
-- 1. PRIMERO: Desactivar tareas redundantes o mal categorizadas
-- (No las borramos para mantener integridad de logs históricos)
-- ============================================================

UPDATE public.worker_task_types 
SET is_active = false 
WHERE code IN (
    'paid_media_setup',           -- Redundante con setups específicos de cada plataforma
    'paid_media_optimization',    -- Redundante con optimizaciones específicas
    'social_content_system',      -- Solapa con content_programming_multichannel
    'copy_ads',                   -- Lo movemos a copy_meta_ads específico
    'video_reel_edit',            -- Lo reemplazamos por edición de video más granular
    'internal_campaign_design'    -- Poco usado, cubierto por estrategia
);

-- ============================================================
-- 2. CATEGORÍA: Meta Ads (antes parte de 'campanas')
-- ============================================================

INSERT INTO public.worker_task_types (code, name, category, base_points, description)
VALUES
    ('meta_business_manager_setup', 'Setup Meta Business / activos', 'meta_ads', 5, 'Configuración inicial de Business Manager, cuentas publicitarias, píxeles y permisos'),
    ('meta_ads_account_review', 'Auditoría de cuenta Meta Ads', 'meta_ads', 4, 'Revisión de estructura actual, errores y oportunidades de mejora'),
    ('meta_ads_campaign_setup', 'Configuración campaña Meta Ads', 'meta_ads', 5, 'Estructura de campaña: objetivos, conjuntos, audiencias y anuncios'),
    ('meta_ads_creative_setup', 'Setup creatividades Meta Ads', 'meta_ads', 3, 'Carga y configuración de piezas publicitarias en Ads Manager'),
    ('meta_ads_tracking_setup', 'Setup pixel / eventos / CAPI', 'meta_ads', 6, 'Instalación de pixel, eventos personalizados, CAPI y dominios verificados'),
    ('meta_ads_retargeting_setup', 'Setup remarketing / retargeting', 'meta_ads', 4, 'Configuración de audiencias de remarketing y campañas de recuperación'),
    ('meta_ads_optimization_cycle', 'Optimización campaña Meta Ads', 'meta_ads', 4, 'Ajustes de presupuesto, pujas, audiencias y creatividades en campaña activa'),
    ('meta_ads_a_b_testing', 'A/B testing en Meta Ads', 'meta_ads', 3, 'Configuración y análisis de tests A/B de creatividades o audiencias'),
    ('meta_ads_reporting', 'Reporte / análisis Meta Ads', 'meta_ads', 3, 'Lectura de métricas, hallazgos y recomendaciones de campaña'),
    ('meta_ads_budget_scaling', 'Escalado de presupuesto Meta', 'meta_ads', 3, 'Estrategia y ejecución de escalado controlado de inversión')
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    base_points = EXCLUDED.base_points,
    description = EXCLUDED.description,
    is_active = TRUE;

-- ============================================================
-- 3. CATEGORÍA: Google Ads (NUEVA - no existía)
-- ============================================================

INSERT INTO public.worker_task_types (code, name, category, base_points, description)
VALUES
    ('google_ads_account_setup', 'Setup cuenta Google Ads', 'google_ads', 5, 'Configuración inicial de cuenta, facturación y vinculaciones'),
    ('google_ads_search_setup', 'Configuración campaña Search', 'google_ads', 5, 'Estructura de campaña de búsqueda: grupos de anuncios, keywords y pujas'),
    ('google_ads_display_setup', 'Configuración campaña Display', 'google_ads', 5, 'Configuración de campañas de display y remarketing visual'),
    ('google_ads_youtube_setup', 'Configuración campaña YouTube', 'google_ads', 6, 'Setup de campañas de video en YouTube: in-stream, discovery, bumper'),
    ('google_ads_shopping_setup', 'Configuración Google Shopping', 'google_ads', 6, 'Setup de campañas de shopping y vinculación con Merchant Center'),
    ('google_ads_keywords_research', 'Investigación de keywords', 'google_ads', 3, 'Research de términos de búsqueda, match types y negative keywords'),
    ('google_ads_audiences_setup', 'Configuración audiencias', 'google_ads', 4, 'Setup de audiencias personalizadas, similares y en mercado'),
    ('google_ads_conversion_tracking', 'Setup conversiones GA4/GTM', 'google_ads', 6, 'Configuración de eventos de conversión, GA4 y Tag Manager'),
    ('google_ads_optimization', 'Optimización Google Ads', 'google_ads', 4, 'Ajustes de campañas activas: pujas, keywords, audiencias y creatividades'),
    ('google_ads_quality_score_opt', 'Optimización Quality Score', 'google_ads', 3, 'Mejora de relevancia de anuncios, landing pages y CTR esperado'),
    ('google_ads_reporting', 'Reporte / análisis Google Ads', 'google_ads', 3, 'Análisis de métricas de Search, Display y YouTube'),
    ('google_ads_script_automation', 'Script/automatización Google Ads', 'google_ads', 7, 'Desarrollo de scripts para automatizaciones avanzadas')
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    base_points = EXCLUDED.base_points,
    description = EXCLUDED.description,
    is_active = TRUE;

-- ============================================================
-- 4. CATEGORÍA: Email Marketing (NUEVA - antes solo newsletter)
-- ============================================================

INSERT INTO public.worker_task_types (code, name, category, base_points, description)
VALUES
    ('email_platform_setup', 'Setup plataforma email marketing', 'email_marketing', 4, 'Configuración de Mailchimp, Brevo, Klaviyo u otra plataforma'),
    ('email_template_design', 'Diseño template email', 'email_marketing', 4, 'Maquetación visual de newsletter o template transaccional'),
    ('email_newsletter_send', 'Newsletter / envío de campaña', 'email_marketing', 3, 'Armado, segmentación y envío de campaña de email'),
    ('email_automation_flow', 'Flujo de automatización email', 'email_marketing', 6, 'Configuración de flows: welcome, abandono de carrito, reactivación'),
    ('email_segmentation_setup', 'Segmentación de lista', 'email_marketing', 3, 'Creación de segmentos dinámicos y listas basadas en comportamiento'),
    ('email_a_b_testing', 'A/B testing emails', 'email_marketing', 3, 'Tests de asuntos, contenido o tiempos de envío'),
    ('email_deliverability_opt', 'Optimización deliverability', 'email_marketing', 5, 'Mejora de tasas de entrega: autenticación, reputación, limpieza de listas'),
    ('email_analytics_reporting', 'Reporte email marketing', 'email_marketing', 2, 'Análisis de métricas: open rate, CTR, conversiones')
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    base_points = EXCLUDED.base_points,
    description = EXCLUDED.description,
    is_active = TRUE;

-- ============================================================
-- 5. CATEGORÍA: Organic Social (antes parte de 'social' y 'contenido')
-- ============================================================

INSERT INTO public.worker_task_types (code, name, category, base_points, description)
VALUES
    ('social_content_strategy', 'Estrategia de contenido redes', 'organic_social', 6, 'Definición de pilares de contenido, calendario editorial y tono'),
    ('social_calendar_planning', 'Planificación calendario mensual', 'organic_social', 4, 'Organización de contenidos por semana y plataforma'),
    ('social_content_scheduling', 'Programación de publicaciones', 'organic_social', 2, 'Carga y calendarización en Meta Business Suite o herramientas'),
    ('social_publishing_manual', 'Publicación manual / stories', 'organic_social', 2, 'Publicación operativa en tiempo real o stories'),
    ('social_community_management', 'Community management', 'organic_social', 3, 'Gestión diaria de comentarios, mensajes e interacciones'),
    ('social_dm_response', 'Respuesta DMs / inbox', 'organic_social', 2, 'Atención de consultas por mensaje directo'),
    ('social_comment_moderation', 'Moderación de comentarios', 'organic_social', 2, 'Respuesta, filtrado y gestión de comentarios'),
    ('social_engagement_pods', 'Engagement / networking activo', 'organic_social', 2, 'Interacción estratégica con otras cuentas y comunidades'),
    ('social_hashtag_strategy', 'Estrategia de hashtags', 'organic_social', 2, 'Research y organización de hashtags por objetivo'),
    ('social_ugc_curation', 'Curación UGC / contenido generado', 'organic_social', 2, 'Búsqueda, permisos y reutilización de contenido de usuarios'),
    ('social_influencer_outreach', 'Outreach a influencers/collabs', 'organic_social', 4, 'Contacto, negociación y coordinación con creadores'),
    ('social_analytics_reporting', 'Reporte redes sociales', 'organic_social', 3, 'Análisis de métricas de crecimiento y engagement'),
    ('social_crisis_management', 'Gestión de crisis / reputación', 'organic_social', 5, 'Manejo de situaciones de reputación online')
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    base_points = EXCLUDED.base_points,
    description = EXCLUDED.description,
    is_active = TRUE;

-- ============================================================
-- 6. CATEGORÍA: Copy & Contenido (renombrada y ampliada)
-- ============================================================

INSERT INTO public.worker_task_types (code, name, category, base_points, description)
VALUES
    ('copy_meta_ads', 'Copy para Meta Ads', 'copy_contenido', 2, 'Redacción de textos publicitarios para Facebook e Instagram Ads'),
    ('copy_google_ads', 'Copy para Google Ads', 'copy_contenido', 2, 'Redacción de headlines y descriptions para Search y Display'),
    ('copy_social_media', 'Copy para redes sociales', 'copy_contenido', 2, 'Captions, textos para posts y stories'),
    ('copy_website_landing', 'Copy para web / landing', 'copy_contenido', 4, 'Textos para páginas web, landing pages y secciones'),
    ('copy_email_marketing', 'Copy para email marketing', 'copy_contenido', 2, 'Asuntos, cuerpo de email y calls to action'),
    ('copy_brand_storytelling', 'Storytelling de marca', 'copy_contenido', 5, 'Narrativa de marca, origen, propósito y valores'),
    ('copy_script_video', 'Guion para video / reel', 'copy_contenido', 3, 'Estructura, texto y dirección de actuación para video'),
    ('copy_blog_article', 'Artículo de blog', 'copy_contenido', 4, 'Redacción de post optimizado para SEO'),
    ('copy_product_description', 'Descripción de producto', 'copy_contenido', 2, 'Fichas técnicas y descripciones comerciales'),
    ('copy_seo_optimization', 'Optimización SEO on-page', 'copy_contenido', 3, 'Meta títulos, descriptions, headings y estructura'),
    ('content_pillar_creation', 'Creación de pilar de contenido', 'copy_contenido', 5, 'Desarrollo de contenido extenso que se deriva en múltiples piezas'),
    ('content_repurposing', 'Reciclaje de contenido', 'copy_contenido', 2, 'Adaptación de contenido existente a nuevos formatos')
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    base_points = EXCLUDED.base_points,
    description = EXCLUDED.description,
    is_active = TRUE;

-- ============================================================
-- 7. CATEGORÍA: Diseño Gráfico (ampliada)
-- ============================================================

INSERT INTO public.worker_task_types (code, name, category, base_points, description)
VALUES
    ('design_brand_identity', 'Identidad visual / branding', 'diseno', 10, 'Sistema visual completo: logo, paleta, tipografía, aplicaciones'),
    ('design_brand_refresh', 'Refresh / rediseño de marca', 'diseno', 8, 'Actualización de identidad existente'),
    ('design_brand_guidelines', 'Manual de marca', 'diseno', 6, 'Documentación de uso de marca'),
    ('design_social_post', 'Diseño de post para redes', 'diseno', 2, 'Pieza estática para feed o stories'),
    ('design_social_carousel', 'Diseño de carrusel', 'diseno', 3, 'Serie de slides informativas o promocionales'),
    ('design_social_template', 'Template editable para redes', 'diseno', 4, 'Diseño de sistema de templates reutilizables'),
    ('design_ad_creative', 'Diseño de creativa publicitaria', 'diseno', 3, 'Piezas específicas para pauta pagada'),
    ('design_infographic', 'Infografía / dataviz', 'diseno', 4, 'Visualización de información y datos'),
    ('design_presentation_deck', 'Presentación / pitch deck', 'diseno', 4, 'Diseño de diapositivas comerciales'),
    ('design_packaging', 'Diseño de packaging', 'diseno', 6, 'Envases, etiquetas y aplicaciones de producto'),
    ('design_editorial', 'Diseño editorial', 'diseno', 5, 'Revistas, catálogos y materiales impresos'),
    ('design_illustration', 'Ilustración personalizada', 'diseno', 5, 'Arte digital o vectorial a medida'),
    ('design_photo_editing', 'Edición / retoque fotográfico', 'diseno', 3, 'Color grading, manipulación y retoque'),
    ('design_mockup_creation', 'Creación de mockups', 'diseno', 3, 'Presentaciones realistas de diseños'),
    ('design_print_production', 'Preprensa / producción gráfica', 'diseno', 3, 'Archivos para imprenta, sangrías, colores')
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    base_points = EXCLUDED.base_points,
    description = EXCLUDED.description,
    is_active = TRUE;

-- ============================================================
-- 8. CATEGORÍA: Video & Motion (ampliada significativamente)
-- ============================================================

INSERT INTO public.worker_task_types (code, name, category, base_points, description)
VALUES
    ('video_reel_short_edit', 'Edición de reel / video corto', 'video_motion', 3, 'Edición rápida para TikTok, Reels, Shorts'),
    ('video_social_content_edit', 'Edición de contenido social', 'video_motion', 4, 'Edición de video para redes con música y texto'),
    ('video_long_form_edit', 'Edición video long-form', 'video_motion', 6, 'Edición de video extenso: entrevistas, documentales, cursos'),
    ('video_ad_commercial_edit', 'Edición de spot publicitario', 'video_motion', 5, 'Video con estructura publicitaria y CTA'),
    ('video_color_grading', 'Color grading / corrección', 'video_motion', 4, 'Ajuste de color y look cinematográfico'),
    ('video_sound_design', 'Diseño sonoro / audio', 'video_motion', 3, 'Mezcla de audio, música, SFX y limpieza'),
    ('video_subtitles_captions', 'Subtítulos / closed captions', 'video_motion', 2, 'Transcripción y sincronización de subtítulos'),
    ('video_motion_graphics_basic', 'Motion graphics básico', 'video_motion', 5, 'Animaciones simples de texto y formas'),
    ('video_motion_graphics_advanced', 'Motion graphics avanzado', 'video_motion', 10, 'Animaciones complejas, personajes, 3D'),
    ('video_animation_2d', 'Animación 2D', 'video_motion', 8, 'Animación frame by frame o vectorial'),
    ('video_animation_3d', 'Animación 3D / CGI', 'video_motion', 15, 'Modelado, texturizado y animación 3D'),
    ('video_kinetic_typography', 'Tipografía cinética', 'video_motion', 4, 'Animación de texto con ritmo y dinámica'),
    ('video_screen_recording', 'Grabación de pantalla / tutorial', 'video_motion', 2, 'Screencast y edición de tutoriales'),
    ('video_stock_footage_search', 'Búsqueda de stock footage', 'video_motion', 2, 'Curación de material de archivo'),
    ('video_storyboard', 'Storyboard / animatic', 'video_motion', 4, 'Secuencia visual y guión gráfico'),
    ('video_production_coordination', 'Coordinación de producción', 'video_motion', 4, 'Logística de filmación, equipo y locación')
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    base_points = EXCLUDED.base_points,
    description = EXCLUDED.description,
    is_active = TRUE;

-- ============================================================
-- 9. CATEGORÍA: Web & Digital (ampliada)
-- ============================================================

INSERT INTO public.worker_task_types (code, name, category, base_points, description)
VALUES
    ('web_ux_ui_design', 'Diseño UX/UI web / app', 'web_digital', 8, 'Arquitectura de información, wireframes y diseño visual'),
    ('web_landing_page_design', 'Diseño landing page', 'web_digital', 5, 'Página de aterrizaje optimizada para conversión'),
    ('web_wordpress_build', 'Desarrollo WordPress', 'web_digital', 8, 'Armado de sitio en WordPress con temas o builders'),
    ('web_custom_frontend', 'Desarrollo frontend custom', 'web_digital', 10, 'HTML/CSS/JS a medida o frameworks modernos'),
    ('web_ecommerce_setup', 'Setup ecommerce', 'web_digital', 10, 'Configuración de tienda online (Shopify, WooCommerce)'),
    ('web_cms_configuration', 'Configuración CMS', 'web_digital', 5, 'Setup de contenido administrable'),
    ('web_seo_technical', 'SEO técnico', 'web_digital', 6, 'Optimización de velocidad, indexación, schema markup'),
    ('web_analytics_setup', 'Setup Analytics / tracking', 'web_digital', 5, 'Configuración de Google Analytics, eventos, conversiones'),
    ('web_funnel_setup', 'Setup de embudo / funnel', 'web_digital', 7, 'Estructura de páginas para conversión escalonada'),
    ('web_ab_testing_setup', 'Setup A/B testing web', 'web_digital', 5, 'Configuración de tests en sitio (Google Optimize, etc.)'),
    ('web_maintenance_update', 'Mantenimiento web', 'web_digital', 3, 'Actualizaciones, backups, seguridad básica'),
    ('web_bug_fix', 'Fix de bug / error web', 'web_digital', 2, 'Corrección de issues puntuales'),
    ('web_performance_opt', 'Optimización performance', 'web_digital', 5, 'Mejora de velocidad de carga y Core Web Vitals'),
    ('web_accessibility_audit', 'Auditoría de accesibilidad', 'web_digital', 4, 'Revisión WCAG y recomendaciones'),
    ('web_form_integration', 'Integración de formularios', 'web_digital', 3, 'Contacto, lead capture, integraciones'),
    ('chatbot_flow_setup', 'Setup flujo de chatbot', 'web_digital', 5, 'Configuración de respuestas automáticas y flujos')
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    base_points = EXCLUDED.base_points,
    description = EXCLUDED.description,
    is_active = TRUE;

-- ============================================================
-- 10. CATEGORÍA: Estrategia & Consultoría (ampliada)
-- ============================================================

INSERT INTO public.worker_task_types (code, name, category, base_points, description)
VALUES
    ('strategy_brand_consulting', 'Consultoría de marca', 'estrategia', 8, 'Diagnóstico, posicionamiento y dirección estratégica'),
    ('strategy_digital_consulting', 'Consultoría digital', 'estrategia', 8, 'Estrategia de presencia digital omnicanal'),
    ('strategy_marketing_plan', 'Plan de marketing', 'estrategia', 10, 'Estrategia completa: objetivos, tácticas, canales, KPIs'),
    ('strategy_workshop_facilitation', 'Facilitación de workshop', 'estrategia', 7, 'Dinámica de descubrimiento, ideación o alineación'),
    ('strategy_customer_research', 'Investigación de cliente', 'estrategia', 6, 'Entrevistas, encuestas y análisis de público objetivo'),
    ('strategy_competitor_analysis', 'Análisis de competencia', 'estrategia', 5, 'Benchmark y mapeo de competidores'),
    ('strategy_value_proposition', 'Definición de propuesta de valor', 'estrategia', 6, 'Pilar de oferta, diferenciación y mensaje clave'),
    ('strategy_service_packaging', 'Paquetización de servicios', 'estrategia', 7, 'Estructura de planes, pricing y propuesta comercial'),
    ('strategy_growth_planning', 'Plan de crecimiento', 'estrategia', 8, 'Estrategia de escalado y adquisición'),
    ('strategy_retainer_planning', 'Planning mensual retainer', 'estrategia', 5, 'Definición de prioridades y alcance del mes'),
    ('strategy_crisis_strategy', 'Estrategia de crisis', 'estrategia', 8, 'Plan de contingencia y comunicación en crisis'),
    ('strategy_rebranding_strategy', 'Estrategia de rebranding', 'estrategia', 10, 'Plan integral de cambio de marca'),
    ('strategy_internal_alignment', 'Alineación interna / cultura', 'estrategia', 6, 'Estrategia de comunicación interna y valores')
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    base_points = EXCLUDED.base_points,
    description = EXCLUDED.description,
    is_active = TRUE;

-- ============================================================
-- 11. CATEGORÍA: Automatizaciones & CRM (ampliada)
-- ============================================================

INSERT INTO public.worker_task_types (code, name, category, base_points, description)
VALUES
    ('automation_crm_setup', 'Setup de CRM', 'automatizaciones', 6, 'Configuración de HubSpot, Pipedrive, Salesforce, etc.'),
    ('automation_lead_scoring', 'Lead scoring / calificación', 'automatizaciones', 4, 'Sistema de puntuación y calificación de leads'),
    ('automation_nurture_sequence', 'Secuencia de nutrición', 'automatizaciones', 5, 'Flujo automatizado de emails para leads'),
    ('automation_whatsapp_flow', 'Flujo de WhatsApp Business', 'automatizaciones', 6, 'Automatizaciones y chatbots en WhatsApp'),
    ('automation_zapier_make', 'Integración Zapier / Make', 'automatizaciones', 5, 'Conexión de apps y automatización de procesos'),
    ('automation_workflow_design', 'Diseño de workflow', 'automatizaciones', 6, 'Mapeo y documentación de procesos automatizables'),
    ('automation_reporting_dashboard', 'Dashboard automatizado', 'automatizaciones', 6, 'Reportes automáticos con Data Studio, Tableau, etc.'),
    ('automation_data_sync', 'Sincronización de datos', 'automatizaciones', 5, 'Integración de bases de datos entre plataformas'),
    ('automation_alert_notification', 'Sistema de alertas', 'automatizaciones', 3, 'Notificaciones automáticas por eventos específicos')
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    base_points = EXCLUDED.base_points,
    description = EXCLUDED.description,
    is_active = TRUE;

-- ============================================================
-- 12. CATEGORÍA: Espacios & Experiencias (se mantiene)
-- ============================================================

INSERT INTO public.worker_task_types (code, name, category, base_points, description)
VALUES
    ('space_experience_design', 'Diseño de experiencia / espacio', 'espacios', 10, 'Concepto integral de espacio físico o virtual'),
    ('space_brand_activation', 'Activación de marca en espacio', 'espacios', 8, 'Aplicación de marca en ambientación'),
    ('space_event_concept', 'Concepto de evento corporativo', 'espacios', 8, 'Ideación y estructura visual de evento'),
    ('space_ambiance_design', 'Ambientación y decoración', 'espacios', 6, 'Look & feel, elementos decorativos'),
    ('space_signage_wayfinding', 'Señalética / wayfinding', 'espacios', 5, 'Sistema de orientación y señalización'),
    ('space_pop_up_design', 'Diseño de pop-up / stand', 'espacios', 7, 'Espacio temporal comercial o exposición'),
    ('space_photo_staging', 'Puesta en escena fotográfica', 'espacios', 4, 'Ambientación para sesiones de foto/video'),
    ('space_virtual_showroom', 'Showroom virtual / 3D', 'espacios', 8, 'Espacio digital interactivo')
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    base_points = EXCLUDED.base_points,
    description = EXCLUDED.description,
    is_active = TRUE;

-- ============================================================
-- 13. CATEGORÍA: Gestión & Operaciones (ampliada)
-- ============================================================

INSERT INTO public.worker_task_types (code, name, category, base_points, description)
VALUES
    ('management_project_lead', 'Liderazgo de proyecto', 'gestion', 6, 'Gestión integral de proyecto: scope, tiempos, equipo'),
    ('management_sprint_planning', 'Sprint planning / coordinación', 'gestion', 5, 'Planificación y seguimiento de sprint'),
    ('management_client_meeting', 'Reunión con cliente', 'gestion', 2, 'Presentación, feedback o alineación con cliente'),
    ('management_internal_meeting', 'Reunión interna / standup', 'gestion', 1, 'Coordinación de equipo (puntaje reducido)'),
    ('management_qa_review', 'QA / revisión de calidad', 'gestion', 3, 'Control de calidad antes de entrega'),
    ('management_vendor_coordination', 'Coordinación de proveedores', 'gestion', 3, 'Gestión de terceros: imprentas, fotógrafos, etc.'),
    ('management_timeline_planning', 'Planificación de cronograma', 'gestion', 4, 'Armado de timelines y milestones'),
    ('management_resource_allocation', 'Asignación de recursos', 'gestion', 3, 'Distribución de trabajo entre equipo'),
    ('management_risk_assessment', 'Análisis de riesgos', 'gestion', 4, 'Identificación y mitigación de riesgos de proyecto'),
    ('management_scope_definition', 'Definición de alcance', 'gestion', 4, 'Documentación de entregables y límites'),
    ('management_budget_tracking', 'Seguimiento de presupuesto', 'gestion', 3, 'Control de horas y gastos del proyecto'),
    ('management_client_reporting', 'Reporte de avance a cliente', 'gestion', 2, 'Actualizaciones de estado y presentaciones'),
    ('management_post_mortem', 'Post-mortem / retrospectiva', 'gestion', 3, 'Análisis post-proyecto y lecciones aprendidas')
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    base_points = EXCLUDED.base_points,
    description = EXCLUDED.description,
    is_active = TRUE;

-- ============================================================
-- 14. CATEGORÍA: Custom / Especializado (para casos no cubiertos)
-- ============================================================

INSERT INTO public.worker_task_types (code, name, category, base_points, description)
VALUES
    ('custom_specialized_delivery', 'Trabajo especializado custom', 'custom', 5, 'Tipo transicional para trabajos no catalogados. Usar con override de puntos.'),
    ('custom_consulting_hour', 'Hora de consultoría', 'custom', 3, 'Asesoría puntual no cubierta por otros tipos'),
    ('custom_training_workshop', 'Capacitación / entrenamiento', 'custom', 5, 'Transferencia de conocimiento al cliente'),
    ('custom_audit_assessment', 'Auditoría / evaluación', 'custom', 4, 'Revisión exhaustiva con entregable de hallazgos'),
    ('custom_research_development', 'Investigación y desarrollo', 'custom', 6, 'Exploración de nuevas herramientas o técnicas')
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    base_points = EXCLUDED.base_points,
    description = EXCLUDED.description,
    is_active = TRUE;

-- ============================================================
-- 15. ACTUALIZAR CATEGORÍAS ANTIGUAS A NUEVAS
-- (Re-categorizar tareas existentes para mantener consistencia)
-- ============================================================

-- Re-categorizar tareas de 'social' que ahora son 'organic_social'
UPDATE public.worker_task_types 
SET category = 'organic_social' 
WHERE code IN (
    'meta_content_scheduling',
    'social_post_publishing',
    'social_dm_response',
    'social_comment_management',
    'community_management_shift',
    'content_adaptation_formats',
    'hashtag_copy_publication',
    'community_guidelines_setup'
);

-- Re-categorizar tareas de 'campanas' que ahora son 'meta_ads'
UPDATE public.worker_task_types 
SET category = 'meta_ads' 
WHERE code IN (
    'meta_ads_campaign_setup',
    'meta_ads_creative_adaptation',
    'meta_ads_optimization_cycle',
    'meta_ads_reporting',
    'lead_form_setup'
);

-- Re-categorizar tareas de 'contenido' que ahora son 'copy_contenido'
UPDATE public.worker_task_types 
SET category = 'copy_contenido' 
WHERE code IN (
    'content_calendar',
    'newsletter_setup_send',
    'content_programming_multichannel',
    'social_content_pack'
);

-- ============================================================
-- 16. DESACTIVAR CATEGORÍAS VIEJAS (marcar tareas restantes como inactivas)
-- ============================================================

-- Desactivar tareas de categorías que ya no usamos
UPDATE public.worker_task_types 
SET is_active = false 
WHERE category IN ('campanas', 'social', 'contenido')
AND is_active = true
AND code NOT IN (
    -- Mantener activas las que ya re-categorizamos
    'meta_content_scheduling',
    'social_post_publishing',
    'social_dm_response',
    'social_comment_management',
    'community_management_shift',
    'content_adaptation_formats',
    'hashtag_copy_publication',
    'community_guidelines_setup',
    'meta_ads_campaign_setup',
    'meta_ads_creative_adaptation',
    'meta_ads_optimization_cycle',
    'meta_ads_reporting',
    'lead_form_setup',
    'content_calendar',
    'newsletter_setup_send',
    'content_programming_multichannel',
    'social_content_pack'
);

-- ============================================================
-- RESUMEN DE CAMBIOS
-- ============================================================
-- Categorías nuevas: meta_ads, google_ads, email_marketing, 
--                     organic_social, copy_contenido
-- 
-- Categorías eliminadas (tareas migradas): campanas, social, contenido
-- Categorías mantenidas: diseno, video_motion, web_digital, estrategia,
--                         automatizaciones, espacios, gestion, custom,
--                         marca, dev, producto, digital (algunas con cambios)
--
-- Total de tareas nuevas: ~120 tipos de tarea organizados
-- Redundancias eliminadas: 6 tareas marcadas como inactivas
-- ============================================================
