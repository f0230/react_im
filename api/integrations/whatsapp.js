import axios from 'axios';
import crypto from 'crypto';
import { getSupabaseAdmin } from '../server/utils/supabaseServer.js';

function parseJsonBody(req) {
  if (!req.body) return null;
  if (typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return null;
    }
  }
  return null;
}

function normalizeAction(value) {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return '';
  if (['send', 'message', 'outbound'].includes(text)) return 'send';
  if (['webhook', 'verify', 'inbound', 'events'].includes(text)) return 'webhook';
  if (['ai-toggle', 'ai_toggle', 'toggle-ai', 'toggle'].includes(text)) return 'ai-toggle';
  return text;
}

function inferActionFromBody(body, fallback = 'send') {
  if (!body || typeof body !== 'object') return fallback;

  if (body.object === 'whatsapp_business_account' || Array.isArray(body.entry)) {
    return 'webhook';
  }

  const hasThreadIdentity = Boolean(body.wa_id || body.thread_id);
  const hasTogglePayload = Object.prototype.hasOwnProperty.call(body, 'ai_enabled') || typeof body.action === 'string';
  if (hasThreadIdentity && hasTogglePayload) {
    return 'ai-toggle';
  }

  return fallback;
}

function resolveAction(req) {
  const queryAction = normalizeAction(req?.query?.action);
  if (queryAction) return queryAction;

  if (req.method === 'GET') {
    return 'webhook';
  }

  const body = parseJsonBody(req);
  return inferActionFromBody(body, 'send');
}

function normalizeBinaryData(data) {
  if (!data) return null;

  if (typeof data === 'string') {
    let mimeType = null;
    let base64 = data;
    if (data.startsWith('data:')) {
      const match = data.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        base64 = match[2];
      }
    }
    try {
      const buffer = Buffer.from(base64, 'base64');
      if (!buffer.length) return null;
      return { buffer, mimeType };
    } catch {
      return null;
    }
  }

  if (Array.isArray(data)) {
    const buffer = Buffer.from(Uint8Array.from(data));
    if (!buffer.length) return null;
    return { buffer, mimeType: null };
  }

  if (data?.type === 'Buffer' && Array.isArray(data?.data)) {
    const buffer = Buffer.from(data.data);
    if (!buffer.length) return null;
    return { buffer, mimeType: null };
  }

  if (data instanceof ArrayBuffer) {
    const buffer = Buffer.from(data);
    if (!buffer.length) return null;
    return { buffer, mimeType: null };
  }

  if (data instanceof Uint8Array) {
    const buffer = Buffer.from(data);
    if (!buffer.length) return null;
    return { buffer, mimeType: null };
  }

  return null;
}

function buildDefaultFilename(type, mimeType) {
  if (mimeType) {
    const extension = mimeType.split('/')[1];
    if (extension) return `${type || 'file'}.${extension}`;
  }
  return `${type || 'file'}.bin`;
}

