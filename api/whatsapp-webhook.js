import crypto from 'crypto';
import { getSupabaseAdmin } from './utils/supabaseServer.js';

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

export default async function handler(req, res) {
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
        await supabase
          .from('whatsapp_messages')
          .upsert(messageRows, { onConflict: 'message_id' });
      }

      const threadRows = Array.from(threadUpserts.values());
      if (threadRows.length > 0) {
        await supabase
          .from('whatsapp_threads')
          .upsert(threadRows, { onConflict: 'wa_id' });
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
