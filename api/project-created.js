import {
  handleReportsAiContext,
  handleReportsIngest,
} from '../server/services/reportsPipeline.js';

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

function getQueryParam(req, key) {
  if (req.query && Object.prototype.hasOwnProperty.call(req.query, key)) {
    return req.query[key];
  }
  try {
    const url = new URL(req.url, 'http://localhost');
    return url.searchParams.get(key);
  } catch {
    return null;
  }
}

function resolveAction(req) {
  return String(getQueryParam(req, 'action') || '').trim();
}

async function forwardToN8n(payload) {
  const webhookUrl = process.env.N8N_WEBHOOK_URL_2;
  if (!webhookUrl) return;

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Source': 'grupodte-projects',
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
  const action = resolveAction(req);

  if (action === 'reports-ai-context') {
    return handleReportsAiContext(req, res);
  }

  if (action === 'reports-ingest' || action === 'reports-ocr-summary') {
    return handleReportsIngest(req, res);
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'common.errors.methodNotAllowed' });
  }

  const body = parseJsonBody(req);
  if (!body) {
    return res.status(400).json({ error: 'common.errors.invalidJson' });
  }

  const payload = {
    event: body.event || 'project_created',
    project: body.project || body.data || null,
    client: body.client || null,
    actor: body.actor || null,
    source: body.source || 'project_created',
    meta: body.meta || null,
    timestamp: body.timestamp || new Date().toISOString(),
  };

  await forwardToN8n(payload);

  return res.status(200).json({ ok: true });
}
