import { getSupabaseAdmin } from './supabaseServer.js';

const getBearerToken = (req) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    return authHeader.split(' ')[1];
};

export async function verifyAuthenticated(req) {
    const token = getBearerToken(req);
    if (!token) {
        return { user: null, profile: null, error: 'Missing or invalid Authorization header' };
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
        return { user: null, profile: null, error: 'Database connection error' };
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
        return { user: null, profile: null, error: 'Unauthorized: Invalid token' };
    }

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, role, client_id')
        .eq('id', user.id)
        .maybeSingle();

    if (profileError || !profile) {
        return { user: null, profile: null, error: 'Forbidden: Profile not found' };
    }

    return { user, profile, error: null };
}

/**
 * Verifies if the request is made by an authorized admin.
 * @param {Request} req - The Express request object.
 * @returns {Promise<{user: object, error: string|null}>}
 */
export async function verifyAdmin(req) {
    const { user, profile, error } = await verifyAuthenticated(req);
    if (error) {
        return { user: null, error };
    }

    if (profile.role !== 'admin') {
        return { user: null, error: 'Forbidden: Admin access required' };
    }

    return { user, error: null };
}
