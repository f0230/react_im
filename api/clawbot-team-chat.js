import { getSupabaseAdmin } from '../server/utils/supabaseServer.js';

const DEFAULT_CONTEXT_LIMIT = 40;
const MAX_CONTEXT_LIMIT = 80;
const DEFAULT_BOT_NAME = 'Clawbot';
const DONE_STATUSES = new Set([
  'done',
  'completed',
  'complete',
  'closed',
  'cancelled',
  'canceled',
  'finished',
  'entregado',
  'resuelto',
]);

function parseJsonBody(req) {
  if (!req.body) return null;
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

function clampInt(value, fallback, min, max) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(numeric)));
}

function isMissingProjectColumn(error) {
  const code = String(error?.code || '');
  const message = String(error?.message || '').toLowerCase();
  return code === '42703' || code === 'PGRST204' || message.includes('project_id');
}

function looksLikeBotName(value, botName) {
  const text = sanitizeText(value).toLowerCase();
  if (!text) return false;
  return text.includes('clawbot') || text.includes(String(botName || '').toLowerCase());
}

function isClawbotMessage(row, botName) {
  const authorName = row?.author_name;
  const authorFullName = row?.author?.full_name;
  const authorEmail = row?.author?.email;
  return (
    looksLikeBotName(authorName, botName)
    || looksLikeBotName(authorFullName, botName)
    || looksLikeBotName(authorEmail, botName)
  );
}

function getProjectTitle(project) {
  return (
    sanitizeText(project?.title)
    || sanitizeText(project?.name)
    || sanitizeText(project?.project_name)
    || 'Proyecto sin nombre'
  );
}

function getProjectStatus(project) {
  return (
    sanitizeText(project?.status)
    || sanitizeText(project?.state)
    || sanitizeText(project?.phase)
    || 'sin estado'
  );
}

function toOpenAiContextMessages(rows, botName) {
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => {
    const authorName = sanitizeText(row?.author_name)
      || sanitizeText(row?.author?.full_name)
      || sanitizeText(row?.author?.email)
      || 'Equipo';
    const timestamp = row?.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString();
    const type = sanitizeText(row?.message_type, 'text').toLowerCase();
    const rawBody = sanitizeText(row?.body, '');
    const body = type === 'text'
      ? rawBody
      : `[${type}] ${sanitizeText(row?.file_name) || rawBody || 'archivo'}`;

    return {
      role: isClawbotMessage(row, botName) ? 'assistant' : 'user',
      content: `[${timestamp}] ${authorName}: ${body}`.slice(0, 2200),
    };
  });
}

function projectSnapshot(project) {
  if (!project) return null;
  return {
    id: project.id || null,
    title: getProjectTitle(project),
    status: getProjectStatus(project),
    description: sanitizeText(project?.description).slice(0, 500) || null,
    client_id: project?.client_id || null,
    updated_at: project?.updated_at || project?.created_at || null,
  };
}

function buildSystemPrompt(botName) {
  return [
    `Sos ${botName}, miembro operativo del equipo de DTE.`,
    'Participas en canales internos como un colega tecnico y de operaciones.',
    'Reglas:',
    '- Responde en espanol claro y concreto.',
    '- Usa el contexto del canal, mensajes previos y proyecto si existe.',
    '- Si falta contexto, pide solo una aclaracion puntual.',
    '- Si detectas bloqueo, propone pasos accionables con responsables sugeridos.',
    '- No inventes datos que no esten en el contexto.',
    '- Mantene respuestas breves (maximo 8 lineas).',
  ].join('\n');
}

