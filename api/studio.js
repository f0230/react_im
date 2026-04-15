/**
 * /api/studio — merged handler for Studio / Banana AI image utilities
 *
 * Routes (action param):
 *   proxy          POST /api/studio-proxy     → download KIE image → Supabase
 *   kie-upload     POST /api/kie-upload       → upload reference file to KIE CDN
 *   market-create  POST /api/studio           → proxy KIE Market createTask
 *   market-poll    POST /api/studio           → proxy KIE Market recordInfo
 *   veo-create     POST /api/studio           → proxy KIE Veo generate
 *   veo-poll       POST /api/studio           → proxy KIE Veo record-info
 */

import { createClient } from '@supabase/supabase-js';

const KIE_API           = 'https://api.kie.ai/api/v1';
const KIE_UPLOAD_BASE_URL = 'https://kieai.redpandaai.co';

function getKieApiKey(res) {
  const key = process.env.KIE_API_KEY || process.env.VITE_KIE_API_KEY;
  if (!key) {
    res.status(500).json({ error: 'KIE_API_KEY not configured on server.' });
    return null;
  }
  return key;
}

// ─── helpers ────────────────────────────────────────────────────────────────

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function parseBody(req) {
  if (!req?.body) return {};
  return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
}

async function parseJsonResponse(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Unexpected upload response (${response.status}): ${text.slice(0, 120)}`);
  }
}

function getFileExtensionFromType(contentType) {
  const normalized = (contentType || '').toLowerCase();
  if (normalized.includes('image/jpeg')) return 'jpg';
  if (normalized.includes('image/webp')) return 'webp';
  if (normalized.includes('image/gif')) return 'gif';
  if (normalized.includes('image/png')) return 'png';
  if (normalized.includes('image/avif')) return 'avif';
  if (normalized.includes('video/mp4')) return 'mp4';
  if (normalized.includes('video/webm')) return 'webm';
  if (normalized.includes('video/quicktime')) return 'mov';
  if (normalized.includes('video/')) return 'mp4';
  return 'png';
}

// ─── action: proxy ───────────────────────────────────────────────────────────
// Downloads an image from an external URL (KIE AI CDN) and uploads it to the
// Supabase 'banana-ai' storage bucket.
// Body: { imageUrl: string, taskId: string }

async function handleProxy(req, res) {
  const { imageUrl, taskId } = parseBody(req);

  if (!imageUrl || typeof imageUrl !== 'string') {
    return res.status(400).json({ error: 'Missing imageUrl in request body.' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured on server.' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`Failed to download image: HTTP ${imageResponse.status}`);
  }

  const arrayBuffer = await imageResponse.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const contentType = imageResponse.headers.get('content-type') || 'application/octet-stream';
  const ext = getFileExtensionFromType(contentType);

  const safeTaskId = (taskId || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '');
  const fileName = `banana-${safeTaskId}-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('banana-ai')
    .upload(fileName, buffer, { contentType, upsert: true });

  if (uploadError) {
    throw new Error(`Supabase upload failed: ${uploadError.message}`);
  }

  return res.status(200).json({ path: fileName });
}

// ─── action: kie-upload ──────────────────────────────────────────────────────
// Uploads a reference image/video (data URL or https URL) to the KIE CDN.
// Body: { imageDataUrl: string, uploadPath?: string }

