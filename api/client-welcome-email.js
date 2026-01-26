import { Resend } from 'resend';

const HTML_ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

const escapeHtml = (value) =>
  String(value || '').replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char] || char);

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
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = parseJsonBody(req);
  if (!body) {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const email = String(body.email || '').trim();
  const fullName = String(body.full_name || body.fullName || '').trim();
  if (!email) {
    return res.status(400).json({ error: 'Missing "email"' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  const notifyTo = process.env.RESEND_NOTIFY_TO;
  const templateId = process.env.RESEND_CLIENT_WELCOME_TEMPLATE_ID;
  const portalUrl = process.env.PORTAL_URL || 'https://www.grupodte.com';

  if (!apiKey || !from) {
    return res.status(500).json({ error: 'Missing Resend configuration' });
  }

  const resend = new Resend(apiKey);

  const safeName = escapeHtml(fullName) || 'Cliente';
  const safeEmail = escapeHtml(email);
  const subject = 'Bienvenido/a a Grupo DTE';

  const html = `
    <div style="background-color:#ffffff;padding:24px;max-width:600px;margin:auto;font-family:Arial,sans-serif;color:#111827;border:1px solid #e5e7eb;border-radius:12px;">
      <h2 style="font-size:20px;font-weight:600;margin:0 0 12px;">Bienvenido/a a Grupo DTE</h2>
      <p style="font-size:14px;margin:8px 0;">Hola ${safeName},</p>
      <p style="font-size:14px;margin:8px 0;">Tu cuenta de cliente ya fue creada en la plataforma.</p>
      <p style="font-size:14px;margin:8px 0;">Ya estas creado como cliente en Grupo DTE.</p>
      <p style="font-size:14px;margin:8px 0;">
        Tus credenciales de acceso son tu cuenta de Google asociada a <strong>${safeEmail}</strong>.
      </p>
      <div style="margin:16px 0;">
        <a href="${portalUrl}" style="display:inline-block;padding:10px 16px;background:#111827;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;">Ingresar al portal</a>
      </div>
      <p style="font-size:12px;color:#6b7280;">Si no reconoces este correo, podes ignorarlo.</p>
    </div>
  `;

  const text = `Bienvenido/a a Grupo DTE\n\nHola ${fullName || 'Cliente'},\nTu cuenta de cliente ya fue creada en la plataforma.\nYa estas creado como cliente en Grupo DTE.\nTus credenciales de acceso son tu cuenta de Google asociada a ${email}.\nIngresar al portal: ${portalUrl}`;

  try {
    const payload = {
      from,
      to: [email],
      subject,
    };

    if (templateId) {
      payload.template = {
        id: templateId,
        variables: {
          CLIENT_NAME: fullName || 'Cliente',
          CLIENT_EMAIL: email,
          PORTAL_URL: portalUrl,
        },
      };
    } else {
      payload.html = html;
      payload.text = text;
    }

    if (notifyTo && notifyTo !== email) {
      payload.bcc = [notifyTo];
    }

    if (templateId) {
      const { data, error, status } = await sendViaResendApi({ apiKey, payload });
      if (error) {
        console.error('Resend error:', error);
        return res.status(status || 500).json({ error: 'Failed to send email' });
      }
      return res.status(200).json({ ok: true, id: data?.id });
    }

    const { data, error } = await resend.emails.send(payload);

    if (error) {
      console.error('Resend error:', error);
      return res.status(500).json({ error: 'Failed to send email' });
    }

    return res.status(200).json({ ok: true, id: data?.id });
  } catch (error) {
    console.error('Resend exception:', error);
    return res.status(500).json({ error: 'Failed to send email' });
  }
}
