-- ============================================================
-- Expand worker task catalog for social ops, Meta and ad work
-- ============================================================

INSERT INTO public.worker_task_types (code, name, category, base_points, description)
VALUES
    ('meta_content_scheduling', 'Programación de contenido Meta', 'social', 2, 'Carga, programación y calendarización de piezas en Meta Business Suite'),
    ('social_post_publishing', 'Publicación / subida de piezas', 'social', 2, 'Publicación operativa de piezas en redes o plataformas'),
    ('social_dm_response', 'Respuesta de DMs / inbox', 'social', 2, 'Gestión de mensajes directos, consultas y primera atención'),
    ('social_comment_management', 'Gestión de comentarios / community', 'social', 2, 'Respuesta, moderación y seguimiento de comentarios en redes'),
    ('community_management_shift', 'Bloque de community management', 'social', 4, 'Bloque operativo de gestión de comunidad, respuesta y seguimiento'),
    ('content_adaptation_formats', 'Adaptación de contenido por formato', 'social', 3, 'Ajuste de piezas para story, reel, feed, carrusel u otros formatos'),
    ('hashtag_copy_publication', 'Copy + hashtags + publicación', 'social', 2, 'Armado de copy final, hashtags y salida operativa a redes'),
    ('community_guidelines_setup', 'Setup de lineamientos de community', 'social', 4, 'Definición de criterios, tono y respuesta operativa para redes'),

    ('meta_business_manager_setup', 'Setup Meta Business / activos', 'campanas', 5, 'Configuración de Business Manager, cuentas, píxeles y permisos'),
    ('meta_ads_campaign_setup', 'Configuración campaña Meta Ads', 'campanas', 5, 'Configuración de campaña, conjuntos, anuncios y objetivos'),
    ('meta_ads_tracking_setup', 'Setup pixel / eventos Meta', 'campanas', 6, 'Instalación o ajuste de pixel, CAPI, eventos y conversiones'),
    ('meta_ads_creative_adaptation', 'Adaptación creativa para anuncios', 'campanas', 3, 'Adaptación de piezas, copies y formatos para pauta'),
    ('meta_ads_optimization_cycle', 'Ciclo de optimización Meta Ads', 'campanas', 4, 'Revisión de performance, ajustes de segmentación, presupuesto o creatividades'),
    ('meta_ads_reporting', 'Reporte / análisis Meta Ads', 'campanas', 3, 'Lectura de resultados, hallazgos y próximos movimientos de campaña'),
    ('lead_form_setup', 'Setup formulario / captura de leads', 'campanas', 3, 'Configuración de lead forms o flujos básicos de captura'),

    ('content_programming_multichannel', 'Programación multicanal de contenidos', 'contenido', 3, 'Planificación y publicación coordinada en varias plataformas'),
    ('social_content_pack', 'Pack mensual de contenidos para redes', 'contenido', 6, 'Bloque de armado y organización de piezas para gestión mensual'),
    ('newsletter_setup_send', 'Setup y envío de newsletter', 'contenido', 4, 'Maquetado, segmentación y envío de campaña de email marketing'),

    ('whatsapp_automation_flow', 'Automatización de WhatsApp / flujo', 'digital', 7, 'Configuración de flujos, disparadores o automatizaciones en WhatsApp'),
    ('crm_followup_pipeline', 'Seguimiento comercial / pipeline', 'gestion', 3, 'Seguimiento de leads, pipeline y avances comerciales operativos')
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    base_points = EXCLUDED.base_points,
    description = EXCLUDED.description,
    is_active = TRUE;
