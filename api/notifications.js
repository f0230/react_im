/**
 * UNIFIED NOTIFICATIONS HANDLER
 * Replaces: client-welcome-email.js + project-created.js + slack-notify.js
 *
 * Routes via ?action= param:
 *   action=welcome-email    → send welcome email (was client-welcome-email.js)
 *   action=project-created  → n8n webhook trigger (was project-created.js)
 *   action=slack-notify     → Slack message (was slack-notify.js)
 *   action=reports-ai-context  → reports pipeline (kept for backward compat)
 *   action=reports-ingest      → reports pipeline (kept for backward compat)
 */

import {
    handleReportsAiContext,
    handleReportsIngest,
} from '../server/services/reportsPipeline.js';
import { getSupabaseAdmin } from '../server/utils/supabaseServer.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseJsonBody(req) {
    if (!req.body) return null;
    if (typeof req.body === 'object') return req.body;
    if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return null; } }
    return null;
}

function getAction(req) {
    if (req.query?.action) return req.query.action;
    try { return new URL(req.url, 'http://localhost').searchParams.get('action') || ''; }
    catch { return ''; }
}

// ─── Welcome Email ────────────────────────────────────────────────────────────

async function handleWelcomeEmail(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const body = parseJsonBody(req);
    if (!body) return res.status(400).json({ error: 'Invalid JSON' });

    const email = String(body.email || '').trim();
    const fullName = String(body.full_name || body.fullName || '').trim();
    if (!email) return res.status(400).json({ error: 'Missing email' });

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM;
    const notifyTo = process.env.RESEND_NOTIFY_TO;
    const templateId = process.env.RESEND_CLIENT_WELCOME_TEMPLATE_ID;
    const portalUrl = process.env.PORTAL_URL || 'https://www.grupodte.com';

    if (!apiKey || !from) return res.status(500).json({ error: 'Missing Resend config' });
    if (!templateId) return res.status(500).json({ error: 'Missing RESEND_CLIENT_WELCOME_TEMPLATE_ID' });

    const payload = {
        from, to: [email], subject: 'Bienvenido/a a Grupo DTE',
        template: { id: templateId, variables: { CLIENT_NAME: fullName || 'Cliente', CLIENT_EMAIL: email, PORTAL_URL: portalUrl } },
    };
    if (notifyTo && notifyTo !== email) payload.bcc = [notifyTo];

    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) return res.status(response.status || 500).json({ error: 'Failed to send email' });
        return res.status(200).json({ ok: true, id: data?.id });
    } catch (err) {
        console.error('[notifications] welcome-email error:', err);
        return res.status(500).json({ error: 'Failed to send email' });
    }
}

// ─── Project Created (n8n forward) ────────────────────────────────────────────

async function handleProjectCreated(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const body = parseJsonBody(req);
    if (!body) return res.status(400).json({ error: 'Invalid JSON' });

    const webhookUrl = process.env.N8N_WEBHOOK_URL_2;
    if (webhookUrl) {
        try {
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Webhook-Source': 'grupodte-projects' },
                body: JSON.stringify({
                    event: body.event || 'project_created',
                    project: body.project || body.data || null,
                    client: body.client || null,
                    actor: body.actor || null,
                    source: body.source || 'project_created',
                    meta: body.meta || null,
                    timestamp: body.timestamp || new Date().toISOString(),
                }),
            });
            if (!response.ok) console.error('[notifications] n8n error:', response.status, await response.text().catch(() => ''));
        } catch (err) {
            console.error('[notifications] n8n error:', err);
        }
    }
    return res.status(200).json({ ok: true });
}

// ─── Slack Notify ─────────────────────────────────────────────────────────────

const MAX_PREVIEW = 220;
const truncate = (text) => { const s = String(text || '').replace(/\s+/g, ' ').trim(); return s.length <= MAX_PREVIEW ? s : `${s.slice(0, MAX_PREVIEW - 1)}…`; };

