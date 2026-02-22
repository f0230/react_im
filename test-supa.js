import dotenv from 'dotenv';
import { getSupabaseAdmin } from './server/utils/supabaseServer.js';

dotenv.config();
const supabase = getSupabaseAdmin();
if (!supabase) {
    console.error('❌ Supabase Admin and URL missing');
    process.exit(1);
}

const { data, error } = await supabase.from('team_channels').select('id').limit(1);
if (error) {
    console.error('❌ Supabase Auth check failed:', error.message);
} else {
    console.log('✅ Supabase Auth check passed');
}
