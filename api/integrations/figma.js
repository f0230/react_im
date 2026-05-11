/**
 * UNIFIED FIGMA HANDLER
 * Replaces: figma-auth.js + figma-webhook.js + figma/comments.js
 *
 * Routes via ?action= param (or vercel.json rewrites):
 *   action=auth-login    → Figma OAuth redirect (was figma-auth.js /login)
 *   action=auth-callback → Figma OAuth callback (was figma-auth.js /callback)
 *   action=webhook       → Figma webhook (was figma-webhook.js)
 *   action=comments      → Figma comments proxy (was figma/comments.js)
 */

import { createClient } from '@supabase/supabase-js';

// ─── Shared helpers ──────────────────────────────────────────────────────────

function getAction(req) {
    if (req.query?.action) return req.query.action;
    try { return new URL(req.url, 'http://localhost').searchParams.get('action') || ''; }
    catch { return ''; }
}

function getRedirectUri(req) {
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:5173';
    const proto = req.headers['x-forwarded-proto'] || (host.includes('localhost') ? 'http' : 'https');
    return `${proto}://${host}/api/figma/auth-callback`;
}

// ─── Figma OAuth – login ─────────────────────────────────────────────────────

async function handleAuthLogin(req, res) {
    const FIGMA_CLIENT_ID = process.env.FIGMA_CLIENT_ID;
    const redirectUri = getRedirectUri(req);
    const params = new URLSearchParams({
        client_id: FIGMA_CLIENT_ID,
        redirect_uri: redirectUri,
        scope: 'file_read',
        response_type: 'code',
        state: 'admin_login',
    });
    return res.redirect(`https://www.figma.com/oauth?${params.toString()}`);
}

// ─── Figma OAuth – callback ──────────────────────────────────────────────────

async function handleAuthCallback(req, res) {
    const FIGMA_CLIENT_ID = process.env.FIGMA_CLIENT_ID;
    const FIGMA_SECRET = process.env.FIGMA_SECRET;
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const appUrl = process.env.VITE_APP_URL || 'http://localhost:5173';

    const { code, error: figmaError } = req.query;
    if (figmaError || !code) return res.redirect(`${appUrl}/admin?error=figma_denied`);

    try {
        const redirectUri = getRedirectUri(req);
        const tokenRes = await fetch('https://www.figma.com/api/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ client_id: FIGMA_CLIENT_ID, client_secret: FIGMA_SECRET, redirect_uri: redirectUri, code, grant_type: 'authorization_code' }),
        });
        if (!tokenRes.ok) throw new Error('Figma token exchange failed');
        const { access_token: figmaAccessToken } = await tokenRes.json();

        const meRes = await fetch('https://api.figma.com/v1/me', { headers: { Authorization: `Bearer ${figmaAccessToken}` } });
        if (!meRes.ok) throw new Error('Failed to fetch Figma user profile');
        const figmaUser = await meRes.json();
        if (!figmaUser.email) throw new Error('No email returned from Figma');

        if (!SUPABASE_SERVICE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');
        const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

        const { data: profile, error: profileError } = await supabaseAdmin.from('profiles').select('id, role, email').eq('email', figmaUser.email).single();
        if (profileError || !profile) return res.redirect(`${appUrl}/admin?error=not_found&email=${encodeURIComponent(figmaUser.email)}`);
        if (!['admin', 'worker'].includes(profile.role)) return res.redirect(`${appUrl}/admin?error=not_admin`);

        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'magiclink',
            email: figmaUser.email,
            options: { redirectTo: `${appUrl}/dashboard`, data: { figma_id: figmaUser.id, figma_handle: figmaUser.handle, login_method: 'figma' } },
        });
        if (linkError || !linkData?.properties?.hashed_token) throw new Error('Failed to generate login link');
        return res.redirect(linkData.action_link);
    } catch (err) {
        console.error('[figma] auth callback error:', err.message);
        return res.redirect(`${process.env.VITE_APP_URL || 'http://localhost:5173'}/admin?error=server_error`);
    }
}