function buildUserPrompt({
  channel,
  triggerPrompt,
  triggerMessageId,
  currentUser,
  project,
  serviceStats,
}) {
  const channelInfo = {
    id: channel?.id || null,
    name: channel?.name || null,
    slug: channel?.slug || null,
    description: channel?.description || null,
    project_id: channel?.project_id || null,
  };

  const requestMeta = {
    trigger_message_id: triggerMessageId || null,
    requested_by: currentUser?.profile?.full_name || currentUser?.profile?.email || currentUser?.user?.id || 'equipo',
    asked_text: triggerPrompt,
  };

  return [
    'Contexto del canal (JSON):',
    JSON.stringify(channelInfo, null, 2),
    '',
    'Proyecto vinculado (JSON):',
    JSON.stringify(project || { id: null }, null, 2),
    '',
    'Estado operativo del proyecto (JSON):',
    JSON.stringify(serviceStats || { total_services: 0 }, null, 2),
    '',
    'Pedido actual (JSON):',
    JSON.stringify(requestMeta, null, 2),
    '',
    'Responde dentro de la conversacion del canal como un miembro del equipo.',
  ].join('\n');
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

function resolveOpenClawUrl() {
  const explicit = sanitizeText(process.env.OPENCLAW_CHAT_COMPLETIONS_URL)
    || sanitizeText(process.env.OPENCLAW_API_URL);
  if (explicit) return explicit;

  const base = sanitizeText(process.env.OPENCLAW_BASE_URL)
    || sanitizeText(process.env.OPENCLAW_URL);
  if (!base) return null;

  const normalized = base.endsWith('/') ? base.slice(0, -1) : base;
  if (normalized.endsWith('/chat/completions')) return normalized;
  if (normalized.endsWith('/v1')) return `${normalized}/chat/completions`;
  return `${normalized}/v1/chat/completions`;
}

async function fetchChannel(supabase, channelId) {
  const baseFields = 'id, name, slug, description, is_public, created_by, created_at';
  const attempt = await supabase
    .from('team_channels')
    .select(`${baseFields}, project_id`)
    .eq('id', channelId)
    .maybeSingle();

  if (!attempt.error) {
    return attempt.data || null;
  }

  if (!isMissingProjectColumn(attempt.error)) {
    throw attempt.error;
  }

  const fallback = await supabase
    .from('team_channels')
    .select(baseFields)
    .eq('id', channelId)
    .maybeSingle();

  if (fallback.error) {
    throw fallback.error;
  }

  if (!fallback.data) return null;
  return { ...fallback.data, project_id: null };
}

async function resolveCurrentUser({ supabase, req }) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { status: 401, error: 'Missing or invalid Authorization header' };
  }

  const token = authHeader.split(' ')[1];
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  const user = authData?.user;
  if (authError || !user) {
    return { status: 401, error: 'Unauthorized: invalid token' };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role, full_name, email')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return { status: 403, error: 'Forbidden: profile not found' };
  }

  if (!['admin', 'worker'].includes(profile.role)) {
    return { status: 403, error: 'Forbidden: team access required' };
  }

  return {
    status: 200,
    user,
    profile,
  };
}

async function resolveProjectFromChannel({ supabase, channel }) {
  if (!channel) return null;

  const projectId = channel.project_id || null;
  if (!projectId) return null;

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .maybeSingle();

  return project || null;
}

async function loadServiceStats({ supabase, projectId }) {
  if (!projectId) return null;

  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('project_id', projectId)
    .limit(500);

  if (error || !Array.isArray(data)) {
    return null;
  }

  let total = 0;
  let done = 0;
  let open = 0;
  let overdue = 0;
  const now = Date.now();

  for (const row of data) {
    total += 1;

    const status = sanitizeText(row?.status || row?.state || row?.phase).toLowerCase();
    const isDone = DONE_STATUSES.has(status);
    if (isDone) {
      done += 1;
    } else {
      open += 1;
    }

    const dueRaw = row?.due_date || row?.deadline || row?.end_at || row?.ends_at;
    if (!isDone && dueRaw) {
      const dueTs = Date.parse(String(dueRaw));
      if (!Number.isNaN(dueTs) && dueTs < now) {
        overdue += 1;
      }
    }
  }

  return {
    total_services: total,
    open_services: open,
    done_services: done,
    overdue_services: overdue,
  };
}

