import { supabase } from '@/lib/supabaseClient';

const API_BASE = '/api/client-message-ai';

async function getToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.access_token;
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      resolve(result.includes(',') ? result.split(',').pop() : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function postJson(payload) {
  const token = await getToken();
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.detail || data?.error || 'No se pudo procesar el mensaje');
  }

  return data;
}

export async function transcribeClientAudio(audioBlob) {
  const audioBase64 = await blobToBase64(audioBlob);
  const data = await postJson({
    action: 'transcribe',
    audioBase64,
    mimeType: audioBlob.type || 'audio/webm',
  });

  return data.transcript || '';
}

export async function generateClientMessage({
  transcript,
  clientContext = '',
  tone = 'profesional cercano',
  channel = 'WhatsApp',
}) {
  const data = await postJson({
    action: 'generate',
    transcript,
    clientContext,
    tone,
    channel,
  });

  return data.output;
}