async function uploadWhatsAppMedia({ buffer, mimeType, filename, phoneNumberId, accessToken, apiVersion }) {
  const formData = new FormData();
  const blob = new Blob([buffer], { type: mimeType });

  formData.append('messaging_product', 'whatsapp');
  formData.append('file', blob, filename);
  formData.append('type', mimeType);

  const response = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/media`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });

  const result = await response.json();
  if (!response.ok) {
    const message = result?.error?.message || 'Failed to upload media';
    const error = new Error(message);
    error.details = result;
    throw error;
  }

  return result?.id || null;
}

async function handleSend(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'common.errors.methodNotAllowed' });
  }

  const body = parseJsonBody(req);
  if (!body) {
    return res.status(400).json({ error: 'common.errors.invalidJson' });
  }

  const { to, text, template, preview_url, type, url, caption, data, mime_type, mimeType, filename } = body;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const apiVersion = process.env.WHATSAPP_API_VERSION || 'v18.0';

  if (!phoneNumberId || !accessToken) {
    return res.status(500).json({ error: 'common.errors.missingCredentials' });
  }

  if (!to) {
    return res.status(400).json({ error: 'Missing "to" phone number' });
  }

  if (data && !type) {
    return res.status(400).json({ error: 'Provide "type" when sending media data' });
  }

  if (!text && !template && !(type && (url || data))) {
    return res.status(400).json({ error: 'Provide "text", "template", or "type" with "url" or "data"' });
  }

  const payload = {
    messaging_product: 'whatsapp',
    to,
  };

  if (template) {
    if (!template.name) {
      return res.status(400).json({ error: 'Template name is required' });
    }

    payload.type = 'template';
    payload.template = {
      name: template.name,
      language: {
        code: template.language || 'es',
      },
      components: template.components || [],
    };
  } else if (type && ['image', 'video', 'audio', 'document'].includes(type) && (url || data)) {
    payload.type = type;

    let mediaId = null;
    if (data) {
      const normalized = normalizeBinaryData(data);
      if (!normalized?.buffer) {
        return res.status(400).json({ error: 'Invalid "data" payload for media upload' });
      }

      const resolvedMimeType = mimeType || mime_type || normalized.mimeType;
      if (!resolvedMimeType) {
        return res.status(400).json({ error: 'Missing "mime_type" for media upload' });
      }

      try {
        mediaId = await uploadWhatsAppMedia({
          buffer: normalized.buffer,
          mimeType: resolvedMimeType,
          filename: filename || buildDefaultFilename(type, resolvedMimeType),
          phoneNumberId,
          accessToken,
          apiVersion,
        });
      } catch (error) {
        console.error('WhatsApp media upload error:', error.details || error.message);
        return res.status(500).json({
          error: 'Failed to upload WhatsApp media',
          detail: error.details || error.message,
        });
      }
    }

    if (mediaId) {
      payload[type] = { id: mediaId };
    } else if (url) {
      payload[type] = { link: url };
      if (caption && type !== 'audio') {
        payload[type].caption = caption;
      }
    } else {
      return res.status(400).json({ error: 'Provide "url" or valid "data" for media' });
    }
  } else {
    payload.type = 'text';
    payload.text = {
      body: text,
      preview_url: Boolean(preview_url),
    };
  }

  try {
    const response = await axios.post(
      `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const messageId = response?.data?.messages?.[0]?.id || null;
    const now = new Date().toISOString();
    const supabase = getSupabaseAdmin();

    if (supabase) {
      let bodyContent = text;
      if (payload.type !== 'text' && payload.type !== 'template') {
        if (payload?.[payload.type]?.id) {
          bodyContent = `media:${payload[payload.type].id}`;
        } else {
          bodyContent = url;
        }
        if (caption) bodyContent += `|${caption}`;
      }

      const preview = bodyContent || `template:${template?.name || 'unknown'}`;

      await supabase.from('whatsapp_messages').insert([
        {
          wa_id: to,
          direction: 'outbound',
          message_id: messageId,
          type: payload.type,
          body: bodyContent || null,
          timestamp: now,
          raw: { request: payload, response: response.data },
          status: 'sent',
          status_timestamp: now,
        },
      ]);

      await supabase.from('whatsapp_threads').upsert(
        [
          {
            wa_id: to,
            client_phone: to,
            last_message: preview,
            last_message_at: now,
          },
        ],
        { onConflict: 'wa_id' }
      );
    }

    return res.status(200).json({ ok: true, data: response.data });
  } catch (error) {
    console.error('WhatsApp send error:', error.response?.data || error.message);
    return res.status(500).json({
      error: 'Failed to send WhatsApp message',
      detail: error.response?.data || error.message,
    });
  }
}

function toIsoTimestamp(secondsString) {
  if (!secondsString) return null;
  const ms = Number(secondsString) * 1000;
  if (Number.isNaN(ms)) return null;
  return new Date(ms).toISOString();
}

function getMessageBody(message) {
  if (message?.text?.body) return message.text.body;
  if (message?.image?.caption) return message.image.caption;
  if (message?.document?.caption) return message.document.caption;
  if (message?.video?.caption) return message.video.caption;
  if (message?.audio) return null;
  return null;
}

function getMessagePreview(message) {
  const body = getMessageBody(message);
  if (body) return body;
  if (message?.type) return `[${message.type}]`;
  return '[message]';
}

