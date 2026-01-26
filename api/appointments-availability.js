import { getSupabaseAdmin } from '../server/utils/supabaseServer.js';

const DEFAULT_TABLE = 'appointments';
const DEFAULT_SLOT_MINUTES = 30;
const DEFAULT_DAYS = 7;
const DEFAULT_WORKDAY_START = '09:00';
const DEFAULT_WORKDAY_END = '18:00';
const MAX_SLOTS = 200;

const CANDIDATE_TIME_FIELDS = [
  ['start_time', 'end_time'],
  ['start_at', 'end_at'],
  ['starts_at', 'ends_at'],
  ['start', 'end'],
  ['starts', 'ends'],
  ['scheduled_at', 'scheduled_end'],
];

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

function parseNumber(value, fallback) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function parseBool(value, fallback) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') return true;
    if (normalized === 'false' || normalized === '0') return false;
  }
  return fallback;
}

function parseIsoDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function parseTime(value, fallbackValue) {
  const raw = typeof value === 'string' ? value.trim() : '';
  const fallback = typeof fallbackValue === 'string' ? fallbackValue.trim() : '';
  const time = raw || fallback;
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return { hours, minutes };
}

function toDayCursor(dateUtc, offsetMs) {
  const local = new Date(dateUtc.getTime() + offsetMs);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()));
}

function normalizeBusyIntervals(rows, startField, endField, bufferMs) {
  const intervals = [];
  for (const row of rows || []) {
    const startRaw = row?.[startField];
    const endRaw = row?.[endField];
    const start = parseIsoDate(startRaw);
    const end = parseIsoDate(endRaw);
    if (!start || !end) continue;
    let startMs = start.getTime();
    let endMs = end.getTime();
    if (endMs <= startMs) continue;
    if (bufferMs > 0) {
      startMs -= bufferMs;
      endMs += bufferMs;
    }
    intervals.push({ startMs, endMs });
  }
  intervals.sort((a, b) => a.startMs - b.startMs);
  return intervals;
}

function hasOverlap(slotStartMs, slotEndMs, busy) {
  for (const interval of busy) {
    if (interval.startMs >= slotEndMs) return false;
    if (slotStartMs < interval.endMs && slotEndMs > interval.startMs) {
      return true;
    }
  }
  return false;
}

