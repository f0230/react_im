import { supabase } from '@/lib/supabaseClient';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'; // no 0/O/1/I/l
const CODE_LENGTH = 7;

function randomCode(length = CODE_LENGTH) {
  const bytes = new Uint8Array(length);
  (globalThis.crypto || window.crypto).getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

/**
 * Create (or reuse) a short link for a dashboard path.
 * Re-copying the same page returns the existing code thanks to the
 * unique index on target_path.
 *
 * @param {string} targetPath  e.g. "/dashboard/projects/acme/services/<pageId>"
 * @param {string|null} projectId  optional project UUID for cascade cleanup
 * @returns {Promise<string>} the short code
 */
export async function createShortLink(targetPath, projectId = null) {
  // Reuse if one already exists for this exact path.
  const { data: existing } = await supabase
    .from('shared_links')
    .select('code')
    .eq('target_path', targetPath)
    .maybeSingle();
  if (existing?.code) return existing.code;

  const { data: auth } = await supabase.auth.getUser();
  const createdBy = auth?.user?.id ?? null;

  // Retry a few times on the unlikely code collision.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = randomCode();
    const { data, error } = await supabase
      .from('shared_links')
      .insert({ code, target_path: targetPath, project_id: projectId, created_by: createdBy })
      .select('code')
      .maybeSingle();

    if (!error && data?.code) return data.code;

    // 23505 = unique_violation. If the path raced in, fetch the winner.
    if (error?.code === '23505') {
      const { data: raced } = await supabase
        .from('shared_links')
        .select('code')
        .eq('target_path', targetPath)
        .maybeSingle();
      if (raced?.code) return raced.code;
      // otherwise it was a code collision → loop and retry with a new code
      continue;
    }
    if (error) throw error;
  }
  throw new Error('No se pudo generar un link corto');
}

/**
 * Resolve a short code to its target dashboard path.
 * @param {string} code
 * @returns {Promise<string|null>} target_path or null if not found
 */
export async function resolveShortLink(code) {
  if (!code) return null;
  const { data, error } = await supabase
    .from('shared_links')
    .select('target_path')
    .eq('code', code)
    .maybeSingle();
  if (error) return null;
  return data?.target_path ?? null;
}
