
import OpenAI from 'openai';
import { getSupabaseAdmin } from '../../utils/supabaseServer.js';

function parseJsonBody(req) {
  if (!req?.body) return null;
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

function sanitizeText(value, fallback = '') {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function getTokenFromRequest(req) {
  const header = req?.headers?.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice(7).trim();
}

async function verifyRequest(req, res) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    res.status(500).json({ error: 'Server configuration error: missing Supabase credentials' });
    return null;
  }

  const token = getTokenFromRequest(req);
  if (!token) {
    res.status(401).json({ error: 'Missing Authorization header' });
    return null;
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user?.id) {
    res.status(401).json({ error: 'Unauthorized: invalid token' });
    return null;
  }

  return { supabase, user: data.user };
}

function createOpenAI() {
  const apiKey = sanitizeText(process.env.OPENAI_API_KEY);
  if (!apiKey) {
    const error = new Error('Missing OPENAI_API_KEY');
    error.statusCode = 500;
    throw error;
  }
  return new OpenAI({ apiKey });
}

function extractJsonObject(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    // continue
  }

  const fenced = text.match(/```json\s*([\s\S]*?)```/i) || text.match(/```\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    try {
      return JSON.parse(fenced[1]);
    } catch {
      // continue
    }
  }

  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {
      // continue
    }
  }

  return null;
}

async function handleTranscribe(req, res, body) {
  const audioBase64 = sanitizeText(body.audioBase64);
  const mimeType = sanitizeText(body.mimeType, 'audio/webm');

  if (!audioBase64) {
    return res.status(400).json({ error: 'audioBase64 is required' });
  }

  const maxBytes = Number(process.env.OPENAI_CLIENT_MESSAGE_MAX_AUDIO_BYTES || 8 * 1024 * 1024);
  const audioBuffer = Buffer.from(audioBase64, 'base64');
  if (!audioBuffer.length) {
    return res.status(400).json({ error: 'Audio is empty' });
  }
  if (audioBuffer.byteLength > maxBytes) {
    return res.status(413).json({ error: 'Audio is too large' });
  }

  const client = createOpenAI();
  const model = sanitizeText(process.env.OPENAI_TRANSCRIPTION_MODEL, 'gpt-4o-mini-transcribe');
  const extension = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('mpeg') ? 'mp3' : 'webm';
  const file = new File([audioBuffer], `client-message.${extension}`, { type: mimeType });

  const transcription = await client.audio.transcriptions.create({
    file,
    model,
    language: 'es',
  });

  return res.status(200).json({
    ok: true,
    model,
    transcript: sanitizeText(transcription?.text),
  });
}

async function handleGenerate(req, res, body) {
  const transcript = sanitizeText(body.transcript);
  const clientContext = sanitizeText(body.clientContext).slice(0, 1200);
  const tone = sanitizeText(body.tone, 'profesional cercano');
  const channel = sanitizeText(body.channel, 'WhatsApp');

  if (!transcript) {
    return res.status(400).json({ error: 'transcript is required' });
  }

  const client = createOpenAI();
  const model = sanitizeText(process.env.OPENAI_CLIENT_MESSAGE_MODEL, 'gpt-4o-mini');

  const response = await client.chat.completions.create({
    model,
    temperature: 0.35,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: [
          'Sos un asistente de Grupo DTE para convertir notas habladas en mensajes listos para clientes.',
          'Escribí en español rioplatense neutro, claro, humano y breve.',
          'Optimizá para ahorrar tokens: no expliques tu razonamiento y devolvé solo JSON.',
          'No inventes datos, precios, fechas ni promesas. Si falta información, redactá de forma flexible.',
          'El mensaje debe sonar profesional, cercano y directo, ideal para WhatsApp o chat comercial.',
        ].join(' '),
      },
      {
        role: 'user',
        content: JSON.stringify({
          channel,
          tone,
          clientContext,
          spokenNote: transcript.slice(0, 3500),
          outputShape: {
            message: 'mensaje final para enviar',
            subject: 'titulo corto opcional',
            followUp: 'siguiente accion sugerida en una frase',
          },
        }),
      },
    ],
  });

  const content = response?.choices?.[0]?.message?.content || '';
  const parsed = extractJsonObject(content);
  const message = sanitizeText(parsed?.message || content);

  if (!message) {
    return res.status(502).json({ error: 'AI did not return a valid message' });
  }

  return res.status(200).json({
    ok: true,
    model,
    output: {
      message,
      subject: sanitizeText(parsed?.subject),
      followUp: sanitizeText(parsed?.followUp),
    },
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = parseJsonBody(req);
  if (!body) {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const auth = await verifyRequest(req, res);
  if (!auth) return;

  const action = sanitizeText(req.query?.action || body.action);

  try {
    if (action === 'transcribe') return await handleTranscribe(req, res, body);
    if (action === 'generate') return await handleGenerate(req, res, body);

    return res.status(400).json({
      error: 'Invalid action',
      available: ['transcribe', 'generate'],
    });
  } catch (error) {
    console.error('client-message-ai failed:', error);
    return res.status(error?.statusCode || 500).json({
      error: 'Failed to process client message',
      detail: error?.message || String(error),
    });
  }
}
