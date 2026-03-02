import { getSupabaseAdmin } from '../server/utils/supabaseServer.js';

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

function sanitizeText(value, fallback = '') {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function getTokenFromRequest(req) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return null;
  return auth.slice(7).trim() || null;
}

function parseLimit(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 6;
  return Math.max(1, Math.min(20, Math.trunc(numeric)));
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

function normalizeMonth(value) {
  const text = sanitizeText(value);
  if (!/^\d{4}-\d{2}$/.test(text)) return null;
  return text;
}

function monthBounds(monthValue) {
  const month = normalizeMonth(monthValue);
  if (!month) return null;
  const [yearText, monthText] = month.split('-');
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  if (!Number.isFinite(year) || !Number.isFinite(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return null;
  }

  const start = new Date(Date.UTC(year, monthIndex, 1));
  const end = new Date(Date.UTC(year, monthIndex + 1, 0));
  return {
    periodStart: start.toISOString().slice(0, 10),
    periodEnd: end.toISOString().slice(0, 10),
  };
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

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => sanitizeText(item))
    .filter(Boolean)
    .slice(0, 8);
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
  keyInsights = [],
  winningPaths = [],
  nextSteps = [],
  riskFlags = [],
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
  if (keyInsights.length) lines.push(`Insights clave: ${keyInsights.join(' | ')}`);
  if (winningPaths.length) lines.push(`Caminos que funcionaron: ${winningPaths.join(' | ')}`);
  if (nextSteps.length) lines.push(`Siguientes pasos: ${nextSteps.join(' | ')}`);
  if (riskFlags.length) lines.push(`Riesgos detectados: ${riskFlags.join(' | ')}`);
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

async function callOpenAiReportParser({
  ocrText,
  projectTitle,
  reportMonth,
  historicalReports = [],
}) {
  const apiKey = sanitizeText(process.env.OPENAI_API_KEY);
  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY');
  }

  const model = sanitizeText(process.env.OPENAI_REPORTS_MODEL, 'gpt-4o-mini');
  const ocrTrimmed = String(ocrText || '').slice(0, 45000);
  const historicalText = JSON.stringify(historicalReports, null, 2).slice(0, 12000);

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
            'Sos un analista senior de performance y operaciones.',
            'Recibirás texto OCR con ruido; primero limpia mentalmente errores tipicos de OCR y luego extrae datos confiables.',
            'No inventes datos. Si algo no existe, usa null o [] según corresponda.',
            'Usa el historial previo para detectar patrones que funcionaron y caminos a reforzar.',
            'Devolvé SOLO JSON con esta forma exacta:',
            '{',
            '  "metrics": {',
            '    "reach": number | null,',
            '    "impressions": number | null,',
            '    "clicks": number | null,',
            '    "spend": number | null,',
            '    "leads": number | null',
            '  },',
            '  "summary": "resumen ejecutivo breve en espanol (4-6 lineas)",',
            '  "key_insights": ["insight 1", "insight 2"],',
            '  "winning_paths": ["camino que funciono 1", "camino que funciono 2"],',
            '  "next_steps": ["accion recomendada 1", "accion recomendada 2"],',
            '  "risk_flags": ["riesgo 1", "riesgo 2"],',
            '  "operational_comment": "sintesis operativa para equipo",',
            '  "ai_context_text": "contexto compacto para alimentar otro agente"',
            '}',
            'Reglas:',
            '- winning_paths: solo acciones/canales/mensajes que mostraron resultado positivo.',
            '- next_steps: acciones concretas y accionables para el mes siguiente.',
            '- risk_flags: frenos de performance o incertidumbres relevantes.',
          ].join('\n'),
        },
        {
          role: 'user',
          content: [
            `Proyecto: ${projectTitle}`,
            `Mes objetivo del informe: ${reportMonth}`,
            'Historial reciente (JSON):',
            historicalText || '[]',
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

async function handleReportsAiContext(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const projectId = getQueryParam(req, 'projectId');
  if (!projectId) {
    return res.status(400).json({ error: 'projectId is required' });
  }

  const token = getTokenFromRequest(req);
  if (!token) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return res.status(500).json({ error: 'Server configuration error: missing Supabase credentials' });
  }

  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized: invalid token' });
  }

  const userId = authData.user.id;
  const { data: accessData, error: accessError } = await supabase
    .rpc('fn_has_project_access', { p_id: projectId, u_id: userId });

  if (accessError) {
    return res.status(500).json({ error: 'Failed to verify project access', detail: accessError.message });
  }
  if (!accessData) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const limit = parseLimit(getQueryParam(req, 'limit'));
  const { data, error } = await supabase
    .from('project_reports')
    .select('id, period_start, period_end, ai_context_text, created_at')
    .eq('project_id', projectId)
    .not('ai_context_text', 'is', null)
    .order('period_end', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return res.status(500).json({ error: 'Failed to load report context', detail: error.message });
  }

  const reports = (data || []).map((item) => ({
    id: item.id,
    period_start: item.period_start,
    period_end: item.period_end,
    created_at: item.created_at,
    ai_context_text: item.ai_context_text,
  }));

  const context = reports
    .map((item, index) => `Informe ${index + 1}\n${item.ai_context_text}`)
    .join('\n\n---\n\n');

  return res.status(200).json({
    projectId,
    count: reports.length,
    context,
    reports,
    generatedAt: new Date().toISOString(),
  });
}

