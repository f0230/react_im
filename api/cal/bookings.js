import { getSupabaseAdmin } from '../../server/utils/supabaseServer.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Security Check: Secret Header
    // Ideally this is replaced by RLS on Frontend, but if API is used, it must be secured.
    const secret = req.headers['x-admin-secret'];
    const envSecret = process.env.ADMIN_API_SECRET;

    if (!envSecret || secret !== envSecret) {
        // Strict block if not configured or mismatch.
        return res.status(401).json({ error: 'Unauthorized: Missing or invalid credentials' });
    }

    const supabase = getSupabaseAdmin();

    if (!supabase) {
        return res.status(500).json({ error: 'Missing server credentials' });
    }

    try {
        const { data, error } = await supabase
            .from('appointments')
            .select(`
                *,
                projects ( name ),
                clients ( company_name, full_name, email )
            `)
            .order('scheduled_at', { ascending: true });

        if (error) {
            return res.status(500).json({
                error: 'Failed to fetch bookings',
                details: error.message
            });
        }

        return res.status(200).json({ ok: true, data });
    } catch (err) {
        console.error('Internal Error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
