import { getSupabaseAdmin } from '../server/utils/supabaseServer.js';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

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

function toInt(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
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

function buildPhase1SystemPrompt() {
  return [
    'Sos un estratega senior de marketing de contenidos para DTE.',
    'Trabajas la Fase 1: reunion principal del mes.',
    'Objetivo: cerrar una brujula mensual ejecutable y enfocada en conversion por conversacion.',
    'Responde SIEMPRE en JSON valido, sin markdown.',
    'Output obligatorio:',
    '{',
    '  "frase_eje": string,',
    '  "mensaje_principal": string,',
    '  "ctas": string[2..4],',
    '  "kpi": string,',
    '  "checklist": string[3..6],',
    '  "justificacion": string',
    '}',
    'Reglas:',
    '- Lenguaje simple, accionable y sin jerga innecesaria.',
    '- La frase eje debe poder repetirse en todo el mes.',
    '- Los CTAs deben ser de baja friccion y orientados a mensaje directo.',
    '- Mantene consistencia con los inputs, no inventes contexto externo.',
  ].join('\n');
}

function buildPhase2SystemPrompt() {
  return [
    'Sos un planner de sistema de contenidos para DTE.',
    'Trabajas la Fase 2: convertir la estrategia mensual en piezas concretas.',
    'Objetivo: repetir el concepto central desde distintos angulos para que te vean, te entiendan, te crean y te escriban.',
    'Responde SIEMPRE en JSON valido, sin markdown.',
    'Output obligatorio:',
    '{',
    '  "objetivo_sistema": string,',
    '  "ancla": [{"titulo": string, "formato": string, "objetivo": string, "hook": string, "mensaje": string, "cta": string, "notas": string}],',
    '  "refuerzo": [{"titulo": string, "formato": string, "objetivo": string, "hook": string, "mensaje": string, "cta": string, "notas": string}],',
    '  "contexto": [{"titulo": string, "formato": string, "objetivo": string, "hook": string, "mensaje": string, "cta": string, "notas": string}],',
    '  "piezas_rapidas": [{"detonante": string, "mensaje": string, "cta": string}],',
    '  "cadencia": string[3..8]',
    '}',
    'Reglas:',
    '- El bloque ancla instala concepto + promesa.',
    '- El bloque refuerzo explica pasos y baja confusion.',
    '- El bloque contexto baja riesgo y sube confianza.',
    '- Cada pieza debe cerrar con CTA concreto.',
    '- Las piezas rapidas son assets adaptables para oportunidades puntuales del proyecto (eventos, novedades, lanzamientos o recordatorios).',
    '- Evita contenido agresivo; tono cercano y claro.',
  ].join('\n');
}

function normalizePhase1(raw, fallbackInput) {
  const input = raw && typeof raw === 'object' ? raw : {};
  const ctas = normalizeStringArray(input.ctas, 4);
  const fallbackCtas = normalizeStringArray(fallbackInput?.ctas, 4);

  return {
    frase_eje:
      sanitizeText(input.frase_eje)
      || sanitizeText(input.axis_phrase)
      || sanitizeText(fallbackInput?.concepto_central)
      || 'Definir frase eje del mes',
    mensaje_principal:
      sanitizeText(input.mensaje_principal)
      || sanitizeText(input.main_message)
      || sanitizeText(fallbackInput?.mensaje_principal)
      || 'Definir mensaje principal claro y accionable',
    ctas: ctas.length > 0 ? ctas : fallbackCtas,
    kpi:
      sanitizeText(input.kpi)
      || sanitizeText(input.objetivo_medido)
      || sanitizeText(fallbackInput?.objetivo_medible)
      || 'Definir KPI principal del mes',
    checklist: normalizeStringArray(input.checklist, 6),
    justificacion: sanitizeText(input.justificacion),
  };
}

function normalizePiece(item, idx, fallbackFormat) {
  if (!item || typeof item !== 'object') {
    return {
      titulo: `${fallbackFormat} ${idx + 1}`,
      formato: fallbackFormat,
      objetivo: 'Definir objetivo',
      hook: 'Definir hook',
      mensaje: 'Definir mensaje',
      cta: 'Definir CTA',
      notas: '',
    };
  }

  return {
    titulo:
      sanitizeText(item.titulo)
      || sanitizeText(item.title)
      || `${fallbackFormat} ${idx + 1}`,
    formato:
      sanitizeText(item.formato)
      || sanitizeText(item.format)
      || fallbackFormat,
    objetivo: sanitizeText(item.objetivo) || sanitizeText(item.goal) || 'Definir objetivo',
    hook: sanitizeText(item.hook) || 'Definir hook',
    mensaje: sanitizeText(item.mensaje) || sanitizeText(item.message) || 'Definir mensaje',
    cta: sanitizeText(item.cta) || 'Definir CTA',
    notas: sanitizeText(item.notas) || sanitizeText(item.notes),
  };
}

function normalizePieces(value, fallbackFormat) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 12).map((item, idx) => normalizePiece(item, idx, fallbackFormat));
}

