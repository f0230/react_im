import { Node } from '@xyflow/react';
import { supabase } from './supabaseClient';

const STUDIO_BUCKET = 'banana-ai';
// 7 days — long enough that workflows reopened days later still render
// without re-signing every asset. Hydration re-signs on each load anyway.
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 7;

/**
 * Retries an async operation with exponential backoff. Used for transient
 * network/storage failures so a single hiccup does not break media loading.
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  { attempts = 3, baseDelayMs = 400 }: { attempts?: number; baseDelayMs?: number } = {},
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (i < attempts - 1) {
        const delay = baseDelayMs * 2 ** i + Math.random() * baseDelayMs;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

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
  return withRetry(async () => {
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
  });
}

export async function persistMediaUrl(
  mediaUrl: string,
  taskId: string,
): Promise<{ storagePath: string; signedUrl: string }> {
  return withRetry(async () => {
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
  }, { attempts: 2, baseDelayMs: 600 });
}

/**
 * Batch-signs a list of storage paths. Returns a path → signed URL map;
 * paths that fail to sign are simply omitted.
 */
export async function createStudioSignedUrls(
  paths: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (paths.length === 0) return map;

  try {
    const entries = await withRetry(async () => {
      const { data, error } = await supabase.storage
        .from(STUDIO_BUCKET)
        .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
      if (error) throw error;
      return data;
    });
    (entries ?? []).forEach((entry) => {
      if (entry.signedUrl && entry.path) map.set(entry.path, entry.signedUrl);
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn('[media-storage] Batch sign failed:', message);
  }
  return map;
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

  let signedEntries: Array<{ error: string | null; path: string | null; signedUrl: string }> | null;
  try {
    signedEntries = await withRetry(async () => {
      const { data, error } = await supabase.storage
        .from(STUDIO_BUCKET)
        .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
      if (error) throw error;
      return data;
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn('[media-storage] Batch sign failed after retries, skipping hydration:', message);
    return nodes;
  }

  // Build a path → signedUrl lookup
  const signedUrlMap = new Map<string, string>();
  (signedEntries ?? []).forEach((entry) => {
    if (entry.signedUrl && entry.path) signedUrlMap.set(entry.path, entry.signedUrl);
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
