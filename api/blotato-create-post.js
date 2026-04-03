/**
 * POST /api/blotato-create-post
 * Crea una publicación en Blotato API (/posts)
 * Soporta: publicación inmediata, scheduling específico, o useNextFreeSlot
 */

import { getSupabaseAdmin } from '../server/utils/supabaseServer.js';

const BLOTATO_API_BASE = 'https://backend.blotato.com/v2';

const PLATFORM_TARGET_TYPES = {
  twitter: 'twitter',
  linkedin: 'linkedin',
  instagram: 'instagram',
  facebook: 'facebook',
  tiktok: 'tiktok',
  pinterest: 'pinterest',
  threads: 'threads',
  bluesky: 'bluesky',
  youtube: 'youtube'
};

function getTokenFromRequest(req) {
  const header = req?.headers?.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice(7).trim();
}

function getTargetConfig(platform, customConfig = {}) {
  const base = { targetType: PLATFORM_TARGET_TYPES[platform] };
  
  switch (platform) {
    case 'facebook':
      return { ...base, pageId: customConfig.pageId };
    case 'linkedin':
      return customConfig.pageId ? { ...base, pageId: customConfig.pageId } : base;
    case 'instagram':
      return {
        ...base,
        mediaType: customConfig.mediaType || 'reel',
        altText: customConfig.altText,
        collaborators: customConfig.collaborators,
        coverImageUrl: customConfig.coverImageUrl,
        shareToFeed: customConfig.shareToFeed,
        audioName: customConfig.audioName
      };
    case 'tiktok':
      return {
        ...base,
        privacyLevel: customConfig.privacyLevel || 'PUBLIC_TO_EVERYONE',
        disabledComments: customConfig.disabledComments ?? false,
        disabledDuet: customConfig.disabledDuet ?? false,
        disabledStitch: customConfig.disabledStitch ?? false,
        isBrandedContent: customConfig.isBrandedContent ?? false,
        isYourBrand: customConfig.isYourBrand ?? false,
        isAiGenerated: customConfig.isAiGenerated ?? false,
        title: customConfig.title,
        autoAddMusic: customConfig.autoAddMusic,
        isDraft: customConfig.isDraft,
        imageCoverIndex: customConfig.imageCoverIndex,
        videoCoverTimestamp: customConfig.videoCoverTimestamp
      };
    case 'pinterest':
      return {
        ...base,
        boardId: customConfig.boardId,
        title: customConfig.title,
        altText: customConfig.altText,
        link: customConfig.link
      };
    case 'threads':
      return {
        ...base,
        replyControl: customConfig.replyControl || 'everyone'
      };
    case 'youtube':
      return {
        ...base,
        title: customConfig.title || 'Video',
        privacyStatus: customConfig.privacyStatus || 'private',
        shouldNotifySubscribers: customConfig.shouldNotifySubscribers ?? true,
        isMadeForKids: customConfig.isMadeForKids ?? false,
        containsSyntheticMedia: customConfig.containsSyntheticMedia ?? false
      };
    default:
      return base;
  }
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body || {};
  const { 
    serviceId, 
    projectId, 
    contentText, 
    mediaUrls = [],
    accountId, 
    platform,
    targetConfig = {},
    scheduling = {},
    additionalPosts = []
  } = body;

  // Validaciones
  if (!serviceId || !projectId) {
    return res.status(400).json({ error: 'serviceId and projectId are required' });
  }
  if (!contentText?.trim()) {
    return res.status(400).json({ error: 'contentText is required' });
  }
  if (!accountId || !platform) {
    return res.status(400).json({ error: 'accountId and platform are required' });
  }
  if (!PLATFORM_TARGET_TYPES[platform]) {
    return res.status(400).json({ error: `Unsupported platform: ${platform}` });
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

  // Verificar acceso al proyecto
  const { data: hasAccess, error: accessError } = await supabase
    .rpc('fn_has_project_access', { p_id: projectId, u_id: userId });
  
  if (accessError) {
    return res.status(500).json({ error: 'Failed to verify project access', detail: accessError.message });
  }
  
  if (!hasAccess) {
    return res.status(403).json({ error: 'Forbidden: no project access' });
  }

  const apiKey = process.env.BLOTATO_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'BLOTATO_API_KEY not configured in environment' });
  }

  try {
    // Construir payload de Blotato
    const blotatoPayload = {
      post: {
        accountId,
        content: {
          text: contentText.trim(),
          mediaUrls: mediaUrls || [],
          platform: PLATFORM_TARGET_TYPES[platform],
          ...(additionalPosts.length > 0 && { additionalPosts })
        },
        target: getTargetConfig(platform, targetConfig)
      }
    };

    // Añadir scheduling (ROOT LEVEL - no dentro de post)
    if (scheduling.type === 'scheduled' && scheduling.time) {
      blotatoPayload.scheduledTime = scheduling.time;
    } else if (scheduling.type === 'nextSlot') {
      blotatoPayload.useNextFreeSlot = true;
    }

    // Llamar a Blotato API
    const blotatoRes = await fetch(`${BLOTATO_API_BASE}/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'blotato-api-key': apiKey
      },
      body: JSON.stringify(blotatoPayload)
    });

    const blotatoData = await blotatoRes.json();

    if (!blotatoRes.ok) {
      return res.status(blotatoRes.status).json({
        error: 'Blotato API error',
        detail: blotatoData
      });
    }

    const submissionId = blotatoData.postSubmissionId;
    
    // Determinar status inicial
    let initialStatus = 'draft';
    let scheduledTime = null;
    
    if (scheduling.type === 'immediate') {
      initialStatus = 'publishing';
    } else if (scheduling.type === 'scheduled' && scheduling.time) {
      initialStatus = 'scheduled';
      scheduledTime = scheduling.time;
    } else if (scheduling.type === 'nextSlot') {
      initialStatus = 'scheduled';
    }

    // Guardar en base de datos
    const { data: postRecord, error: insertError } = await supabase
      .from('service_posts')
      .insert({
        service_id: serviceId,
        project_id: projectId,
        content_text: contentText.trim(),
        media_urls: mediaUrls || [],
        account_id: accountId,
        platform,
        target_config: targetConfig,
        status: initialStatus,
        blotato_submission_id: submissionId,
        scheduled_time: scheduledTime,
        created_by: userId
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    return res.status(200).json({
      ok: true,
      post: postRecord,
      blotatoSubmissionId: submissionId,
      status: initialStatus
    });

  } catch (error) {
    console.error('Blotato create post error:', error);
    return res.status(500).json({
      error: 'Failed to create post',
      detail: error.message
    });
  }
}
