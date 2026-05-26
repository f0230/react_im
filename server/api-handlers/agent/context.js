/**
 * Agent Context Handler
 *
 * Returns a fully enriched context package for the VPS Hermes agent:
 *   - Channel metadata
 *   - Linked project (description, status, objective)
 *   - Active team members (project_assignments)
 *   - Notion data (tasks, campaigns, recent meetings) — fetched server-side
 *   - Message buffer + summary from agent_context
 *
 * Auth: Bearer AGENT_SECRET
 * Method: GET /api/agent?action=context&channel_id=<uuid>
 */

import { getSupabaseAdmin } from '../../utils/supabaseServer.js';
import { validateAgentSecret } from './auth.js';

const NOTION_VERSION = '2022-06-28';
const NOTION_API = 'https://api.notion.com/v1';

// ─── Notion helpers ──────────────────────────────────────────────────────────

function extractRichText(arr) {
  if (!Array.isArray(arr)) return '';
  return arr.map(r => r.plain_text || '').join('');
}

function extractNotionTitle(properties) {
  const titleProp = Object.values(properties || {}).find(p => p?.type === 'title');
  return extractRichText(titleProp?.title || []);
}

function extractStatus(properties) {
  return (
    properties?.Status?.status?.name ??
    properties?.Status?.select?.name ??
    properties?.Estado?.status?.name ??
    properties?.Estado?.select?.name ??
    null
  );
}

function extractDate(properties, keys) {
  for (const key of keys) {
    const val = properties?.[key]?.date?.start;
    if (val) return val;
  }
  return null;
}

function extractAssignees(properties) {
  return (
    properties?.Assignee?.people ??
    properties?.Asignado?.people ??
    []
  ).map(p => p.name).filter(Boolean);
}

