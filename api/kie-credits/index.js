/**
 * Direct endpoint for KIE credits
 * GET /api/kie-credits
 *
 * Returns available credits from KIE API
 */

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET.' });
  }

  try {
    const apiKey = process.env.KIE_API_KEY;

    if (!apiKey) {
      console.error('[kie-credits] KIE_API_KEY not configured');
      return res.status(500).json({
        error: 'KIE_API_KEY not configured',
        hint: 'Configure KIE_API_KEY in Vercel Environment Variables',
      });
    }

    console.log('[kie-credits] Fetching from KIE API...');

    const response = await fetch('https://api.kie.ai/api/v1/chat/credit', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error('[kie-credits] HTTP error:', response.status, responseText);
      return res.status(response.status).json({
        error: `KIE API returned HTTP ${response.status}`,
        details: responseText.substring(0, 200),
      });
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('[kie-credits] JSON parse error:', e.message, responseText);
      return res.status(500).json({
        error: 'Invalid JSON response from KIE API',
        details: responseText.substring(0, 200),
      });
    }

    // Check KIE response structure
    if (!data || typeof data !== 'object') {
      console.error('[kie-credits] Invalid response structure:', data);
      return res.status(500).json({
        error: 'Invalid response structure from KIE API',
        received: typeof data,
      });
    }

    // KIE returns: { code: 200, msg: "success", data: 100 }
    if (data.code !== 200) {
      console.warn('[kie-credits] KIE returned non-200 code:', data);
      return res.status(200).json({
        error: data.msg || `API returned code ${data.code}`,
        code: data.code,
        credits: 0,
      });
    }

    const credits = typeof data.data === 'number' ? data.data : 0;

    console.log('[kie-credits] Success:', credits);
    return res.status(200).json({ credits });
  } catch (error) {
    console.error('[kie-credits] Uncaught error:', error.message, error.stack);
    return res.status(500).json({
      error: error.message || 'Internal server error',
      type: error.constructor.name,
    });
  }
}
