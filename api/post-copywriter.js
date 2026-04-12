import { getSupabaseAdmin } from '../server/utils/supabaseServer.js';
import { MODO_STYLE_GUIDE } from '../server/brand-base/modo-style.js';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const DESTINATION_KEYS = ['pageId', 'page_id', 'boardId', 'board_id', 'channelId', 'channel_id'];

function parseJsonBody(req) {
  if (!req?.body) return null;
  if (typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return null;
    }
  }
  return null;
}

function sanitizeText(value, fallback = '') {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function normalizeStringArray(value, max = 8) {
  if (!Array.isArray(value)) return [];
  const out = [];

  for (const item of value) {
    const text = sanitizeText(String(item || ''));
    if (!text) continue;
    out.push(text.slice(0, 240));
    if (out.length >= max) break;
  }

  return out;
}

function getTokenFromRequest(req) {
  const header = req?.headers?.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice(7).trim();
}

function extractAssistantText(payload) {
  const content = payload?.choices?.[0]?.message?.content;

  if (typeof content === 'string') {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (typeof part?.text === 'string') return part.text;
        if (typeof part?.content === 'string') return part.content;
        return '';
      })
      .join('\n')
      .trim();
  }

  return '';
}

function safeParseJson(input) {
  if (!input || typeof input !== 'string') return null;

  try {
    return JSON.parse(input);
  } catch {
    // continue
  }

  const fenced = input.match(/```json\s*([\s\S]*?)```/i) || input.match(/```\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    try {
      return JSON.parse(fenced[1]);
    } catch {
      // continue
    }
  }

  const start = input.indexOf('{');
  const end = input.lastIndexOf('}');
  if (start >= 0 && end > start) {
    const candidate = input.slice(start, end + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      return null;
    }
  }

  return null;
}

function getProjectDisplayName(project) {
  return (
    sanitizeText(project?.title)
    || sanitizeText(project?.name)
    || sanitizeText(project?.project_name)
    || 'Proyecto sin nombre'
  );
}

function getDestinationLabel(targetConfig) {
  if (!targetConfig || typeof targetConfig !== 'object') return '';
  return (
    sanitizeText(targetConfig.pageName)
    || sanitizeText(targetConfig.page_name)
    || sanitizeText(targetConfig.boardName)
    || sanitizeText(targetConfig.board_name)
    || sanitizeText(targetConfig.channelName)
    || sanitizeText(targetConfig.channel_name)
  );
}

function normalizeAccountTargets(value) {
  if (!Array.isArray(value)) return [];

  return value.slice(0, 12).map((account) => {
    const platform = sanitizeText(account?.platform, 'desconocida');
    const username = sanitizeText(account?.username);
    const fullname = sanitizeText(account?.fullname);
    const targetConfig = account?.targetConfig || account?.target_config || {};
    const destinationIdKey = DESTINATION_KEYS.find((key) => targetConfig[key]);
    const destinationId = destinationIdKey ? sanitizeText(String(targetConfig[destinationIdKey])) : '';

    return {
      platform,
      cuenta: fullname || username || sanitizeText(account?.id, 'Cuenta'),
      usuario: username ? `@${username.replace(/^@+/, '')}` : '',
      destino: getDestinationLabel(targetConfig),
      destino_id: destinationId,
    };
  });
}

function normalizeAiPlanning(value) {
  if (!value || typeof value !== 'object') return null;

  const phase1 = value.phase1?.output && typeof value.phase1.output === 'object'
    ? value.phase1.output
    : null;
  const phase2 = value.phase2?.output && typeof value.phase2.output === 'object'
    ? value.phase2.output
    : null;

  const firstAnchor = phase2?.ancla?.[0] && typeof phase2.ancla[0] === 'object'
    ? phase2.ancla[0]
    : null;

  if (!phase1 && !phase2) return null;

  return {
    frase_eje: sanitizeText(phase1?.frase_eje),
    mensaje_principal: sanitizeText(phase1?.mensaje_principal),
    ctas: normalizeStringArray(phase1?.ctas, 4),
    objetivo_sistema: sanitizeText(phase2?.objetivo_sistema),
    pieza_ancla_destacada: firstAnchor ? {
      titulo: sanitizeText(firstAnchor.titulo),
      hook: sanitizeText(firstAnchor.hook),
      mensaje: sanitizeText(firstAnchor.mensaje),
      cta: sanitizeText(firstAnchor.cta),
    } : null,
  };
}

const DOC_TYPE_LABELS = {
  brand_voice: 'VOZ DE MARCA',
  copy_examples: 'EJEMPLOS DE COPY',
  audience: 'AUDIENCIA OBJETIVO',
  guidelines: 'LINEAMIENTOS ESPECÍFICOS',
  general: 'CONTEXTO ADICIONAL',
};

// Hard cap to keep token usage predictable (~4 000 chars ≈ ~1 000 tokens)
const BRAND_DOCS_CHAR_LIMIT = 4000;

function formatBrandDocsForPrompt(docs) {
  if (!docs || docs.length === 0) return '';

  const sections = [];
  let totalChars = 0;

  // Group by type so the model gets a coherent structure
  const byType = {};
  for (const doc of docs) {
    const key = doc.doc_type || 'general';
    if (!byType[key]) byType[key] = [];
    byType[key].push(doc);
  }

  // Priority order: brand_voice first, then examples, then the rest
  const typeOrder = ['brand_voice', 'copy_examples', 'audience', 'guidelines', 'general'];
  const sortedKeys = [
    ...typeOrder.filter((k) => byType[k]),
    ...Object.keys(byType).filter((k) => !typeOrder.includes(k)),
  ];

  for (const type of sortedKeys) {
    for (const doc of byType[type]) {
      const header = `### ${DOC_TYPE_LABELS[type] || type.toUpperCase()}: ${doc.title}`;
      const body = sanitizeText(doc.content);
      if (!body) continue;

      const chunk = `${header}\n${body}`;
      if (totalChars + chunk.length > BRAND_DOCS_CHAR_LIMIT) {
        const remaining = BRAND_DOCS_CHAR_LIMIT - totalChars;
        if (remaining > 80) {
          sections.push(`${header}\n${body.slice(0, remaining - header.length - 10)}…`);
        }
        break;
      }

      sections.push(chunk);
      totalChars += chunk.length;
    }
    if (totalChars >= BRAND_DOCS_CHAR_LIMIT) break;
  }

  return sections.join('\n\n');
}

