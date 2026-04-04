/**
 * /api/blotato?action=...
 * Consolidates all Blotato serverless handlers into one function.
 *
 * Actions:
 *   GET  ?action=check-status&postId=...   → Poll post status
 *   GET  ?action=sync-accounts&projectId=... → Sync connected accounts
 *   POST ?action=sync-accounts              → Sync connected accounts (body: { projectId })
 *   POST ?action=create-post               → Create a post
 *   PATCH  ?action=update-post&postId=...  → Update scheduled post
 *   DELETE ?action=update-post&postId=...  → Cancel a post
 */

import { randomUUID } from 'crypto';
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

// ─── Helpers ────────────────────────────────────────────────────────────────

function normalizeOptionalString(value) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function normalizeCollaborators(value) {
  const rawValues = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : [];

  const collaborators = rawValues
    .map((item) => String(item || '').replace(/^@+/, '').trim())
    .filter(Boolean)
    .slice(0, 3);

  return collaborators.length > 0 ? collaborators : undefined;
}

function normalizeMediaUrls(mediaUrls = []) {
  if (!Array.isArray(mediaUrls)) return [];
  return mediaUrls
    .map((url) => normalizeOptionalString(url))
    .filter(Boolean);
}

function isVideoMediaUrl(url = '') {
  return /\.(mp4|mov|webm)(\?.*)?$/i.test(String(url || ''));
}

function stringifyBlotatoError(value) {
  if (!value) return '';
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) {
    return value.map((item) => stringifyBlotatoError(item)).filter(Boolean).join(' · ');
  }
  if (typeof value === 'object') {
    return [
      value.errorMessage,
      value.message,
      value.error,
      value.detail,
      value.reason,
      value.description,
    ]
      .map((item) => stringifyBlotatoError(item))
      .filter(Boolean)
      .join(' · ');
  }
  return String(value).trim();
}

function getFallbackPlatformError(platform) {
  if (platform === 'instagram') {
    return 'Instagram rechazo la publicacion sin detalle. Revisa que la cuenta siga conectada en Blotato y que el video sea MP4 o MOV, publico y menor a 100 MB.';
  }
  return 'La plataforma rechazo la publicacion y no devolvio un detalle util.';
}

function getBlotatoErrorMessage(payload, platform) {
  const message = stringifyBlotatoError(payload);
  if (!message || /^(undefined|null|no error)$/i.test(message)) {
    return getFallbackPlatformError(platform);
  }
  return message;
}

function getPublishedTimestamp(post, blotatoData) {
  return (
    normalizeOptionalString(blotatoData?.publishedAt)
    || normalizeOptionalString(blotatoData?.published_at)
    || normalizeOptionalString(post?.scheduled_time)
    || normalizeOptionalString(post?.published_at)
    || new Date().toISOString()
  );
}

function ensurePlatformConsistency(contentPlatform, targetType) {
  if (contentPlatform !== targetType) {
    throw new Error(`content.platform must match target.targetType for ${contentPlatform}`);
  }
}

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

async function authenticate(req, supabase) {
  const token = getTokenFromRequest(req);
  if (!token) return { error: 'Missing Authorization header', status: 401 };
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData?.user?.id) return { error: 'Unauthorized', status: 401 };
  return { user: authData.user };
}

async function verifyProjectAccess(supabase, projectId, userId) {
  const { data: hasAccess, error } = await supabase
    .rpc('fn_has_project_access', { p_id: projectId, u_id: userId });
  if (error) return { error: 'Failed to verify project access', detail: error.message, status: 500 };
  if (!hasAccess) return { error: 'Forbidden: no project access', status: 403 };
  return { ok: true };
}

