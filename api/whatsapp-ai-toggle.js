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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = parseJsonBody(req);
  if (!body) {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const { wa_id, ai_enabled, client_id, thread_id } = body;
  if (!wa_id) {
    return res.status(400).json({ error: 'Missing wa_id' });
  }

  await forwardToN8n({
    event: 'ai_bot_toggle',
    wa_id,
    client_id: client_id || null,
    thread_id: thread_id || null,
    ai_enabled: Boolean(ai_enabled),
    timestamp: new Date().toISOString(),
  });

  return res.status(200).json({ ok: true });
}
