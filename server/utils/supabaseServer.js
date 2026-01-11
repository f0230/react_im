import { createClient } from '@supabase/supabase-js';

let supabaseAdmin = null;

export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !serviceKey) {
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
