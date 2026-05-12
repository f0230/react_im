/**
 * Notion API shim — proxies /api/notion?action=... to /api/integrations?service=notion&action=...
 * Enables the client-side notionService.js to call /api/notion directly.
 */

import handler from './integrations/index.js';

export default async function notionHandler(req, res) {
  req.query = { ...req.query, service: 'notion' };
  return handler(req, res);
}
