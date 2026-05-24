import { supabase } from '@/lib/supabaseClient';

const API_BASE = '/api';

async function getToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.access_token;
}

export async function generateProjectPostCopy({
  projectId,
  serviceId = null,
  brief,
  selectedPlatforms = [],
  format = 'post',
  mediaContext = {},
  selectedAccounts = [],
  aiPlanning = null,
}) {
  const token = await getToken();
  const res = await fetch(`${API_BASE}/post-copywriter`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      projectId,
      serviceId,
      brief,
      selectedPlatforms,
      format,
      mediaContext,
      selectedAccounts,
      aiPlanning,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.detail || data?.error || 'No se pudo generar el copy');
  }

  if (!data?.output?.copy) {
    throw new Error('La IA no devolvió un copy válido');
  }

  return data.output;
}

export async function refineProjectPostCopy({
  projectId,
  serviceId = null,
  currentCopy = '',
  userInstruction,
  selectedPlatforms = [],
  format = 'post',
  mediaContext = {},
  selectedAccounts = [],
  aiPlanning = null,
}) {
  const token = await getToken();
  const res = await fetch(`${API_BASE}/post-copywriter`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'refine-copy',
      projectId,
      serviceId,
      currentCopy,
      userInstruction,
      selectedPlatforms,
      format,
      mediaContext,
      selectedAccounts,
      aiPlanning,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.detail || data?.error || 'No se pudo editar el copy');
  }

  if (!data?.output?.copy) {
    throw new Error('La IA no devolviÃ³ un copy vÃ¡lido');
  }

  return data.output;
}

export async function generateBrandDocs({ projectId, extraContext = '' }) {
  const token = await getToken();
  const res = await fetch(`${API_BASE}/generate-brand-docs`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ projectId, extraContext }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.detail || data?.error || 'No se pudo generar el brand kit');
  }

  if (!Array.isArray(data?.docs) || data.docs.length === 0) {
    throw new Error('La IA no devolvió documentos de marca válidos');
  }

  return data.docs;
}
