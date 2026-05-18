import { supabase } from './supabaseClient';
import { createStudioSignedUrls } from './mediaStorage';

export interface GenerationRecord {
  id: string;
  project_id: string;
  model: string | null;
  prompt: string | null;
  result_url: string | null;
  storage_path: string | null;
  result_type: string | null;
  aspect_ratio: string | null;
  task_id: string | null;
  provider: string | null;
  created_at: string;
}

export interface NewGeneration {
  model?: string | null;
  prompt?: string | null;
  resultUrl?: string | null;
  storagePath?: string | null;
  resultType?: string | null;
  aspectRatio?: string | null;
  taskId?: string | null;
  provider?: string | null;
}

/** Reads the active project id from the URL — kept in sync by App. */
export function getActiveProjectId(): string | null {
  return new URLSearchParams(window.location.search).get('projectId');
}

/**
 * Appends a generation to the project history. Fire-and-forget friendly —
 * failures are logged but never block the generation flow.
 */
export async function recordGeneration(entry: NewGeneration): Promise<void> {
  const projectId = getActiveProjectId();
  if (!projectId) return;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('studio_generations').insert({
      project_id: projectId,
      model: entry.model ?? null,
      prompt: entry.prompt ?? null,
      result_url: entry.resultUrl ?? null,
      storage_path: entry.storagePath ?? null,
      result_type: entry.resultType ?? null,
      aspect_ratio: entry.aspectRatio ?? null,
      task_id: entry.taskId ?? null,
      provider: entry.provider ?? null,
      created_by: user?.id ?? null,
    });
    if (error) throw error;
  } catch (error) {
    console.warn('[studio-history] Could not record generation:', error);
  }
}

/**
 * Fetches the most recent generations for a project, re-signing storage URLs
 * so previews render even days after the original signed URL expired.
 */
export async function fetchGenerations(
  projectId: string,
  limit = 100,
): Promise<GenerationRecord[]> {
  const { data, error } = await supabase
    .from('studio_generations')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.warn('[studio-history] Fetch failed:', error.message);
    return [];
  }

  const rows = (data ?? []) as GenerationRecord[];
  const paths = rows
    .map((r) => r.storage_path)
    .filter((p): p is string => Boolean(p));
  const signed = await createStudioSignedUrls(paths);

  return rows.map((r) => ({
    ...r,
    result_url: r.storage_path
      ? signed.get(r.storage_path) ?? r.result_url
      : r.result_url,
  }));
}

export async function deleteGeneration(id: string): Promise<boolean> {
  const { error } = await supabase.from('studio_generations').delete().eq('id', id);
  if (error) {
    console.warn('[studio-history] Delete failed:', error.message);
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Asset library — uploaded reference images, reusable across workflows
// ---------------------------------------------------------------------------

export interface AssetRecord {
  id: string;
  result_url: string | null;
  storage_path: string | null;
  result_type: 'image';
  created_at: string;
}

/** Registers an uploaded reference image so it can be reused later. */
export async function recordAsset(entry: {
  storagePath: string;
  resultUrl?: string | null;
  aspectRatio?: number | null;
}): Promise<void> {
  const projectId = getActiveProjectId();
  if (!projectId || !entry.storagePath) return;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('studio_assets').upsert(
      {
        project_id: projectId,
        storage_path: entry.storagePath,
        result_url: entry.resultUrl ?? null,
        aspect_ratio: entry.aspectRatio ?? null,
        created_by: user?.id ?? null,
      },
      { onConflict: 'project_id,storage_path', ignoreDuplicates: true },
    );
    if (error) throw error;
  } catch (error) {
    console.warn('[studio-history] Could not record asset:', error);
  }
}

export async function fetchAssets(
  projectId: string,
  limit = 100,
): Promise<AssetRecord[]> {
  const { data, error } = await supabase
    .from('studio_assets')
    .select('id, result_url, storage_path, created_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.warn('[studio-history] Fetch assets failed:', error.message);
    return [];
  }

  const rows = (data ?? []) as Array<Omit<AssetRecord, 'result_type'>>;
  const paths = rows
    .map((r) => r.storage_path)
    .filter((p): p is string => Boolean(p));
  const signed = await createStudioSignedUrls(paths);

  return rows.map((r) => ({
    ...r,
    result_type: 'image' as const,
    result_url: r.storage_path
      ? signed.get(r.storage_path) ?? r.result_url
      : r.result_url,
  }));
}

export async function deleteAsset(id: string): Promise<boolean> {
  const { error } = await supabase.from('studio_assets').delete().eq('id', id);
  if (error) {
    console.warn('[studio-history] Delete asset failed:', error.message);
    return false;
  }
  return true;
}
