/**
 * Consolidated Content Handler
 * Routes via ?type= or ?service= param:
 *   type=copywriter     → Post copywriter AI handler
 *   type=planner        → Services content planner handler
 */

import copywriterHandler from '../../server/api-handlers/content/copywriter.js';
import plannerHandler from '../../server/api-handlers/content/planner.js';

function getType(req) {
  let type = req.query?.type || req.query?.service;
  if (type) return String(type).toLowerCase().trim();

  try {
    const url = new URL(req.url, 'http://localhost');
    type = url.searchParams.get('type') || url.searchParams.get('service');
    if (type) return type.toLowerCase().trim();

    // Infer from pathname
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts[2]) return parts[2].toLowerCase();
  } catch {
    // noop
  }

  return '';
}

export default async function handler(req, res) {
  const type = getType(req);

  try {
    switch (type) {
      case 'copywriter':
      case 'post-copywriter':
      case 'post':
        return await copywriterHandler(req, res);
      case 'planner':
      case 'services-planner':
      case 'services':
        return await plannerHandler(req, res);
      default:
        return res.status(400).json({
          error: 'Invalid type parameter',
          available: ['copywriter', 'planner'],
          received: type || '(empty)',
        });
    }
  } catch (error) {
    console.error(`[content/${type}]`, error);
    return res.status(500).json({ error: error.message });
  }
}