function buildSystemPrompt(brandDocs = []) {
  const base = [
    'Sos un copywriter senior de social media para DTE.',
    'Tu tarea es escribir un copy listo para publicar, usando el brief del usuario, la identidad del proyecto y el contexto operativo disponible.',
    '',
    MODO_STYLE_GUIDE,
    '',
    'Responde SIEMPRE en JSON valido, sin markdown.',
    'Output obligatorio:',
    '{',
    '  "copy": string,',
    '  "hook": string,',
    '  "cta": string,',
    '  "hashtags": string[],',
    '  "tone_used": string',
    '}',
    'Reglas profesionales:',
    '- El copy debe tener un hook inicial claro y fuerte.',
    '- Desarrolla valor, beneficio o perspectiva concreta; evita relleno.',
    '- Cierra con CTA accionable y coherente con el objetivo.',
    '- Adapta longitud, ritmo y estructura al formato y plataformas elegidas.',
    '- Usa espanol rioplatense neutro y profesional.',
    '- No inventes datos, precios, resultados, promociones, horarios, ubicaciones ni testimonios.',
    '- Si falta informacion, escribe de forma util sin fabricar hechos.',
    '- Evita frases vacias, lugares comunes y tono robotico.',
    '- No abuses de emojis. Por defecto, no uses emojis salvo que el contexto lo justifique claramente.',
    '- Los hashtags son opcionales, maximo 5, y solo si aportan.',
    '- El campo "copy" debe quedar listo para pegar y publicar.',
  ];

  const docsText = formatBrandDocsForPrompt(brandDocs);
  if (docsText) {
    base.push(
      '',
      '## CONOCIMIENTO DE MARCA DEL PROYECTO',
      'Los siguientes documentos definen la identidad, voz y lineamientos de este proyecto.',
      'PRIORIZA esta informacion por encima de las reglas generales cuando haya conflicto.',
      '',
      docsText,
    );
  }

  return base.join('\n');
}