async function enrichForSlack({ table, record }) {
    const supabase = getSupabaseAdmin();
    if (!supabase || !record) return {};
    try {
        if (table === 'team_channels' && record.created_by) {
            const { data } = await supabase.from('profiles').select('full_name, email').eq('id', record.created_by).maybeSingle();
            return data ? { created_by_name: data.full_name || data.email } : {};
        }
        if (table === 'team_channel_members') {
            const [ch, mb, ab] = await Promise.all([
                supabase.from('team_channels').select('name,slug').eq('id', record.channel_id).maybeSingle(),
                supabase.from('profiles').select('full_name,email').eq('id', record.member_id).maybeSingle(),
                record.added_by ? supabase.from('profiles').select('full_name,email').eq('id', record.added_by).maybeSingle() : Promise.resolve({ data: null }),
            ]);
            return { channel_name: ch?.data?.name, channel_slug: ch?.data?.slug, member_name: mb?.data?.full_name || mb?.data?.email, added_by_name: ab?.data?.full_name || ab?.data?.email };
        }
        if (table === 'team_messages') {
            const [ch, au] = await Promise.all([
                supabase.from('team_channels').select('name,slug').eq('id', record.channel_id).maybeSingle(),
                supabase.from('profiles').select('full_name,email').eq('id', record.author_id).maybeSingle(),
            ]);
            return { channel_name: ch?.data?.name, channel_slug: ch?.data?.slug, author_name: record.author_name || au?.data?.full_name || au?.data?.email };
        }
    } catch (err) { console.warn('[notifications] slack enrichment failed:', err); }
    return {};
}

function formatSlackText({ event, table, record, enrich }) {
    if (table === 'team_channels' && event === 'INSERT') return `🆕 Canal creado: ${record?.name || record?.id} (por ${enrich?.created_by_name || 'desconocido'}).`;
    if (table === 'team_channel_members' && event === 'INSERT') return `👤 Nuevo miembro en ${enrich?.channel_name || record?.channel_id}: ${enrich?.member_name || record?.member_id}${enrich?.added_by_name ? ` (por ${enrich.added_by_name})` : ''}.`;
    if (table === 'team_messages' && event === 'INSERT') return `💬 Mensaje en ${enrich?.channel_name || record?.channel_id} de ${enrich?.author_name || record?.author_id}: ${truncate(record?.body || record?.file_name || '') || '[sin texto]'}.`;
    if (table === 'whatsapp_messages' && event === 'INSERT') return record?.direction === 'inbound' ? `📲 WhatsApp de ${record?.wa_id}: ${truncate(record?.body || '') || '[sin texto]'}.` : null;
    return `🔔 Evento ${event} en ${table}.`;
}

