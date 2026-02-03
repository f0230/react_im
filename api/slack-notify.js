import { getSupabaseAdmin } from '../server/utils/supabaseServer.js';

const MAX_PREVIEW_LENGTH = 220;

function truncate(text) {
  if (!text) return '';
  const normalized = String(text).replace(/\s+/g, ' ').trim();
  if (normalized.length <= MAX_PREVIEW_LENGTH) return normalized;
  return `${normalized.slice(0, MAX_PREVIEW_LENGTH - 1)}…`;
}

async function enrichWithSupabase({ table, record }) {
  const supabase = getSupabaseAdmin();
  if (!supabase || !record) return {};

  try {
    if (table === 'team_channels' && record.created_by) {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', record.created_by)
        .maybeSingle();
      if (data) {
        return { created_by_name: data.full_name || data.email || record.created_by };
      }
    }

    if (table === 'team_channel_members') {
      const [channelRes, memberRes, addedByRes] = await Promise.all([
        supabase
          .from('team_channels')
          .select('name, slug')
          .eq('id', record.channel_id)
          .maybeSingle(),
        supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', record.member_id)
          .maybeSingle(),
        record.added_by
          ? supabase
              .from('profiles')
              .select('full_name, email')
              .eq('id', record.added_by)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      return {
        channel_name: channelRes?.data?.name,
        channel_slug: channelRes?.data?.slug,
        member_name: memberRes?.data?.full_name || memberRes?.data?.email,
        added_by_name: addedByRes?.data?.full_name || addedByRes?.data?.email,
      };
    }

    if (table === 'team_messages') {
      const [channelRes, authorRes] = await Promise.all([
        supabase
          .from('team_channels')
          .select('name, slug')
          .eq('id', record.channel_id)
          .maybeSingle(),
        supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', record.author_id)
          .maybeSingle(),
      ]);

      return {
        channel_name: channelRes?.data?.name,
        channel_slug: channelRes?.data?.slug,
        author_name: record.author_name || authorRes?.data?.full_name || authorRes?.data?.email,
      };
    }
  } catch (error) {
    console.warn('Slack notify enrichment failed:', error);
  }

  return {};
}

function formatSlackMessage({ event, table, record, enrich }) {
  if (table === 'team_channels' && event === 'INSERT') {
    const name = record?.name || record?.slug || record?.id || 'Canal';
    const creator = enrich?.created_by_name || record?.created_by || 'desconocido';
    return `🆕 Canal creado: ${name} (creado por ${creator}).`;
  }

  if (table === 'team_channel_members' && event === 'INSERT') {
    const channelLabel = enrich?.channel_name || record?.channel_id || 'Canal';
    const memberLabel = enrich?.member_name || record?.member_id || 'miembro';
    const addedBy = enrich?.added_by_name || record?.added_by;
    const addedByText = addedBy ? ` (agregado por ${addedBy})` : '';
    return `👤 Nuevo miembro en ${channelLabel}: ${memberLabel}${addedByText}.`;
  }

  if (table === 'team_messages' && event === 'INSERT') {
    const channelLabel = enrich?.channel_name || record?.channel_id || 'Canal';
    const authorLabel = enrich?.author_name || record?.author_id || 'Equipo';
    const preview = truncate(record?.body || record?.file_name || record?.media_url || '');
    return `💬 Mensaje en ${channelLabel} de ${authorLabel}: ${preview || '[sin texto]'}.`;
  }

  if (table === 'whatsapp_messages' && event === 'INSERT') {
    const direction = record?.direction || 'message';
    if (direction !== 'inbound') {
      return null;
    }
    const waId = record?.wa_id || 'contacto';
    const preview = truncate(record?.body || record?.type || record?.message_id || '');
    return `📲 WhatsApp (${direction}) de ${waId}: ${preview || '[sin texto]'}.`;
  }

  return `🔔 Evento ${event} en ${table}.`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = process.env.SLACK_NOTIFY_SECRET;
  if (secret) {
    const incoming = req.headers['x-slack-notify-secret'];
    if (!incoming || incoming !== secret) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const token = process.env.SLACK_BOT_TOKEN;
  const channel = process.env.SLACK_CHANNEL_ID;

  if (!token || !channel) {
    return res.status(500).json({ error: 'Slack credentials missing' });
  }

  const payload = typeof req.body === 'object' ? req.body : null;
  if (!payload || !payload.table || !payload.event) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  const enrich = await enrichWithSupabase({ table: payload.table, record: payload.record });
  const text = formatSlackMessage({
    event: payload.event,
    table: payload.table,
    record: payload.record,
    enrich,
  });
  if (!text) {
    return res.status(200).json({ ok: true, skipped: true });
  }

  try {
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({
        channel,
        text,
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) {
      console.error('Slack API error:', response.status, data);
      return res.status(502).json({ error: 'Slack API error', detail: data });
    }

    return res.status(200).json({ ok: true, ts: data.ts });
  } catch (error) {
    console.error('Slack notify error:', error);
    return res.status(500).json({ error: 'Failed to notify Slack' });
  }
}
