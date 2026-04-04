/**
 * Notion API proxy
 * Routes via ?action= param:
 *   action=meetings  → fetch meeting notes from a project's Notion database
 *
 * Env vars required:
 *   NOTION_TOKEN              — Notion integration token (set once in Vercel)
 *   VITE_SUPABASE_URL         — already set
 *   SUPABASE_SERVICE_ROLE_KEY — already set
 *
 * The Notion database ID per project is stored in the `projects` Supabase table
 * as the `notion_db_id` column — no per-project env vars needed.
 * Run the migration in supabase/migrations/ to add that column.
 */

import { createClient } from '@supabase/supabase-js';

const NOTION_VERSION = '2022-06-28';
const NOTION_API_BASE = 'https://api.notion.com/v1';
const PAGE_SIZE = 20;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function notionHeaders(token) {
    return {
        Authorization: `Bearer ${token}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
    };
}

function extractRichText(richTextArr) {
    if (!Array.isArray(richTextArr) || richTextArr.length === 0) return '';
    return richTextArr.map((r) => r.plain_text || '').join('');
}

function formatPage(page) {
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

/**
 * Look up the Notion database ID for a project from Supabase.
 * The project UUID comes directly from the URL — no manual mapping needed.
 */
async function getNotionDbId(projectId) {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
        throw new Error('Supabase credentials not configured');
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await supabase
        .from('projects')
        .select('notion_db_id')
        .eq('id', projectId)
        .maybeSingle();

    if (error) throw new Error(`Supabase error: ${error.message}`);

    return data?.notion_db_id ?? null;
}

// ─── Action: meetings ─────────────────────────────────────────────────────────

async function handleMeetings(req, res) {
    const token = process.env.NOTION_TOKEN;
    if (!token) {
        return res.status(500).json({ error: 'NOTION_TOKEN is not configured' });
    }

    const projectId = req.query?.projectId;
    if (!projectId) {
        return res.status(400).json({ error: 'projectId query param is required' });
    }

    let databaseId;
    try {
        databaseId = await getNotionDbId(projectId);
    } catch (err) {
        console.error('[notion] failed to fetch notion_db_id from Supabase:', err.message);
        return res.status(500).json({ error: err.message });
    }

    if (!databaseId) {
        return res.status(404).json({
            error: `No Notion database linked to project "${projectId}"`,
            hint: 'Set the notion_db_id field on this project in Supabase (or via the project settings UI).',
        });
    }

    try {
        const cursor = req.query?.cursor ?? null;

        const body = {
            page_size: PAGE_SIZE,
            sorts: [{ property: 'Date', direction: 'descending' }],
        };
        if (cursor) body.start_cursor = cursor;

        const r = await fetch(`${NOTION_API_BASE}/databases/${databaseId}/query`, {
            method: 'POST',
            headers: notionHeaders(token),
            body: JSON.stringify(body),
        });

        if (!r.ok) {
            const err = await r.json().catch(() => ({}));
            console.error('[notion] Notion API error:', err);
            return res.status(r.status).json({ error: err.message || 'Notion API error' });
        }

        const data = await r.json();

        return res.status(200).json({
            meetings: (data.results || []).map(formatPage),
            nextCursor: data.next_cursor ?? null,
            hasMore: data.has_more ?? false,
        });
    } catch (err) {
        console.error('[notion] meetings handler error:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

// ─── Main router ─────────────────────────────────────────────────────────────

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const action = req.query?.action
        ?? new URL(req.url, 'http://localhost').searchParams.get('action');

    if (action === 'meetings') return handleMeetings(req, res);

    return res.status(400).json({
        error: 'Missing or unknown ?action param. Valid: meetings',
    });
}