function buildUserPayload({
  project,
  service,
  aiPlanning,
  brief,
  selectedPlatforms,
  format,
  mediaContext,
  selectedAccounts,
}) {
  return {
    proyecto: {
      id: project.id,
      nombre: getProjectDisplayName(project),
      descripcion: sanitizeText(project.description),
      objetivo: sanitizeText(project.objective),
      tipo_necesidad: sanitizeText(project.need_type),
      urgencia: sanitizeText(project.urgency),
      presupuesto: sanitizeText(project.budget_range),
    },
    servicio: service ? {
      id: service.id,
      titulo: sanitizeText(service.title),
      descripcion: sanitizeText(service.description),
      requerimientos: sanitizeText(service.requirements),
      entregables: sanitizeText(service.deliverables),
    } : null,
    identidad_de_marca: {
      resumen: [
        sanitizeText(project.description),
        sanitizeText(project.objective),
      ].filter(Boolean).join(' | '),
      planning: aiPlanning,
    },
    publicacion: {
      brief_usuario: brief,
      plataformas: normalizeStringArray(selectedPlatforms, 8),
      formato: sanitizeText(format, 'post'),
      media: mediaContext && typeof mediaContext === 'object' ? mediaContext : {},
      destinos_seleccionados: selectedAccounts,
      objetivo_del_copy:
        'Generar un copy social listo para publicar, alineado a la marca del proyecto y a la publicacion actual.',
    },
  };
}

function normalizeHashtags(value) {
  return normalizeStringArray(value, 5).map((item) => {
    const compact = item.replace(/\s+/g, '');
    return compact.startsWith('#') ? compact : `#${compact}`;
  });
}

function normalizeOutput(raw) {
  const input = raw && typeof raw === 'object' ? raw : {};
  const hashtags = normalizeHashtags(input.hashtags || input.suggested_hashtags);

  let copy =
    sanitizeText(input.copy)
    || sanitizeText(input.caption);

  if (!copy) {
    const parts = [
      sanitizeText(input.hook),
      sanitizeText(input.body),
      sanitizeText(input.cta),
    ].filter(Boolean);
    copy = parts.join('\n\n');
  }

  if (!copy) {
    throw new Error('OpenAI returned an empty copy');
  }

  const compactHashtags = hashtags.join(' ');
  if (compactHashtags && !hashtags.every((tag) => copy.includes(tag))) {
    copy = `${copy}\n\n${compactHashtags}`.trim();
  }

  return {
    copy,
    hook: sanitizeText(input.hook),
    cta: sanitizeText(input.cta),
    hashtags,
    tone_used: sanitizeText(input.tone_used) || 'Profesional y alineado a marca',
  };
}

async function callOpenAiJson({ apiKey, model, systemPrompt, userPayload }) {
  const response = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.7,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: JSON.stringify(userPayload, null, 2) },
      ],
      response_format: { type: 'json_object' },
    }),
  });

  const raw = await response.text();
  let payload = {};

  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    payload = {};
  }

  if (!response.ok) {
    const detail = sanitizeText(payload?.error?.message) || raw.slice(0, 300) || 'Unknown OpenAI error';
    throw new Error(`OpenAI request failed (${response.status}): ${detail}`);
  }

  const assistantText = extractAssistantText(payload);
  if (!assistantText) {
    throw new Error('OpenAI returned an empty response');
  }

  const parsed = safeParseJson(assistantText);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('OpenAI returned invalid JSON content');
  }

  return parsed;
}

// ─── Brand Docs Generator ────────────────────────────────────────────────────

const BRAND_DOC_TYPES = ['brand_voice', 'copy_examples', 'audience', 'guidelines', 'general'];