function isSignatureValid(req, rawBody) {
  const appSecret = process.env.META_APP_SECRET;
  const signatureHeader = req.headers['x-hub-signature-256'];

  if (!appSecret || !signatureHeader || !rawBody) {
    return true;
  }

  const expected = `sha256=${crypto
    .createHmac('sha256', appSecret)
    .update(rawBody, 'utf8')
    .digest('hex')}`;

  if (expected.length !== signatureHeader.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(expected, 'utf8'),
    Buffer.from(signatureHeader, 'utf8')
  );
}

async function forwardToN8n(payload, source) {
  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Source': source,
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

async function handleWebhook(req, res) {
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

    if (mode === 'subscribe' && token && token === verifyToken) {
      return res.status(200).send(challenge);
    }

    return res.status(403).send('Forbidden');
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rawBody = typeof req.body === 'string' ? req.body : null;
  const body = parseJsonBody(req);

  if (!body) {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  if (!isSignatureValid(req, rawBody)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  if (body.object !== 'whatsapp_business_account') {
    return res.status(200).send('IGNORED');
  }

  await forwardToN8n(body, 'grupodte-whatsapp');

  const supabase = getSupabaseAdmin();
  const entries = Array.isArray(body.entry) ? body.entry : [];
  const messageRows = [];
  const statusUpdates = [];
  const threadUpserts = new Map();

  for (const entry of entries) {
    const changes = Array.isArray(entry.changes) ? entry.changes : [];

    for (const change of changes) {
      const value = change?.value || {};
      const messages = Array.isArray(value.messages) ? value.messages : [];
      const statuses = Array.isArray(value.statuses) ? value.statuses : [];
      const contacts = Array.isArray(value.contacts) ? value.contacts : [];
      const contactMap = new Map(contacts.map((contact) => [contact.wa_id, contact]));

      for (const message of messages) {
        const waId = message?.from || message?.wa_id;
        const contact = waId ? contactMap.get(waId) : null;
        const clientName = contact?.profile?.name || null;
        const preview = getMessagePreview(message);
        const timestamp = toIsoTimestamp(message?.timestamp);

        if (waId) {
          messageRows.push({
            wa_id: waId,
            direction: 'inbound',
            message_id: message?.id || null,
            type: message?.type || null,
            body: getMessageBody(message),
            timestamp,
            raw: message,
          });

          threadUpserts.set(waId, {
            wa_id: waId,
            client_name: clientName,
            client_phone: waId,
            last_message: preview,
            last_message_at: timestamp,
          });
        }
      }

      for (const status of statuses) {
        statusUpdates.push({
          id: status?.id,
          status: status?.status || null,
          status_timestamp: toIsoTimestamp(status?.timestamp),
        });
      }
    }
  }

  if (supabase) {
    try {
      if (messageRows.length > 0) {
        await supabase.from('whatsapp_messages').upsert(messageRows, { onConflict: 'message_id' });
      }

      const threadRows = Array.from(threadUpserts.values());
      if (threadRows.length > 0) {
        await supabase.from('whatsapp_threads').upsert(threadRows, { onConflict: 'wa_id' });
      }

      for (const update of statusUpdates) {
        if (!update.id) continue;
        await supabase
          .from('whatsapp_messages')
          .update({
            status: update.status,
            status_timestamp: update.status_timestamp,
          })
          .eq('message_id', update.id);
      }
    } catch (error) {
      console.error('WhatsApp webhook DB error:', error);
    }
  }

  return res.status(200).send('EVENT_RECEIVED');
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

async function handleAiToggle(req, res) {
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

  await forwardToN8n(
    {
      event: 'ai_bot_toggle',
      wa_id,
      client_id: client_id || null,
      thread_id: thread_id || null,
      ai_enabled: nextValue,
      source: source || 'api',
      reason: reason || null,
      timestamp: new Date().toISOString(),
    },
    'grupodte-inbox'
  );

  return res.status(200).json({
    ok: true,
    ai_enabled: nextValue,
    db_updated: dbResult.ok === true,
  });
}

export default async function handler(req, res) {
  const action = resolveAction(req);

  if (action === 'send') {
    return handleSend(req, res);
  }

  if (action === 'ai-toggle') {
    return handleAiToggle(req, res);
  }

  return handleWebhook(req, res);
}
