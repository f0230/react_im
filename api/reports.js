import { handleReportsAiContext, handleReportsIngest } from '../server/services/reportsPipeline.js';

/**
 * Unified Reports handler.
 * Routes by ?action= query param (or rewrite from vercel.json)
 *   action=reports-ai-context  → handleReportsAiContext
 *   action=reports-ingest      → handleReportsIngest  (previously reports-ocr-summary)
 */
export default async function handler(req, res) {
    const action = req.query?.action ?? new URL(req.url, 'http://localhost').searchParams.get('action');

    if (action === 'reports-ai-context') {
        return handleReportsAiContext(req, res);
    }

    if (action === 'reports-ingest') {
        return handleReportsIngest(req, res);
    }

    return res.status(400).json({ error: 'Missing or unknown ?action param. Valid: reports-ai-context, reports-ingest' });
}
