import { createClient } from '@supabase/supabase-js';

/**
 * Serverless proxy: downloads an image from an external URL (KIE AI CDN)
 * and uploads it to the Supabase 'banana-ai' storage bucket.
 *
 * POST /api/studio-proxy
 * Body: { imageUrl: string, taskId: string }
 * Returns: { path: string }
 */
export default async function handler(req, res) {
    // CORS headers for local dev
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed. Use POST.' });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { imageUrl, taskId } = body ?? {};

    if (!imageUrl || typeof imageUrl !== 'string') {
        return res.status(400).json({ error: 'Missing imageUrl in request body.' });
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured on server.' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        // 1. Download the image from KIE AI (server-side → no CORS)
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
            throw new Error(`Failed to download image: HTTP ${imageResponse.status}`);
        }

        const arrayBuffer = await imageResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const contentType = imageResponse.headers.get('content-type') || 'image/png';
        const ext = contentType.includes('webp') ? 'webp' : contentType.includes('jpeg') ? 'jpg' : 'png';

        // 2. Generate unique filename
        const safeTaskId = (taskId || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '');
        const fileName = `banana-${safeTaskId}-${Date.now()}.${ext}`;

        // 3. Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
            .from('banana-ai')
            .upload(fileName, buffer, {
                contentType,
                upsert: true,
            });

        if (uploadError) {
            throw new Error(`Supabase upload failed: ${uploadError.message}`);
        }

        return res.status(200).json({ path: fileName });
    } catch (error) {
        console.error('[studio-proxy] Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
