/**
 * Agent Buffer Handler
 *
 * Called by a Supabase Database Webhook on every team_messages INSERT.
 * Appends the new message to agent_context.message_buffer for the channel
 * and returns trigger metadata so the caller (n8n or direct webhook) knows
 * whether to immediately invoke the Hermes agent.
 *
 * Auth: Bearer AGENT_SECRET
 */

import { getSupabaseAdmin } from '../../utils/supabaseServer.js';
import { validateAgentSecret } from './auth.js';

const MAX_BUFFER_SIZE = 60;

// Keywords that suggest the agent should pay attention.
// Ordered by priority — first match wins for urgency classification.
const KEYWORD_RULES = [
  { pattern: /@dte/i,                                          type: 'mention',  urgency: 'high' },
  { pattern: /urgente|urgent|asap|ya mismo/i,                  type: 'keyword',  urgency: 'high' },
  { pattern: /bloqueado|bloquer|bloqueada|atascado/i,          type: 'keyword',  urgency: 'high' },
  { pattern: /quién hace|quien hace|quién puede|quien puede/i, type: 'keyword',  urgency: 'high' },
  { pattern: /\?\s*$/m,                                        type: 'question', urgency: 'medium' },
  { pattern: /deadline|fecha límite|vence el|entrega el/i,     type: 'keyword',  urgency: 'medium' },
  { pattern: /recordatorio|reminder|no te olvides/i,           type: 'keyword',  urgency: 'medium' },
  { pattern: /ayuda|necesito|help me/i,                        type: 'keyword',  urgency: 'low' },
  { pattern: /qué hay|que hay|qué está|que esta|cómo va|como va/i, type: 'question', urgency: 'low' },
];

function parseBody(req) {
  if (!req.body) return null;
  if (typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body); } catch { return null; }
}

function isAgentMessage(record) {
  const agentName = (process.env.AGENT_DISPLAY_NAME || 'dte').toLowerCase();
  const name = (record.author_name || '').toLowerCase();
  // Block bot's own messages from entering the buffer
  return name === agentName || name === '@dte' || name === 'mike' || name === 'clawbot';
}

function detectTriggers(body) {
  const triggers = [];
  for (const rule of KEYWORD_RULES) {
    if (rule.pattern.test(body)) {
      triggers.push({ type: rule.type, urgency: rule.urgency, pattern: rule.pattern.source });
    }
  }
  return triggers;
}

function buildBufferEntry(record) {
  return {
    id:           record.id,
    author_id:    record.author_id,
    author_name:  record.author_name || 'Equipo',
    body:         (record.body || '').slice(0, 1000),
    message_type: record.message_type || 'text',
    file_name:    record.file_name || null,
    created_at:   record.created_at || new Date().toISOString(),
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = validateAgentSecret(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  const body = parseBody(req);
  if (!body) return res.status(400).json({ error: 'Invalid JSON body' });

  // Support both Supabase webhook format { type, table, record } and direct { ...record }
  const record = body.record ?? body;

  if (!record?.channel_id) {
    return res.status(400).json({ error: 'Missing channel_id in payload' });
  }

  // Skip messages posted by the agent itself to avoid feedback loops
  if (isAgentMessage(record)) {
    return res.status(200).json({ ok: true, skipped: true, reason: 'agent_own_message' });
  }

  // Skip non-text messages with no body (file-only, system events)
  if (!record.body && record.message_type !== 'audio') {
    return res.status(200).json({ ok: true, skipped: true, reason: 'empty_body' });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return res.status(500).json({ error: 'Supabase admin not configured' });

  const triggers = detectTriggers(record.body || '');
  const hasMention = triggers.some(t => t.type === 'mention');
  const highestUrgency = triggers.find(t => t.urgency === 'high')
    ? 'high'
    : triggers.find(t => t.urgency === 'medium')
    ? 'medium'
    : triggers.length > 0 ? 'low' : null;

  // Fetch current buffer state
  const { data: current } = await supabase
    .from('agent_context')
    .select('message_buffer, message_count_since_response')
    .eq('channel_id', record.channel_id)
    .maybeSingle();

  const prevBuffer = Array.isArray(current?.message_buffer) ? current.message_buffer : [];
  const newBuffer  = [...prevBuffer, buildBufferEntry(record)].slice(-MAX_BUFFER_SIZE);
  const newCount   = (current?.message_count_since_response ?? 0) + 1;

  const { error: upsertError } = await supabase
    .from('agent_context')
    .upsert(
      {
        channel_id:                   record.channel_id,
        message_buffer:               newBuffer,
        message_count_since_response: newCount,
        last_message_at:              record.created_at || new Date().toISOString(),
        updated_at:                   new Date().toISOString(),
      },
      { onConflict: 'channel_id' }
    );

  if (upsertError) {
    console.error('[agent/buffer] upsert error:', upsertError);
    return res.status(500).json({ error: upsertError.message });
  }

  return res.status(200).json({
    ok:                    true,
    channel_id:            record.channel_id,
    buffer_size:           newBuffer.length,
    message_count:         newCount,
    triggers,
    urgency:               highestUrgency,
    // true = caller should invoke the Hermes agent NOW (mention or high urgency)
    invoke_agent_now:      hasMention || highestUrgency === 'high',
  });
}
