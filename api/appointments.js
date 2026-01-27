import { getSupabaseAdmin } from '../server/utils/supabaseServer.js';

const DEFAULT_TABLE = 'appointments';
const DEFAULT_ID_FIELD = 'id';
const DEFAULT_SELECT = '*';
const ALLOWED_METHODS = new Set(['GET', 'POST', 'PATCH', 'PUT', 'DELETE']);

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
  read: 'read',
  get: 'read',
  query: 'read',
  list: 'read',
  check_availability: 'check_availability',
  availability: 'check_availability',
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

  if (method === 'GET') return 'read';
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
    body?.api_key ||
    req.query?.api_key
  );
}

// ✅ MEJORADO: Extrae datos del body de forma más flexible
function extractData(body) {
  if (!body || typeof body !== 'object') return null;
  
  // Si viene envuelto en alguna de estas propiedades
  if (body.data !== undefined) return body.data;
  if (body.appointment !== undefined) return body.appointment;
  if (body.record !== undefined) return body.record;
  if (body.payload !== undefined) return body.payload;
  
  // ✅ NUEVO: Si no está envuelto, busca campos conocidos de appointments
  const knownFields = [
    'user_id', 'summary', 'description', 'start_time', 'end_time', 
    'status', 'meet_link', 'google_event_id', 'assigned_worker_id'
  ];
  
  const hasKnownFields = knownFields.some(field => body[field] !== undefined);
  if (hasKnownFields) {
    // Extrae solo los campos conocidos
    const extracted = {};
    for (const field of knownFields) {
      if (body[field] !== undefined) {
        extracted[field] = body[field];
      }
    }
    return Object.keys(extracted).length > 0 ? extracted : null;
  }
  
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

// ✅ NUEVO: Valida fechas ISO 8601
function validateDateTime(dateString) {
  if (!dateString || typeof dateString !== 'string') return false;
  
  // Regex básico para ISO 8601 con timezone
  const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/;
  if (!iso8601Regex.test(dateString)) return false;
  
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

// ✅ NUEVO: Función para consultar disponibilidad
async function checkAvailability(supabase, body) {
  const date = body.date || body.start_date;
  const userId = body.user_id || body.client_id;
  
  if (!date) {
    return { error: 'Missing date parameter (format: YYYY-MM-DD)' };
  }
  
  // Validar formato de fecha
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return { error: 'Invalid date format. Use YYYY-MM-DD' };
  }
  
  // Consultar citas existentes del día
  const startOfDay = `${date}T00:00:00-03:00`;
  const endOfDay = `${date}T23:59:59-03:00`;
  
  const { data: existingAppointments, error } = await supabase
    .from('appointments')
    .select('start_time, end_time')
    .gte('start_time', startOfDay)
    .lte('start_time', endOfDay)
    .order('start_time', { ascending: true });
  
  if (error) {
    return { error: 'Failed to query appointments', detail: error.message };
  }
  
  // Generar bloques disponibles (9 AM - 7 PM, bloques de 1 hora)
  const availableSlots = [];
  const workStart = 9; // 9 AM
  const workEnd = 19; // 7 PM
  
  for (let hour = workStart; hour < workEnd; hour++) {
    const slotStart = `${date}T${String(hour).padStart(2, '0')}:00:00-03:00`;
    const slotEnd = `${date}T${String(hour + 1).padStart(2, '0')}:00:00-03:00`;
    
    // Verificar si este bloque está ocupado
    const isOccupied = existingAppointments.some(apt => {
      const aptStart = new Date(apt.start_time);
      const aptEnd = new Date(apt.end_time);
      const checkStart = new Date(slotStart);
      const checkEnd = new Date(slotEnd);
      
      // Hay conflicto si se solapan
      return (checkStart < aptEnd && checkEnd > aptStart);
    });
    
    if (!isOccupied) {
      availableSlots.push({ start: slotStart, end: slotEnd });
    }
  }
  
  return {
    ok: true,
    date,
    available_slots: availableSlots,
    count: availableSlots.length
  };
}

export default async function handler(req, res) {
  if (!ALLOWED_METHODS.has(req.method)) {
    res.setHeader('Allow', 'GET, POST, PATCH, PUT, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Para GET, usar query params; para otros, usar body
  const body = req.method === 'GET' 
    ? req.query
    : parseJsonBody(req) || 
      (req.method === 'DELETE' && req.query && typeof req.query === 'object' ? req.query : null);
      
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ error: 'Invalid request parameters' });
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

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return res.status(500).json({ error: 'Missing Supabase server credentials' });
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

  try {
    // ✅ NUEVO: Acción para consultar disponibilidad
    if (action === 'check_availability') {
      const result = await checkAvailability(supabase, body);
      if (result.error) {
        return res.status(400).json(result);
      }
      return res.status(200).json(result);
    }

    // ✅ NUEVO: Acción para leer/listar citas
    if (action === 'read') {
      const match = buildMatch(body, idField);
      let query = supabase.from(table).select(select);
      
      if (match) {
        query = query.match(match);
      }
      
      // Filtros adicionales por fecha si se proveen
      if (body.start_date) {
        query = query.gte('start_time', body.start_date);
      }
      if (body.end_date) {
        query = query.lte('start_time', body.end_date);
      }
      
      if (expectSingle) {
        query = query.single();
      } else {
        query = query.order('start_time', { ascending: true });
      }
      
      const { data, error } = await query;
      if (error) {
        console.error('Failed to read appointments', { table, error: error.message });
        return res.status(500).json({ error: 'Failed to read appointments', detail: error.message });
      }
      
      const count = Array.isArray(data) ? data.length : data ? 1 : 0;
      return res.status(200).json({ ok: true, action, table, count, data });
    }

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

      // ✅ NUEVO: Validar campos requeridos
      if (!payload.user_id) {
        return res.status(400).json({ error: 'Missing required field: user_id' });
      }
      if (!payload.summary) {
        return res.status(400).json({ error: 'Missing required field: summary' });
      }
      if (!payload.start_time) {
        return res.status(400).json({ error: 'Missing required field: start_time' });
      }
      if (!payload.end_time) {
        return res.status(400).json({ error: 'Missing required field: end_time' });
      }

      // ✅ NUEVO: Validar formato de fechas
      if (!validateDateTime(payload.start_time)) {
        return res.status(400).json({ 
          error: 'Invalid start_time format. Use ISO 8601 with timezone (YYYY-MM-DDTHH:mm:ss±HH:mm)',
          example: '2025-01-27T15:00:00-03:00'
        });
      }
      if (!validateDateTime(payload.end_time)) {
        return res.status(400).json({ 
          error: 'Invalid end_time format. Use ISO 8601 with timezone (YYYY-MM-DDTHH:mm:ss±HH:mm)',
          example: '2025-01-27T16:00:00-03:00'
        });
      }

      // ✅ NUEVO: Validar que end_time > start_time
      const startDate = new Date(payload.start_time);
      const endDate = new Date(payload.end_time);
      if (endDate <= startDate) {
        return res.status(400).json({ error: 'end_time must be after start_time' });
      }

      // ✅ NUEVO: Validar que no sea en el pasado
      const now = new Date();
      if (startDate < now) {
        return res.status(400).json({ error: 'Cannot create appointments in the past' });
      }

      let query = supabase.from(table).insert(payload);
      if (returning) {
        query = query.select(select);
        if (expectSingle) query = query.single();
      }

      const { data, error } = await query;
      if (error) {
        console.error('Failed to create appointment', {
          table,
          payload,
          error: error.message,
        });
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

      // ✅ NUEVO: Validar fechas si se están actualizando
      if (updates.start_time && !validateDateTime(updates.start_time)) {
        return res.status(400).json({ 
          error: 'Invalid start_time format. Use ISO 8601 with timezone',
          example: '2025-01-27T15:00:00-03:00'
        });
      }
      if (updates.end_time && !validateDateTime(updates.end_time)) {
        return res.status(400).json({ 
          error: 'Invalid end_time format. Use ISO 8601 with timezone',
          example: '2025-01-27T16:00:00-03:00'
        });
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
        console.error('Failed to update appointment', {
          table,
          match,
          error: error.message,
        });
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
        console.error('Failed to delete appointment', {
          table,
          match,
          error: error.message,
        });
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