async function handleReportsOcrSummary(req, res) {
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
  const reportMonth = normalizeMonth(body.reportMonth);
  const pdfUrl = sanitizeText(body.pdfUrl);
  const pdfPath = sanitizeText(body.pdfPath);
  const pdfName = sanitizeText(body.pdfName, 'informe.pdf');
  const fileSize = Number(body.fileSize);

  if (!projectId || !reportMonth || !pdfUrl || !pdfPath) {
    return res.status(400).json({ error: 'projectId, reportMonth, pdfUrl and pdfPath are required' });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return res.status(500).json({ error: 'Server configuration error: missing Supabase credentials' });
  }

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

  try {
    const projectTitle = getProjectTitle(project);
    const ocrText = await callMistralOcr(pdfUrl);
    const { data: lastReports } = await supabase
      .from('project_reports')
      .select('period_start, period_end, metrics_jsonb, operational_comment')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(3);

    const historicalReports = Array.isArray(lastReports) ? lastReports : [];

    const parsed = await callOpenAiReportParser({
      ocrText,
      projectTitle,
      reportMonth,
      historicalReports,
    });

    const parsedMetrics = parsed?.metrics && typeof parsed.metrics === 'object' ? parsed.metrics : {};
    const metrics = {
      reach: toNullableNumber(parsedMetrics.reach ?? parsed.reach),
      impressions: toNullableNumber(parsedMetrics.impressions ?? parsed.impressions),
      clicks: toNullableNumber(parsedMetrics.clicks ?? parsed.clicks),
      spend: toNullableNumber(parsedMetrics.spend ?? parsed.spend),
      leads: toNullableNumber(parsedMetrics.leads ?? parsed.leads),
    };

    const monthRange = monthBounds(reportMonth);
    if (!monthRange) {
      return res.status(400).json({ error: 'Invalid reportMonth format. Use YYYY-MM' });
    }
    const periodStart = monthRange.periodStart;
    const periodEnd = monthRange.periodEnd;

    const summary = sanitizeText(parsed.summary || parsed.executive_summary || parsed.operational_comment);
    const keyInsights = normalizeStringArray(parsed.key_insights || parsed.keyInsights);
    const winningPaths = normalizeStringArray(parsed.winning_paths || parsed.winningPaths);
    const nextSteps = normalizeStringArray(parsed.next_steps || parsed.nextSteps);
    const riskFlags = normalizeStringArray(parsed.risk_flags || parsed.riskFlags);

    const operationalCommentParts = [];
    if (summary) operationalCommentParts.push(summary);
    if (winningPaths.length) operationalCommentParts.push(`Caminos que funcionaron: ${winningPaths.join(' | ')}`);
    if (nextSteps.length) operationalCommentParts.push(`Siguientes pasos: ${nextSteps.join(' | ')}`);
    if (riskFlags.length) operationalCommentParts.push(`Riesgos: ${riskFlags.join(' | ')}`);
    const operationalComment = operationalCommentParts.join('\n');

    const aiContextText = sanitizeText(parsed.ai_context_text)
      || buildAiContextText({
        projectTitle,
        periodStart,
        periodEnd,
        metrics,
        summary,
        keyInsights,
        winningPaths,
        nextSteps,
        riskFlags,
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
        report_month: reportMonth,
        period_start: periodStart,
        period_end: periodEnd,
        metrics,
        summary,
        key_insights: keyInsights,
        winning_paths: winningPaths,
        next_steps: nextSteps,
        risk_flags: riskFlags,
      },
    });
  } catch (error) {
    return res.status(500).json({
      error: error?.message || 'Unexpected OCR processing error',
    });
  }
}

export default async function handler(req, res) {
  const action = resolveAction(req);
  if (action === 'reports-ai-context') {
    return handleReportsAiContext(req, res);
  }
  if (action === 'reports-ocr-summary') {
    return handleReportsOcrSummary(req, res);
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
