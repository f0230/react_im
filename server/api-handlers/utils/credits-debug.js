/**
 * Debug endpoint for KIE credits API
 * GET /api/kie-credits-debug
 *
 * Shows raw response from KIE API for troubleshooting
 */

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET.' });
  }

  const apiKey = process.env.KIE_API_KEY || process.env.VITE_KIE_API_KEY;

  const debug = {
    timestamp: new Date().toISOString(),
    env_check: {
      has_KIE_API_KEY: !!process.env.KIE_API_KEY,
      has_VITE_KIE_API_KEY: !!process.env.VITE_KIE_API_KEY,
      key_preview: apiKey ? `${apiKey.substring(0, 5)}...${apiKey.substring(apiKey.length - 5)}` : 'null',
    },
  };

  if (!apiKey) {
    return res.status(400).json({
      ...debug,
      error: 'KIE_API_KEY not configured',
    });
  }

  try {
    console.log('[kie-debug] Calling KIE API with:', {
      url: 'https://api.kie.ai/api/v1/chat/credit',
      headers: {
        'Authorization': `Bearer ${apiKey.substring(0, 5)}...`,
        'Content-Type': 'application/json',
      },
    });

    const response = await fetch('https://api.kie.ai/api/v1/chat/credit', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    const responseText = await response.text();
    const isJson = response.headers.get('content-type')?.includes('application/json');

    let parsedData = null;
    if (isJson && responseText) {
      try {
        parsedData = JSON.parse(responseText);
      } catch (e) {
        parsedData = { parse_error: e.message };
      }
    }

    console.log('[kie-debug] Response:', {
      status: response.status,
      statusText: response.statusText,
      headers: {
        'content-type': response.headers.get('content-type'),
        'content-length': response.headers.get('content-length'),
      },
      body: responseText.substring(0, 500),
      parsed: parsedData,
    });

    return res.status(200).json({
      ...debug,
      kie_response: {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type'),
        body: responseText,
        parsed: parsedData,
      },
    });
  } catch (error) {
    console.error('[kie-debug] Error:', error);
    return res.status(500).json({
      ...debug,
      error: error.message,
      stack: error.stack,
    });
  }
}
