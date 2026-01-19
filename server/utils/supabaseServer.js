import { createClient } from '@supabase/supabase-js';

let supabaseAdmin = null;

export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.warn('⚠️ Suspabase credentials missing for server-side admin');
    return null;
  }

  if (!supabaseAdmin) {
    supabaseAdmin = createClient(url, serviceKey, {
      auth: {
        persistSession: false,
      },
    });
  }

  return supabaseAdmin;
}
