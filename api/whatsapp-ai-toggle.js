import { getSupabaseAdmin } from '../server/utils/supabaseServer.js';

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

function parseToggleValue(value, action) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on', 'enable', 'enabled'].includes(normalized)) return true;
    if (['false', '0', 'no', 'off', 'disable', 'disabled'].includes(normalized)) return false;
  }
  if (typeof action === 'string') {
    const normalizedAction = action.trim().toLowerCase();
    if (['disable', 'off', 'deactivate'].includes(normalizedAction)) return false;
    if (['enable', 'on', 'activate'].includes(normalizedAction)) return true;
  }
  return null;
}

async function forwardToN8n(payload) {
  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Source': 'grupodte-inbox',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      console.error('n8n webhook error:', response.status, text);
    }
  } catch (error) {
    console.error('n8n webhook error:', error);
  }
}

async function updateThreadAiEnabled({ wa_id, thread_id, ai_enabled }) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, reason: 'missing_supabase' };

  let query = supabase.from('whatsapp_threads').update({ ai_enabled: Boolean(ai_enabled) });
  if (thread_id) {
    query = query.eq('id', thread_id);
  } else {
    query = query.eq('wa_id', wa_id);
  }

  const { data, error } = await query.select().single();
  if (error) {
    console.error('AI toggle DB error:', error);
    return { ok: false, error };
  }

  return { ok: true, data };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = parseJsonBody(req);
  if (!body) {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const { wa_id, ai_enabled, client_id, thread_id, action, source, reason } = body;
  if (!wa_id) {
    return res.status(400).json({ error: 'Missing wa_id' });
  }

  const nextValue = parseToggleValue(ai_enabled, action);
  if (nextValue === null) {
    return res.status(400).json({ error: 'Missing or invalid ai_enabled/action' });
  }

  const dbResult = await updateThreadAiEnabled({
    wa_id,
    thread_id: thread_id || null,
    ai_enabled: nextValue,
  });

  await forwardToN8n({
    event: 'ai_bot_toggle',
    wa_id,
    client_id: client_id || null,
    thread_id: thread_id || null,
    ai_enabled: nextValue,
    source: source || 'api',
    reason: reason || null,
    timestamp: new Date().toISOString(),
  });

  return res.status(200).json({
    ok: true,
    ai_enabled: nextValue,
    db_updated: dbResult.ok === true,
  });
}
