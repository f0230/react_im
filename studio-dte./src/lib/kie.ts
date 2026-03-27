const KIE_API = 'https://api.kie.ai/api/v1';
const KIE_UPLOAD = 'https://kieai.redpandaai.co/api';

function apiKey(): string {
  const key = import.meta.env.VITE_KIE_API_KEY;
  if (!key) throw new Error('VITE_KIE_API_KEY no está configurada');
  return key;
}

function authHeaders(json = true): Record<string, string> {
  const h: Record<string, string> = { Authorization: `Bearer ${apiKey()}` };
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

/** Parse KIE JSON response, handling text/mixed responses */
async function parseJson(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Respuesta inesperada de KIE: ${text.slice(0, 200)}`);
  }
}

// ---------------------------------------------------------------------------
// File Upload (stream — matches banana-image-studio approach)
// ---------------------------------------------------------------------------
export async function uploadImage(base64DataUrl: string): Promise<string> {
  const key = apiKey();

  // Convert base64 data URL to blob
  const res = await fetch(base64DataUrl);
  const blob = await res.blob();
  const ext = blob.type.split('/')[1] || 'png';
  const fileName = `ref-${Date.now()}.${ext}`;

  const formData = new FormData();
  formData.append('file', blob, fileName);
  formData.append('uploadPath', 'images/studio-dte');
  formData.append('fileName', fileName);

  const uploadRes = await fetch(`${KIE_UPLOAD}/file-stream-upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}` },
    body: formData,
  });

  const data = await parseJson(uploadRes);
  if (data.code !== 200) {
    throw new Error(data.msg || `Upload failed (${uploadRes.status})`);
  }

  const fileUrl =
    data.data?.fileUrl || data.data?.downloadUrl || data.fileUrl || data.downloadUrl || data.data;
  if (typeof fileUrl !== 'string') throw new Error('No file URL in upload response');
  return fileUrl;
}

// ---------------------------------------------------------------------------
// Market API  (Nano Banana, Kling, Sora 2)
// ---------------------------------------------------------------------------
export async function createMarketTask(
  model: string,
  input: Record<string, any>,
): Promise<string> {
  const key = apiKey();

  const createRes = await fetch(`${KIE_API}/jobs/createTask`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ model, input }),
  });

  const data = await parseJson(createRes);
  if (data.code !== 200) {
    throw new Error(data.msg || `API Error: ${data.code}`);
  }

  const id =
    data.data?.taskId || data.data?.tid || data.taskId || data.tid;
  if (!id) throw new Error('No taskId en la respuesta de KIE');
  return id.toString();
}

export async function pollMarketTask(taskId: string): Promise<{ urls: string[] }> {
  const key = apiKey();
  const maxRetries = 120;
  const interval = 5000;

  for (let i = 0; i < maxRetries; i++) {
    const res = await fetch(`${KIE_API}/jobs/recordInfo?taskId=${taskId}`, {
      headers: { Authorization: `Bearer ${key}` },
    });

    const data = await res.json();
    console.log(`[KIE] Poll (${taskId}):`, data);

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
          const result = JSON.parse(d.resultJson);
          urls = result.resultUrls || [];
          if (!urls.length && result.url) urls = [result.url];
        } catch { /* ignore */ }
      }
      // Fallback
      if (!urls.length) {
        const fallback = d.url || d.imageUrl;
        if (fallback) urls = [fallback];
      }
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
// Veo 3.1 Dedicated API
// ---------------------------------------------------------------------------
export async function createVeoTask(params: {
  prompt: string;
  model: string;
  imageUrls?: string[];
  aspectRatio?: string;
}): Promise<string> {
  const key = apiKey();

  const body: Record<string, any> = {
    prompt: params.prompt,
    model: params.model,
    aspect_ratio: params.aspectRatio || '16:9',
  };

  if (params.imageUrls?.length) {
    body.imageUrls = params.imageUrls;
    body.generationType = 'REFERENCE_2_VIDEO';
  } else {
    body.generationType = 'TEXT_2_VIDEO';
  }

  const res = await fetch(`${KIE_API}/veo/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  });

  const data = await parseJson(res);
  if (data.code && data.code !== 200) {
    throw new Error(data.msg || `Veo API Error: ${data.code}`);
  }

  const id = data.data?.taskId || data.data?.tid || data.taskId || data.tid;
  if (!id) throw new Error('No taskId en la respuesta de Veo');
  return id.toString();
}

export async function pollVeoTask(taskId: string): Promise<{ urls: string[] }> {
  const key = apiKey();
  const maxRetries = 120;
  const interval = 5000;

  for (let i = 0; i < maxRetries; i++) {
    const res = await fetch(`${KIE_API}/veo/record-info?taskId=${taskId}`, {
      headers: { Authorization: `Bearer ${key}` },
    });

    const data = await parseJson(res);
    console.log(`[KIE] Veo poll (${taskId}):`, data);

    // successFlag: 0=processing, 1=success, 2=partial, 3=failed
    const flag = data.successFlag ?? data.data?.successFlag;
    if (flag === 1 || flag === 2) {
      const urls = data.response?.resultUrls || data.data?.resultUrls || [];
      return { urls };
    }
    if (flag === 3) {
      throw new Error('Veo generation failed');
    }

    await new Promise((r) => setTimeout(r, interval));
  }

  throw new Error('Timeout: Veo tardó más de 10 minutos');
}
