import axios from 'axios';
import { getSupabaseAdmin } from '../server/utils/supabaseServer.js';

function normalizeBinaryData(data) {
  if (!data) return null;

  // Data URI format: data:audio/ogg;base64,AAAA
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
    } catch (error) {
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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'common.errors.methodNotAllowed' });
  }

  const body = parseJsonBody(req);
  if (!body) {
    return res.status(400).json({ error: 'common.errors.invalidJson' });
  }

  // Added type, url, caption, data to destructuring
  const { to, text, template, preview_url, type, url, caption, data, mime_type, mimeType, filename } = body;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const apiVersion = process.env.WHATSAPP_API_VERSION || 'v18.0';

  if (!phoneNumberId || !accessToken) {
    return res.status(500).json({
      error: 'common.errors.missingCredentials',
    });
  }

  if (!to) {
    return res.status(400).json({ error: 'Missing "to" phone number' });
  }

  if (data && !type) {
    return res.status(400).json({ error: 'Provide "type" when sending media data' });
  }

  // Validation: either text, template, or media type with url/data
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
    // Handle Media Messages (URL or binary data)
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
      payload[type] = {
        link: url,
      };
      if (caption && type !== 'audio') {
        payload[type].caption = caption;
      }
    } else {
      return res.status(400).json({ error: 'Provide "url" or valid "data" for media' });
    }
  } else {
    // Default to Text
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
      // Determine what to store as 'body' or preview
      let bodyContent = text;
      if (payload.type !== 'text' && payload.type !== 'template') {
        if (payload?.[payload.type]?.id) {
          bodyContent = `media:${payload[payload.type].id}`;
        } else {
          bodyContent = url; // Store the URL as the body for media
        }
        if (caption) bodyContent += `|${caption}`; // Naive way to store caption if needed, or just store URL
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

    return res.status(200).json({
      ok: true,
      message_id: messageId,
      result: response.data,
    });
  } catch (error) {
    console.error('WhatsApp send error:', error.response?.data || error.message);
    return res.status(500).json({
      error: 'Failed to send WhatsApp message',
      detail: error.response?.data || error.message,
    });
  }
}
