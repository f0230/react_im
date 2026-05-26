/**
 * Validates the shared AGENT_SECRET for service-to-service calls.
 * Used by: Supabase webhook → buffer-update, VPS Hermes service → all agent endpoints.
 */
export function validateAgentSecret(req) {
  const secret = process.env.AGENT_SECRET;

  if (!secret) {
    return { ok: false, status: 500, error: 'AGENT_SECRET is not configured on the server' };
  }

  const authHeader = req.headers?.authorization || req.headers?.Authorization || '';

  if (!authHeader.startsWith('Bearer ')) {
    return { ok: false, status: 401, error: 'Missing or malformed Authorization header' };
  }

  const token = authHeader.slice(7).trim();

  if (token !== secret) {
    return { ok: false, status: 401, error: 'Invalid agent secret' };
  }

  return { ok: true };
}
