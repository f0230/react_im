// All KIE API calls are proxied through /api/studio to avoid CORS and keep
// the API key server-side. The browser never calls api.kie.ai directly.

const STUDIO_API = '/api/studio';

async function studioPost(action: string, body: Record<string, any>): Promise<any> {
  const res = await fetch(`${STUDIO_API}?action=${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Unexpected response from server: ${text.slice(0, 200)}`);
  }

  if (!res.ok) {
    throw new Error(data?.error || `Server error: ${res.status}`);
  }

  return data;
}

function tryParseJsonArray(value: any): string[] | null {
  if (Array.isArray(value) && value.length) {
    return value.filter((u) => typeof u === 'string');
  }
  if (typeof value === 'string' && value.startsWith('[')) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed) && parsed.length) {
        return parsed.filter((u) => typeof u === 'string');
      }
    } catch { /* not valid JSON */ }
  }
  return null;
}

function extractResultUrls(payload: any): string[] {
  const candidates = [
    payload?.resultUrls,
    payload?.response?.resultUrls,
    payload?.response?.originUrls,
    payload?.info?.resultUrls,
    payload?.urls,
  ];

  for (const candidate of candidates) {
    const urls = tryParseJsonArray(candidate);
    if (urls) return urls;
  }

  const singleUrlCandidates = [
    payload?.url,
    payload?.resultUrl,
    payload?.imageUrl,
    payload?.videoUrl,
    payload?.response?.resultUrl,
    payload?.response?.videoUrl,
  ];

  for (const candidate of singleUrlCandidates) {
    if (typeof candidate === 'string' && candidate) {
      return [candidate];
    }
  }

  return [];
}

// ---------------------------------------------------------------------------
// File Upload — routes through /api/kie-upload server proxy
// Accepts: blob: URLs, data: URLs, or https: URLs
// ---------------------------------------------------------------------------
export async function uploadFile(
  urlOrDataUrl: string,
  uploadPath = 'images/studio-dte',
): Promise<string> {
  // Public https URLs (Supabase CDN, etc.) are passed directly to KIE —
  // the API accepts them natively and this avoids a costly server-side re-fetch
  // that causes 504 timeouts on Vercel.
  if (urlOrDataUrl.startsWith('https://') || urlOrDataUrl.startsWith('http://')) {
    return urlOrDataUrl;
  }

  let imageDataUrl = urlOrDataUrl;

  // blob: URLs are browser-local — convert to base64 so the server can read it
  if (urlOrDataUrl.startsWith('blob:')) {
    const fetchRes = await fetch(urlOrDataUrl);
    const blob = await fetchRes.blob();
    imageDataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  }

  const res = await fetch('/api/kie-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageDataUrl, uploadPath }),
  });

  const text = await res.text();
  let data: any;
  try { data = JSON.parse(text); } catch { throw new Error(`Upload error: ${text.slice(0, 200)}`); }

  if (!res.ok) throw new Error(data?.error || `Upload failed (${res.status})`);
  if (!data.fileUrl) throw new Error('No file URL in upload response');
  return data.fileUrl;
}

/** Backwards-compatible alias */
export const uploadImage = (url: string) => uploadFile(url, 'images/studio-dte');

// ---------------------------------------------------------------------------
// Market API  (Nano Banana, Kling, Sora 2) — proxied server-side
// ---------------------------------------------------------------------------
export async function createMarketTask(
  model: string,
  input: Record<string, any>,
  options?: {
    callBackUrl?: string;
    progressCallBackUrl?: string;
  },
): Promise<string> {
  const body: Record<string, any> = { model, input };
  if (options?.callBackUrl) body.callBackUrl = options.callBackUrl;
  if (options?.progressCallBackUrl) body.progressCallBackUrl = options.progressCallBackUrl;

  const data = await studioPost('market-create', body);
  const id = data.taskId;
  if (!id) throw new Error('No taskId en la respuesta');
  return String(id);
}

