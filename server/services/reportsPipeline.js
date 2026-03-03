import { getSupabaseAdmin } from '../utils/supabaseServer.js';

const METRIC_DEFINITIONS = [
  { key: 'reach', label: 'Reach', aliases: ['reach', 'alcance'], core: true },
  {
    key: 'impressions',
    label: 'Impresiones',
    aliases: ['impressions', 'impresiones', 'visualizaciones_totales', 'visualizaciones', 'total_views', 'views'],
    core: true,
  },
  { key: 'clicks', label: 'Clicks', aliases: ['clicks', 'clics'], core: true },
  { key: 'link_clicks', label: 'Clicks en enlace', aliases: ['link_clicks', 'linkClicks', 'clicks_enlace'] },
  { key: 'spend', label: 'Spend', aliases: ['spend', 'amount_spent', 'gasto'], core: true },
  { key: 'leads', label: 'Leads', aliases: ['leads'], core: true },
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

const METRIC_KEYS = METRIC_DEFINITIONS.map((definition) => definition.key);
const METRIC_KEY_SET = new Set(METRIC_KEYS);
const CORE_METRIC_KEYS = METRIC_DEFINITIONS.filter((definition) => definition.core).map((definition) => definition.key);

const EXTRACTOR_TOP_LEVEL_KEYS = new Set([
  'metrics',
  'extraction_confidence',
  'extraction_warnings',
  'source_evidence',
]);

const EVIDENCE_ALLOWED_KEYS = new Set([
  'field',
  'page',
  'table',
  'raw_value',
  'note',
  'confidence',
]);

const EXTRACTOR_SYSTEM_PROMPT = [
  'Eres un extractor de datos de reportes de redes sociales.',
  'Recibirás OCR ruidoso y posiblemente imágenes de páginas.',
  'No inventes datos.',
  'Devuelve SOLO JSON válido con este schema exacto:',
  '{',
  '  "metrics": {',
  '    "reach": number|null,',
  '    "impressions": number|null,',
  '    "clicks": number|null,',
  '    "link_clicks": number|null,',
  '    "spend": number|null,',
  '    "leads": number|null,',
  '    "conversions": number|null,',
  '    "engagements": number|null,',
  '    "followers_gained": number|null,',
  '    "followers_lost": number|null,',
  '    "followers_net": number|null,',
  '    "ctr": number|null,',
  '    "cpc": number|null,',
  '    "cpm": number|null,',
  '    "cpl": number|null',
  '  },',
  '  "extraction_confidence": number,',
  '  "extraction_warnings": string[],',
  '  "source_evidence": [{',
  '    "field": string,',
  '    "page": number|null,',
  '    "table": string|null,',
  '    "raw_value": string|null,',
  '    "note": string|null,',
  '    "confidence": number|null',
  '  }]',
  '}',
  'Reglas:',
  '- Usa null si un valor no existe.',
  '- extraction_confidence debe estar entre 0 y 1.',
  '- source_evidence debe incluir page y table cuando sea posible.',
  '- No agregues claves fuera del schema.',
].join('\n');

const ANALYST_SYSTEM_PROMPT = [
  'Eres un analista senior de performance para redes sociales.',
  'Recibirás métricas normalizadas de un reporte + historial de últimos 3 reportes del proyecto.',
  'Tu salida debe estar en español claro para cliente final: concreta, accionable y entendible.',
  'Devuelve SOLO JSON con este schema exacto:',
  '{',
  '  "summary": string,',
  '  "operational_comment": string,',
  '  "ai_context_text": string,',
  '  "key_insights": string[],',
  '  "next_steps": string[],',
  '  "risk_flags": string[]',
  '}',
  'Reglas:',
  '- summary: resumen ejecutivo (6-10 líneas) con números si existen.',
  '- operational_comment: análisis completo con diagnóstico, causalidad y plan de acción.',
  '- ai_context_text: contexto compacto para reutilizar en otros agentes.',
  '- No uses markdown ni texto fuera del JSON.',
].join('\n');

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

function getTokenFromRequest(req) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return null;
  return auth.slice(7).trim() || null;
}

