/**
 * /api/kie-credits — KIE API credits check
 * GET /api/kie-credits
 */

function getKieApiKey(res) {
  const key = process.env.KIE_API_KEY || process.env.VITE_KIE_API_KEY;
  if (!key) {
    res.status(500).json({ error: 'KIE_API_KEY not configured on server.' });
    return null;
  }
  return key;
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

async function parseJsonResponse(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Invalid JSON response (${response.status}): ${text.slice(0, 120)}`);
  }
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET.' });
  }

  const apiKey = getKieApiKey(res);
  if (!apiKey) return;

  try {
    const response = await fetch('https://api.kie.ai/api/v1/chat/credit', {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`KIE API error: HTTP ${response.status}`);
    }

    const data = await parseJsonResponse(response);

    if (!data) {
      throw new Error('Empty response from KIE API');
    }

    if (data.code !== 200) {
      throw new Error(data.msg || `API Error: ${data.code}`);
    }

    const credits = Number(data.data || 0);

    return res.status(200).json({ credits });
  } catch (error) {
    console.error('[kie-credits] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch credits' });
  }
}
