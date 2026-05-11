/**
 * Consolidated Utils Handler
 * Routes via ?action= or ?type= param:
 *   action=credits      → KIE credits handler
 *   action=models       → KIE models & pricing handler
 *   action=reports      → Reports handler
 */

import creditsHandler from '../../server/api-handlers/utils/credits.js';
import creditsDebugHandler from '../../server/api-handlers/utils/credits-debug.js';
import modelsHandler from '../../server/api-handlers/utils/models.js';
import reportsHandler from '../../server/api-handlers/utils/reports.js';

function getAction(req) {
  let action = req.query?.action || req.query?.type;
  if (action) return String(action).toLowerCase().trim();

  try {
    const url = new URL(req.url, 'http://localhost');
    action = url.searchParams.get('action') || url.searchParams.get('type');
    if (action) return action.toLowerCase().trim();

    // Infer from pathname
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts[2]) return parts[2].toLowerCase();
  } catch {
    // noop
  }

  return '';
}

export default async function handler(req, res) {
  const action = getAction(req);

  try {
    switch (action) {
      case 'credits':
      case 'kie-credits':
      case 'kie':
        return await creditsHandler(req, res);
      case 'credits-debug':
      case 'kie-debug':
        return await creditsDebugHandler(req, res);
      case 'models':
      case 'kie-models':
      case 'pricing':
        return await modelsHandler(req, res);
      case 'reports':
      case 'report':
        return await reportsHandler(req, res);
      default:
        return res.status(400).json({
          error: 'Invalid action parameter',
          available: ['credits', 'credits-debug', 'models', 'reports'],
          received: action || '(empty)',
        });
    }
  } catch (error) {
    console.error(`[utils/${action}]`, error);
    return res.status(500).json({ error: error.message });
  }
}