function buildBrandDocsSystemPrompt() {
  return [
    'Sos un estratega de marca y copywriter senior especializado en social media para agencias de marketing.',
    'Tu tarea es generar una base de conocimiento de marca completa para un proyecto, basándote en el contexto provisto.',
    'Esta base de conocimiento será usada por una IA para generar copies de redes sociales alineados a la marca.',
    '',
    MODO_STYLE_GUIDE,
    '',
    'Los documentos que generés deben estar ALINEADOS con el estilo base anterior, adaptándolo al rubro y tono específico del proyecto.',
    '',
    'Respondé SIEMPRE con JSON válido, sin markdown, con esta estructura exacta:',
    '{',
    '  "docs": [',
    '    {',
    '      "doc_type": string,  // uno de: brand_voice | copy_examples | audience | guidelines | general',
    '      "title": string,     // título descriptivo, máx 80 chars',
    '      "content": string    // contenido en markdown, máx 1500 chars por doc',
    '    }',
    '  ]',
    '}',
    '',
    'Reglas:',
    '- Generá exactamente estos 4 documentos en este orden: brand_voice, audience, copy_examples, guidelines.',
    '- Si hay contexto suficiente, agregá un 5to doc de tipo "general" con novedades, temporada o foco actual.',
    '- Cada doc debe ser accionable y específico al proyecto — nada genérico ni de relleno.',
    '- brand_voice: tono, persona gramatical, ritmo, palabras a evitar, estilo.',
    '- audience: perfil demográfico, dolores reales, lenguaje que usa, qué valora.',
    '- copy_examples: 3 ejemplos de copies listos para publicar (Instagram, LinkedIn o el canal más relevante).',
    '- guidelines: reglas concretas de qué incluir siempre y qué evitar siempre.',
    '- Escribí en español rioplatense. El contenido debe ser directamente usable, no una descripción de lo que haría.',
    '- No uses placeholders como "[nombre del cliente]". Si falta info, inferí de forma razonable.',
  ].join('\n');
}

function buildBrandDocsUserPayload({ project, extraContext }) {
  return {
    proyecto: {
      nombre: getProjectDisplayName(project),
      descripcion: sanitizeText(project.description),
      objetivo: sanitizeText(project.objective),
      tipo_necesidad: sanitizeText(project.need_type),
    },
    contexto_adicional: sanitizeText(extraContext),
    instruccion: 'Generá la base de conocimiento de marca para este proyecto.',
  };
}

function normalizeBrandDocsOutput(raw) {
  const docs = Array.isArray(raw?.docs) ? raw.docs : [];

  return docs
    .filter((d) => d && typeof d === 'object')
    .map((d) => ({
      doc_type: BRAND_DOC_TYPES.includes(d.doc_type) ? d.doc_type : 'general',
      title:   sanitizeText(d.title, 'Sin título').slice(0, 120),
      content: sanitizeText(d.content, '').slice(0, 8000),
    }))
    .filter((d) => d.content.length > 0)
    .slice(0, 6);
}

