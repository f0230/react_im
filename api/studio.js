/**
 * /api/studio — thin proxy to studio-ai handler
 * Injects tool=studio so the router dispatches correctly.
 * Client calls: POST /api/studio?action=market-create|market-poll|veo-create|veo-poll|proxy|kie-upload
 */
import studioAiHandler from './studio-ai/index.js';

export default async function handler(req, res) {
  // Ensure tool=studio is always set regardless of query string
  req.query = { ...req.query, tool: 'studio' };
  return studioAiHandler(req, res);
}
