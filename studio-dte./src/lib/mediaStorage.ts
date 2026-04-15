import { Node } from '@xyflow/react';
import { supabase } from './supabaseClient';

const STUDIO_BUCKET = 'banana-ai';
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24;

interface ProxyUploadResponse {
  path?: string;
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

export async function hydrateNodeMediaUrls(nodes: Node[]): Promise<Node[]> {
  const hydrated = await Promise.all(
    nodes.map(async (node) => {
      const nodeData = (node.data && typeof node.data === 'object' ? node.data : {}) as Record<string, any>;
      const storagePath = typeof nodeData.storagePath === 'string' ? nodeData.storagePath : null;
      if (!storagePath) return node;

      try {
        const signedUrl = await createStudioSignedUrl(storagePath);
        if (node.type === 'output') {
          return {
            ...node,
            data: {
              ...nodeData,
              resultUrl: signedUrl,
            },
          };
        }

        if (node.type === 'image') {
          return {
            ...node,
            data: {
              ...nodeData,
              imageUrl: signedUrl,
            },
          };
        }
      } catch (error) {
        console.warn('[media-storage] Failed to re-sign media URL:', storagePath, error);
      }

      return node;
    }),
  );

  return hydrated;
}
