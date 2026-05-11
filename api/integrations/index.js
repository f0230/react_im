/**
 * Consolidated Integrations Handler
 * Routes via ?service= param:
 *   service=figma      → Figma OAuth & webhook handlers
 *   service=meta       → Meta/Facebook Graph API handlers
 *   service=whatsapp   → WhatsApp Business API handlers
 *   service=notion     → Notion API handlers
 */

import figmaHandler from '../../server/api-handlers/integrations/figma.js';
import metaHandler from '../../server/api-handlers/integrations/meta.js';
import whatsappHandler from '../../server/api-handlers/integrations/whatsapp.js';
import notionHandler from '../../server/api-handlers/integrations/notion.js';

function getService(req) {
  if (req.query?.service) return String(req.query.service).toLowerCase().trim();

  try {
    const url = new URL(req.url, 'http://localhost');
    const service = url.searchParams.get('service');
    if (service) return service.toLowerCase().trim();

    // Infer from pathname: /api/integrations/figma/auth-callback → figma
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts[2]) return parts[2].toLowerCase();
  } catch {
    // noop
  }

  return '';
}

export default async function handler(req, res) {
  const service = getService(req);

  try {
    switch (service) {
      case 'figma':
        return await figmaHandler(req, res);
      case 'meta':
        return await metaHandler(req, res);
      case 'whatsapp':
        return await whatsappHandler(req, res);
      case 'notion':
        return await notionHandler(req, res);
      default:
        return res.status(400).json({
          error: 'Invalid service parameter',
          available: ['figma', 'meta', 'whatsapp', 'notion'],
          received: service || '(empty)',
        });
    }
  } catch (error) {
    console.error(`[integrations/${service}]`, error);
    return res.status(500).json({ error: error.message });
  }
}
