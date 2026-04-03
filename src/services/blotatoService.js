/**
 * Servicio para interactuar con las API routes de Blotato
 */

import { supabase } from '@/lib/supabaseClient';

const API_BASE = '/api';

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token;
}

export async function syncBlotatoAccounts(projectId) {
  const token = await getToken();
  const res = await fetch(`${API_BASE}/blotato?action=sync-accounts&projectId=${projectId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to sync accounts');
  return data;
}

export async function fetchProjectAccounts(projectId) {
  const { data, error } = await supabase
    .from('project_blotato_config')
    .select('connected_accounts')
    .eq('project_id', projectId)
    .maybeSingle();

  if (error) throw error;
  return data?.connected_accounts || [];
}

export async function createPost({
  serviceId,
  projectId,
  contentText,
  mediaUrls,
  accountId,
  platform,
  targetConfig,
  scheduling,
  additionalPosts
}) {
  const token = await getToken();
  const res = await fetch(`${API_BASE}/blotato?action=create-post`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      serviceId,
      projectId,
      contentText,
      mediaUrls,
      accountId,
      platform,
      targetConfig,
      scheduling,
      additionalPosts
    })
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to create post');
  return data;
}

export async function checkPostStatus(postId) {
  const token = await getToken();
  const res = await fetch(`${API_BASE}/blotato?action=check-status&postId=${postId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to check status');
  return data;
}

export async function updatePost(postId, updates) {
  const token = await getToken();
  const res = await fetch(`${API_BASE}/blotato?action=update-post&postId=${postId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updates)
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update post');
  return data;
}

export async function cancelPost(postId) {
  const token = await getToken();
  const res = await fetch(`${API_BASE}/blotato?action=update-post&postId=${postId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to cancel post');
  return data;
}

export async function fetchServicePosts(serviceId) {
  const { data, error } = await supabase
    .from('service_posts')
    .select('*')
    .eq('service_id', serviceId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function fetchProjectPosts(projectId) {
  const { data, error } = await supabase
    .from('service_posts')
    .select('*')
    .eq('project_id', projectId)
    .order('scheduled_time', { ascending: true, nullsLast: true });

  if (error) throw error;
  return data || [];
}

export function subscribeToServicePosts(serviceId, callback) {
  return supabase
    .channel(`service_posts:${serviceId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'service_posts',
        filter: `service_id=eq.${serviceId}`
      },
      callback
    )
    .subscribe();
}

export function subscribeToProjectPosts(projectId, callback) {
  return supabase
    .channel(`project_posts:${projectId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'service_posts',
        filter: `project_id=eq.${projectId}`
      },
      callback
    )
    .subscribe();
}

// Upload media to Supabase Storage → returns public URL
export async function uploadMediaFile(file) {
  const ext = file.name.split('.').pop();
  const { data: { user } } = await supabase.auth.getUser();
  const path = `${user.id}/${Date.now()}.${ext}`;

  const { data, error } = await supabase.storage
    .from('social-media')
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) throw error;

  const { data: urlData } = supabase.storage
    .from('social-media')
    .getPublicUrl(data.path);

  return urlData.publicUrl;
}

// Helpers para UI
export const PLATFORM_CONFIG = {
  twitter: {
    name: 'Twitter',
    icon: 'twitter',
    color: '#1DA1F2',
    maxChars: 280,
    supportsThreads: true
  },
  linkedin: {
    name: 'LinkedIn',
    icon: 'linkedin',
    color: '#0A66C2',
    maxChars: 3000,
    supportsThreads: false
  },
  instagram: {
    name: 'Instagram',
    icon: 'instagram',
    color: '#E4405F',
    maxChars: 2200,
    supportsThreads: false,
    mediaTypes: ['reel', 'story', 'feed']
  },
  facebook: {
    name: 'Facebook',
    icon: 'facebook',
    color: '#1877F2',
    maxChars: 63206,
    supportsThreads: false
  },
  tiktok: {
    name: 'TikTok',
    icon: 'tiktok',
    color: '#000000',
    maxChars: 2200,
    supportsThreads: false
  },
  pinterest: {
    name: 'Pinterest',
    icon: 'pinterest',
    color: '#BD081C',
    maxChars: 500,
    supportsThreads: false
  },
  threads: {
    name: 'Threads',
    icon: 'threads',
    color: '#000000',
    maxChars: 500,
    supportsThreads: true
  },
  bluesky: {
    name: 'Bluesky',
    icon: 'bluesky',
    color: '#0285FF',
    maxChars: 300,
    supportsThreads: true
  },
  youtube: {
    name: 'YouTube',
    icon: 'youtube',
    color: '#FF0000',
    maxChars: 5000,
    supportsThreads: false
  }
};

export function getPlatformIcon(platform) {
  return PLATFORM_CONFIG[platform]?.icon || 'share';
}

export function getPlatformName(platform) {
  return PLATFORM_CONFIG[platform]?.name || platform;
}

export function getPlatformColor(platform) {
  return PLATFORM_CONFIG[platform]?.color || '#666';
}

export function getMaxChars(platform) {
  return PLATFORM_CONFIG[platform]?.maxChars || 2000;
}

export function truncateForPlatform(text, platform) {
  const max = getMaxChars(platform);
  if (text.length <= max) return text;
  return text.slice(0, max - 3) + '...';
}

// Status helpers
export const POST_STATUS_CONFIG = {
  draft: { label: 'Borrador', color: 'neutral', icon: 'edit' },
  scheduled: { label: 'Programado', color: 'blue', icon: 'calendar' },
  publishing: { label: 'Publicando', color: 'amber', icon: 'loader' },
  published: { label: 'Publicado', color: 'green', icon: 'check' },
  failed: { label: 'Falló', color: 'red', icon: 'x' },
  cancelled: { label: 'Cancelado', color: 'gray', icon: 'ban' }
};

export function getStatusConfig(status) {
  return POST_STATUS_CONFIG[status] || POST_STATUS_CONFIG.draft;
}