function getTargetConfig(platform, customConfig = {}, mediaUrls = []) {
  const base = { targetType: PLATFORM_TARGET_TYPES[platform] };
  switch (platform) {
    case 'facebook': {
      const pageId = normalizeOptionalString(customConfig.pageId);
      if (!pageId) throw new Error('Facebook posts require target.pageId');

      const mediaType = normalizeOptionalString(customConfig.mediaType);
      const link = normalizeOptionalString(customConfig.link);

      return {
        ...base,
        pageId,
        ...(['video', 'reel'].includes(mediaType) ? { mediaType } : {}),
        ...(link ? { link } : {})
      };
    }
    case 'linkedin':
      return customConfig.pageId ? { ...base, pageId: customConfig.pageId } : base;
    case 'instagram': {
      const hasVideoMedia = mediaUrls.some((url) => isVideoMediaUrl(url));
      const requestedMediaType = normalizeOptionalString(customConfig.mediaType);
      const mediaType = requestedMediaType === 'story'
        ? 'story'
        : requestedMediaType === 'reel'
          ? 'reel'
          : undefined;
      const altText = hasVideoMedia ? undefined : normalizeOptionalString(customConfig.altText);
      const collaborators = normalizeCollaborators(customConfig.collaborators);
      const coverImageUrl = normalizeOptionalString(customConfig.coverImageUrl);
      const shareToFeed = customConfig.shareToFeed === true ? true : undefined;
      const audioName = normalizeOptionalString(customConfig.audioName);

      return {
        ...base,
        ...(mediaType ? { mediaType } : {}),
        ...(altText ? { altText: altText.slice(0, 1000) } : {}),
        ...(collaborators ? { collaborators } : {}),
        ...(mediaType === 'reel' && coverImageUrl ? { coverImageUrl } : {}),
        ...(mediaType === 'reel' && shareToFeed !== undefined ? { shareToFeed } : {}),
        ...(mediaType === 'reel' && audioName ? { audioName } : {})
      };
    }
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
      return { ...base, replyControl: customConfig.replyControl || 'everyone' };
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

function buildBlotatoPostDraft({ accountId, platform, contentText, mediaUrls = [], targetConfig = {} }) {
  const targetType = PLATFORM_TARGET_TYPES[platform];
  if (!targetType) throw new Error(`Unsupported platform: ${platform}`);

  const normalizedMediaUrls = normalizeMediaUrls(mediaUrls);
  const draft = {
    accountId,
    content: {
      text: contentText.trim(),
      mediaUrls: normalizedMediaUrls,
      platform: targetType
    },
    target: getTargetConfig(platform, targetConfig, normalizedMediaUrls)
  };

  ensurePlatformConsistency(draft.content.platform, draft.target.targetType);
  return draft;
}

function buildBlotatoPostPayload({ accountId, platform, contentText, mediaUrls = [], targetConfig = {}, scheduling = {} }) {
  const payload = {
    post: buildBlotatoPostDraft({ accountId, platform, contentText, mediaUrls, targetConfig })
  };

  if (scheduling.type === 'scheduled' && scheduling.time) {
    payload.scheduledTime = scheduling.time;
  } else if (scheduling.type === 'nextSlot') {
    payload.useNextFreeSlot = true;
  }

  return payload;
}

// ─── Action handlers ─────────────────────────────────────────────────────────

async function handleCheckStatus(req, res, supabase) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const postId = getQueryParam(req, 'postId');
  if (!postId) return res.status(400).json({ error: 'postId is required' });

  const auth = await authenticate(req, supabase);
  if (auth.error) return res.status(auth.status).json({ error: auth.error });

  const { data: post, error: postError } = await supabase
    .from('service_posts').select('*').eq('id', postId).maybeSingle();
  if (postError || !post) return res.status(404).json({ error: 'Post not found' });

  const access = await verifyProjectAccess(supabase, post.project_id, auth.user.id);
  if (access.error) return res.status(access.status).json({ error: access.error, detail: access.detail });

  if (['published', 'failed', 'cancelled'].includes(post.status)) {
    return res.status(200).json({ ok: true, post, isFinal: true });
  }

  const apiKey = process.env.BLOTATO_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'BLOTATO_API_KEY not configured in environment' });

  try {
    const blotatoRes = await fetch(`${BLOTATO_API_BASE}/posts/${post.blotato_submission_id}`, {
      headers: { 'blotato-api-key': apiKey }
    });

    if (!blotatoRes.ok) {
      return res.status(blotatoRes.status).json({ error: 'Blotato API error', detail: await blotatoRes.text() });
    }

    const blotatoData = await blotatoRes.json();
    let newStatus = post.status;
    let updates = {};

    switch (blotatoData.status) {
      case 'published':
        newStatus = 'published';
        updates.published_at = getPublishedTimestamp(post, blotatoData);
        updates.public_url = blotatoData.publicUrl || null;
        break;
      case 'failed':
        newStatus = 'failed';
        updates.error_message = getBlotatoErrorMessage(blotatoData, post.platform);
        break;
      case 'in-progress':
        if (post.status === 'draft') newStatus = 'publishing';
        if (blotatoData.scheduledAt && post.status === 'scheduled') updates.scheduled_time = blotatoData.scheduledAt;
        break;
    }

    if (newStatus !== post.status || Object.keys(updates).length > 0) {
      updates.status = newStatus;
      updates.updated_at = new Date().toISOString();
      const { error: updateError } = await supabase.from('service_posts').update(updates).eq('id', postId);
      if (updateError) throw updateError;
      post.status = newStatus;
      Object.assign(post, updates);
    }

    return res.status(200).json({
      ok: true, post,
      blotatoStatus: blotatoData.status,
      isFinal: ['published', 'failed', 'cancelled'].includes(newStatus)
    });
  } catch (error) {
    console.error('Blotato check status error:', error);
    return res.status(500).json({ error: 'Failed to check post status', detail: error.message });
  }
}