async function handleKieUpload(req, res) {
  const { imageDataUrl, uploadPath = 'images/studio-dte' } = parseBody(req);

  if (!imageDataUrl || typeof imageDataUrl !== 'string') {
    return res.status(400).json({ error: 'Missing imageDataUrl in request body.' });
  }

  const apiKey = getKieApiKey(res);
  if (!apiKey) return;

  const imageResponse = await fetch(imageDataUrl);
  if (!imageResponse.ok) {
    throw new Error(`Could not fetch reference file: HTTP ${imageResponse.status}`);
  }

  const blob = await imageResponse.blob();
  const extension = getFileExtensionFromType(blob.type);
  const fileName = `ref-${Date.now()}.${extension}`;

  const formData = new FormData();
  formData.append('file', blob, fileName);
  formData.append('uploadPath', uploadPath);
  formData.append('fileName', fileName);

  const uploadResponse = await fetch(`${KIE_UPLOAD_BASE_URL}/api/file-stream-upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  const data = await parseJsonResponse(uploadResponse);
  if (data.code !== 200) {
    throw new Error(data.msg || `Reference upload failed (${uploadResponse.status})`);
  }

  const fileUrl =
    data.data?.fileUrl ||
    data.data?.downloadUrl ||
    data.fileUrl ||
    data.downloadUrl ||
    data.data;

  if (typeof fileUrl !== 'string') {
    throw new Error('Could not find file URL in upload response');
  }

  return res.status(200).json({ fileUrl });
}

// ─── action: market-create ───────────────────────────────────────────────────
// Proxy for KIE Market POST /api/v1/jobs/createTask
// Body: { model, input, callBackUrl?, progressCallBackUrl? }

async function handleMarketCreate(req, res) {
  const { model, input, callBackUrl, progressCallBackUrl } = parseBody(req);
  if (!model || !input) return res.status(400).json({ error: 'Missing model or input.' });

  const apiKey = getKieApiKey(res);
  if (!apiKey) return;

  const body = { model, input };
  if (callBackUrl) body.callBackUrl = callBackUrl;
  if (progressCallBackUrl) body.progressCallBackUrl = progressCallBackUrl;

  const kieRes = await fetch(`${KIE_API}/jobs/createTask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });

  const data = await parseJsonResponse(kieRes);

  if (data.code !== 200) {
    return res.status(400).json({ error: data.msg || `KIE error: ${data.code}` });
  }

  const taskId = data.data?.taskId || data.data?.tid || data.taskId || data.tid;
  if (!taskId) return res.status(500).json({ error: 'No taskId in KIE response.' });

  return res.status(200).json({ taskId: String(taskId) });
}

// ─── action: market-poll ─────────────────────────────────────────────────────
// Proxy for KIE Market GET /api/v1/jobs/recordInfo
// Body: { taskId }

async function handleMarketPoll(req, res) {
  const { taskId } = parseBody(req);
  if (!taskId) return res.status(400).json({ error: 'Missing taskId.' });

  const apiKey = getKieApiKey(res);
  if (!apiKey) return;

  const kieRes = await fetch(`${KIE_API}/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  const data = await parseJsonResponse(kieRes);
  return res.status(200).json(data);
}

// ─── action: veo-create ──────────────────────────────────────────────────────
// Proxy for KIE Veo POST /api/v1/veo/generate
// Body: full Veo request payload

async function handleVeoCreate(req, res) {
  const payload = parseBody(req);

  const apiKey = getKieApiKey(res);
  if (!apiKey) return;

  const kieRes = await fetch(`${KIE_API}/veo/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(payload),
  });

  const data = await parseJsonResponse(kieRes);

  if (data.code && data.code !== 200) {
    return res.status(400).json({ error: data.msg || `Veo error: ${data.code}` });
  }

  const taskId = data.data?.taskId || data.data?.tid || data.taskId || data.tid;
  if (!taskId) return res.status(500).json({ error: 'No taskId in Veo response.' });

  return res.status(200).json({ taskId: String(taskId) });
}

// ─── action: veo-poll ────────────────────────────────────────────────────────
// Proxy for KIE Veo GET /api/v1/veo/record-info
// Body: { taskId }

async function handleVeoPoll(req, res) {
  const { taskId } = parseBody(req);
  if (!taskId) return res.status(400).json({ error: 'Missing taskId.' });

  const apiKey = getKieApiKey(res);
  if (!apiKey) return;

  const kieRes = await fetch(`${KIE_API}/veo/record-info?taskId=${encodeURIComponent(taskId)}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  const data = await parseJsonResponse(kieRes);
  return res.status(200).json(data);
}

// ─── main handler ────────────────────────────────────────────────────────────

const ACTIONS = {
  proxy: handleProxy,
  'kie-upload': handleKieUpload,
  'market-create': handleMarketCreate,
  'market-poll': handleMarketPoll,
  'veo-create': handleVeoCreate,
  'veo-poll': handleVeoPoll,
};

export default async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed. Use POST.' });

  const action = req.query?.action || req.body?.action;

  const actionFn = ACTIONS[action];
  if (!actionFn) {
    return res.status(400).json({ error: `Unknown action: "${action}". Valid: ${Object.keys(ACTIONS).join(', ')}` });
  }

  try {
    return await actionFn(req, res);
  } catch (error) {
    console.error(`[studio:${action}] Error:`, error);
    return res.status(500).json({ error: error.message || 'Studio handler failed' });
  }
}
