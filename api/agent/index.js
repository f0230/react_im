/**
 * Consolidated Agent API
 *
 * Routes via ?action= param:
 *
 *   GET  action=context            → Enriched context package for Hermes (channel + project + Notion + buffer)
 *   POST action=buffer-update      → Append message to channel buffer (called by Supabase webhook)
 *   POST action=post-message       → Bot posts a message to a channel
 *   POST action=log-run            → Create agent_run audit record
 *   POST action=complete-run       → Finalize agent_run with stats
 *   GET  action=pending-channels   → List channels needing agent attention (used by cron)
 *
 * All routes require: Authorization: Bearer <AGENT_SECRET>
 */

import contextHandler from '../../server/api-handlers/agent/context.js';
import bufferHandler  from '../../server/api-handlers/agent/buffer.js';
import actionsHandler from '../../server/api-handlers/agent/actions.js';

function getAction(req) {
  try {
    const url = new URL(req.url, 'http://localhost');
    return (
      req.query?.action ||
      url.searchParams.get('action') ||
      ''
    ).toLowerCase().trim();
  } catch {
    return '';
  }
}

export default async function handler(req, res) {
  // CORS for local VPS development
  res.setHeader('Access-Control-Allow-Origin', process.env.AGENT_CORS_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = getAction(req);

  try {
    switch (action) {
      // Context — GET, returns enriched payload for Hermes
      case 'context':
        return await contextHandler(req, res);

      // Buffer — POST from Supabase Database Webhook
      case 'buffer-update':
        return await bufferHandler(req, res);

      // Actions — POST/GET (dispatcher handles method validation internally)
      case 'post-message':
      case 'log-run':
      case 'complete-run':
      case 'pending-channels':
        return await actionsHandler(req, res);

      default:
        return res.status(400).json({
          error:     'Missing or unknown ?action param',
          available: [
            'GET  context',
            'POST buffer-update',
            'POST post-message',
            'POST log-run',
            'POST complete-run',
            'GET  pending-channels',
          ],
          received: action || '(empty)',
        });
    }
  } catch (err) {
    console.error(`[api/agent][${action}] unhandled:`, err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
