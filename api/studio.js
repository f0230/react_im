/**
 * /api/studio — merged handler for Studio / Banana AI image utilities
 *
 * Routes (action param):
 *   proxy      POST /api/studio-proxy  → /api/studio?action=proxy
 *   kie-upload POST /api/kie-upload    → /api/studio?action=kie-upload
 */

import { createClient } from '@supabase/supabase-js';

const KIE_UPLOAD_BASE_URL = 'https://kieai.redpandaai.co';

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
  if (contentType === 'image/jpeg') return 'jpg';
  if (contentType === 'image/webp') return 'webp';
  if (contentType === 'image/gif') return 'gif';
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
  const contentType = imageResponse.headers.get('content-type') || 'image/png';
  const ext = contentType.includes('webp') ? 'webp' : contentType.includes('jpeg') ? 'jpg' : 'png';

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
// Uploads a reference image (data URL) to the KIE AI CDN.
// Body: { imageDataUrl: string }

async function handleKieUpload(req, res) {
  const { imageDataUrl } = parseBody(req);

  if (!imageDataUrl || typeof imageDataUrl !== 'string') {
    return res.status(400).json({ error: 'Missing imageDataUrl in request body.' });
  }

  const apiKey = process.env.KIE_API_KEY || process.env.VITE_KIE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'KIE_API_KEY not configured on server.' });
  }

  const imageResponse = await fetch(imageDataUrl);
  if (!imageResponse.ok) {
    throw new Error(`Could not parse reference image: HTTP ${imageResponse.status}`);
  }

  const blob = await imageResponse.blob();
  const extension = getFileExtensionFromType(blob.type);
  const fileName = `reference-${Date.now()}.${extension}`;

  const formData = new FormData();
  formData.append('file', blob, fileName);
  formData.append('uploadPath', 'images/banana-reference');
  formData.append('fileName', fileName);

  const uploadResponse = await fetch(`${KIE_UPLOAD_BASE_URL}/api/file-stream-upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  const data = await parseJsonResponse(uploadResponse);
  if (data.code !== 200) {
    throw new Error(data.msg || `Reference image upload failed (${uploadResponse.status})`);
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

// ─── main handler ────────────────────────────────────────────────────────────

const ACTIONS = {
  proxy: handleProxy,
  'kie-upload': handleKieUpload,
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