async function handleSlackNotify(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const secret = process.env.SLACK_NOTIFY_SECRET;
    const openclawKey = process.env.OPENCLAW_API_KEY;

    const slackSecretOk = !secret || req.headers['x-slack-notify-secret'] === secret;

    const authHeader = String(req.headers['authorization'] || '').trim();
    const bearer = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';
    const openclawOk = Boolean(openclawKey) && bearer === openclawKey;

    if (!slackSecretOk && !openclawOk) return res.status(401).json({ error: 'Unauthorized' });

    const token = process.env.SLACK_BOT_TOKEN;
    const channel = process.env.SLACK_CHANNEL_ID;
    if (!token || !channel) return res.status(500).json({ error: 'Missing Slack credentials' });

    const payload = typeof req.body === 'object' ? req.body : null;
    if (!payload?.table || !payload?.event) return res.status(400).json({ error: 'Invalid payload' });

    const enrich = await enrichForSlack({ table: payload.table, record: payload.record });
    const text = formatSlackText({ event: payload.event, table: payload.table, record: payload.record, enrich });
    if (!text) return res.status(200).json({ ok: true, skipped: true });

    try {
        const response = await fetch('https://slack.com/api/chat.postMessage', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=utf-8' },
            body: JSON.stringify({ channel, text }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data.ok === false) return res.status(502).json({ error: 'Slack API error', detail: data });
        return res.status(200).json({ ok: true, ts: data.ts });
    } catch (err) {
        console.error('[notifications] slack error:', err);
        return res.status(500).json({ error: 'Failed to notify Slack' });
    }
}

// ─── Slack Channel Create ────────────────────────────────────────────────────

async function slackApi(token, method, payload) {
    const response = await fetch(`https://slack.com/api/${method}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(payload || {}),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) {
        const err = new Error(`Slack API error: ${method}`);
        err.detail = data;
        throw err;
    }
    return data;
}

async function handleSlackCreateChannel(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const secret = process.env.SLACK_NOTIFY_SECRET;
    const openclawKey = process.env.OPENCLAW_API_KEY;

    const slackSecretOk = !secret || req.headers['x-slack-notify-secret'] === secret;

    const authHeader = String(req.headers['authorization'] || '').trim();
    const bearer = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';
    const openclawOk = Boolean(openclawKey) && bearer === openclawKey;

    if (!slackSecretOk && !openclawOk) return res.status(401).json({ error: 'Unauthorized' });

    const token = process.env.SLACK_BOT_TOKEN;
    if (!token) return res.status(500).json({ error: 'Missing SLACK_BOT_TOKEN' });

    const body = parseJsonBody(req);
    if (!body) return res.status(400).json({ error: 'Invalid JSON' });

    const name = String(body.name || '').trim();
    const is_private = Boolean(body.is_private || body.isPrivate || false);
    const purpose = body.purpose ? String(body.purpose).trim() : '';
    const topic = body.topic ? String(body.topic).trim() : '';
    const invite_user_ids = Array.isArray(body.invite_user_ids || body.inviteUserIds)
        ? (body.invite_user_ids || body.inviteUserIds).map(String).filter(Boolean)
        : [];

    if (!name) return res.status(400).json({ error: 'Missing channel name' });
    // Slack: lowercase, numbers, hyphens, max 80
    const normalized = name.toLowerCase().replace(/[^a-z0-9-_]/g, '-').replace(/-+/g, '-').slice(0, 80);

    try {
        const created = await slackApi(token, 'conversations.create', { name: normalized, is_private });
        const channelId = created?.channel?.id;
        if (!channelId) return res.status(502).json({ error: 'Slack API did not return channel id' });

        if (purpose) await slackApi(token, 'conversations.setPurpose', { channel: channelId, purpose });
        if (topic) await slackApi(token, 'conversations.setTopic', { channel: channelId, topic });
        if (invite_user_ids.length) await slackApi(token, 'conversations.invite', { channel: channelId, users: invite_user_ids.join(',') });

        return res.status(200).json({ ok: true, id: channelId, name: normalized, is_private });
    } catch (err) {
        // Common case: name already taken
        const detail = err?.detail || null;
        const errorCode = detail?.error;
        return res.status(502).json({ error: 'Slack API error', slack_error: errorCode, detail });
    }
}

// ─── Main router ─────────────────────────────────────────────────────────────

export default async function handler(req, res) {
    const action = getAction(req);

    // Backward compat: reports actions (previously in project-created.js)
    if (action === 'reports-ai-context') return handleReportsAiContext(req, res);
    if (action === 'reports-ingest' || action === 'reports-ocr-summary') return handleReportsIngest(req, res);

    if (action === 'welcome-email') return handleWelcomeEmail(req, res);
    if (action === 'project-created') return handleProjectCreated(req, res);
    if (action === 'slack-notify') return handleSlackNotify(req, res);
    if (action === 'slack-create-channel') return handleSlackCreateChannel(req, res);

    // Default fallback: if no action, treat as project-created POST (backward compat)
    if (req.method === 'POST' && !action) return handleProjectCreated(req, res);

    return res.status(400).json({ error: 'Missing or unknown ?action. Valid: welcome-email, project-created, slack-notify, slack-create-channel' });
}
