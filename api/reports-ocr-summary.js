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

const REPORT_METRICS = [
  { key: 'reach', label: 'Reach', aliases: ['reach', 'alcance'], core: true },
  { key: 'impressions', label: 'Impresiones', aliases: ['impressions', 'impresiones'], core: true },
  { key: 'clicks', label: 'Clicks', aliases: ['clicks', 'clics'], core: true },
  { key: 'spend', label: 'Spend', aliases: ['spend', 'amount_spent', 'gasto'], core: true },
  { key: 'leads', label: 'Leads', aliases: ['leads'], core: true },
  { key: 'link_clicks', label: 'Clicks en enlace', aliases: ['link_clicks', 'linkClicks', 'clicks_enlace'] },
  { key: 'conversions', label: 'Conversiones', aliases: ['conversions', 'conversiones'] },
  { key: 'engagements', label: 'Interacciones', aliases: ['engagements', 'interactions', 'interacciones'] },
  { key: 'followers_gained', label: 'Seguidores ganados', aliases: ['followers_gained', 'new_followers'] },
  { key: 'followers_lost', label: 'Seguidores perdidos', aliases: ['followers_lost', 'lost_followers'] },
  { key: 'followers_net', label: 'Seguidores netos', aliases: ['followers_net', 'net_followers'] },
  { key: 'ctr', label: 'CTR (%)', aliases: ['ctr'] },
  { key: 'cpc', label: 'CPC', aliases: ['cpc'] },
  { key: 'cpm', label: 'CPM', aliases: ['cpm'] },
  { key: 'cpl', label: 'CPL', aliases: ['cpl'] },
];

function pickMetricFromSources(sources, aliases) {
  for (const source of sources) {
    if (!source || typeof source !== 'object') continue;
    for (const alias of aliases) {
      const value = toNullableNumber(source[alias]);
      if (value !== null) return value;
    }
  }
  return null;
}

function normalizeReportMetrics(parsedMetrics, parsed) {
  const metrics = {};
  const sources = [parsedMetrics, parsed];

  for (const definition of REPORT_METRICS) {
    metrics[definition.key] = pickMetricFromSources(sources, definition.aliases);
  }

  if (metrics.followers_net === null && metrics.followers_gained !== null && metrics.followers_lost !== null) {
    metrics.followers_net = metrics.followers_gained - metrics.followers_lost;
  }
  if (metrics.ctr === null && metrics.clicks !== null && metrics.impressions > 0) {
    metrics.ctr = (metrics.clicks / metrics.impressions) * 100;
  }
  if (metrics.cpc === null && metrics.spend !== null && metrics.clicks > 0) {
    metrics.cpc = metrics.spend / metrics.clicks;
  }
  if (metrics.cpm === null && metrics.spend !== null && metrics.impressions > 0) {
    metrics.cpm = (metrics.spend * 1000) / metrics.impressions;
  }
  if (metrics.cpl === null && metrics.spend !== null && metrics.leads > 0) {
    metrics.cpl = metrics.spend / metrics.leads;
  }

  return metrics;
}

function formatMetricForContext(metricKey, value) {
  if (value === null || value === undefined) return 'N/D';
  if (['spend', 'cpc', 'cpm', 'cpl'].includes(metricKey)) {
    return `$${Number(value).toFixed(2)}`;
  }
  if (metricKey === 'ctr') {
    return `${Number(value).toFixed(2)}%`;
  }
  return Number(value).toFixed(Number.isInteger(value) ? 0 : 2);
}

function buildOperationalReportFallback({
  projectTitle,
  reportMonth,
  periodStart,
  periodEnd,
  metrics,
  summary,
  keyInsights = [],
  winningPaths = [],
  nextSteps = [],
  riskFlags = [],
}) {
  const metricLines = REPORT_METRICS
    .filter((definition) => metrics?.[definition.key] !== null || definition.core)
    .map((definition) => `- ${definition.label}: ${formatMetricForContext(definition.key, metrics?.[definition.key])}`);

  const lines = [];
  lines.push('DIAGNOSTICO OPERATIVO EXPERTO');
  lines.push(`Proyecto: ${projectTitle}`);
  lines.push(`Mes analizado: ${reportMonth} (${periodStart} a ${periodEnd})`);
  lines.push('');
  lines.push('1) LECTURA GENERAL DEL RENDIMIENTO');
  lines.push(summary || 'No se pudo extraer una sintesis textual completa desde OCR; se detalla analisis cuantitativo con los datos detectados.');
  lines.push('');
  lines.push('2) TABLERO DE METRICAS DETECTADAS');
  lines.push(...metricLines);
  lines.push('');
  lines.push('3) HALLAZGOS CLAVE');
  lines.push(keyInsights.length ? `- ${keyInsights.join('\n- ')}` : '- No se detectaron hallazgos textuales adicionales en el OCR.');
  lines.push('');
  lines.push('4) PALANCAS QUE FUNCIONARON');
  lines.push(winningPaths.length ? `- ${winningPaths.join('\n- ')}` : '- No se pudo confirmar una palanca ganadora con evidencia suficiente.');
  lines.push('');
  lines.push('5) PLAN OPERATIVO RECOMENDADO');
  lines.push(nextSteps.length ? `- ${nextSteps.join('\n- ')}` : '- Definir experimento por audiencia, creatividades y objetivo para el siguiente periodo.');
  lines.push('');
  lines.push('6) RIESGOS Y CONTROL');
  lines.push(riskFlags.length ? `- ${riskFlags.join('\n- ')}` : '- Validar tracking y calidad de datos para reducir incertidumbre en la toma de decisiones.');
  return lines.join('\n');
}

