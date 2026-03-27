const KIE_API = 'https://api.kie.ai/api/v1';
const KIE_UPLOAD = 'https://kieai.redpandaai.co/api';

function apiKey(): string {
  // @ts-ignore
  return process.env.KIE_API_KEY || '';
}

function authHeaders(json = true): Record<string, string> {
  const h: Record<string, string> = { Authorization: `Bearer ${apiKey()}` };
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

// ---------------------------------------------------------------------------
// File Upload (base64)
// ---------------------------------------------------------------------------
export async function uploadBase64(base64WithPrefix: string): Promise<string> {
  const base64Data = base64WithPrefix.includes(',')
    ? base64WithPrefix.split(',')[1]
    : base64WithPrefix;
  const mimeType = base64WithPrefix.includes(';base64')
    ? base64WithPrefix.split(';')[0].split(':')[1]
    : 'image/png';
  const ext = mimeType.split('/')[1] || 'png';

  const res = await fetch(`${KIE_UPLOAD}/file-base64-upload`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      base64Data,
      uploadPath: 'studio-dte',
      fileName: `ref-${Date.now()}.${ext}`,
    }),
  });

  if (!res.ok) throw new Error(`Upload failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.downloadUrl || data.url;
}

// ---------------------------------------------------------------------------
// Market API  (Nano Banana, Kling, Sora 2)
// ---------------------------------------------------------------------------
export async function createMarketTask(
  model: string,
  input: Record<string, any>,
): Promise<string> {
  const payload = { model, input };
  console.log('[KIE] createTask request:', JSON.stringify(payload, null, 2));

  const res = await fetch(`${KIE_API}/jobs/createTask`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  console.log('[KIE] createTask response:', res.status, text);

  if (!res.ok) throw new Error(`Create task failed (${res.status}): ${text}`);

  let data: any;
  try { data = JSON.parse(text); } catch { throw new Error(`Invalid JSON from KIE: ${text}`); }

  // Try multiple possible response shapes
  const id = data.taskId || data.task_id || data.data?.taskId || data.data?.task_id;
  if (!id) throw new Error(`No taskId in response: ${text}`);
  return id;
}

export async function pollMarketTask(
  taskId: string,
  onProgress?: (state: string) => void,
): Promise<{ urls: string[] }> {
  let delay = 3000;

  while (true) {
    await new Promise((r) => setTimeout(r, delay));

    const res = await fetch(`${KIE_API}/jobs/recordInfo?taskId=${taskId}`, {
      headers: authHeaders(false),
    });
    const data = await res.json();
    onProgress?.(data.state);

    if (data.state === 'success') {
      let urls: string[] = [];
      if (data.resultJson) {
        try {
          urls = JSON.parse(data.resultJson).resultUrls || [];
        } catch { /* ignore parse errors */ }
      }
      return { urls };
    }

    if (data.state === 'fail') {
      throw new Error(data.message || 'Task failed');
    }

    delay = Math.min(delay * 1.5, 20000);
  }
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

  console.log('[KIE] veo generate request:', JSON.stringify(body, null, 2));

  const res = await fetch(`${KIE_API}/veo/generate`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });

  const text = await res.text();
  console.log('[KIE] veo generate response:', res.status, text);

  if (!res.ok) throw new Error(`Veo task failed (${res.status}): ${text}`);

  let data: any;
  try { data = JSON.parse(text); } catch { throw new Error(`Invalid JSON from KIE: ${text}`); }

  const id = data.taskId || data.task_id || data.data?.taskId || data.data?.task_id;
  if (!id) throw new Error(`No taskId in response: ${text}`);
  return id;
}

export async function pollVeoTask(taskId: string): Promise<{ urls: string[] }> {
  let delay = 5000;

  while (true) {
    await new Promise((r) => setTimeout(r, delay));

    const res = await fetch(`${KIE_API}/veo/record-info?taskId=${taskId}`, {
      headers: authHeaders(false),
    });
    const data = await res.json();

    // successFlag: 0=processing, 1=success, 2=partial, 3=failed
    if (data.successFlag === 1 || data.successFlag === 2) {
      return { urls: data.response?.resultUrls || [] };
    }
    if (data.successFlag === 3) {
      throw new Error('Veo generation failed');
    }

    delay = Math.min(delay * 1.5, 30000);
  }
}
