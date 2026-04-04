/**
 * Notion integration — client-side config.
 *
 * The Notion database ID per project is stored in the `projects.notion_db_id`
 * column in Supabase and resolved server-side by api/notion.js.
 * No per-project env vars or manual slug mapping needed here.
 */

/**
 * Returns true if the given service card key represents a meetings service.
 * Any card key that starts with "meetings" triggers the MeetingHistory panel.
 */
export function isMeetingsCard(cardKey) {
    return typeof cardKey === 'string' && cardKey.startsWith('meetings');
}