async function handleGenerateBrandDocs(req, res, supabase, user) {
  const body = parseJsonBody(req);
  const projectId    = sanitizeText(body?.projectId);
  const extraContext = sanitizeText(body?.extraContext);

  if (!projectId) {
    return res.status(400).json({ error: 'projectId is required' });
  }

  const { data: hasAccess, error: accessError } = await supabase
    .rpc('fn_has_project_access', { p_id: projectId, u_id: user.id });

  if (accessError) {
    return res.status(500).json({ error: 'Failed to verify project access', detail: accessError.message });
  }
  if (!hasAccess) {
    return res.status(403).json({ error: 'Forbidden: no project access' });
  }

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .maybeSingle();

  if (projectError) {
    return res.status(500).json({ error: 'Failed to load project', detail: projectError.message });
  }
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  const apiKey = sanitizeText(process.env.OPENAI_API_KEY);
  if (!apiKey) {
    return res.status(500).json({ error: 'Missing OPENAI_API_KEY' });
  }

  const model =
    sanitizeText(process.env.OPENAI_SOCIAL_COPY_MODEL)
    || sanitizeText(process.env.OPENAI_SERVICES_PLANNER_MODEL)
    || sanitizeText(process.env.OPENAI_REPORTS_MODEL)
    || 'gpt-4o-mini';

  try {
    const rawOutput = await callOpenAiJson({
      apiKey,
      model,
      systemPrompt: buildBrandDocsSystemPrompt(),
      userPayload:  buildBrandDocsUserPayload({ project, extraContext }),
    });

    const docs = normalizeBrandDocsOutput(rawOutput);

    if (docs.length === 0) {
      return res.status(500).json({ error: 'AI did not return any brand docs' });
    }

    return res.status(200).json({
      ok: true,
      model,
      generatedAt: new Date().toISOString(),
      docs,
    });
  } catch (error) {
    console.error('generate-brand-docs failed:', error);
    return res.status(500).json({
      error:  'Failed to generate brand docs',
      detail: error?.message || String(error),
    });
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = parseJsonBody(req);
  if (!body) {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  // ── Auth (shared by all actions) ──────────────────────────
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return res.status(500).json({ error: 'Server configuration error: missing Supabase credentials' });
  }

  const token = getTokenFromRequest(req);
  if (!token) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }

  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  const user = authData?.user;
  if (authError || !user?.id) {
    return res.status(401).json({ error: 'Unauthorized: invalid token' });
  }

  // ── Action dispatch ───────────────────────────────────────
  const action = sanitizeText(req.query?.action || body.action);
  if (action === 'generate-brand-docs') {
    return handleGenerateBrandDocs(req, res, supabase, user);
  }

  const projectId = sanitizeText(body.projectId);
  const serviceId = sanitizeText(body.serviceId);
  const brief = sanitizeText(body.brief);
  const selectedPlatforms = normalizeStringArray(body.selectedPlatforms, 8);
  const format = sanitizeText(body.format, 'post');
  const mediaContext = body.mediaContext && typeof body.mediaContext === 'object' ? body.mediaContext : {};
  const aiPlanningInput = body.aiPlanning && typeof body.aiPlanning === 'object' ? body.aiPlanning : null;
  const selectedAccounts = normalizeAccountTargets(body.selectedAccounts);

  if (!projectId) {
    return res.status(400).json({ error: 'projectId is required' });
  }

  if (!brief) {
    return res.status(400).json({ error: 'brief is required' });
  }

  const { data: hasAccess, error: accessError } = await supabase
    .rpc('fn_has_project_access', { p_id: projectId, u_id: user.id });

  if (accessError) {
    return res.status(500).json({ error: 'Failed to verify project access', detail: accessError.message });
  }

  if (!hasAccess) {
    return res.status(403).json({ error: 'Forbidden: no project access' });
  }

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .maybeSingle();

  if (projectError) {
    return res.status(500).json({ error: 'Failed to load project', detail: projectError.message });
  }

  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  let service = null;
  let resolvedAiPlanning = normalizeAiPlanning(aiPlanningInput);

  if (serviceId) {
    const { data: serviceData, error: serviceError } = await supabase
      .from('services')
      .select('*')
      .eq('id', serviceId)
      .maybeSingle();

    if (serviceError) {
      return res.status(500).json({ error: 'Failed to load service', detail: serviceError.message });
    }

    if (!serviceData) {
      return res.status(404).json({ error: 'Service not found' });
    }

    if (serviceData.project_id && serviceData.project_id !== projectId) {
      return res.status(400).json({ error: 'serviceId does not belong to projectId' });
    }

    service = serviceData;
    if (!resolvedAiPlanning) {
      resolvedAiPlanning = normalizeAiPlanning(serviceData.ai_planning);
    }
  }

  const apiKey = sanitizeText(process.env.OPENAI_API_KEY);
  if (!apiKey) {
    return res.status(500).json({ error: 'Missing OPENAI_API_KEY' });
  }

  const model =
    sanitizeText(process.env.OPENAI_SOCIAL_COPY_MODEL)
    || sanitizeText(process.env.OPENAI_SERVICES_PLANNER_MODEL)
    || sanitizeText(process.env.OPENAI_REPORTS_MODEL)
    || 'gpt-4o-mini';

  // Load active brand docs for this project (best-effort — don't fail the request if missing)
  let brandDocs = [];
  try {
    const { data: docsData } = await supabase
      .from('project_brand_docs')
      .select('title, doc_type, content')
      .eq('project_id', projectId)
      .eq('is_active', true)
      .order('doc_type')
      .limit(20);

    if (Array.isArray(docsData)) brandDocs = docsData;
  } catch {
    // non-fatal: proceed without brand docs
  }

  try {
    const payload = buildUserPayload({
      project,
      service,
      aiPlanning: resolvedAiPlanning,
      brief,
      selectedPlatforms,
      format,
      mediaContext,
      selectedAccounts,
    });

    const rawOutput = await callOpenAiJson({
      apiKey,
      model,
      systemPrompt: buildSystemPrompt(brandDocs),
      userPayload: payload,
    });

    const output = normalizeOutput(rawOutput);

    return res.status(200).json({
      ok: true,
      model,
      generatedAt: new Date().toISOString(),
      docsUsed: brandDocs.length,
      output,
    });
  } catch (error) {
    console.error('post-copywriter failed:', error);
    return res.status(500).json({
      error: 'Failed to generate copy',
      detail: error?.message || String(error),
    });
  }
}