function buildAiContextText({
  projectTitle,
  reportMonth,
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
  lines.push(`Mes objetivo: ${reportMonth || 'N/D'}`);
  lines.push(`Periodo: ${periodStart} a ${periodEnd}`);
  lines.push('Metricas extraidas:');

  for (const definition of REPORT_METRICS) {
    const value = metrics?.[definition.key];
    if (value !== null || definition.core) {
      lines.push(`- ${definition.label}: ${formatMetricForContext(definition.key, value)}`);
    }
  }

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

async function callOpenAiReportParser({ ocrText, projectTitle, reportMonth }) {
  const apiKey = sanitizeText(process.env.OPENAI_API_KEY);
  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY');
  }

  const model = sanitizeText(process.env.OPENAI_REPORTS_MODEL, 'gpt-4o-mini');
  const ocrTrimmed = String(ocrText || '').slice(0, 80000);

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
            'Sos un agente operativo experto en redes sociales, performance y crecimiento.',
            'Extrae datos desde OCR de un informe PDF.',
            'No devuelvas un comentario corto: devolvé un informe operativo integral y accionable.',
            'Devolvé SOLO JSON con esta forma exacta:',
            '{',
            '  "metrics": {',
            '    "reach": number | null,',
            '    "impressions": number | null,',
            '    "clicks": number | null,',
            '    "link_clicks": number | null,',
            '    "spend": number | null,',
            '    "leads": number | null,',
            '    "conversions": number | null,',
            '    "engagements": number | null,',
            '    "followers_gained": number | null,',
            '    "followers_lost": number | null,',
            '    "followers_net": number | null,',
            '    "ctr": number | null,',
            '    "cpc": number | null,',
            '    "cpm": number | null,',
            '    "cpl": number | null',
            '  },',
            '  "summary": "resumen ejecutivo detallado en espanol (8-12 lineas, con datos concretos y variaciones)",',
            '  "operational_report": "informe operativo experto completo (14-22 lineas) con secciones y analisis integral del reporte",',
            '  "key_insights": ["insight 1", "insight 2"],',
            '  "winning_paths": ["camino que funciono 1", "camino que funciono 2"],',
            '  "next_steps": ["accion recomendada 1", "accion recomendada 2"],',
            '  "risk_flags": ["riesgo 1", "riesgo 2"],',
            '  "operational_comment": "devolucion operativa precisa para equipo (que paso, por que paso, que hacer ahora)",',
            '  "ai_context_text": "texto compacto para contexto de IA"',
            '}',
            'Si un dato no existe, usa null o [] segun corresponda. No inventes valores.',
            'El summary, operational_report y operational_comment deben mencionar numeros cuando existan.',
            'operational_report debe cubrir TODO lo relevante que exista en el reporte: objetivos, embudo (alcance, interaccion, clics, leads/conversion), eficiencia (CTR/CPC/CPM/CPL), lectura de audiencia/creatividades, comparativa historica y plan 7/15/30 dias.',
            'operational_report debe incluir encabezados numerados y bullets concretos.',
            'No uses frases genericas: prioriza causalidad, impacto y accion.',
          ].join('\n'),
        },
        {
          role: 'user',
          content: [
            `Proyecto: ${projectTitle}`,
            `Mes objetivo del informe: ${reportMonth || 'no provisto'}`,
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
    const parsed = await callOpenAiReportParser({ ocrText, projectTitle, reportMonth });

    const parsedMetrics = parsed?.metrics && typeof parsed.metrics === 'object' ? parsed.metrics : {};
    const metrics = normalizeReportMetrics(parsedMetrics, parsed);

    const monthRange = monthBounds(reportMonth);
    if (!monthRange) {
      return res.status(400).json({ error: 'Invalid reportMonth format. Use YYYY-MM' });
    }
    const periodStart = monthRange.periodStart;
    const periodEnd = monthRange.periodEnd;

    const summary = sanitizeText(
      parsed.summary || parsed.executive_summary || parsed.operational_report || parsed.operational_comment
    );
    const keyInsights = normalizeStringArray(parsed.key_insights || parsed.keyInsights);
    const winningPaths = normalizeStringArray(parsed.winning_paths || parsed.winningPaths);
    const nextSteps = normalizeStringArray(parsed.next_steps || parsed.nextSteps);
    const riskFlags = normalizeStringArray(parsed.risk_flags || parsed.riskFlags);
    const operationalReportFromAi = sanitizeText(
      parsed.operational_report || parsed.operationalReport || parsed.operational_comment
    );

    const operationalCommentParts = [];
    if (summary) operationalCommentParts.push(summary);
    if (keyInsights.length) operationalCommentParts.push(`Insights clave:\n- ${keyInsights.join('\n- ')}`);
    if (winningPaths.length) operationalCommentParts.push(`Caminos que funcionaron:\n- ${winningPaths.join('\n- ')}`);
    if (nextSteps.length) operationalCommentParts.push(`Siguientes pasos:\n- ${nextSteps.join('\n- ')}`);
    if (riskFlags.length) operationalCommentParts.push(`Riesgos:\n- ${riskFlags.join('\n- ')}`);
    const fallbackComment = operationalCommentParts.join('\n\n');
    const operationalComment = operationalReportFromAi
      || fallbackComment
      || buildOperationalReportFallback({
        projectTitle,
        reportMonth,
        periodStart,
        periodEnd,
        metrics,
        summary,
        keyInsights,
        winningPaths,
        nextSteps,
        riskFlags,
      });
    const aiContextText = sanitizeText(parsed.ai_context_text)
      || buildAiContextText({
        projectTitle,
        reportMonth,
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
        operational_report: operationalComment,
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
