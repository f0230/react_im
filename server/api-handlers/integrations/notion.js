/**
 * Notion API proxy
 * Routes via ?action= param:
 *   action=meetings       → fetch meeting notes from a project's Notion database
 *   action=tasks          → fetch tasks from a project's Notion database
 *   action=campaigns      → fetch campaigns from a project's Notion database
 *   action=search-pages   → search Notion pages available to the integration
 *   action=page           → render the selected project page through the API
 *   action=save-settings  → save the selected page and optional database IDs
 *
 * Env vars required:
 *   NOTION_TOKEN              — Notion integration token (set once in Vercel)
 *   VITE_SUPABASE_URL         — already set
 *   SUPABASE_SERVICE_ROLE_KEY — already set
 *
 * The Notion database IDs per project are stored in the `projects` Supabase table:
 *   notion_page_id        → root page rendered in the portal
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
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key =
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.SUPABASE_SERVICE_KEY ||
        process.env.SERVICE_ROLE_KEY;
    if (!url || !key) {
        const missing = [
            !url ? 'SUPABASE_URL or VITE_SUPABASE_URL' : null,
            !key ? 'SUPABASE_SERVICE_ROLE_KEY' : null,
        ].filter(Boolean).join(', ');
        throw new Error(`Supabase server credentials missing: ${missing}`);
    }
    return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

async function getUserFromToken(req) {
    const authHeader = req.headers?.authorization || req.headers?.Authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return null;

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
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

async function assertAdmin(userId) {
    const supabase = getSupabase();
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle();

    if (profile?.role !== 'admin') {
        throw new Error('Solo admins pueden configurar las integraciones de Notion.');
    }
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

async function readJsonBody(req) {
    if (req.body && typeof req.body === 'object') return req.body;
    if (typeof req.body === 'string') return JSON.parse(req.body || '{}');

    const raw = await new Promise((resolve, reject) => {
        let data = '';
        req.on('data', (chunk) => { data += chunk; });
        req.on('end', () => resolve(data));
        req.on('error', reject);
    });
    return JSON.parse(raw || '{}');
}

async function notionRequest(path, token, options = {}) {
    const r = await fetch(`${NOTION_API_BASE}${path}`, {
        method: options.method || 'GET',
        headers: notionHeaders(token),
        body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.message || `Notion API error ${r.status}`);
    }

    return r.json();
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

async function getProjectNotionPage(projectId) {
    const supabase = getSupabase();
    const { data, error } = await supabase
        .from('projects')
        .select('notion_page_id, notion_page_title, notion_page_url')
        .eq('id', projectId)
        .maybeSingle();

    if (error) throw new Error(`Supabase error: ${error.message}`);
    return data ?? {};
}

// ─── Formatters ───────────────────────────────────────────────────────────────

function extractPageTitle(page) {
    const properties = page?.properties || {};
    const titleProperty = Object.values(properties).find((property) => property?.type === 'title');
    return extractRichText(titleProperty?.title || []) || 'Página sin título';
}

function formatPageSummary(page) {
    return {
        id: page.id,
        title: extractPageTitle(page),
        url: page.url || null,
        lastEditedTime: page.last_edited_time || null,
    };
}

function coerceToString(value, fallback = '') {
    if (value == null) return fallback;
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return extractRichText(value);
    if (typeof value === 'object') {
        if (typeof value.plain_text === 'string') return value.plain_text;
        if (typeof value.name === 'string') return value.name;
        if (typeof value.content === 'string') return value.content;
        return fallback;
    }
    return String(value);
}

function formatBlock(block) {
    const type = block.type;
    const data = block[type] || {};
    const rawRichText = Array.isArray(data.rich_text)
        ? data.rich_text
        : (Array.isArray(data.title) ? data.title : []);
    const text = extractRichText(rawRichText);
    const caption = extractRichText(Array.isArray(data.caption) ? data.caption : []);
    const title = coerceToString(data.title, '')
        || coerceToString(data.name, '')
        || text
        || '';

    return {
        id: block.id,
        type,
        hasChildren: Boolean(block.has_children),
        text,
        caption,
        checked: data.checked ?? null,
        language: data.language ?? null,
        url:
            data.url ??
            data.external?.url ??
            data.file?.url ??
            null,
        title,
    };
}

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

function formatDatabaseRowProperty(prop) {
    if (!prop) return null;

    const { type } = prop;

    switch (type) {
        case 'title':
            return { type: 'text', value: extractRichText(prop.title || []) };
        case 'rich_text':
            return { type: 'text', value: extractRichText(prop.rich_text || []) };
        case 'status':
            return {
                type: 'badge',
                value: prop.status?.name || null,
                color: prop.status?.color || 'gray',
            };
        case 'select':
            return {
                type: 'badge',
                value: prop.select?.name || null,
                color: prop.select?.color || 'gray',
            };
        case 'multi_select':
            return {
                type: 'badges',
                value: (prop.multi_select || []).map(s => ({
                    name: s.name,
                    color: s.color,
                })),
            };
        case 'date':
            return {
                type: 'date',
                value: prop.date?.start || null,
                end: prop.date?.end || null,
            };
        case 'number':
            return { type: 'number', value: prop.number };
        case 'checkbox':
            return { type: 'checkbox', value: prop.checkbox };
        case 'people':
            return {
                type: 'people',
                value: (prop.people || []).map(p => p.name),
            };
        case 'email':
            return { type: 'email', value: prop.email };
        case 'phone_number':
            return { type: 'phone', value: prop.phone_number };
        case 'url':
            return { type: 'url', value: prop.url };
        default:
            return null;
    }
}

function formatDatabaseRow(row) {
    const properties = row.properties || {};
    const titleProp = Object.entries(properties).find(([, p]) => p?.type === 'title');
    const titleValue = titleProp ? extractRichText(titleProp[1]?.title || []) : `Entrada #${row.id.slice(0, 8)}`;

    const formattedProps = {};
    Object.entries(properties).forEach(([propName, prop]) => {
        if (prop?.type !== 'title') {
            const formatted = formatDatabaseRowProperty(prop);
            if (formatted) {
                formattedProps[propName] = formatted;
            }
        }
    });

    return {
        id: row.id,
        type: 'database_row',
        hasChildren: false,
        text: titleValue,
        title: titleValue,
        url: row.url || null,
        properties: formattedProps,
        caption: '',
        checked: null,
        language: null,
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

async function handleSearchPages(req, res, token, userId) {
    try {
        await assertAdmin(userId);
    } catch (err) {
        return res.status(403).json({ error: err.message });
    }

    let body;
    try {
        body = await readJsonBody(req);
    } catch {
        return res.status(400).json({ error: 'Invalid JSON body' });
    }

    const query = String(body.query || '').trim();
    const cursor = body.cursor || null;
    const data = await notionRequest('/search', token, {
        method: 'POST',
        body: {
            ...(query ? { query } : {}),
            page_size: 20,
            ...(cursor ? { start_cursor: cursor } : {}),
            filter: {
                property: 'object',
                value: 'page',
            },
            sort: {
                direction: 'descending',
                timestamp: 'last_edited_time',
            },
        },
    });

    return res.status(200).json({
        pages: (data.results || []).map(formatPageSummary),
        nextCursor: data.next_cursor ?? null,
        hasMore: data.has_more ?? false,
    });
}

async function tryLoadPageOrDatabase(resourceId, token, cursor) {
    const cursorSuffix = cursor ? `&start_cursor=${encodeURIComponent(cursor)}` : '';

    try {
        const [page, children] = await Promise.all([
            notionRequest(`/pages/${resourceId}`, token),
            notionRequest(`/blocks/${resourceId}/children?page_size=25${cursorSuffix}`, token),
        ]);
        return { type: 'page', page, children };
    } catch (pageError) {
        if (pageError.message?.includes('is a database')) {
            const [db, dbQuery] = await Promise.all([
                notionRequest(`/databases/${resourceId}`, token),
                queryNotionDb(resourceId, token, cursor, null),
            ]);

            const dbRows = (dbQuery.results || []).map(formatDatabaseRow);

            return {
                type: 'database',
                page: {
                    id: db.id,
                    title: extractRichText(db.title || []) || 'Base de datos sin título',
                    url: db.url || null,
                    last_edited_time: db.last_edited_time || null,
                },
                children: {
                    results: dbRows,
                    next_cursor: dbQuery.next_cursor ?? null,
                    has_more: dbQuery.has_more ?? false,
                },
            };
        }
        throw pageError;
    }
}

async function handleProjectPage(req, res, projectId, token) {
    const settings = await getProjectNotionPage(projectId);
    if (!settings.notion_page_id) {
        return res.status(404).json({
            error: 'No hay página de Notion configurada para este proyecto.',
            hint: 'Un admin debe seleccionar una página de Notion en Integraciones.',
        });
    }

    const cursor = req.query?.cursor
        ?? new URL(req.url, 'http://localhost').searchParams.get('cursor');

    const { page, children } = await tryLoadPageOrDatabase(settings.notion_page_id, token, cursor);

    return res.status(200).json({
        page: {
            ...formatPageSummary(page),
            title: settings.notion_page_title || extractPageTitle(page),
            url: settings.notion_page_url || page.url || null,
        },
        blocks: (children.results || []).map(formatBlock),
        nextCursor: children.next_cursor ?? null,
        hasMore: children.has_more ?? false,
    });
}

async function handleSubPage(req, res, projectId, token) {
    const pageId = req.query?.pageId
        ?? new URL(req.url, 'http://localhost').searchParams.get('pageId');

    if (!pageId) {
        return res.status(400).json({ error: 'pageId query param is required' });
    }

    const cursor = req.query?.cursor
        ?? new URL(req.url, 'http://localhost').searchParams.get('cursor');

    const result = await tryLoadPageOrDatabase(pageId, token, cursor);

    const blocks = result.type === 'database'
        ? result.children.results
        : (result.children.results || []).map(formatBlock);

    return res.status(200).json({
        page: formatPageSummary(result.page),
        blocks: blocks,
        nextCursor: result.children.next_cursor ?? null,
        hasMore: result.children.has_more ?? false,
    });
}

// ─── Admin: save Notion settings ──────────────────────────────────────────────

async function handleSaveDbIds(req, res, projectId, userId) {
    const supabase = getSupabase();

    try {
        await assertAdmin(userId);
    } catch (err) {
        return res.status(403).json({ error: err.message });
    }

    let body;
    try {
        body = await readJsonBody(req);
    } catch {
        return res.status(400).json({ error: 'Invalid JSON body' });
    }

    const updates = {};
    if ('notion_page_id' in body) updates.notion_page_id = body.notion_page_id || null;
    if ('notion_page_title' in body) updates.notion_page_title = body.notion_page_title || null;
    if ('notion_page_url' in body) updates.notion_page_url = body.notion_page_url || null;
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
        if (action === 'page') return await handleProjectPage(req, res, projectId, notionToken);
        if (action === 'sub-page') return await handleSubPage(req, res, projectId, notionToken);
        if (action === 'search-pages' && req.method === 'POST') {
            return await handleSearchPages(req, res, notionToken, user.id);
        }
        if ((action === 'save-settings' || action === 'save-db-ids') && req.method === 'POST') {
            return await handleSaveDbIds(req, res, projectId, user.id);
        }

        return res.status(400).json({
            error: 'Missing or unknown ?action param. Valid: meetings, tasks, campaigns, page, sub-page, search-pages, save-settings',
        });
    } catch (err) {
        console.error('[notion] handler error:', err);
        return res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
}