function sanitizeText(value, fallback = '') {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function cleanReportText(value, fallback = '') {
  const base = sanitizeText(value, fallback);
  if (!base) return fallback;
  return base
    .replace(/\*{1,3}/g, '')
    .replace(/`{1,3}/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
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

function parseLimit(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 6;
  return Math.max(1, Math.min(20, Math.trunc(numeric)));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function roundTo(value, decimals = 4) {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function toNullableNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;

  let text = String(value).trim();
  if (!text) return null;

  const isNegative = /^\(.*\)$/.test(text) || text.startsWith('-');

  text = text
    .replace(/^\((.*)\)$/u, '$1')
    .replace(/[%$€£R$\s]/g, '')
    .replace(/[^0-9,.-]/g, '');

  if (!text || text === '-' || text === '.' || text === ',') return null;

  const commaCount = (text.match(/,/g) || []).length;
  const dotCount = (text.match(/\./g) || []).length;

  if (commaCount > 0 && dotCount > 0) {
    if (text.lastIndexOf(',') > text.lastIndexOf('.')) {
      text = text.replace(/\./g, '').replace(',', '.');
    } else {
      text = text.replace(/,/g, '');
    }
  } else if (commaCount > 0) {
    if (commaCount > 1) {
      text = text.replace(/,/g, '');
    } else {
      const [intPart, decimalPart = ''] = text.split(',');
      text = decimalPart.length > 0 && decimalPart.length <= 2
        ? `${intPart}.${decimalPart}`
        : `${intPart}${decimalPart}`;
    }
  } else if (dotCount > 1) {
    text = text.replace(/\./g, '');
  }

  let parsed = Number(text);
  if (!Number.isFinite(parsed)) return null;
  if (isNegative && parsed > 0) parsed *= -1;

  return parsed;
}

function extractJsonObject(rawContent) {
  if (rawContent && typeof rawContent === 'object' && !Array.isArray(rawContent)) {
    return rawContent;
  }

  const text = sanitizeText(rawContent);
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    // continue
  }

  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;

  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

function normalizeStringArray(value, maxItems = 10) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => sanitizeText(item))
    .filter(Boolean)
    .slice(0, maxItems);
}

function normalizeNullableString(value) {
  const text = sanitizeText(value);
  return text || null;
}

function normalizeBase64Image(rawValue) {
  const value = sanitizeText(rawValue);
  if (!value) return null;
  if (value.startsWith('data:image/')) return value;
  return `data:image/png;base64,${value}`;
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

function extractOcrImages(payload) {
  const images = [];

  const pushCandidate = (value) => {
    const image = normalizeBase64Image(value);
    if (image) images.push(image);
  };

  const pages = payload?.pages || payload?.data?.pages;
  if (Array.isArray(pages)) {
    for (const page of pages) {
      pushCandidate(page?.image_base64);
      pushCandidate(page?.image);

      if (Array.isArray(page?.images)) {
        for (const image of page.images) {
          pushCandidate(image?.image_base64 || image?.base64 || image?.data || image?.content || image);
        }
      }
    }
  }

  const rootImages = payload?.images || payload?.data?.images;
  if (Array.isArray(rootImages)) {
    for (const image of rootImages) {
      pushCandidate(image?.image_base64 || image?.base64 || image?.data || image?.content || image);
    }
  }

  return Array.from(new Set(images)).slice(0, 6);
}

function isPoorOcrText(value) {
  const text = sanitizeText(value);
  if (!text) return true;

  const compact = text.replace(/\s+/g, ' ').trim();
  if (compact.length < 350) return true;

  const letters = (compact.match(/[A-Za-zÁÉÍÓÚáéíóúÑñ]/g) || []).length;
  const digits = (compact.match(/\d/g) || []).length;

  if (letters < 140 && digits < 80) return true;
  if (letters < 120) return true;

  return false;
}

function getProjectTitle(project) {
  return (
    sanitizeText(project?.title)
    || sanitizeText(project?.name)
    || sanitizeText(project?.project_name)
    || 'Proyecto'
  );
}

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

  for (const definition of METRIC_DEFINITIONS) {
    metrics[definition.key] = pickMetricFromSources(sources, definition.aliases);
  }

  if (metrics.followers_net === null && metrics.followers_gained !== null && metrics.followers_lost !== null) {
    metrics.followers_net = roundTo(metrics.followers_gained - metrics.followers_lost, 2);
  }

  if (metrics.ctr === null && metrics.clicks !== null && metrics.impressions > 0) {
    metrics.ctr = roundTo((metrics.clicks / metrics.impressions) * 100, 2);
  }

  if (metrics.cpc === null && metrics.spend !== null && metrics.clicks > 0) {
    metrics.cpc = roundTo(metrics.spend / metrics.clicks, 4);
  }

  if (metrics.cpm === null && metrics.spend !== null && metrics.impressions > 0) {
    metrics.cpm = roundTo((metrics.spend * 1000) / metrics.impressions, 4);
  }

  if (metrics.cpl === null && metrics.spend !== null && metrics.leads > 0) {
    metrics.cpl = roundTo(metrics.spend / metrics.leads, 4);
  }

  return metrics;
}

function formatMetricForContext(metricKey, value) {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'N/D';
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
  nextSteps = [],
  riskFlags = [],
}) {
  const metricLines = METRIC_DEFINITIONS
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
  lines.push('4) PLAN OPERATIVO RECOMENDADO');
  lines.push(nextSteps.length ? `- ${nextSteps.join('\n- ')}` : '- Definir experimento por audiencia, creatividades y objetivo para el siguiente periodo.');
  lines.push('');
  lines.push('5) RIESGOS Y CONTROL');
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
  nextSteps = [],
  riskFlags = [],
  extractionConfidence,
  extractionWarnings = [],
}) {
  const lines = [];
  lines.push(`Proyecto: ${projectTitle}`);
  lines.push(`Mes objetivo: ${reportMonth || 'N/D'}`);
  lines.push(`Periodo: ${periodStart} a ${periodEnd}`);

  if (Number.isFinite(extractionConfidence)) {
    lines.push(`Confianza de extracción: ${(extractionConfidence * 100).toFixed(1)}%`);
  }

  lines.push('Metricas extraidas:');
  for (const definition of METRIC_DEFINITIONS) {
    const value = metrics?.[definition.key];
    if (value !== null || definition.core) {
      lines.push(`- ${definition.label}: ${formatMetricForContext(definition.key, value)}`);
    }
  }

  lines.push(`Resumen IA: ${summary || 'Sin resumen.'}`);
  if (keyInsights.length) lines.push(`Insights clave: ${keyInsights.join(' | ')}`);
  if (nextSteps.length) lines.push(`Siguientes pasos: ${nextSteps.join(' | ')}`);
  if (riskFlags.length) lines.push(`Riesgos detectados: ${riskFlags.join(' | ')}`);
  if (extractionWarnings.length) lines.push(`Warnings de extracción: ${extractionWarnings.join(' | ')}`);

  return lines.join('\n');
}

function normalizeEvidence(value) {
  if (!Array.isArray(value)) return [];

  const normalized = [];

  for (const item of value) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;

    const field = sanitizeText(item.field);
    if (!field) continue;

    const pageRaw = toNullableNumber(item.page);
    const confidenceRaw = toNullableNumber(item.confidence);

    normalized.push({
      field,
      page: Number.isFinite(pageRaw) && pageRaw > 0 ? Math.trunc(pageRaw) : null,
      table: normalizeNullableString(item.table),
      raw_value: normalizeNullableString(item.raw_value),
      note: normalizeNullableString(item.note),
      confidence: Number.isFinite(confidenceRaw) ? clamp(confidenceRaw, 0, 1) : null,
    });
  }

  return normalized.slice(0, 120);
}

function validateExtractorPayload(rawPayload) {
  const errors = [];

  if (!rawPayload || typeof rawPayload !== 'object' || Array.isArray(rawPayload)) {
    return { ok: false, errors: ['Payload must be a JSON object'] };
  }

  for (const key of Object.keys(rawPayload)) {
    if (!EXTRACTOR_TOP_LEVEL_KEYS.has(key)) {
      errors.push(`Unexpected top-level key: ${key}`);
    }
  }

  if (!Object.prototype.hasOwnProperty.call(rawPayload, 'metrics')) {
    errors.push('metrics is required');
  }

  const rawMetrics = rawPayload.metrics;
  if (!rawMetrics || typeof rawMetrics !== 'object' || Array.isArray(rawMetrics)) {
    errors.push('metrics must be an object');
  }

  const metrics = {};
  for (const key of METRIC_KEYS) {
    if (!rawMetrics || !Object.prototype.hasOwnProperty.call(rawMetrics, key)) {
      errors.push(`metrics.${key} is required`);
      metrics[key] = null;
      continue;
    }

    const rawValue = rawMetrics[key];
    if (rawValue === null) {
      metrics[key] = null;
      continue;
    }

    const parsedValue = toNullableNumber(rawValue);
    if (parsedValue === null) {
      errors.push(`metrics.${key} must be number|null`);
      metrics[key] = null;
      continue;
    }

    metrics[key] = parsedValue;
  }

  if (rawMetrics && typeof rawMetrics === 'object') {
    for (const key of Object.keys(rawMetrics)) {
      if (!METRIC_KEY_SET.has(key)) {
        errors.push(`Unexpected metrics key: ${key}`);
      }
    }
  }

  let extractionConfidence = toNullableNumber(rawPayload.extraction_confidence);
  if (extractionConfidence === null) {
    errors.push('extraction_confidence is required and must be number between 0 and 1');
    extractionConfidence = null;
  } else {
    extractionConfidence = clamp(extractionConfidence, 0, 1);
  }

  if (!Array.isArray(rawPayload.extraction_warnings)) {
    errors.push('extraction_warnings must be an array');
  }
  const extractionWarnings = normalizeStringArray(rawPayload.extraction_warnings, 30);

  if (!Array.isArray(rawPayload.source_evidence)) {
    errors.push('source_evidence must be an array');
  }

  if (Array.isArray(rawPayload.source_evidence)) {
    for (const evidence of rawPayload.source_evidence) {
      if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) {
        errors.push('source_evidence items must be objects');
        continue;
      }
      for (const evidenceKey of Object.keys(evidence)) {
        if (!EVIDENCE_ALLOWED_KEYS.has(evidenceKey)) {
          errors.push(`Unexpected source_evidence key: ${evidenceKey}`);
        }
      }
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      metrics,
      extraction_confidence: extractionConfidence,
      extraction_warnings: extractionWarnings,
      source_evidence: normalizeEvidence(rawPayload.source_evidence),
    },
  };
}

function normalizeHistoryForAnalyst(records) {
  if (!Array.isArray(records)) return [];

  return records.slice(0, 3).map((item) => ({
    period_start: item?.period_start || null,
    period_end: item?.period_end || null,
    metrics: normalizeReportMetrics(item?.metrics_jsonb, item?.metrics_jsonb),
    operational_comment: cleanReportText(item?.operational_comment || '', ''),
    ai_context_text: cleanReportText(item?.ai_context_text || '', ''),
  }));
}

function buildConsolidatedContext(reports) {
  if (!reports.length) return '';

  return reports
    .map((report, index) => {
      const period = `${report.period_start || 'N/D'} a ${report.period_end || 'N/D'}`;
      const confidence = Number.isFinite(report.extraction_confidence)
        ? `${(report.extraction_confidence * 100).toFixed(1)}%`
        : 'N/D';
      const warnings = Array.isArray(report.extraction_warnings) ? report.extraction_warnings : [];

      const lines = [];
      lines.push(`Informe ${index + 1} (${period})`);
      lines.push(`Confianza extracción: ${confidence}`);
      if (warnings.length) lines.push(`Warnings: ${warnings.join(' | ')}`);
      lines.push(cleanReportText(report.ai_context_text || report.operational_comment || '', 'Sin contexto disponible.'));

      return lines.join('\n');
    })
    .join('\n\n---\n\n');
}

function computeExtractionConfidence({
  providedConfidence,
  metrics,
  extractionWarnings,
  weakOcr,
}) {
  const nonNullCore = CORE_METRIC_KEYS.filter((key) => metrics[key] !== null).length;
  const coverage = CORE_METRIC_KEYS.length > 0 ? nonNullCore / CORE_METRIC_KEYS.length : 0;

  let derived = 0.45 + (coverage * 0.45);
  if (weakOcr) derived -= 0.12;
  derived -= Math.min(0.22, (extractionWarnings?.length || 0) * 0.03);
  derived = clamp(derived, 0, 1);

  if (Number.isFinite(providedConfidence)) {
    return roundTo(clamp((providedConfidence * 0.65) + (derived * 0.35), 0, 1), 4);
  }

  return roundTo(derived, 4);
}

function mergeExtractionWarnings({
  modelWarnings,
  weakOcr,
  metrics,
  sourceEvidence,
}) {
  const merged = new Set(normalizeStringArray(modelWarnings, 40));

  if (weakOcr) {
    merged.add('OCR con baja legibilidad; se recomienda revisión manual del PDF.');
  }

  const coreMissing = CORE_METRIC_KEYS.filter((key) => metrics[key] === null);
  if (coreMissing.length >= 3) {
    merged.add('Faltan múltiples métricas core; la extracción puede estar incompleta.');
  }

  if (!Array.isArray(sourceEvidence) || sourceEvidence.length === 0) {
    merged.add('No se detectó evidencia estructurada por campo/página.');
  }

  return Array.from(merged).slice(0, 40);
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
      include_image_base64: true,
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
  const images = extractOcrImages(payload);
  if (!text && images.length === 0) {
    throw new Error('Mistral OCR returned empty content');
  }

  return {
    text,
    images,
    weakText: isPoorOcrText(text),
  };
}

async function callOpenAiJson({
  model,
  apiKey,
  systemPrompt,
  userPrompt,
  images = [],
  withImages = false,
}) {
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
          content: systemPrompt,
        },
        {
          role: 'user',
          content: withImages
            ? [
              { type: 'text', text: userPrompt },
              ...images.map((url) => ({ type: 'image_url', image_url: { url } })),
            ]
            : userPrompt,
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
    throw new Error(`OpenAI request failed (${response.status}): ${detail || 'unknown error'}`);
  }

  const content = payload?.choices?.[0]?.message?.content;
  const parsed = extractJsonObject(content);
  if (!parsed) {
    throw new Error('OpenAI returned invalid JSON content');
  }

  return parsed;
}

async function runExtractor({
  ocrText,
  ocrImages,
  ocrWeak,
  projectTitle,
  reportMonth,
  pdfName,
}) {
  const apiKey = sanitizeText(process.env.OPENAI_API_KEY);
  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY');
  }

  const model = sanitizeText(
    process.env.OPENAI_REPORTS_EXTRACTOR_MODEL,
    sanitizeText(process.env.OPENAI_REPORTS_MODEL, 'gpt-4o-mini')
  );

  const selectedImages = Array.isArray(ocrImages) ? ocrImages.slice(0, 4) : [];
  const ocrTrimmed = String(ocrText || '').slice(0, 100000);
  const shouldAttachImages = selectedImages.length > 0 && (ocrWeak || ocrTrimmed.length < 1600);

  let lastValidationError = '';

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const retryNote = attempt > 1
      ? `\n\nTu respuesta anterior no cumplió el schema por: ${lastValidationError}. Corrige y devuelve solo JSON válido.`
      : '';

    const userPrompt = [
      `Proyecto: ${projectTitle}`,
      `Archivo PDF: ${pdfName || 'informe.pdf'}`,
      `Mes del informe: ${reportMonth}`,
      'Texto OCR (puede contener ruido):',
      ocrTrimmed || '[Sin texto OCR legible]',
      retryNote,
    ].join('\n\n');

    let parsed;

    try {
      parsed = await callOpenAiJson({
        model,
        apiKey,
        systemPrompt: EXTRACTOR_SYSTEM_PROMPT,
        userPrompt,
        images: selectedImages,
        withImages: shouldAttachImages,
      });
    } catch (error) {
      if (!shouldAttachImages || attempt > 1) throw error;

      const detail = sanitizeText(error?.message).toLowerCase();
      const shouldRetryWithoutImages = detail.includes('image') || detail.includes('vision') || detail.includes('unsupported');
      if (!shouldRetryWithoutImages) throw error;

      parsed = await callOpenAiJson({
        model,
        apiKey,
        systemPrompt: EXTRACTOR_SYSTEM_PROMPT,
        userPrompt,
        images: [],
        withImages: false,
      });
    }

    const validation = validateExtractorPayload(parsed);
    if (validation.ok) {
      return validation.data;
    }

    lastValidationError = validation.errors.join('; ');
  }

  throw new Error(`Extractor schema validation failed: ${lastValidationError || 'invalid extractor payload'}`);
}

function validateAnalystPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;

  const summary = cleanReportText(payload.summary || payload.executive_summary || '');
  const operationalComment = cleanReportText(payload.operational_comment || payload.operationalReport || '');
  const aiContextText = cleanReportText(payload.ai_context_text || payload.aiContext || '');
  const keyInsights = normalizeStringArray(payload.key_insights || payload.keyInsights, 10);
  const nextSteps = normalizeStringArray(payload.next_steps || payload.nextSteps, 10);
  const riskFlags = normalizeStringArray(payload.risk_flags || payload.riskFlags, 10);

  if (!operationalComment) return null;

  return {
    summary,
    operational_comment: operationalComment,
    ai_context_text: aiContextText,
    key_insights: keyInsights,
    next_steps: nextSteps,
    risk_flags: riskFlags,
  };
}

async function runAnalyst({
  projectTitle,
  reportMonth,
  periodStart,
  periodEnd,
  metrics,
  extractionConfidence,
  extractionWarnings,
  sourceEvidence,
  historicalReports,
}) {
  const apiKey = sanitizeText(process.env.OPENAI_API_KEY);
  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY');
  }

  const model = sanitizeText(
    process.env.OPENAI_REPORTS_ANALYST_MODEL,
    sanitizeText(process.env.OPENAI_REPORTS_MODEL, 'gpt-4o-mini')
  );

  const analystPayload = {
    project_title: projectTitle,
    report_month: reportMonth,
    period_start: periodStart,
    period_end: periodEnd,
    normalized_metrics: metrics,
    extraction_confidence: extractionConfidence,
    extraction_warnings: extractionWarnings,
    source_evidence: sourceEvidence,
    historical_reports: historicalReports,
  };

  const parsed = await callOpenAiJson({
    model,
    apiKey,
    systemPrompt: ANALYST_SYSTEM_PROMPT,
    userPrompt: JSON.stringify(analystPayload, null, 2).slice(0, 110000),
    images: [],
    withImages: false,
  });

  const normalized = validateAnalystPayload(parsed);
  if (normalized) {
    return normalized;
  }

  return {
    summary: '',
    operational_comment: '',
    ai_context_text: '',
    key_insights: [],
    next_steps: [],
    risk_flags: [],
  };
}

async function authenticateAndAuthorize({
  req,
  supabase,
  projectId,
  requireUploaderRole,
}) {
  const token = getTokenFromRequest(req);
  if (!token) {
    return { error: { status: 401, payload: { error: 'Missing Authorization header' } } };
  }

  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData?.user?.id) {
    return { error: { status: 401, payload: { error: 'Unauthorized: invalid token' } } };
  }

  const userId = authData.user.id;

  if (requireUploaderRole) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', userId)
      .maybeSingle();

    if (profileError || !profile) {
      return { error: { status: 403, payload: { error: 'Forbidden: missing profile' } } };
    }

    if (!['admin', 'worker'].includes(profile.role)) {
      return { error: { status: 403, payload: { error: 'Forbidden: only admin/worker can upload reports' } } };
    }
  }

  const { data: hasAccess, error: accessError } = await supabase
    .rpc('fn_has_project_access', { p_id: projectId, u_id: userId });

  if (accessError) {
    return {
      error: {
        status: 500,
        payload: { error: 'Failed to verify project access', detail: accessError.message },
      },
    };
  }

  if (!hasAccess) {
    return { error: { status: 403, payload: { error: 'Forbidden: no project access' } } };
  }

  return { userId };
}

export async function handleReportsAiContext(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const projectId = sanitizeText(getQueryParam(req, 'projectId'));
  if (!projectId) {
    return res.status(400).json({ error: 'projectId is required' });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return res.status(500).json({ error: 'Server configuration error: missing Supabase credentials' });
  }

  const auth = await authenticateAndAuthorize({
    req,
    supabase,
    projectId,
    requireUploaderRole: false,
  });

  if (auth.error) {
    return res.status(auth.error.status).json(auth.error.payload);
  }

  const limit = parseLimit(getQueryParam(req, 'limit'));

  const { data, error } = await supabase
    .from('project_reports')
    .select('id, period_start, period_end, created_at, ai_context_text, operational_comment, extraction_confidence, extraction_warnings, metrics_jsonb')
    .eq('project_id', projectId)
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
    ai_context_text: cleanReportText(item.ai_context_text || '', ''),
    operational_comment: cleanReportText(item.operational_comment || '', ''),
    extraction_confidence: Number.isFinite(item.extraction_confidence) ? item.extraction_confidence : null,
    extraction_warnings: normalizeStringArray(item.extraction_warnings || [], 20),
    metrics_jsonb: normalizeReportMetrics(item.metrics_jsonb, item.metrics_jsonb),
  }));

  const context = buildConsolidatedContext(reports);

  return res.status(200).json({
    projectId,
    count: reports.length,
    context,
    reports,
    generatedAt: new Date().toISOString(),
  });
}

export async function handleReportsIngest(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const body = parseJsonBody(req) || {};
  const projectId = sanitizeText(body.projectId);
  const reportMonth = normalizeMonth(body.reportMonth);
  const pdfUrl = sanitizeText(body.pdfUrl);
  const pdfPath = sanitizeText(body.pdfPath);
  const pdfName = sanitizeText(body.pdfName, 'informe.pdf');
  const fileSize = toNullableNumber(body.fileSize);

  if (!projectId || !reportMonth || !pdfUrl || !pdfPath) {
    return res.status(400).json({ error: 'projectId, reportMonth, pdfUrl and pdfPath are required' });
  }

  const monthRange = monthBounds(reportMonth);
  if (!monthRange) {
    return res.status(400).json({ error: 'Invalid reportMonth format. Use YYYY-MM' });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return res.status(500).json({ error: 'Server configuration error: missing Supabase credentials' });
  }

  const auth = await authenticateAndAuthorize({
    req,
    supabase,
    projectId,
    requireUploaderRole: true,
  });

  if (auth.error) {
    return res.status(auth.error.status).json(auth.error.payload);
  }

  const userId = auth.userId;

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .maybeSingle();

  if (projectError || !project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  const projectTitle = getProjectTitle(project);

  try {
    const ocr = await callMistralOcr(pdfUrl);

    const { data: historicalData, error: historicalError } = await supabase
      .from('project_reports')
      .select('period_start, period_end, metrics_jsonb, operational_comment, ai_context_text')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(3);

    if (historicalError) {
      return res.status(500).json({ error: 'Failed to load historical reports', detail: historicalError.message });
    }

    const historicalReports = normalizeHistoryForAnalyst(historicalData || []);

    const extraction = await runExtractor({
      ocrText: ocr.text,
      ocrImages: ocr.images,
      ocrWeak: ocr.weakText,
      projectTitle,
      reportMonth,
      pdfName,
    });

    const normalizedMetrics = normalizeReportMetrics(extraction.metrics, extraction.metrics);

    const extractionWarnings = mergeExtractionWarnings({
      modelWarnings: extraction.extraction_warnings,
      weakOcr: ocr.weakText,
      metrics: normalizedMetrics,
      sourceEvidence: extraction.source_evidence,
    });

    const extractionConfidence = computeExtractionConfidence({
      providedConfidence: extraction.extraction_confidence,
      metrics: normalizedMetrics,
      extractionWarnings,
      weakOcr: ocr.weakText,
    });

    const analyst = await runAnalyst({
      projectTitle,
      reportMonth,
      periodStart: monthRange.periodStart,
      periodEnd: monthRange.periodEnd,
      metrics: normalizedMetrics,
      extractionConfidence,
      extractionWarnings,
      sourceEvidence: extraction.source_evidence,
      historicalReports,
    });

    const summary = cleanReportText(analyst.summary || '');
    const keyInsights = normalizeStringArray(analyst.key_insights, 10);
    const nextSteps = normalizeStringArray(analyst.next_steps, 10);
    const riskFlags = normalizeStringArray(analyst.risk_flags, 10);

    const operationalComment = cleanReportText(analyst.operational_comment)
      || buildOperationalReportFallback({
        projectTitle,
        reportMonth,
        periodStart: monthRange.periodStart,
        periodEnd: monthRange.periodEnd,
        metrics: normalizedMetrics,
        summary,
        keyInsights,
        nextSteps,
        riskFlags,
      });

    const aiContextText = cleanReportText(analyst.ai_context_text)
      || buildAiContextText({
        projectTitle,
        reportMonth,
        periodStart: monthRange.periodStart,
        periodEnd: monthRange.periodEnd,
        metrics: normalizedMetrics,
        summary,
        keyInsights,
        nextSteps,
        riskFlags,
        extractionConfidence,
        extractionWarnings,
      });

    const { data: inserted, error: insertError } = await supabase
      .from('project_reports')
      .insert({
        project_id: projectId,
        period_start: monthRange.periodStart,
        period_end: monthRange.periodEnd,
        pdf_path: pdfPath,
        pdf_url: pdfUrl,
        pdf_name: pdfName,
        file_size: Number.isFinite(fileSize) ? Math.trunc(fileSize) : null,
        metrics_jsonb: normalizedMetrics,
        operational_comment: operationalComment || null,
        ai_context_text: aiContextText,
        extraction_confidence: extractionConfidence,
        extraction_warnings: extractionWarnings,
        source_evidence: extraction.source_evidence,
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
        period_start: monthRange.periodStart,
        period_end: monthRange.periodEnd,
        metrics: normalizedMetrics,
        extraction_confidence: extractionConfidence,
        extraction_warnings: extractionWarnings,
        source_evidence: extraction.source_evidence,
      },
      analysis: {
        summary,
        operational_comment: operationalComment,
        ai_context_text: aiContextText,
        key_insights: keyInsights,
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
