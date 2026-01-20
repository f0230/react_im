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
  const phone = String(body.phone || '').trim();

  if (!email) {
    return res.status(400).json({ error: 'Missing "email"' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  const notifyTo = process.env.RESEND_NOTIFY_TO;

  if (!apiKey || !from) {
    return res.status(500).json({ error: 'Missing Resend configuration' });
  }

  const resend = new Resend(apiKey);

  const safeName = escapeHtml(fullName) || 'Cliente';
  const safeEmail = escapeHtml(email);
  const safePhone = escapeHtml(phone || '-');

  const subject = 'Perfil completado';
  const html = `
    <div style="background-color:#ffffff;padding:24px;max-width:600px;margin:auto;font-family:Arial,sans-serif;color:#111827;border:1px solid #e5e7eb;border-radius:12px;">
      <h2 style="font-size:20px;font-weight:600;margin:0 0 12px;">Perfil completado</h2>
      <p style="font-size:14px;margin:8px 0;"><strong>Nombre:</strong> ${safeName}</p>
      <p style="font-size:14px;margin:8px 0;"><strong>Email:</strong> ${safeEmail}</p>
      <p style="font-size:14px;margin:8px 0;"><strong>Telefono:</strong> ${safePhone}</p>
      <hr style="margin:16px 0;border:none;border-top:1px solid #e5e7eb;" />
      <p style="font-size:12px;color:#6b7280;">Este mensaje fue generado automaticamente por la plataforma.</p>
    </div>
  `;
  const text = `Perfil completado\nNombre: ${fullName || 'Cliente'}\nEmail: ${email}\nTelefono: ${phone || '-'}`;

  try {
    const payload = {
      from,
      to: [email],
      subject,
      html,
      text,
    };

    if (notifyTo && notifyTo !== email) {
      payload.bcc = [notifyTo];
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
