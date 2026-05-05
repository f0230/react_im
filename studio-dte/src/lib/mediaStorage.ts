import { Node } from '@xyflow/react';
import { supabase } from './supabaseClient';

const STUDIO_BUCKET = 'banana-ai';
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24;

interface ProxyUploadResponse {
  path?: string;
}

function normalizeExtFromMime(mimeType: string | null | undefined): string {
  const normalized = (mimeType || '').toLowerCase();
  if (normalized.includes('image/jpeg')) return 'jpg';
  if (normalized.includes('image/webp')) return 'webp';
  if (normalized.includes('image/gif')) return 'gif';
  if (normalized.includes('image/avif')) return 'avif';
  if (normalized.includes('video/mp4')) return 'mp4';
  if (normalized.includes('video/webm')) return 'webm';
  if (normalized.includes('video/quicktime')) return 'mov';
  if (normalized.includes('video/')) return 'mp4';
  return 'png';
}

function sanitizeTaskId(taskId: string): string {
  return (taskId || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '');
}

async function persistViaProxy(
  mediaUrl: string,
  taskId: string,
): Promise<{ storagePath: string; signedUrl: string }> {
  const response = await fetch('/api/studio?action=proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageUrl: mediaUrl, taskId }),
  });

  const text = await response.text();
  let data: ProxyUploadResponse = {};
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Invalid proxy response: ${text.slice(0, 200)}`);
  }

  if (!response.ok) {
    throw new Error((data as { error?: string })?.error || `Proxy upload failed (${response.status})`);
  }

  if (!data.path) {
    throw new Error('Proxy upload succeeded but returned no storage path');
  }

  const signedUrl = await createStudioSignedUrl(data.path);
  return { storagePath: data.path, signedUrl };
}

async function persistViaClient(
  mediaUrl: string,
  taskId: string,
): Promise<{ storagePath: string; signedUrl: string }> {
  const fetchRes = await fetch(mediaUrl);
  if (!fetchRes.ok) {
    throw new Error(`Client fetch failed (${fetchRes.status})`);
  }

  const blob = await fetchRes.blob();
  const contentType = blob.type || 'application/octet-stream';
  const ext = normalizeExtFromMime(contentType);
  const fileName = `banana-${sanitizeTaskId(taskId)}-${Date.now()}.${ext}`;

  const { data, error } = await supabase.storage
    .from(STUDIO_BUCKET)
    .upload(fileName, blob, { contentType, upsert: true });

  if (error) {
    throw error;
  }

  const storagePath = data?.path || fileName;
  const signedUrl = await createStudioSignedUrl(storagePath);
  return { storagePath, signedUrl };
}

export async function createStudioSignedUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(STUDIO_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

  if (error) {
    throw error;
  }

  const signedUrl = data?.signedUrl;
  if (!signedUrl) {
    throw new Error('No signedUrl returned by Supabase storage');
  }

  return signedUrl;
}

export async function persistMediaUrl(
  mediaUrl: string,
  taskId: string,
): Promise<{ storagePath: string; signedUrl: string }> {
  try {
    return await persistViaProxy(mediaUrl, taskId);
  } catch (proxyError) {
    // Fallback for environments where server proxy env vars are missing.
    // Requires authenticated user with upload permission on bucket.
    try {
      return await persistViaClient(mediaUrl, taskId);
    } catch (clientError) {
      const proxyMsg = proxyError instanceof Error ? proxyError.message : String(proxyError);
      const clientMsg = clientError instanceof Error ? clientError.message : String(clientError);
      throw new Error(`Media persist failed. Proxy: ${proxyMsg}. Client: ${clientMsg}`);
    }
  }
}

export async function hydrateNodeMediaUrls(nodes: Node[]): Promise<Node[]> {
  // Collect all nodes that need a signed URL renewal
  const nodesNeedingHydration: Array<{ index: number; node: Node; storagePath: string }> = [];
  nodes.forEach((node, index) => {
    const nodeData = (node.data && typeof node.data === 'object' ? node.data : {}) as Record<string, any>;
    const storagePath = typeof nodeData.storagePath === 'string' ? nodeData.storagePath : null;
    if (storagePath) nodesNeedingHydration.push({ index, node, storagePath });
  });

  if (nodesNeedingHydration.length === 0) return nodes;

  // Batch-sign all paths in a single request instead of N separate calls
  const paths = nodesNeedingHydration.map((n) => n.storagePath);
  const { data: signedEntries, error } = await supabase.storage
    .from(STUDIO_BUCKET)
    .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);

  if (error) {
    console.warn('[media-storage] Batch sign failed, skipping hydration:', error.message);
    return nodes;
  }

  // Build a path → signedUrl lookup
  const signedUrlMap = new Map<string, string>();
  (signedEntries ?? []).forEach((entry) => {
    if (entry.signedUrl) signedUrlMap.set(entry.path, entry.signedUrl);
  });

  // Apply signed URLs back to nodes
  const result = [...nodes];
  for (const { index, node, storagePath } of nodesNeedingHydration) {
    const signedUrl = signedUrlMap.get(storagePath);
    if (!signedUrl) continue;

    const nodeData = (node.data && typeof node.data === 'object' ? node.data : {}) as Record<string, any>;
    if (node.type === 'output') {
      result[index] = { ...node, data: { ...nodeData, resultUrl: signedUrl } };
    } else if (node.type === 'image') {
      result[index] = { ...node, data: { ...nodeData, imageUrl: signedUrl } };
    }
  }

  return result;
}
