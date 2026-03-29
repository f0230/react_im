-- ============================================================
-- Expand worker task catalog to match DTE services
-- ============================================================

INSERT INTO public.worker_task_types (code, name, category, base_points, description)
VALUES
    ('brand_identity_system', 'Sistema de identidad visual', 'marca', 10, 'Sistema visual completo de marca o submarca'),
    ('brand_redesign', 'Rediseño de marca', 'marca', 8, 'Refresh o rediseño integral de marca'),
    ('brand_naming', 'Naming / tono de marca', 'marca', 8, 'Definición de naming, tono y narrativa base'),
    ('brand_manual', 'Manual de marca', 'marca', 6, 'Lineamientos de uso, sistema y documentación'),
    ('presentation_design', 'Presentación / deck comercial', 'marca', 4, 'Diseño de propuesta, deck o pieza comercial'),

    ('strategic_consulting', 'Consultoría estratégica', 'estrategia', 8, 'Diagnóstico, foco y dirección estratégica'),
    ('business_restructuring', 'Reestructuración comercial / operativa', 'estrategia', 13, 'Trabajo de redefinición de oferta, proceso o estructura'),
    ('service_packaging', 'Paquetización / plan profesional', 'estrategia', 7, 'Definición de planes, propuestas o estructura comercial'),
    ('retainer_support', 'Soporte estratégico mensual', 'estrategia', 5, 'Soporte recurrente de seguimiento y criterio'),
    ('internal_comm_system', 'Comunicación interna', 'estrategia', 6, 'Piezas o sistema para comunicación interna'),

    ('campaign_strategy', 'Estrategia de campaña', 'campanas', 8, 'Concepto, enfoque y estructura de campaña'),
    ('social_content_system', 'Sistema de contenidos para redes', 'campanas', 6, 'Plan y piezas base para redes'),
    ('paid_media_setup', 'Setup paid media / tracking', 'campanas', 6, 'Configuración de pauta, pixeles, eventos o conversiones'),
    ('paid_media_optimization', 'Optimización paid media', 'campanas', 5, 'Ajustes de performance sobre campañas activas'),
    ('internal_campaign_design', 'Campaña interna', 'campanas', 5, 'Campaña para cultura, equipo o activación interna'),
    ('sales_enablement_asset', 'Pieza para ventas / conversión', 'campanas', 4, 'Activo puntual para empujar ventas o leads'),

    ('space_experience_design', 'Diseño de espacio / experiencia', 'espacios', 10, 'Concepto integral de espacio, stand o intervención'),
    ('space_identity_system', 'Identidad aplicada a espacio', 'espacios', 8, 'Sistema visual aplicado a espacio físico'),
    ('corporate_event_concept', 'Concepto de evento corporativo', 'espacios', 8, 'Idea, piezas y estructura visual para evento'),
    ('ambiance_design', 'Ambientación', 'espacios', 6, 'Ambientación, look & feel y recorrido'),
    ('wayfinding_signage', 'Señalética / wayfinding', 'espacios', 5, 'Sistema de señalización y orientación'),

    ('web_design_system', 'Diseño web / UX', 'digital', 8, 'Arquitectura visual y experiencia de sitio o landing'),
    ('wordpress_site_build', 'Sitio WordPress / CMS', 'digital', 8, 'Implementación o armado de sitio sobre CMS'),
    ('react_product_module', 'Módulo / pantalla React', 'digital', 12, 'Desarrollo de módulo, vista o feature en React'),
    ('digital_project_support', 'Soporte de proyecto digital', 'digital', 5, 'Acompañamiento técnico-operativo de proyecto'),
    ('seo_implementation', 'SEO técnico / on-page', 'digital', 6, 'Optimización técnica, contenido base y estructura SEO'),
    ('analytics_dashboard', 'Analytics / dashboard', 'digital', 7, 'Medición, tracking o visualización de métricas'),
    ('automation_workflow', 'Automatización / workflow', 'digital', 9, 'Automatización de procesos, bots o integraciones'),

    ('product_ideation', 'Ideación de producto', 'producto', 10, 'Definición de producto, propuesta y alcance'),
    ('product_discovery_workshop', 'Workshop de discovery', 'producto', 7, 'Workshop de definición, research o priorización'),
    ('ux_research', 'Research / validación UX', 'producto', 6, 'Research, entrevistas, pruebas o validación de hipótesis'),

    ('api_integration', 'Integración API / servicio externo', 'dev', 8, 'Integración técnica con servicio o proveedor externo'),
    ('backend_module', 'Módulo backend / lógica interna', 'dev', 10, 'Desarrollo backend o lógica estructural'),

    ('copy_ads', 'Copy para anuncios / campaña', 'contenido', 3, 'Copy puntual para performance o campaña'),
    ('content_calendar', 'Plan editorial / calendario', 'contenido', 4, 'Planeamiento de contenidos o calendario'),

    ('video_reel_edit', 'Edición de reel / pieza corta', 'video', 3, 'Edición breve orientada a redes o pauta'),
    ('storyboard_concept', 'Storyboard / guión visual', 'video', 4, 'Concepto de secuencia, guión o visualización'),

    ('sprint_planning', 'Sprint planning / coordinación', 'gestion', 5, 'Planificación, seguimiento y coordinación operativa'),
    ('custom_specialized_delivery', 'Trabajo especializado / custom', 'custom', 5, 'Tipo transicional para trabajos no catalogados todavía. Usar con override de puntos cuando haga falta')
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    base_points = EXCLUDED.base_points,
    description = EXCLUDED.description,
    is_active = TRUE;
