/**
 * Consolidated Studio & AI Handler
 * Routes via ?tool= or ?service= param:
 *   tool=studio    → Studio KIE/Veo/Market handlers
 *   tool=blotato   → Blotato social media handler
 */

import studioHandler from './studio.js';
import blotatoHandler from './blotato.js';

function getTool(req) {
  let tool = req.query?.tool || req.query?.service;
  if (tool) return String(tool).toLowerCase().trim();

  try {
    const url = new URL(req.url, 'http://localhost');
    tool = url.searchParams.get('tool') || url.searchParams.get('service');
    if (tool) return tool.toLowerCase().trim();

    // Infer from pathname
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts[2]) return parts[2].toLowerCase();
  } catch {
    // noop
  }

  return '';
}

export default async function handler(req, res) {
  const tool = getTool(req);

  try {
    switch (tool) {
      case 'studio':
      case 'kie':
      case 'veo':
      case 'market':
        return await studioHandler(req, res);
      case 'blotato':
      case 'social':
        return await blotatoHandler(req, res);
      default:
        return res.status(400).json({
          error: 'Invalid tool parameter',
          available: ['studio', 'blotato'],
          received: tool || '(empty)',
        });
    }
  } catch (error) {
    console.error(`[studio-ai/${tool}]`, error);
    return res.status(500).json({ error: error.message });
  }
}
