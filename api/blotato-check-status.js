/**
 * GET /api/blotato-check-status
 * Verifica el estado de una publicación en Blotato y actualiza la DB
 * Poll: GET /posts/:postSubmissionId
 */

import { getSupabaseAdmin } from '../server/utils/supabaseServer.js';

const BLOTATO_API_BASE = 'https://backend.blotato.com/v2';

function getQueryParam(req, name) {
  const value = req?.query?.[name];
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function getTokenFromRequest(req) {
  const header = req?.headers?.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice(7).trim();
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const postId = getQueryParam(req, 'postId');
  if (!postId) {
    return res.status(400).json({ error: 'postId is required' });
  }

  const supabase = getSupabaseAdmin();

  // Autenticación
  const token = getTokenFromRequest(req);
  if (!token) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }

  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Obtener el post
  const { data: post, error: postError } = await supabase
    .from('service_posts')
    .select('*')
    .eq('id', postId)
    .maybeSingle();

  if (postError || !post) {
    return res.status(404).json({ error: 'Post not found' });
  }

  // Verificar acceso al proyecto
  const { data: hasAccess, error: accessError } = await supabase
    .rpc('fn_has_project_access', { p_id: post.project_id, u_id: authData.user.id });
  
  if (accessError) {
    return res.status(500).json({ error: 'Failed to verify project access', detail: accessError.message });
  }
  
  if (!hasAccess) {
    return res.status(403).json({ error: 'Forbidden: no project access' });
  }

  // Si ya está en estado final, devolver sin consultar
  if (['published', 'failed', 'cancelled'].includes(post.status)) {
    return res.status(200).json({
      ok: true,
      post,
      isFinal: true
    });
  }

  const apiKey = process.env.BLOTATO_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'BLOTATO_API_KEY not configured in environment' });
  }

  try {
    // Consultar estado en Blotato
    const blotatoRes = await fetch(
      `${BLOTATO_API_BASE}/posts/${post.blotato_submission_id}`,
      { headers: { 'blotato-api-key': apiKey } }
    );

    if (!blotatoRes.ok) {
      const errorText = await blotatoRes.text();
      return res.status(blotatoRes.status).json({
        error: 'Blotato API error',
        detail: errorText
      });
    }

    const blotatoData = await blotatoRes.json();
    const blotatoStatus = blotatoData.status;

    // Mapear estado de Blotato a nuestro estado
    let newStatus = post.status;
    let updates = {};

    switch (blotatoStatus) {
      case 'published':
        newStatus = 'published';
        updates.published_at = new Date().toISOString();
        updates.public_url = blotatoData.publicUrl || null;
        break;
      case 'failed':
        newStatus = 'failed';
        updates.error_message = blotatoData.errorMessage || 'Unknown error';
        break;
      case 'in-progress':
        if (post.status === 'draft') {
          newStatus = 'publishing';
        }
        if (blotatoData.scheduledAt && post.status === 'scheduled') {
          updates.scheduled_time = blotatoData.scheduledAt;
        }
        break;
    }

    if (newStatus !== post.status || Object.keys(updates).length > 0) {
      updates.status = newStatus;
      updates.updated_at = new Date().toISOString();

      const { error: updateError } = await supabase
        .from('service_posts')
        .update(updates)
        .eq('id', postId);

      if (updateError) {
        throw updateError;
      }

      post.status = newStatus;
      Object.assign(post, updates);
    }

    return res.status(200).json({
      ok: true,
      post,
      blotatoStatus,
      isFinal: ['published', 'failed', 'cancelled'].includes(newStatus)
    });

  } catch (error) {
    console.error('Blotato check status error:', error);
    return res.status(500).json({
      error: 'Failed to check post status',
      detail: error.message
    });
  }
}