async function handleSyncAccounts(req, res, supabase) {
  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const projectId = getQueryParam(req, 'projectId') || req.body?.projectId;
  if (!projectId) return res.status(400).json({ error: 'projectId is required' });

  const auth = await authenticate(req, supabase);
  if (auth.error) return res.status(auth.status).json({ error: auth.error });

  const access = await verifyProjectAccess(supabase, projectId, auth.user.id);
  if (access.error) return res.status(access.status).json({ error: access.error, detail: access.detail });

  const apiKey = process.env.BLOTATO_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'BLOTATO_API_KEY not configured in environment' });

  try {
    const accountsRes = await fetch(`${BLOTATO_API_BASE}/users/me/accounts`, {
      headers: { 'blotato-api-key': apiKey, 'Content-Type': 'application/json' }
    });

    if (!accountsRes.ok) {
      return res.status(accountsRes.status).json({ error: 'Blotato API error', detail: await accountsRes.text() });
    }

    const accounts = (await accountsRes.json()).items || [];

    const enrichedAccounts = await Promise.all(
      accounts.map(async (account) => {
        if (['facebook', 'linkedin'].includes(account.platform)) {
          try {
            const subRes = await fetch(
              `${BLOTATO_API_BASE}/users/me/accounts/${account.id}/subaccounts`,
              { headers: { 'blotato-api-key': apiKey } }
            );
            if (subRes.ok) {
              const subData = await subRes.json();
              return { ...account, subaccounts: subData.items || [] };
            }
          } catch (e) {
            console.warn(`Failed to fetch subaccounts for ${account.id}:`, e);
          }
        }
        return account;
      })
    );

    const { error: upsertError } = await supabase
      .from('project_blotato_config')
      .upsert({ project_id: projectId, connected_accounts: enrichedAccounts, updated_at: new Date().toISOString() }, { onConflict: 'project_id' });

    if (upsertError) throw upsertError;

    return res.status(200).json({ ok: true, accounts: enrichedAccounts, count: enrichedAccounts.length });
  } catch (error) {
    console.error('Blotato sync error:', error);
    return res.status(500).json({ error: 'Failed to sync accounts', detail: error.message });
  }
}