async function callOpenClaw({
  sessionKey,
  botName,
  channel,
  triggerPrompt,
  triggerMessageId,
  currentUser,
  project,
  serviceStats,
  contextMessages,
}) {
  const url = resolveOpenClawUrl();
  if (!url) {
    throw new Error('Missing OPENCLAW_BASE_URL or OPENCLAW_CHAT_COMPLETIONS_URL');
  }

  const apiKey = sanitizeText(process.env.OPENCLAW_API_KEY)
    || sanitizeText(process.env.OPENCLAW_BEARER_TOKEN);
  const gatewayToken = sanitizeText(process.env.OPENCLAW_GATEWAY_TOKEN);
  const agentId = sanitizeText(process.env.OPENCLAW_AGENT_ID);
  const model = sanitizeText(process.env.OPENCLAW_MODEL)
    || sanitizeText(process.env.CLAWBOT_MODEL)
    || 'gpt-4o-mini';
  const temperature = Number(process.env.CLAWBOT_TEMPERATURE || 0.2);

  const headers = {
    'Content-Type': 'application/json',
    'x-openclaw-session-key': sessionKey,
  };

  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  if (gatewayToken) headers['x-openclaw-gateway-token'] = gatewayToken;
  if (agentId) headers['x-openclaw-agent-id'] = agentId;

  const systemPrompt = buildSystemPrompt(botName);
  const userPrompt = buildUserPrompt({
    channel,
    triggerPrompt,
    triggerMessageId,
    currentUser,
    project: projectSnapshot(project),
    serviceStats,
  });

  console.log('Calling OpenClaw URL:', url);
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      temperature: Number.isFinite(temperature) ? temperature : 0.2,
      messages: [
        { role: 'system', content: systemPrompt },
        ...contextMessages,
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  console.log('OpenClaw response status:', response.status);
  const rawPayload = await response.text();
  console.log('OpenClaw response body (first 500 chars):', rawPayload.slice(0, 500));

  let payload = {};
  try {
    payload = JSON.parse(rawPayload);
  } catch (e) {
    console.error('Failed to parse OpenClaw response as JSON');
  }

  if (!response.ok) {
    throw new Error(payload?.error?.message || payload?.error || `OpenClaw failed with ${response.status}`);
  }

  const assistantText = extractAssistantText(payload);
  if (!assistantText) {
    throw new Error('OpenClaw returned an empty response');
  }

  return {
    assistantText: assistantText.slice(0, 5000),
    model,
  };
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

  const channelId = sanitizeText(body.channel_id);
  const triggerPrompt = sanitizeText(body.prompt);
  const triggerMessageId = sanitizeText(body.trigger_message_id) || null;
  const contextLimit = clampInt(body.context_limit, DEFAULT_CONTEXT_LIMIT, 8, MAX_CONTEXT_LIMIT);
  const botName = sanitizeText(process.env.CLAWBOT_DISPLAY_NAME, DEFAULT_BOT_NAME);

  if (!channelId) {
    return res.status(400).json({ error: 'Missing channel_id' });
  }
  if (!triggerPrompt) {
    return res.status(400).json({ error: 'Missing prompt' });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error('Clawbot: Missing Supabase credentials (SERVICE_ROLE_KEY)');
    return res.status(500).json({ error: 'Server configuration error: missing Supabase admin credentials' });
  }

  try {
    const currentUser = await resolveCurrentUser({ supabase, req });
    if (currentUser.error) {
      console.warn('Clawbot: Auth failed:', currentUser.error);
      return res.status(currentUser.status).json({ error: currentUser.error });
    }

    const channel = await fetchChannel(supabase, channelId);
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    if (!channel.is_public) {
      const { data: member, error: memberError } = await supabase
        .from('team_channel_members')
        .select('id')
        .eq('channel_id', channelId)
        .eq('member_id', currentUser.user.id)
        .maybeSingle();

      if (memberError) {
        console.error('Clawbot: Membership verify error:', memberError);
        return res.status(500).json({ error: 'Failed to verify channel membership' });
      }
      if (!member) {
        return res.status(403).json({ error: 'Forbidden: you are not a member of this channel' });
      }
    }

    const { data: recentMessages, error: messagesError } = await supabase
      .from('team_messages')
      .select('id, body, created_at, author_id, author_name, message_type, file_name, media_url, reply_to_id, author:profiles(id, full_name, email)')
      .eq('channel_id', channelId)
      .order('created_at', { ascending: false })
      .limit(contextLimit);

    if (messagesError) {
      console.error('Clawbot: Messages load error:', messagesError);
      return res.status(500).json({ error: 'Failed to load channel context', detail: messagesError.message });
    }

    const contextMessages = toOpenAiContextMessages((recentMessages || []).slice().reverse(), botName);

    const linkedProject = await resolveProjectFromChannel({ supabase, channel });
    const serviceStats = await loadServiceStats({
      supabase,
      projectId: linkedProject?.id || null,
    });

    const sessionPrefix = sanitizeText(process.env.CLAWBOT_SESSION_PREFIX, 'team-channel');
    const sessionKey = `${sessionPrefix}:${channelId}`;

    let openClawReply;
    try {
      openClawReply = await callOpenClaw({
        sessionKey,
        botName,
        channel,
        triggerPrompt,
        triggerMessageId,
        currentUser,
        project: linkedProject,
        serviceStats,
        contextMessages,
      });
    } catch (aiError) {
      console.error('Clawbot: OpenAI/OpenClaw call failed:', aiError);
      return res.status(500).json({
        error: 'Clawbot failed to generate a response',
        detail: aiError.message
      });
    }

    let botAuthorId = sanitizeText(process.env.CLAWBOT_PROFILE_ID);
    if (!botAuthorId || botAuthorId.length < 20) { // Naive check for UUID (main/id etc are too short)
      botAuthorId = currentUser.user.id;
    }

    let insertPayload = {
      channel_id: channelId,
      author_id: botAuthorId,
      author_name: botName,
      body: openClawReply.assistantText,
      message_type: 'text',
      reply_to_id: triggerMessageId,
    };

    let insertResult = await supabase
      .from('team_messages')
      .insert(insertPayload)
      .select('id, created_at')
      .single();

    if (insertResult.error && botAuthorId !== currentUser.user.id) {
      console.warn('Clawbot: Failed to insert with botAuthorId, falling back to currentUser:', insertResult.error.message);
      insertPayload = {
        ...insertPayload,
        author_id: currentUser.user.id,
      };
      insertResult = await supabase
        .from('team_messages')
        .insert(insertPayload)
        .select('id, created_at')
        .single();
    }

    if (insertResult.error) {
      console.error('Clawbot: Failed to persist message:', insertResult.error);
      return res.status(500).json({ error: 'Failed to persist Clawbot message', detail: insertResult.error.message });
    }

    return res.status(200).json({
      ok: true,
      message_id: insertResult.data?.id || null,
      channel_id: channelId,
      project_id: linkedProject?.id || null,
      model: openClawReply.model,
    });
  } catch (error) {
    console.error('clawbot-team-chat handler panic:', error);
    return res.status(500).json({
      error: 'Internal server error',
      detail: error?.message || String(error),
    });
  }
}