async function notionQuery(dbId, token, sorts) {
  if (!dbId || !token) return [];
  try {
    const body = { page_size: 20 };
    if (sorts) body.sorts = sorts;

    const r = await fetch(`${NOTION_API}/databases/${dbId}/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!r.ok) return [];
    const data = await r.json();
    return data.results || [];
  } catch {
    return [];
  }
}

async function fetchNotionTasks(dbId, token) {
  const rows = await notionQuery(dbId, token, null);
  return rows.map(p => ({
    id:        p.id,
    url:       p.url,
    title:     extractNotionTitle(p.properties),
    status:    extractStatus(p.properties),
    due_date:  extractDate(p.properties, ['Due Date', 'Fecha límite', 'Due', 'Fecha']),
    priority:  p.properties?.Priority?.select?.name ?? p.properties?.Prioridad?.select?.name ?? null,
    assignees: extractAssignees(p.properties),
    updated:   p.last_edited_time,
  }));
}

async function fetchNotionCampaigns(dbId, token) {
  const rows = await notionQuery(dbId, token, null);
  return rows.map(p => ({
    id:         p.id,
    url:        p.url,
    title:      extractRichText(
      p.properties?.Name?.title ??
      p.properties?.Nombre?.title ??
      p.properties?.Campaign?.title ?? []
    ),
    status:     extractStatus(p.properties),
    start_date: extractDate(p.properties, ['Start Date', 'Date', 'Fecha']),
    end_date:   extractDate(p.properties, ['End Date', 'Due Date', 'Fecha fin']),
    platform:   p.properties?.Platform?.select?.name ??
                p.properties?.Plataforma?.select?.name ?? null,
    updated:    p.last_edited_time,
  }));
}

async function fetchNotionMeetings(dbId, token) {
  const rows = await notionQuery(dbId, token, [{ property: 'Date', direction: 'descending' }]);
  return rows.slice(0, 5).map(p => ({
    id:      p.id,
    url:     p.url,
    title:   extractRichText(
      p.properties?.Title?.title ??
      p.properties?.Name?.title ??
      p.properties?.Nombre?.title ?? []
    ) || 'Reunión sin título',
    date:    extractDate(p.properties, ['Date', 'Fecha', 'Fecha de reunión', 'Meeting date']),
    summary: extractRichText(
      p.properties?.Summary?.rich_text ??
      p.properties?.Resumen?.rich_text ??
      p.properties?.Notes?.rich_text ?? []
    ),
    updated: p.last_edited_time,
  }));
}

// ─── Main handler ─────────────────────────────────────────────────────────────

function getParam(req, key) {
  return (
    req.query?.[key] ??
    (() => {
      try { return new URL(req.url, 'http://localhost').searchParams.get(key); } catch { return null; }
    })()
  );
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = validateAgentSecret(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  const channelId = getParam(req, 'channel_id');
  if (!channelId) return res.status(400).json({ error: 'Missing channel_id query param' });

  const supabase = getSupabaseAdmin();
  if (!supabase) return res.status(500).json({ error: 'Supabase admin not configured' });

  // ── Step 1: channel + agent_context in parallel ────────────────────────────
  const [channelRes, agentCtxRes] = await Promise.all([
    supabase
      .from('team_channels')
      .select('id, name, slug, description, project_id, is_public, created_at')
      .eq('id', channelId)
      .maybeSingle(),
    supabase
      .from('agent_context')
      .select('message_buffer, buffer_summary, message_count_since_response, last_message_at, last_bot_response_at')
      .eq('channel_id', channelId)
      .maybeSingle(),
  ]);

  if (channelRes.error) return res.status(500).json({ error: channelRes.error.message });
  if (!channelRes.data) return res.status(404).json({ error: 'Channel not found' });

  const channel = channelRes.data;
  const agentCtx = agentCtxRes.data;
  const projectId = channel.project_id;

  // ── Step 2: project + team (if channel has a project) ─────────────────────
  let project = null;
  let team = [];
  let notionData = { tasks: [], campaigns: [], meetings: [], available: false };

  if (projectId) {
    const [projectRes, teamRes] = await Promise.all([
      supabase
        .from('projects')
        .select(`
          id, name, title, description, objective, status, need_type, urgency, budget_range,
          notion_db_id, notion_tasks_db_id, notion_campaigns_db_id,
          created_at, updated_at
        `)
        .eq('id', projectId)
        .maybeSingle(),
      supabase
        .from('project_assignments')
        .select('role, profiles(id, full_name, email, role)')
        .eq('project_id', projectId)
        .eq('status', 'active'),
    ]);

    project = projectRes.data ?? null;

    team = (teamRes.data || []).map(a => ({
      id:           a.profiles?.id,
      name:         a.profiles?.full_name || a.profiles?.email,
      email:        a.profiles?.email,
      project_role: a.role,
      platform_role: a.profiles?.role,
    })).filter(m => m.id);

    // ── Step 3: Notion data (best-effort, server-side) ─────────────────────
    const notionToken = process.env.NOTION_TOKEN;
    const hasNotion   = notionToken && project && (
      project.notion_db_id ||
      project.notion_tasks_db_id ||
      project.notion_campaigns_db_id
    );

    if (hasNotion) {
      const [tasks, campaigns, meetings] = await Promise.allSettled([
        fetchNotionTasks(project.notion_tasks_db_id, notionToken),
        fetchNotionCampaigns(project.notion_campaigns_db_id, notionToken),
        fetchNotionMeetings(project.notion_db_id, notionToken),
      ]);

      notionData = {
        available:  true,
        tasks:      tasks.status === 'fulfilled'     ? tasks.value     : [],
        campaigns:  campaigns.status === 'fulfilled' ? campaigns.value : [],
        meetings:   meetings.status === 'fulfilled'  ? meetings.value  : [],
      };
    }
  }

  // ── Response ───────────────────────────────────────────────────────────────
  return res.status(200).json({
    channel: {
      id:          channel.id,
      name:        channel.name,
      slug:        channel.slug,
      description: channel.description,
      project_id:  channel.project_id,
    },
    project,
    team,
    notion: notionData,
    context: {
      message_buffer:               agentCtx?.message_buffer ?? [],
      buffer_summary:               agentCtx?.buffer_summary ?? null,
      message_count_since_response: agentCtx?.message_count_since_response ?? 0,
      last_message_at:              agentCtx?.last_message_at ?? null,
      last_bot_response_at:         agentCtx?.last_bot_response_at ?? null,
    },
    fetched_at: new Date().toISOString(),
  });
}
