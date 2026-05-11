/**
 * Notion service — client-side fetch wrapper.
 * All requests are proxied through /api/notion to keep NOTION_TOKEN server-side.
 */

import { supabase } from '@/lib/supabaseClient';

async function getAuthToken() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
}

async function notionFetch(params) {
    const token = await getAuthToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await fetch(`/api/notion?${params.toString()}`, { headers });

    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed with status ${res.status}`);
    }

    return res.json();
}

async function notionPost(params, body) {
    const token = await getAuthToken();
    if (!token) throw new Error('No autenticado.');

    const res = await fetch(`/api/notion?${params.toString()}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const responseBody = await res.json().catch(() => ({}));
        throw new Error(responseBody.error || `Request failed with status ${res.status}`);
    }

    return res.json();
}

export async function fetchMeetings(projectId, cursor = null) {
    const params = new URLSearchParams({ action: 'meetings', projectId });
    if (cursor) params.set('cursor', cursor);
    return notionFetch(params);
}

export async function fetchTasks(projectId, cursor = null) {
    const params = new URLSearchParams({ action: 'tasks', projectId });
    if (cursor) params.set('cursor', cursor);
    return notionFetch(params);
}

export async function fetchCampaigns(projectId, cursor = null) {
    const params = new URLSearchParams({ action: 'campaigns', projectId });
    if (cursor) params.set('cursor', cursor);
    return notionFetch(params);
}

export async function searchNotionPages(projectId, query, cursor = null) {
    const params = new URLSearchParams({ action: 'search-pages', projectId });
    return notionPost(params, { query, cursor });
}

export async function fetchNotionPage(projectId, cursor = null) {
    const params = new URLSearchParams({ action: 'page', projectId });
    if (cursor) params.set('cursor', cursor);
    return notionFetch(params);
}

export async function saveNotionSettings(projectId, settings) {
    const params = new URLSearchParams({ action: 'save-settings', projectId });
    return notionPost(params, settings);
}

export const saveNotionDbIds = saveNotionSettings;