// ─── Figma Webhook ───────────────────────────────────────────────────────────

async function handleWebhook(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { event_type, file_key, comment, triggered_by, comment_id } = req.body || {};
    if (event_type !== 'FILE_COMMENT') return res.status(200).json({ status: 'ignored' });

    try {
        const { data: projects, error: projectError } = await supabase.from('projects').select('id, title, name, project_name, client_id, figma_url').filter('figma_url', 'ilike', `%${file_key}%`);
        if (projectError) throw projectError;
        if (!projects?.length) return res.status(200).json({ status: 'no_project_found' });

        const project = projects[0];
        const projectTitle = project.title || project.name || project.project_name || 'Proyecto';
        const { data: clientData } = await supabase.from('clients').select('user_id').eq('id', project.client_id).single();
        const { data: assignments } = await supabase.from('project_assignments').select('worker_id').eq('project_id', project.id);
        const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin');

        const recipientIds = Array.from(new Set([
            ...(admins?.map(a => a.id) || []),
            ...(assignments?.map(a => a.worker_id) || []),
            ...(clientData?.user_id ? [clientData.user_id] : []),
        ]));

        const authorName = triggered_by?.handle || 'Alguien';
        const commentText = Array.isArray(comment) ? comment.map(c => c.text).join(' ') : (typeof comment === 'string' ? comment : 'ha dejado un comentario');
        const notifications = recipientIds.map(recipient_id => ({
            recipient_id,
            type: 'figma_comment',
            title: `Nuevo comentario en Figma: ${projectTitle}`,
            body: `${authorName}: ${commentText.substring(0, 100)}${commentText.length > 100 ? '...' : ''}`,
            data: { project_id: project.id, figma_file_key: file_key, figma_url: project.figma_url, comment_id, external_author: authorName },
        }));

        const { error: insertError } = await supabase.from('notifications').insert(notifications);
        if (insertError) throw insertError;
        return res.status(200).json({ status: 'success', notifications_created: notifications.length });
    } catch (error) {
        console.error('[figma] webhook error:', error);
        return res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}

// ─── Figma Comments Proxy ────────────────────────────────────────────────────

async function handleComments(req, res) {
    const { file_key, comment_id } = req.query;
    const token = process.env.FIGMA_API_TOKEN;
    if (!token) return res.status(500).json({ error: 'FIGMA_API_TOKEN not configured' });
    if (!file_key) return res.status(400).json({ error: 'file_key is required' });

    const baseUrl = `https://api.figma.com/v1/files/${file_key}/comments`;
    try {
        if (req.method === 'GET') {
            const r = await fetch(baseUrl, { headers: { 'X-Figma-Token': token } });
            return res.status(r.status).json(await r.json());
        }
        if (req.method === 'POST') {
            const r = await fetch(baseUrl, { method: 'POST', headers: { 'X-Figma-Token': token, 'Content-Type': 'application/json' }, body: JSON.stringify(req.body) });
            return res.status(r.status).json(await r.json());
        }
        if (req.method === 'DELETE') {
            const r = await fetch(`${baseUrl}/${comment_id}`, { method: 'DELETE', headers: { 'X-Figma-Token': token } });
            return res.status(r.status).end();
        }
        res.setHeader('Allow', 'GET, POST, DELETE');
        return res.status(405).json({ error: 'Method Not Allowed' });
    } catch (error) {
        console.error('[figma] comments error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

// ─── Main router ─────────────────────────────────────────────────────────────

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const action = getAction(req);

    if (action === 'auth-login') return handleAuthLogin(req, res);
    if (action === 'auth-callback') return handleAuthCallback(req, res);
    if (action === 'webhook') return handleWebhook(req, res);
    if (action === 'comments') return handleComments(req, res);

    return res.status(400).json({ error: 'Missing or unknown ?action. Valid: auth-login, auth-callback, webhook, comments' });
}
