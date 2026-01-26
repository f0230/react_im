import { getSupabaseAdmin } from '../server/utils/supabaseServer.js';

const DEFAULT_TABLE = 'appointments';
const DEFAULT_ID_FIELD = 'id';
const DEFAULT_SELECT = '*';
const ALLOWED_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

const ACTION_ALIASES = {
  create: 'create',
  insert: 'create',
  new: 'create',
  add: 'create',
  update: 'update',
  edit: 'update',
  patch: 'update',
  delete: 'delete',
  remove: 'delete',
  cancel: 'delete',
};

function parseJsonBody(req) {
  if (!req.body) return null;
  if (typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch (error) {
      return null;
    }
  }
  return null;
}

function parseBool(value, fallback) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  }
  return fallback;
}

function resolveAction(method, action) {
  if (typeof action === 'string') {
    const normalized = action.trim().toLowerCase();
    if (ACTION_ALIASES[normalized]) return ACTION_ALIASES[normalized];
  }

  if (method === 'POST') return 'create';
  if (method === 'PATCH' || method === 'PUT') return 'update';
  if (method === 'DELETE') return 'delete';
  return null;
}

function resolveApiKey(req, body) {
  return (
    req.headers['x-api-key'] ||
    (typeof req.headers.authorization === 'string' &&
      req.headers.authorization.startsWith('Bearer ')
      ? req.headers.authorization.slice('Bearer '.length)
      : null) ||
    body?.api_key
  );
}

function extractData(body) {
  if (!body || typeof body !== 'object') return null;
  if (body.data !== undefined) return body.data;
  if (body.appointment !== undefined) return body.appointment;
  if (body.record !== undefined) return body.record;
  if (body.payload !== undefined) return body.payload;
  return null;
}

function buildMatch(body, idField) {
  if (!body || typeof body !== 'object') return null;
  const match = {};
  const idValue = body.id ?? body.appointment_id ?? body.appointmentId ?? body[`${idField}`];
  if (idValue !== undefined && idValue !== null && idValue !== '') {
    match[idField] = idValue;
  }

  const sources = [body.filters, body.match, body.where];
  for (const source of sources) {
    if (!source || typeof source !== 'object' || Array.isArray(source)) continue;
    for (const [key, value] of Object.entries(source)) {
      if (value === undefined || value === null || value === '') continue;
      match[key] = value;
    }
  }

  return Object.keys(match).length > 0 ? match : null;
}

export default async function handler(req, res) {
  if (!ALLOWED_METHODS.has(req.method)) {
    res.setHeader('Allow', 'POST, PATCH, PUT, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body =
    parseJsonBody(req) ||
    (req.method === 'DELETE' && req.query && typeof req.query === 'object' ? req.query : null);
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const requiredKey = process.env.APPOINTMENTS_API_KEY || process.env.INTERNAL_API_KEY;
  const apiKey = resolveApiKey(req, body);
  if (requiredKey && apiKey !== requiredKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const action = resolveAction(req.method, body.action);
  if (!action) {
    return res.status(400).json({ error: 'Missing or invalid action' });
  }

  const table = String(body.table || DEFAULT_TABLE).trim() || DEFAULT_TABLE;
  const idField = typeof body.id_field === 'string' && body.id_field.trim()
    ? body.id_field.trim()
    : DEFAULT_ID_FIELD;
  const select = typeof body.select === 'string' && body.select.trim()
    ? body.select.trim()
    : DEFAULT_SELECT;
  let returning = parseBool(body.returning, true);
  const expectSingle = parseBool(body.expect_single, false);

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return res.status(500).json({ error: 'Missing Supabase server credentials' });
  }

  try {
    if (action === 'create') {
      const payload = extractData(body);
      if (!payload || (typeof payload !== 'object' && !Array.isArray(payload))) {
        return res.status(400).json({ error: 'Missing appointment data' });
      }
      if (Array.isArray(payload) && payload.length === 0) {
        return res.status(400).json({ error: 'Appointment data is empty' });
      }
      if (!Array.isArray(payload) && Object.keys(payload).length === 0) {
        return res.status(400).json({ error: 'Appointment data is empty' });
      }

      let query = supabase.from(table).insert(payload);
      if (returning) {
        query = query.select(select);
        if (expectSingle) query = query.single();
      }

      const { data, error } = await query;
      if (error) {
        return res.status(500).json({ error: 'Failed to create appointment', detail: error.message });
      }

      const count = Array.isArray(data) ? data.length : data ? 1 : 0;
      return res.status(200).json({ ok: true, action, table, count, data: returning ? data : null });
    }

    if (action === 'update') {
      const updates = extractData(body);
      if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
        return res.status(400).json({ error: 'Missing appointment updates' });
      }
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'Appointment updates are empty' });
      }

      const match = buildMatch(body, idField);
      if (!match) {
        return res.status(400).json({ error: 'Missing appointment identifier or filters' });
      }

      if (expectSingle) returning = true;

      let query = supabase.from(table).update(updates).match(match);
      if (returning) {
        query = query.select(select);
        if (expectSingle) query = query.single();
      }

      const { data, error } = await query;
      if (error) {
        return res.status(500).json({ error: 'Failed to update appointment', detail: error.message });
      }

      const count = Array.isArray(data) ? data.length : data ? 1 : 0;
      return res.status(200).json({ ok: true, action, table, count, data: returning ? data : null });
    }

    if (action === 'delete') {
      const match = buildMatch(body, idField);
      if (!match) {
        return res.status(400).json({ error: 'Missing appointment identifier or filters' });
      }

      if (expectSingle) returning = true;

      let query = supabase.from(table).delete().match(match);
      if (returning) {
        query = query.select(select);
        if (expectSingle) query = query.single();
      }

      const { data, error } = await query;
      if (error) {
        return res.status(500).json({ error: 'Failed to delete appointment', detail: error.message });
      }

      const count = Array.isArray(data) ? data.length : data ? 1 : 0;
      return res.status(200).json({ ok: true, action, table, count, data: returning ? data : null });
    }

    return res.status(400).json({ error: 'Unsupported action' });
  } catch (error) {
    console.error('Appointments API error:', error);
    return res.status(500).json({ error: 'Appointments API error', detail: error?.message });
  }
}
