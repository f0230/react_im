/**
 * Notion API proxy
 * Routes via ?action= param:
 *   action=meetings   → fetch meeting notes from a project's Notion database
 *   action=tasks      → fetch tasks from a project's Notion database
 *   action=campaigns  → fetch campaigns from a project's Notion database
 *
 * Env vars required:
 *   NOTION_TOKEN              — Notion integration token (set once in Vercel)
 *   VITE_SUPABASE_URL         — already set
 *   SUPABASE_SERVICE_ROLE_KEY — already set
 *
 * The Notion database IDs per project are stored in the `projects` Supabase table:
 *   notion_db_id           → meetings
 *   notion_tasks_db_id     → tasks
 *   notion_campaigns_db_id → campaigns
 */

import { createClient } from '@supabase/supabase-js';

const NOTION_VERSION = '2022-06-28';
const NOTION_API_BASE = 'https://api.notion.com/v1';
const PAGE_SIZE = 20;

// ─── Supabase ─────────────────────────────────────────────────────────────────

function getSupabase() {
    const url = process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Supabase credentials not configured');
    return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

async function getUserFromToken(req) {
    const authHeader = req.headers?.authorization || req.headers?.Authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return null;

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) return null;

    const client = createClient(supabaseUrl, anonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
        global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user } } = await client.auth.getUser();
    return user ?? null;
}

