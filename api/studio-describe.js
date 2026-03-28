/**
 * Serverless endpoint: describes an image using OpenAI vision (server-side).
 * Handles CORS and CDN URL access issues that occur in browser.
 *
 * POST /api/studio-describe
 * Body: { imageUrl: string }
 * Returns: { description: string }
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { imageUrl } = body ?? {};

  if (!imageUrl || typeof imageUrl !== 'string') {
    return res.status(400).json({ error: 'Missing imageUrl' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'OPENAI_API_KEY not configured' });

  let finalImageUrl = imageUrl;

  // For remote URLs, fetch server-side and convert to base64 (avoids CDN access issues)
  if (imageUrl.startsWith('http')) {
    try {
      const imgRes = await fetch(imageUrl);
      if (!imgRes.ok) throw new Error(`Image fetch failed: HTTP ${imgRes.status}`);
      const arrayBuffer = await imgRes.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      const contentType = imgRes.headers.get('content-type') || 'image/png';
      finalImageUrl = `data:${contentType};base64,${base64}`;
    } catch (err) {
      return res.status(502).json({ error: `Could not fetch image: ${err.message}` });
    }
  }

  try {
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Describe this image in vivid detail for use as an AI image/video generation prompt. Be specific about composition, lighting, colors, subjects, style, and mood. Return ONLY the prompt text, no explanations or prefixes.',
              },
              {
                type: 'image_url',
                image_url: { url: finalImageUrl },
              },
            ],
          },
        ],
        max_tokens: 500,
      }),
    });

    if (!openaiRes.ok) {
      const err = await openaiRes.text();
      return res.status(502).json({ error: `OpenAI error: ${err}` });
    }

    const data = await openaiRes.json();
    const description = data.choices?.[0]?.message?.content?.trim();
    if (!description) return res.status(502).json({ error: 'Empty response from OpenAI' });

    return res.status(200).json({ description });
  } catch (err) {
    console.error('[studio-describe] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
