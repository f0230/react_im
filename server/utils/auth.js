import { getSupabaseAdmin } from './supabaseServer.js';

/**
 * Verifies if the request is made by an authorized admin.
 * @param {Request} req - The Express request object.
 * @returns {Promise<{user: object, error: string|null}>}
 */
export async function verifyAdmin(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { user: null, error: 'Missing or invalid Authorization header' };
    }

    const token = authHeader.split(' ')[1];
    const supabase = getSupabaseAdmin();

    if (!supabase) {
        return { user: null, error: 'Database connection error' };
    }

    // Verify token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
        return { user: null, error: 'Unauthorized: Invalid token' };
    }

    // Check role in profiles table
    const { data: profile, error: dbError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (dbError || !profile || profile.role !== 'admin') {
        return { user: null, error: 'Forbidden: Admin access required' };
    }

    return { user, error: null };
}