async function resolveTimeFields({ supabase, table, startField, endField }) {
  if (startField && endField) {
    return { startField, endField };
  }

  for (const [candidateStart, candidateEnd] of CANDIDATE_TIME_FIELDS) {
    const { error } = await supabase
      .from(table)
      .select(`${candidateStart},${candidateEnd}`)
      .limit(1);
    if (!error) {
      return { startField: candidateStart, endField: candidateEnd };
    }
    const message = error?.message || '';
    if (error?.code === '42703' || /column/i.test(message) || /does not exist/i.test(message)) {
      continue;
    }
    throw error;
  }

  throw new Error('Unable to detect time columns. Provide start_field and end_field.');
}

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.method === 'GET' ? req.query || {} : parseJsonBody(req);
  if (!body) {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const apiKey =
    req.headers['x-api-key'] ||
    (typeof req.headers.authorization === 'string' &&
      req.headers.authorization.startsWith('Bearer ')
      ? req.headers.authorization.slice('Bearer '.length)
      : null) ||
    body.api_key;
  const requiredKey = process.env.APPOINTMENTS_API_KEY || process.env.INTERNAL_API_KEY;
  if (requiredKey && apiKey !== requiredKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const table = String(body.table || DEFAULT_TABLE).trim() || DEFAULT_TABLE;
  const slotMinutes = Math.max(5, parseNumber(body.slot_minutes, DEFAULT_SLOT_MINUTES));
  const bufferMinutes = Math.max(0, parseNumber(body.buffer_minutes, 0));
  const days = Math.max(1, parseNumber(body.days, DEFAULT_DAYS));
  const limit = Math.min(Math.max(1, parseNumber(body.limit, 20)), MAX_SLOTS);
  const excludeWeekends = parseBool(body.exclude_weekends, true);
  const tzOffsetMinutes = parseNumber(
    body.tz_offset_minutes ?? body.timezone_offset ?? body.tz_offset,
    0
  );

  const workdayStart = parseTime(body.workday_start, DEFAULT_WORKDAY_START);
  const workdayEnd = parseTime(body.workday_end, DEFAULT_WORKDAY_END);
  if (!workdayStart || !workdayEnd) {
    return res.status(400).json({ error: 'Invalid workday_start/workday_end format. Use HH:mm.' });
  }

  const rangeStart = parseIsoDate(body.range_start || body.start) || new Date();
  const rangeEnd =
    parseIsoDate(body.range_end || body.end) ||
    new Date(rangeStart.getTime() + days * 24 * 60 * 60 * 1000);

  if (rangeEnd <= rangeStart) {
    return res.status(400).json({ error: 'range_end must be after range_start.' });
  }
  if (
    workdayEnd.hours < workdayStart.hours ||
    (workdayEnd.hours === workdayStart.hours && workdayEnd.minutes <= workdayStart.minutes)
  ) {
    return res.status(400).json({ error: 'workday_end must be after workday_start.' });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return res.status(500).json({ error: 'Missing Supabase server credentials' });
  }

  let timeFields;
  try {
    timeFields = await resolveTimeFields({
      supabase,
      table,
      startField: body.start_field,
      endField: body.end_field,
    });
  } catch (error) {
    return res.status(400).json({ error: error?.message || 'Invalid time fields' });
  }

  let query = supabase
    .from(table)
    .select(`${timeFields.startField},${timeFields.endField}`)
    .lt(timeFields.startField, rangeEnd.toISOString())
    .gt(timeFields.endField, rangeStart.toISOString());

  const filters = body.filters && typeof body.filters === 'object' ? body.filters : null;
  if (filters) {
    for (const [key, value] of Object.entries(filters)) {
      if (value === undefined || value === null || value === '') continue;
      query = query.eq(key, value);
    }
  }

  const statusField = typeof body.status_field === 'string' ? body.status_field.trim() : '';
  const excludeStatuses = Array.isArray(body.exclude_statuses)
    ? body.exclude_statuses.filter((value) => value !== null && value !== undefined && value !== '')
    : [];
  if (statusField && excludeStatuses.length > 0) {
    for (const status of excludeStatuses) {
      query = query.neq(statusField, status);
    }
  }

  const { data: rows, error } = await query;
  if (error) {
    return res.status(500).json({ error: 'Failed to load appointments', detail: error.message });
  }

  const busy = normalizeBusyIntervals(
    rows,
    timeFields.startField,
    timeFields.endField,
    bufferMinutes * 60 * 1000
  );

  const slots = [];
  const slotMs = slotMinutes * 60 * 1000;
  const offsetMs = tzOffsetMinutes * 60 * 1000;
  const rangeStartMs = rangeStart.getTime();
  const rangeEndMs = rangeEnd.getTime();
  const startCursor = toDayCursor(rangeStart, offsetMs);
  const endCursor = toDayCursor(rangeEnd, offsetMs);

  for (
    let cursor = new Date(startCursor.getTime());
    cursor <= endCursor && slots.length < limit;
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  ) {
    const dayOfWeek = cursor.getUTCDay();
    if (excludeWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
      continue;
    }

    const dayStartLocal = new Date(
      Date.UTC(
        cursor.getUTCFullYear(),
        cursor.getUTCMonth(),
        cursor.getUTCDate(),
        workdayStart.hours,
        workdayStart.minutes,
        0,
        0
      )
    );
    const dayEndLocal = new Date(
      Date.UTC(
        cursor.getUTCFullYear(),
        cursor.getUTCMonth(),
        cursor.getUTCDate(),
        workdayEnd.hours,
        workdayEnd.minutes,
        0,
        0
      )
    );

    const dayStartUtc = new Date(dayStartLocal.getTime() - offsetMs);
    const dayEndUtc = new Date(dayEndLocal.getTime() - offsetMs);
    let slotStartMs = dayStartUtc.getTime();
    const dayEndMs = dayEndUtc.getTime();

    while (slotStartMs + slotMs <= dayEndMs && slots.length < limit) {
      const slotEndMs = slotStartMs + slotMs;
      if (slotEndMs <= rangeStartMs) {
        slotStartMs += slotMs;
        continue;
      }
      if (slotStartMs >= rangeEndMs) {
        break;
      }
      if (slotEndMs > rangeEndMs) {
        break;
      }

      if (!hasOverlap(slotStartMs, slotEndMs, busy)) {
        slots.push({
          start: new Date(slotStartMs).toISOString(),
          end: new Date(slotEndMs).toISOString(),
        });
      }

      slotStartMs += slotMs;
    }
  }

  return res.status(200).json({
    ok: true,
    slots,
    meta: {
      table,
      start_field: timeFields.startField,
      end_field: timeFields.endField,
      range_start: rangeStart.toISOString(),
      range_end: rangeEnd.toISOString(),
      slot_minutes: slotMinutes,
      buffer_minutes: bufferMinutes,
      tz_offset_minutes: tzOffsetMinutes,
      exclude_weekends: excludeWeekends,
      total_busy: busy.length,
      total_slots: slots.length,
    },
  });
}
