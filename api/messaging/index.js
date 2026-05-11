/**
 * Consolidated Messaging Handler
 * Routes via ?type= or ?service= param:
 *   type=chat           → ClawBot team chat handler
 *   type=notifications  → Notifications & webhooks handler
 */

import chatHandler from '../../server/api-handlers/messaging/chat.js';
import notificationsHandler from '../../server/api-handlers/messaging/notifications.js';

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
      case 'chat':
      case 'clawbot':
      case 'team-chat':
        return await chatHandler(req, res);
      case 'notifications':
      case 'notify':
      case 'webhook':
      case 'email':
        return await notificationsHandler(req, res);
      default:
        return res.status(400).json({
          error: 'Invalid type parameter',
          available: ['chat', 'notifications'],
          received: type || '(empty)',
        });
    }
  } catch (error) {
    console.error(`[messaging/${type}]`, error);
    return res.status(500).json({ error: error.message });
  }
}
