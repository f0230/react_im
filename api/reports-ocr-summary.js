import { getSupabaseAdmin } from '../server/utils/supabaseServer.js';

function getTokenFromRequest(req) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return null;
  return auth.slice(7).trim() || null;
}

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

function sanitizeText(value, fallback = '') {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function toNullableNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const normalized = String(value).replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeDate(value) {
  const text = sanitizeText(value);
  if (!text) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function extractJsonObject(rawText) {
  const direct = sanitizeText(rawText);
  if (!direct) return null;

  try {
    return JSON.parse(direct);
  } catch {
    // continue
  }

  const start = direct.indexOf('{');
  const end = direct.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;

  try {
    return JSON.parse(direct.slice(start, end + 1));
  } catch {
    return null;
  }
}

function extractOcrText(payload) {
  const pages = payload?.pages || payload?.data?.pages;
  if (Array.isArray(pages)) {
    const joined = pages
      .map((page) => sanitizeText(page?.markdown) || sanitizeText(page?.text) || '')
      .filter(Boolean)
      .join('\n\n');
    if (joined) return joined;
  }

  return (
    sanitizeText(payload?.output_text)
    || sanitizeText(payload?.text)
    || sanitizeText(payload?.content)
    || ''
  );
}

function getProjectTitle(project) {
  return (
    sanitizeText(project?.title)
    || sanitizeText(project?.name)
    || sanitizeText(project?.project_name)
    || 'Proyecto'
  );
}

function buildAiContextText({
  projectTitle,
  periodStart,
  periodEnd,
  metrics,
  summary,
}) {
  const lines = [];
  lines.push(`Proyecto: ${projectTitle}`);
  lines.push(`Periodo: ${periodStart} a ${periodEnd}`);
  lines.push('Metricas extraidas:');
  lines.push(`- Reach: ${metrics.reach ?? 'N/D'}`);
  lines.push(`- Impresiones: ${metrics.impressions ?? 'N/D'}`);
  lines.push(`- Clicks: ${metrics.clicks ?? 'N/D'}`);
  lines.push(`- Spend: ${metrics.spend ?? 'N/D'}`);
  lines.push(`- Leads: ${metrics.leads ?? 'N/D'}`);
  lines.push(`Resumen IA: ${summary || 'Sin resumen.'}`);
  return lines.join('\n');
}

async function callMistralOcr(pdfUrl) {
  const apiKey = sanitizeText(process.env.MISTRAL_API_KEY);
  if (!apiKey) {
    throw new Error('Missing MISTRAL_API_KEY');
  }

  const model = sanitizeText(process.env.MISTRAL_OCR_MODEL, 'mistral-ocr-latest');
  const response = await fetch('https://api.mistral.ai/v1/ocr', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      document: {
        type: 'document_url',
        document_url: pdfUrl,
      },
      include_image_base64: false,
    }),
  });

  const raw = await response.text();
  let payload = {};
  try {
    payload = JSON.parse(raw);
  } catch {
    payload = {};
  }

  if (!response.ok) {
    const detail = sanitizeText(raw).slice(0, 280);
    throw new Error(`Mistral OCR failed (${response.status}): ${detail || 'unknown error'}`);
  }

  const text = extractOcrText(payload);
  if (!text) {
    throw new Error('Mistral OCR returned empty text');
  }

  return text;
}

