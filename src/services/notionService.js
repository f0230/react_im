/**
 * Notion service — client-side fetch wrapper.
 * All requests are proxied through /api/notion to keep NOTION_TOKEN server-side.
 */

/**
 * Fetch meeting notes for a project from the Notion API.
 *
 * @param {string} projectId  — project slug (see src/config/notion.js PROJECT_SLUGS)
 * @param {string|null} cursor — pagination cursor returned by a previous call
 * @returns {Promise<{ meetings: Meeting[], nextCursor: string|null, hasMore: boolean }>}
 */
export async function fetchMeetings(projectId, cursor = null) {
    const params = new URLSearchParams({ action: 'meetings', projectId });
    if (cursor) params.set('cursor', cursor);

    const res = await fetch(`/api/notion?${params.toString()}`);

    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed with status ${res.status}`);
    }

    return res.json();
}