export async function pollMarketTask(taskId: string): Promise<{ urls: string[] }> {
  const maxRetries = 120;
  const interval = 5000;

  for (let i = 0; i < maxRetries; i++) {
    const data = await studioPost('market-poll', { taskId });

    if (import.meta.env.DEV) console.log(`[KIE] Poll (${taskId}):`, data);

    if (data.code !== 200) {
      if (data.code === 404 && i < 5) {
        await new Promise((r) => setTimeout(r, interval));
        continue;
      }
      throw new Error(data.msg || 'Error checking task status');
    }

    const d = data.data || {};
    const state = (d.state || '').toLowerCase();

    if (state === 'success') {
      let urls: string[] = [];
      if (d.resultJson) {
        try {
          const result =
            typeof d.resultJson === 'string' ? JSON.parse(d.resultJson) : d.resultJson;
          urls = extractResultUrls(result);
        } catch { /* ignore */ }
      }
      if (!urls.length) urls = extractResultUrls(d);
      return { urls };
    }

    if (state === 'fail') {
      throw new Error(d.failMsg || d.reason || 'Generation failed');
    }

    await new Promise((r) => setTimeout(r, interval));
  }

  throw new Error('Timeout: la generación tardó más de 10 minutos');
}

// ---------------------------------------------------------------------------
// Veo 3 / 3.1 API — proxied server-side
// ---------------------------------------------------------------------------
export async function createVeoTask(params: {
  prompt: string;
  model: string;
  imageUrls?: string[];
  aspectRatio?: string;
  seed?: number;
  enableTranslation?: boolean;
  enableFallback?: boolean;
  generationType?: string;
  callBackUrl?: string;
}): Promise<string> {
  const payload: Record<string, any> = {
    prompt: params.prompt,
    model: params.model,
    aspect_ratio: params.aspectRatio || '16:9',
  };

  if (params.generationType) payload.generationType = params.generationType;
  if (params.imageUrls?.length) payload.imageUrls = params.imageUrls;
  if (typeof params.seed === 'number' && isFinite(params.seed)) payload.seeds = params.seed;
  if (params.enableTranslation !== undefined) payload.enableTranslation = params.enableTranslation;
  if (params.enableFallback !== undefined) payload.enableFallback = params.enableFallback;
  if (params.callBackUrl) payload.callBackUrl = params.callBackUrl;

  const data = await studioPost('veo-create', payload);
  const id = data.taskId;
  if (!id) throw new Error('No taskId en la respuesta de Veo');
  return String(id);
}

export async function pollVeoTask(taskId: string): Promise<{ urls: string[] }> {
  const maxRetries = 60;   // 60 × 15s = 15 min max
  const interval = 15000; // Veo takes 2-5 min; 15s avoids hammering the API

  for (let i = 0; i < maxRetries; i++) {
    const data = await studioPost('veo-poll', { taskId });

    if (import.meta.env.DEV) console.log(`[KIE] Veo poll (${taskId}):`, data);

    if (data.code !== 200) {
      throw new Error(data.msg || 'Error checking Veo task status');
    }

    const flag = data.successFlag ?? data.data?.successFlag;
    const details = data.data || {};

    if (flag === 1) {
      const urls = extractResultUrls(details);
      return { urls };
    }
    if (flag === 2 || flag === 3) {
      throw new Error(
        details.errorMessage || data.msg || 'Veo generation failed',
      );
    }

    await new Promise((r) => setTimeout(r, interval));
  }

  throw new Error('Timeout: Veo tardó más de 10 minutos');
}

// ---------------------------------------------------------------------------
// Topaz Upscale (Image & Video)
// ---------------------------------------------------------------------------
export async function createUpscaleTask(
  url: string,
  type: 'image' | 'video',
  upscaleFactor = '2',
): Promise<string> {
  const model = type === 'video' ? 'topaz/video-upscale' : 'topaz/image-upscale';
  const inputKey = type === 'video' ? 'video_url' : 'image_url';
  return createMarketTask(model, { [inputKey]: url, upscale_factor: upscaleFactor });
}