function normalizeQuickPieces(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 6).map((item) => ({
    detonante: sanitizeText(item?.detonante) || sanitizeText(item?.trigger) || 'Cuando aparezca una oportunidad puntual',
    mensaje: sanitizeText(item?.mensaje) || sanitizeText(item?.message) || 'Mensaje rapido alineado al objetivo del proyecto',
    cta: sanitizeText(item?.cta) || 'Escribinos por DM',
  }));
}

function normalizePhase2(raw) {
  const input = raw && typeof raw === 'object' ? raw : {};
  const quickPieces = normalizeQuickPieces(input.piezas_rapidas || input.flyers_torneos);

  return {
    objetivo_sistema:
      sanitizeText(input.objetivo_sistema)
      || sanitizeText(input.system_goal)
      || 'Repetir el concepto central desde distintos angulos y cerrar en conversacion.',
    ancla: normalizePieces(input.ancla, 'Reel'),
    refuerzo: normalizePieces(input.refuerzo, 'Carrusel'),
    contexto: normalizePieces(input.contexto, 'Carrusel'),
    piezas_rapidas: quickPieces,
    flyers_torneos: quickPieces,
    cadencia: normalizeStringArray(input.cadencia, 8),
  };
}

function buildPhase1UserPayload({ service, phaseInput }) {
  return {
    servicio: {
      id: service.id,
      titulo: sanitizeText(service.title),
      descripcion: sanitizeText(service.description),
      requerimientos: sanitizeText(service.requirements),
      entregables: sanitizeText(service.deliverables),
    },
    fase_1_inputs: {
      proposito: sanitizeText(phaseInput?.proposito),
      objetivo_medible: sanitizeText(phaseInput?.objetivo_medible),
      concepto_central: sanitizeText(phaseInput?.concepto_central),
      mensaje_principal: sanitizeText(phaseInput?.mensaje_principal),
      ctas: normalizeStringArray(phaseInput?.ctas, 4),
      publico_objetivo: sanitizeText(phaseInput?.publico_objetivo),
      contexto_extra: sanitizeText(phaseInput?.contexto_extra),
    },
    instruccion: 'Devuelve una propuesta final lista para ejecutar este mes.',
  };
}

function buildPhase2UserPayload({ service, phase1Output, phase2Input }) {
  return {
    servicio: {
      id: service.id,
      titulo: sanitizeText(service.title),
      descripcion: sanitizeText(service.description),
    },
    brujula_fase_1: {
      frase_eje: sanitizeText(phase1Output?.frase_eje),
      mensaje_principal: sanitizeText(phase1Output?.mensaje_principal),
      ctas: normalizeStringArray(phase1Output?.ctas, 4),
      kpi: sanitizeText(phase1Output?.kpi),
    },
    fase_2_inputs: {
      reels_ancla: clamp(toInt(phase2Input?.reels_ancla, 2), 1, 6),
      carruseles_refuerzo: clamp(toInt(phase2Input?.carruseles_refuerzo, 3), 1, 8),
      carruseles_contexto: clamp(toInt(phase2Input?.carruseles_contexto, 4), 1, 10),
      incluir_piezas_rapidas:
        typeof phase2Input?.incluir_piezas_rapidas === 'boolean'
          ? phase2Input.incluir_piezas_rapidas
          : Boolean(phase2Input?.incluir_flyers_torneos),
      notas_operativas: sanitizeText(phase2Input?.notas_operativas),
    },
    instruccion: 'Construye un sistema consistente donde todas las piezas empujen al mismo CTA conversacional.',
  };
}