async function handleCreatePost(req, res, supabase) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body || {};
  // accounts: [{ id, platform, targetConfig }] — one entry per Blotato account to post to
  const { serviceId, projectId, contentText, mediaUrls = [], accounts = [], scheduling = {} } = body;

  if (!projectId) return res.status(400).json({ error: 'projectId is required' });
  if (!contentText?.trim()) return res.status(400).json({ error: 'contentText is required' });
  if (!accounts.length) return res.status(400).json({ error: 'at least one account is required' });

  for (const acc of accounts) {
    if (!acc.id || !acc.platform) return res.status(400).json({ error: 'each account must have id and platform' });
    if (!PLATFORM_TARGET_TYPES[acc.platform]) return res.status(400).json({ error: `Unsupported platform: ${acc.platform}` });
  }

  const auth = await authenticate(req, supabase);
  if (auth.error) return res.status(auth.status).json({ error: auth.error });

  const access = await verifyProjectAccess(supabase, projectId, auth.user.id);
  if (access.error) return res.status(access.status).json({ error: access.error, detail: access.detail });

  const apiKey = process.env.BLOTATO_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'BLOTATO_API_KEY not configured in environment' });

  // Determine scheduling params once (same for all accounts)
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

  // Group ID shared across all posts created in this batch
  const postGroupId = randomUUID();
  const createdPosts = [];
  const errors = [];

  for (const { id: accountId, platform, targetConfig = {} } of accounts) {
    try {
      const blotatoPayload = buildBlotatoPostPayload({
        accountId,
        platform,
        contentText,
        mediaUrls,
        targetConfig,
        scheduling
      });

      const blotatoRes = await fetch(`${BLOTATO_API_BASE}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'blotato-api-key': apiKey },
        body: JSON.stringify(blotatoPayload)
      });

      const blotatoData = await blotatoRes.json();
      if (!blotatoRes.ok) {
        errors.push({
          accountId,
          platform,
          error: getBlotatoErrorMessage(blotatoData, platform),
          detail: blotatoData
        });
        continue;
      }

      const { data: postRecord, error: insertError } = await supabase
        .from('service_posts')
        .insert({
          service_id: serviceId || null,
          project_id: projectId,
          post_group_id: postGroupId,
          content_text: contentText.trim(),
          media_urls: mediaUrls || [],
          account_id: accountId,
          platform,
          target_config: targetConfig,
          status: initialStatus,
          blotato_submission_id: blotatoData.postSubmissionId,
          scheduled_time: scheduledTime,
          created_by: auth.user.id
        })
        .select()
        .single();

      if (insertError) throw insertError;
      createdPosts.push(postRecord);
    } catch (err) {
      console.error(`Error creating post for account ${accountId}:`, err);
      errors.push({ accountId, platform, error: err.message });
    }
  }

  if (createdPosts.length === 0) {
    return res.status(500).json({ error: 'All posts failed to create', errors });
  }

  return res.status(200).json({
    ok: true,
    posts: createdPosts,
    postGroupId,
    errors: errors.length > 0 ? errors : undefined
  });
}

async function handleUpdatePost(req, res, supabase) {
  if (!['PATCH', 'DELETE'].includes(req.method)) {
    res.setHeader('Allow', 'PATCH, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const postId = getQueryParam(req, 'postId');
  if (!postId) return res.status(400).json({ error: 'postId is required' });

  const auth = await authenticate(req, supabase);
  if (auth.error) return res.status(auth.status).json({ error: auth.error });

  const { data: post, error: postError } = await supabase
    .from('service_posts').select('*').eq('id', postId).maybeSingle();
  if (postError || !post) return res.status(404).json({ error: 'Post not found' });

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', auth.user.id).single();

  const canModify = post.created_by === auth.user.id || ['admin', 'worker'].includes(profile?.role);
  if (!canModify) return res.status(403).json({ error: 'Forbidden: cannot modify this post' });

  const apiKey = process.env.BLOTATO_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'BLOTATO_API_KEY not configured in environment' });

  if (req.method === 'DELETE') {
    try {
      if (!['scheduled', 'draft'].includes(post.status)) {
        return res.status(400).json({ error: 'Cannot cancel post that is already publishing or published' });
      }

      if (post.blotato_submission_id && post.status === 'scheduled') {
        const blotatoRes = await fetch(`${BLOTATO_API_BASE}/schedules/${post.blotato_submission_id}`, {
          method: 'DELETE',
          headers: { 'blotato-api-key': apiKey }
        });
        if (!blotatoRes.ok && blotatoRes.status !== 404) {
          return res.status(blotatoRes.status).json({ error: 'Blotato API error', detail: await blotatoRes.text() });
        }
      }

      const { error: updateError } = await supabase
        .from('service_posts')
        .update({ status: 'cancelled', updated_at: new Date().toISOString(), updated_by: auth.user.id })
        .eq('id', postId);

      if (updateError) throw updateError;
      return res.status(200).json({ ok: true, status: 'cancelled' });
    } catch (error) {
      console.error('Blotato cancel error:', error);
      return res.status(500).json({ error: 'Failed to cancel post', detail: error.message });
    }
  }

  // PATCH
  const body = req.body || {};
  const { contentText, mediaUrls, scheduledTime } = body;

  try {
    if (!['scheduled', 'draft'].includes(post.status)) {
      return res.status(400).json({ error: 'Cannot update post that is already publishing or published' });
    }

    const updates = { updated_at: new Date().toISOString(), updated_by: auth.user.id };
    let needsBlotatoUpdate = false;

    if (contentText !== undefined) { updates.content_text = contentText; needsBlotatoUpdate = true; }
    if (mediaUrls !== undefined) { updates.media_urls = mediaUrls; needsBlotatoUpdate = true; }
    if (scheduledTime !== undefined) { updates.scheduled_time = scheduledTime; needsBlotatoUpdate = true; }

    if (needsBlotatoUpdate && post.blotato_submission_id) {
      const patchPayload = { patch: {} };

      if (contentText !== undefined || mediaUrls !== undefined) {
        patchPayload.patch.draft = {
          ...buildBlotatoPostDraft({
            accountId: post.account_id,
            platform: post.platform,
            contentText: contentText !== undefined ? contentText : post.content_text,
            mediaUrls: mediaUrls !== undefined ? mediaUrls : post.media_urls,
            targetConfig: post.target_config || {}
          })
        };
      }

      if (scheduledTime !== undefined) patchPayload.patch.scheduledTime = scheduledTime;

      const blotatoRes = await fetch(`${BLOTATO_API_BASE}/schedules/${post.blotato_submission_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'blotato-api-key': apiKey },
        body: JSON.stringify(patchPayload)
      });

      if (!blotatoRes.ok) {
        return res.status(blotatoRes.status).json({ error: 'Blotato API error', detail: await blotatoRes.json().catch(() => ({})) });
      }
    }

    const { data: updatedPost, error: updateError } = await supabase
      .from('service_posts').update(updates).eq('id', postId).select().single();
    if (updateError) throw updateError;

    return res.status(200).json({ ok: true, post: updatedPost });
  } catch (error) {
    console.error('Blotato update error:', error);
    return res.status(500).json({ error: 'Failed to update post', detail: error.message });
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  const action = getQueryParam(req, 'action');

  if (req.method === 'OPTIONS') {
    const methodsByAction = {
      'check-status': 'GET',
      'sync-accounts': 'GET, POST',
      'create-post': 'POST',
      'update-post': 'PATCH, DELETE'
    };
    res.setHeader('Access-Control-Allow-Methods', methodsByAction[action] || 'GET, POST, PATCH, DELETE');
    return res.status(200).end();
  }

  if (!action) {
    return res.status(400).json({ error: 'Missing required query param: action' });
  }

  const supabase = getSupabaseAdmin();

  switch (action) {
    case 'check-status':   return handleCheckStatus(req, res, supabase);
    case 'sync-accounts':  return handleSyncAccounts(req, res, supabase);
    case 'create-post':    return handleCreatePost(req, res, supabase);
    case 'update-post':    return handleUpdatePost(req, res, supabase);
    default:
      return res.status(400).json({ error: `Unknown action: ${action}` });
  }
}
