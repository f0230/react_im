import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type ProjectCandidate = {
  id: string;
  name?: string | null;
  description?: string | null;
};

type ProjectMatch = {
  id: string;
  confidence?: number;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEFAULT_MESSAGE_LIMIT = 12;

const cleanText = (value: unknown, fallback: string) => {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const normalizeMessages = (messages: unknown) => {
  if (!Array.isArray(messages)) return [] as string[];

  return messages
    .map((item) => {
      if (typeof item === 'string') return item.trim();
      if (!item || typeof item !== 'object') return null;
      const role = (item as { role?: string; direction?: string }).role
        || ((item as { direction?: string }).direction === 'outbound' ? 'assistant' : 'user');
      const content = (item as { content?: string; body?: string }).content
        || (item as { body?: string }).body
        || '';
      if (!content) return null;
      return `${role}: ${content}`.trim();
    })
    .filter((line): line is string => Boolean(line));
};

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const payload = await req.json().catch(() => null);
  if (!payload || typeof payload !== 'object') {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const waId = (payload as { wa_id?: string }).wa_id;
  if (!waId) {
    return jsonResponse({ error: 'Missing wa_id' }, 400);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const openaiKey = Deno.env.get('OPENAI_API_KEY') ?? '';

  if (!supabaseUrl || !serviceKey) {
    return jsonResponse({ error: 'Missing Supabase credentials' }, 500);
  }

  if (!openaiKey) {
    return jsonResponse({ error: 'Missing OPENAI_API_KEY' }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const messageLimit = Number((payload as { message_limit?: number }).message_limit)
    || DEFAULT_MESSAGE_LIMIT;

  let previousShortContext = (payload as { previous_short_context?: string }).previous_short_context
    || (payload as { short_context_text?: string }).short_context_text
    || '';

  let conversation = normalizeMessages((payload as { messages?: unknown }).messages);

  if (conversation.length === 0) {
    const { data, error } = await supabase
      .from('whatsapp_messages')
      .select('direction, body, type, timestamp')
      .eq('wa_id', waId)
      .order('timestamp', { ascending: false })
      .limit(messageLimit);

    if (error) {
      return jsonResponse({ error: 'Failed to load messages', detail: error.message }, 500);
    }

    conversation = (data ?? [])
      .slice()
      .reverse()
      .map((item) => {
        const role = item.direction === 'outbound' ? 'assistant' : 'user';
        const body = item.body || (item.type ? `[${item.type}]` : '[message]');
        return `${role}: ${body}`;
      });
  }

  if (!previousShortContext) {
    const { data } = await supabase
      .from('whatsapp_threads')
      .select('short_context_text')
      .eq('wa_id', waId)
      .maybeSingle();

    previousShortContext = data?.short_context_text || '';
  }

  const projectCandidates = Array.isArray((payload as { projects?: ProjectCandidate[] }).projects)
    ? (payload as { projects?: ProjectCandidate[] }).projects || []
    : [];
  const allowedProjectIds = new Set(projectCandidates.map((project) => project.id).filter(Boolean));

  const projectsText = projectCandidates.length
    ? projectCandidates
        .map((project) => {
          const name = project.name ? ` - ${project.name}` : '';
          const description = project.description ? ` (${project.description})` : '';
          return `${project.id}${name}${description}`;
        })
        .join('\n')
    : 'none';

  const systemPrompt = [
    'Eres un asistente que comprime conversaciones de WhatsApp en un short_context operativo.',
    'Devuelve SOLO JSON valido con estas claves:',
    '- goal: objetivo principal actual.',
    '- state: estado actual concreto.',
    '- next_step: una sola cosa que falta para avanzar.',
    '- project_matches: lista de objetos {id, confidence} usando SOLO ids de la lista dada.',
    'Reglas: resumen corto, claro, sin emojis, en espanol rioplatense neutro.',
  ].join('\n');

  const userPrompt = [
    'Short_context previo (si existe):',
    previousShortContext || 'none',
    '',
    'Ultimos mensajes (ordenados):',
    conversation.join('\n'),
    '',
    'Proyectos candidatos (id - nombre - descripcion):',
    projectsText,
  ].join('\n');

  const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    }),
  });

  if (!openaiResponse.ok) {
    const detail = await openaiResponse.text().catch(() => '');
    return jsonResponse({ error: 'OpenAI request failed', detail }, 500);
  }

  const openaiData = await openaiResponse.json();
  const content = openaiData?.choices?.[0]?.message?.content ?? '{}';

  let parsed: {
    goal?: string;
    state?: string;
    next_step?: string;
    project_matches?: ProjectMatch[];
  } = {};

  try {
    parsed = JSON.parse(content);
  } catch {
    parsed = {};
  }

  const goal = cleanText(parsed.goal, 'Pendiente');
  const state = cleanText(parsed.state, 'Pendiente');
  const nextStep = cleanText(parsed.next_step, 'Pendiente');
  const projectMatches = Array.isArray(parsed.project_matches)
    ? parsed.project_matches.filter((match) => match?.id && allowedProjectIds.has(match.id))
    : [];

  const now = new Date().toISOString();

  const shortContext = {
    goal,
    state,
    next_step: nextStep,
    updated_at: now,
    project_ids: projectMatches.map((match) => match.id),
  };

  const shortContextText = [
    `Objetivo: ${goal}`,
    `Estado: ${state}`,
    `Falta: ${nextStep}`,
  ].join('\n');

  const { error: upsertError } = await supabase
    .from('whatsapp_threads')
    .upsert(
      {
        wa_id: waId,
        short_context: shortContext,
        short_context_text: shortContextText,
        short_context_updated_at: now,
      },
      { onConflict: 'wa_id' }
    );

  if (upsertError) {
    return jsonResponse({ error: 'Failed to update thread', detail: upsertError.message }, 500);
  }

  if (projectMatches.length > 0) {
    const rows = projectMatches.map((match) => ({
      wa_id: waId,
      project_id: match.id,
      confidence: typeof match.confidence === 'number' ? match.confidence : null,
      source: 'auto',
      last_touched_at: now,
    }));

    const { error: projectError } = await supabase
      .from('thread_projects')
      .upsert(rows, { onConflict: 'wa_id,project_id' });

    if (projectError) {
      return jsonResponse({ error: 'Failed to update thread_projects', detail: projectError.message }, 500);
    }
  }

  return jsonResponse({
    ok: true,
    wa_id: waId,
    short_context: shortContext,
    short_context_text: shortContextText,
    project_matches: projectMatches,
  });
});