async function assertProjectAccess(userId, projectId) {
    const supabase = getSupabase();
    const { data: hasAccess, error } = await supabase.rpc('fn_has_project_access', {
        p_id: projectId,
        u_id: userId,
    });
    if (error || !hasAccess) throw new Error('Access denied');
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function notionHeaders(token) {
    return {
        Authorization: `Bearer ${token}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
    };
}

function extractRichText(arr) {
    if (!Array.isArray(arr) || arr.length === 0) return '';
    return arr.map((r) => r.plain_text || '').join('');
}

async function queryNotionDb(databaseId, token, cursor, sorts) {
    const body = { page_size: PAGE_SIZE };
    if (cursor) body.start_cursor = cursor;
    if (sorts) body.sorts = sorts;

    const r = await fetch(`${NOTION_API_BASE}/databases/${databaseId}/query`, {
        method: 'POST',
        headers: notionHeaders(token),
        body: JSON.stringify(body),
    });

    if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.message || `Notion API error ${r.status}`);
    }

    return r.json();
}

async function getProjectDbIds(projectId) {
    const supabase = getSupabase();
    const { data, error } = await supabase
        .from('projects')
        .select('notion_db_id, notion_tasks_db_id, notion_campaigns_db_id')
        .eq('id', projectId)
        .maybeSingle();

    if (error) throw new Error(`Supabase error: ${error.message}`);
    return data ?? {};
}

// ─── Formatters ───────────────────────────────────────────────────────────────

function formatMeeting(page) {
    const p = page.properties || {};
    return {
        id: page.id,
        url: page.url,
        lastEditedTime: page.last_edited_time,
        title: extractRichText(p.Title?.title ?? p.Name?.title ?? []),
        date: p.Date?.date?.start ?? null,
        summary: extractRichText(p.Summary?.rich_text ?? []),
        actionItems: extractRichText(p['Action Items']?.rich_text ?? []),
        status: p.Status?.select?.name ?? null,
        project: p.Project?.select?.name ?? null,
        service: p.Service?.select?.name ?? null,
    };
}

function formatTask(page) {
    const p = page.properties || {};
    // Status can be a "status" type (new Notion) or "select" type
    const statusName =
        p.Status?.status?.name ??
        p.Status?.select?.name ??
        p.Estado?.status?.name ??
        p.Estado?.select?.name ??
        null;

    // Assignee — person property
    const assignees = (p.Assignee?.people ?? p.Asignado?.people ?? [])
        .map((person) => person.name)
        .filter(Boolean);

    return {
        id: page.id,
        url: page.url,
        lastEditedTime: page.last_edited_time,
        title: extractRichText(
            p.Name?.title ?? p.Nombre?.title ?? p.Task?.title ?? p.Tarea?.title ?? []
        ),
        status: statusName,
        dueDate:
            p['Due Date']?.date?.start ??
            p['Fecha límite']?.date?.start ??
            p.Due?.date?.start ??
            null,
        priority:
            p.Priority?.select?.name ??
            p.Prioridad?.select?.name ??
            null,
        assignees,
    };
}

function formatCampaign(page) {
    const p = page.properties || {};
    return {
        id: page.id,
        url: page.url,
        lastEditedTime: page.last_edited_time,
        title: extractRichText(
            p.Name?.title ?? p.Nombre?.title ?? p.Campaign?.title ?? p.Campaña?.title ?? []
        ),
        status:
            p.Status?.status?.name ??
            p.Status?.select?.name ??
            p.Estado?.status?.name ??
            p.Estado?.select?.name ??
            null,
        startDate: p['Start Date']?.date?.start ?? p.Date?.date?.start ?? p.Fecha?.date?.start ?? null,
        endDate: p['End Date']?.date?.start ?? p['Due Date']?.date?.start ?? null,
        description: extractRichText(
            p.Description?.rich_text ?? p.Descripción?.rich_text ?? p.Summary?.rich_text ?? []
        ),
        platform:
            p.Platform?.select?.name ??
            p.Plataforma?.select?.name ??
            p.Channel?.select?.name ??
            null,
    };
}

// ─── Action handlers ─────────────────────────────────────────────────────────

async function handleMeetings(req, res, projectId, token) {
    const ids = await getProjectDbIds(projectId);
    if (!ids.notion_db_id) {
        return res.status(404).json({
            error: 'No hay base de datos de reuniones configurada para este proyecto.',
            hint: 'El admin debe configurar el ID de la base de datos de Notion en Integraciones.',
        });
    }

    const data = await queryNotionDb(
        ids.notion_db_id,
        token,
        req.query?.cursor ?? null,
        [{ property: 'Date', direction: 'descending' }]
    );

    return res.status(200).json({
        meetings: (data.results || []).map(formatMeeting),
        nextCursor: data.next_cursor ?? null,
        hasMore: data.has_more ?? false,
    });
}

async function handleTasks(req, res, projectId, token) {
    const ids = await getProjectDbIds(projectId);
    if (!ids.notion_tasks_db_id) {
        return res.status(404).json({
            error: 'No hay base de datos de tareas configurada para este proyecto.',
            hint: 'El admin debe configurar el ID de la base de datos de Notion en Integraciones.',
        });
    }

    const data = await queryNotionDb(
        ids.notion_tasks_db_id,
        token,
        req.query?.cursor ?? null,
        null
    );

    return res.status(200).json({
        tasks: (data.results || []).map(formatTask),
        nextCursor: data.next_cursor ?? null,
        hasMore: data.has_more ?? false,
    });
}

async function handleCampaigns(req, res, projectId, token) {
    const ids = await getProjectDbIds(projectId);
    if (!ids.notion_campaigns_db_id) {
        return res.status(404).json({
            error: 'No hay base de datos de campañas configurada para este proyecto.',
            hint: 'El admin debe configurar el ID de la base de datos de Notion en Integraciones.',
        });
    }

    const data = await queryNotionDb(
        ids.notion_campaigns_db_id,
        token,
        req.query?.cursor ?? null,
        null
    );

    return res.status(200).json({
        campaigns: (data.results || []).map(formatCampaign),
        nextCursor: data.next_cursor ?? null,
        hasMore: data.has_more ?? false,
    });
}

// ─── Admin: save Notion DB IDs ────────────────────────────────────────────────

async function handleSaveDbIds(req, res, projectId, userId) {
    const supabase = getSupabase();

    // Only admins can configure
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle();

    if (profile?.role !== 'admin') {
        return res.status(403).json({ error: 'Solo admins pueden configurar las integraciones de Notion.' });
    }

    let body;
    try {
        const raw = await new Promise((resolve, reject) => {
            let data = '';
            req.on('data', (chunk) => { data += chunk; });
            req.on('end', () => resolve(data));
            req.on('error', reject);
        });
        body = JSON.parse(raw || '{}');
    } catch {
        return res.status(400).json({ error: 'Invalid JSON body' });
    }

    const updates = {};
    if ('notion_db_id' in body) updates.notion_db_id = body.notion_db_id || null;
    if ('notion_tasks_db_id' in body) updates.notion_tasks_db_id = body.notion_tasks_db_id || null;
    if ('notion_campaigns_db_id' in body) updates.notion_campaigns_db_id = body.notion_campaigns_db_id || null;

    if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No fields to update.' });
    }

    const { error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', projectId);

    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json({ ok: true, updated: updates });
}

// ─── Main router ─────────────────────────────────────────────────────────────

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const notionToken = process.env.NOTION_TOKEN;
    if (!notionToken) {
        return res.status(500).json({ error: 'NOTION_TOKEN is not configured' });
    }

    const action = req.query?.action
        ?? new URL(req.url, 'http://localhost').searchParams.get('action');

    const projectId = req.query?.projectId
        ?? new URL(req.url, 'http://localhost').searchParams.get('projectId');

    if (!projectId) {
        return res.status(400).json({ error: 'projectId query param is required' });
    }

    // Validate user session
    let user;
    try {
        user = await getUserFromToken(req);
        if (!user) return res.status(401).json({ error: 'No autenticado.' });
        await assertProjectAccess(user.id, projectId);
    } catch (err) {
        return res.status(403).json({ error: err.message || 'Acceso denegado.' });
    }

    try {
        if (action === 'meetings') return await handleMeetings(req, res, projectId, notionToken);
        if (action === 'tasks') return await handleTasks(req, res, projectId, notionToken);
        if (action === 'campaigns') return await handleCampaigns(req, res, projectId, notionToken);
        if (action === 'save-db-ids' && req.method === 'POST') {
            return await handleSaveDbIds(req, res, projectId, user.id);
        }

        return res.status(400).json({
            error: 'Missing or unknown ?action param. Valid: meetings, tasks, campaigns',
        });
    } catch (err) {
        console.error('[notion] handler error:', err);
        return res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
}