async function callOpenAiJson({ apiKey, model, temperature, systemPrompt, userPayload }) {
  const response = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature,
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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = parseJsonBody(req);
  if (!body) {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const phase = sanitizeText(body.phase).toLowerCase();
  const serviceId = sanitizeText(body.serviceId);
  const projectId = sanitizeText(body.projectId);
  const phaseInput = body.phaseInput && typeof body.phaseInput === 'object' ? body.phaseInput : {};
  const phase1Output = body.phase1Output && typeof body.phase1Output === 'object' ? body.phase1Output : {};

  if (!serviceId) {
    return res.status(400).json({ error: 'serviceId is required' });
  }

  if (!['phase1', 'phase2'].includes(phase)) {
    return res.status(400).json({ error: 'phase must be phase1 or phase2' });
  }

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

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return res.status(403).json({ error: 'Forbidden: profile not found' });
  }

  if (!['admin', 'worker'].includes(profile.role)) {
    return res.status(403).json({ error: 'Forbidden: only admin/worker can run planner' });
  }

  const { data: service, error: serviceError } = await supabase
    .from('services')
    .select('id, project_id, title, description, requirements, deliverables')
    .eq('id', serviceId)
    .maybeSingle();

  if (serviceError) {
    return res.status(500).json({ error: 'Failed to load service', detail: serviceError.message });
  }

  if (!service) {
    return res.status(404).json({ error: 'Service not found' });
  }

  if (projectId && service.project_id !== projectId) {
    return res.status(400).json({ error: 'serviceId does not belong to projectId' });
  }

  const { data: hasAccess, error: accessError } = await supabase
    .rpc('fn_has_project_access', { p_id: service.project_id, u_id: user.id });

  if (accessError) {
    return res.status(500).json({ error: 'Failed to verify project access', detail: accessError.message });
  }

  if (!hasAccess) {
    return res.status(403).json({ error: 'Forbidden: no project access' });
  }

  const apiKey = sanitizeText(process.env.OPENAI_API_KEY);
  if (!apiKey) {
    return res.status(500).json({ error: 'Missing OPENAI_API_KEY' });
  }

  const model =
    sanitizeText(process.env.OPENAI_SERVICES_PLANNER_MODEL)
    || sanitizeText(process.env.OPENAI_REPORTS_MODEL)
    || 'gpt-4o-mini';

  try {
    let parsed;

    if (phase === 'phase1') {
      const payload = buildPhase1UserPayload({ service, phaseInput });
      parsed = await callOpenAiJson({
        apiKey,
        model,
        temperature: 0.35,
        systemPrompt: buildPhase1SystemPrompt(),
        userPayload: payload,
      });

      const output = normalizePhase1(parsed, payload.fase_1_inputs);
      return res.status(200).json({
        ok: true,
        phase,
        model,
        generatedAt: new Date().toISOString(),
        output,
      });
    }

    if (!sanitizeText(phase1Output?.frase_eje) || !sanitizeText(phase1Output?.mensaje_principal)) {
      return res.status(400).json({ error: 'phase1Output with frase_eje and mensaje_principal is required for phase2' });
    }

    const payload = buildPhase2UserPayload({ service, phase1Output, phase2Input: phaseInput });
    parsed = await callOpenAiJson({
      apiKey,
      model,
      temperature: 0.45,
      systemPrompt: buildPhase2SystemPrompt(),
      userPayload: payload,
    });

    const output = normalizePhase2(parsed);

    if (!Boolean(payload.fase_2_inputs.incluir_piezas_rapidas)) {
      output.piezas_rapidas = [];
      output.flyers_torneos = [];
    }

    return res.status(200).json({
      ok: true,
      phase,
      model,
      generatedAt: new Date().toISOString(),
      output,
    });
  } catch (error) {
    console.error('services-content-planner failed:', error);
    return res.status(500).json({
      error: 'Failed to generate planning content',
      detail: error?.message || String(error),
    });
  }
}
