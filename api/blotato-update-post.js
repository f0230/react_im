/**
 * PATCH /api/blotato-update-post
 * Actualiza una publicación programada (content y/o time)
 * DELETE para cancelar
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
    res.setHeader('Access-Control-Allow-Methods', 'PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  if (!['PATCH', 'DELETE'].includes(req.method)) {
    res.setHeader('Allow', 'PATCH, DELETE');
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
  const userId = authData.user.id;

  // Obtener el post
  const { data: post, error: postError } = await supabase
    .from('service_posts')
    .select('*')
    .eq('id', postId)
    .maybeSingle();

  if (postError || !post) {
    return res.status(404).json({ error: 'Post not found' });
  }

  // Verificar permisos (creador o admin/worker)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  const canModify = post.created_by === userId || 
                    ['admin', 'worker'].includes(profile?.role);
  
  if (!canModify) {
    return res.status(403).json({ error: 'Forbidden: cannot modify this post' });
  }

  const apiKey = process.env.BLOTATO_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'BLOTATO_API_KEY not configured in environment' });
  }

  // CANCELAR (DELETE)
  if (req.method === 'DELETE') {
    try {
      // Solo se puede cancelar si está scheduled o draft
      if (!['scheduled', 'draft'].includes(post.status)) {
        return res.status(400).json({ 
          error: 'Cannot cancel post that is already publishing or published' 
        });
      }

      // Si tiene submissionId, cancelar en Blotato también
      if (post.blotato_submission_id && post.status === 'scheduled') {
        const blotatoRes = await fetch(
          `${BLOTATO_API_BASE}/schedules/${post.blotato_submission_id}`,
          {
            method: 'DELETE',
            headers: { 'blotato-api-key': apiKey }
          }
        );

        if (!blotatoRes.ok && blotatoRes.status !== 404) {
          const errorText = await blotatoRes.text();
          return res.status(blotatoRes.status).json({
            error: 'Blotato API error',
            detail: errorText
          });
        }
      }

      // Actualizar en DB
      const { error: updateError } = await supabase
        .from('service_posts')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
          updated_by: userId
        })
        .eq('id', postId);

      if (updateError) throw updateError;

      return res.status(200).json({ ok: true, status: 'cancelled' });

    } catch (error) {
      console.error('Blotato cancel error:', error);
      return res.status(500).json({ error: 'Failed to cancel post', detail: error.message });
    }
  }

  // ACTUALIZAR (PATCH)
  const body = req.body || {};
  const { contentText, mediaUrls, scheduledTime } = body;

  try {
    // Solo actualizar si está en estados modificables
    if (!['scheduled', 'draft'].includes(post.status)) {
      return res.status(400).json({ 
        error: 'Cannot update post that is already publishing or published' 
      });
    }

    const updates = { updated_at: new Date().toISOString(), updated_by: userId };
    let needsBlotatoUpdate = false;

    // Actualizar contenido local
    if (contentText !== undefined) {
      updates.content_text = contentText;
      needsBlotatoUpdate = true;
    }
    if (mediaUrls !== undefined) {
      updates.media_urls = mediaUrls;
      needsBlotatoUpdate = true;
    }
    if (scheduledTime !== undefined) {
      updates.scheduled_time = scheduledTime;
      needsBlotatoUpdate = true;
    }

    // Si hay cambios que requieren actualizar en Blotato
    if (needsBlotatoUpdate && post.blotato_submission_id) {
      const patchPayload = { patch: {} };

      if (contentText !== undefined || mediaUrls !== undefined) {
        patchPayload.patch.draft = {
          accountId: post.account_id,
          content: {
            text: contentText !== undefined ? contentText : post.content_text,
            mediaUrls: mediaUrls !== undefined ? mediaUrls : post.media_urls,
            platform: post.platform
          },
          target: { targetType: post.platform }
        };
      }

      if (scheduledTime !== undefined) {
        patchPayload.patch.scheduledTime = scheduledTime;
        updates.scheduled_time = scheduledTime;
      }

      const blotatoRes = await fetch(
        `${BLOTATO_API_BASE}/schedules/${post.blotato_submission_id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'blotato-api-key': apiKey
          },
          body: JSON.stringify(patchPayload)
        }
      );

      if (!blotatoRes.ok) {
        const errorData = await blotatoRes.json().catch(() => ({}));
        return res.status(blotatoRes.status).json({
          error: 'Blotato API error',
          detail: errorData
        });
      }
    }

    // Guardar cambios en DB
    const { data: updatedPost, error: updateError } = await supabase
      .from('service_posts')
      .update(updates)
      .eq('id', postId)
      .select()
      .single();

    if (updateError) throw updateError;

    return res.status(200).json({ ok: true, post: updatedPost });

  } catch (error) {
    console.error('Blotato update error:', error);
    return res.status(500).json({ error: 'Failed to update post', detail: error.message });
  }
}