async function callOpenAiReportParser({ ocrText, projectTitle }) {
  const apiKey = sanitizeText(process.env.OPENAI_API_KEY);
  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY');
  }

  const model = sanitizeText(process.env.OPENAI_REPORTS_MODEL, 'gpt-4o-mini');
  const ocrTrimmed = String(ocrText || '').slice(0, 45000);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: [
            'Sos un analista de performance.',
            'Extrae datos desde OCR de un informe PDF.',
            'Devolvé SOLO JSON con esta forma exacta:',
            '{',
            '  "period_start": "YYYY-MM-DD | null",',
            '  "period_end": "YYYY-MM-DD | null",',
            '  "metrics": {',
            '    "reach": number | null,',
            '    "impressions": number | null,',
            '    "clicks": number | null,',
            '    "spend": number | null,',
            '    "leads": number | null',
            '  },',
            '  "summary": "resumen ejecutivo breve en espanol",',
            '  "operational_comment": "comentario operativo breve",',
            '  "ai_context_text": "texto compacto para contexto de IA"',
            '}',
            'Si un dato no existe, usa null. No inventes valores.',
          ].join('\n'),
        },
        {
          role: 'user',
          content: [
            `Proyecto: ${projectTitle}`,
            'Texto OCR del PDF:',
            ocrTrimmed,
          ].join('\n\n'),
        },
      ],
    }),
  });

  const raw = await response.text();
  let payload = {};
  try {
    payload = JSON.parse(raw);
  } catch {
    payload = {};
  }

  if (!response.ok) {
    const detail = sanitizeText(raw).slice(0, 280);
    throw new Error(`OpenAI summarization failed (${response.status}): ${detail || 'unknown error'}`);
  }

  const content = payload?.choices?.[0]?.message?.content;
  const parsed = extractJsonObject(content);
  if (!parsed) {
    throw new Error('OpenAI returned invalid JSON');
  }

  return parsed;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const token = getTokenFromRequest(req);
  if (!token) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }

  const body = parseJsonBody(req) || {};
  const projectId = sanitizeText(body.projectId);
  const pdfUrl = sanitizeText(body.pdfUrl);
  const pdfPath = sanitizeText(body.pdfPath);
  const pdfName = sanitizeText(body.pdfName, 'informe.pdf');
  const fileSize = Number(body.fileSize);

  if (!projectId || !pdfUrl || !pdfPath) {
    return res.status(400).json({ error: 'projectId, pdfUrl and pdfPath are required' });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return res.status(500).json({ error: 'Server configuration error: missing Supabase credentials' });
  }

  try {
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData?.user?.id) {
      return res.status(401).json({ error: 'Unauthorized: invalid token' });
    }

    const userId = authData.user.id;
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', userId)
      .maybeSingle();

    if (profileError || !profile) {
      return res.status(403).json({ error: 'Forbidden: missing profile' });
    }

    if (!['admin', 'worker'].includes(profile.role)) {
      return res.status(403).json({ error: 'Forbidden: only admin/worker can upload reports' });
    }

    const { data: hasAccess, error: accessError } = await supabase
      .rpc('fn_has_project_access', { p_id: projectId, u_id: userId });

    if (accessError) {
      return res.status(500).json({ error: 'Failed to verify project access', detail: accessError.message });
    }

    if (!hasAccess) {
      return res.status(403).json({ error: 'Forbidden: no project access' });
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .maybeSingle();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const projectTitle = getProjectTitle(project);
    const ocrText = await callMistralOcr(pdfUrl);
    const parsed = await callOpenAiReportParser({ ocrText, projectTitle });

    const parsedMetrics = parsed?.metrics && typeof parsed.metrics === 'object' ? parsed.metrics : {};
    const metrics = {
      reach: toNullableNumber(parsedMetrics.reach ?? parsed.reach),
      impressions: toNullableNumber(parsedMetrics.impressions ?? parsed.impressions),
      clicks: toNullableNumber(parsedMetrics.clicks ?? parsed.clicks),
      spend: toNullableNumber(parsedMetrics.spend ?? parsed.spend),
      leads: toNullableNumber(parsedMetrics.leads ?? parsed.leads),
    };

    let periodStart = normalizeDate(parsed.period_start || parsed.periodStart || parsed?.period?.start);
    let periodEnd = normalizeDate(parsed.period_end || parsed.periodEnd || parsed?.period?.end);
    const today = new Date().toISOString().slice(0, 10);

    if (!periodStart && !periodEnd) {
      periodStart = today;
      periodEnd = today;
    } else if (!periodStart && periodEnd) {
      periodStart = periodEnd;
    } else if (periodStart && !periodEnd) {
      periodEnd = periodStart;
    }

    if (periodStart > periodEnd) {
      const temp = periodStart;
      periodStart = periodEnd;
      periodEnd = temp;
    }

    const summary = sanitizeText(parsed.summary || parsed.executive_summary || parsed.operational_comment);
    const operationalComment = sanitizeText(parsed.operational_comment || summary);
    const aiContextText = sanitizeText(parsed.ai_context_text)
      || buildAiContextText({
        projectTitle,
        periodStart,
        periodEnd,
        metrics,
        summary,
      });

    const { data: inserted, error: insertError } = await supabase
      .from('project_reports')
      .insert({
        project_id: projectId,
        period_start: periodStart,
        period_end: periodEnd,
        pdf_path: pdfPath,
        pdf_url: pdfUrl,
        pdf_name: pdfName,
        file_size: Number.isFinite(fileSize) ? fileSize : null,
        metrics_jsonb: metrics,
        operational_comment: operationalComment || null,
        ai_context_text: aiContextText,
        source: 'imported',
        created_by: userId,
      })
      .select('*')
      .single();

    if (insertError) {
      return res.status(500).json({ error: 'Failed to save report', detail: insertError.message });
    }

    return res.status(200).json({
      ok: true,
      report: inserted,
      extracted: {
        period_start: periodStart,
        period_end: periodEnd,
        metrics,
        summary,
      },
    });
  } catch (error) {
    return res.status(500).json({
      error: error?.message || 'Unexpected OCR processing error',
    });
  }
}
