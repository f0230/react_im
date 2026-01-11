import axios from 'axios';
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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = parseJsonBody(req);
  if (!body) {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  // Added type, url, caption to destructuring
  const { to, text, template, preview_url, type, url, caption } = body;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const apiVersion = process.env.WHATSAPP_API_VERSION || 'v18.0';

  if (!phoneNumberId || !accessToken) {
    return res.status(500).json({
      error: 'Missing WhatsApp API credentials',
    });
  }

  if (!to) {
    return res.status(400).json({ error: 'Missing "to" phone number' });
  }

  // Validation: either text, template, or media type with url
  if (!text && !template && !(type && url)) {
    return res.status(400).json({ error: 'Provide "text", "template", or "type" matching with "url"' });
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
  } else if (type && ['image', 'video', 'audio', 'document'].includes(type) && url) {
    // Handle Media Messages
    payload.type = type;
    payload[type] = {
      link: url,
    };
    if (caption && type !== 'audio') {
      payload[type].caption = caption;
    }
    // For documents, it's good practice to send a filename, but we'll skip for simplicity unless passed
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
        bodyContent = url; // Store the URL as the body for media
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
