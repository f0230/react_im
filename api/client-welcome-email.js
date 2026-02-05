const parseJsonBody = (req) => {
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
};

const sendViaResendApi = async ({ apiKey, payload }) => {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { error: data, status: response.status };
  }

  return { data };
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'common.errors.methodNotAllowed' });
  }

  const body = parseJsonBody(req);
  if (!body) {
    return res.status(400).json({ error: 'common.errors.invalidJson' });
  }

  const email = String(body.email || '').trim();
  const fullName = String(body.full_name || body.fullName || '').trim();
  if (!email) {
    return res.status(400).json({ error: 'common.errors.missingEmail' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  const notifyTo = process.env.RESEND_NOTIFY_TO;
  const templateId = process.env.RESEND_CLIENT_WELCOME_TEMPLATE_ID;
  const portalUrl = process.env.PORTAL_URL || 'https://www.grupodte.com';

  if (!apiKey || !from) {
    return res.status(500).json({ error: 'common.errors.missingResendConfig' });
  }

  const subject = 'Bienvenido/a a Grupo DTE';

  if (!templateId) {
    return res.status(500).json({ error: 'Missing RESEND_CLIENT_WELCOME_TEMPLATE_ID' });
  }

  try {
    const payload = {
      from,
      to: [email],
      subject,
    };

    payload.template = {
      id: templateId,
      variables: {
        CLIENT_NAME: fullName || 'Cliente',
        CLIENT_EMAIL: email,
        PORTAL_URL: portalUrl,
      },
    };

    if (notifyTo && notifyTo !== email) {
      payload.bcc = [notifyTo];
    }

    const { data, error, status } = await sendViaResendApi({ apiKey, payload });
    if (error) {
      console.error('Resend error:', error);
      return res.status(status || 500).json({ error: 'common.errors.failedToSendEmail' });
    }
    return res.status(200).json({ ok: true, id: data?.id });
  } catch (error) {
    console.error('Resend exception:', error);
    return res.status(500).json({ error: 'common.errors.failedToSendEmail' });
  }
}
