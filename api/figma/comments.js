import fetch from 'node-fetch';

export default async function handler(req, res) {
    const { file_key } = req.query;
    const token = process.env.FIGMA_API_TOKEN;

    if (!token) {
        return res.status(500).json({ error: 'FIGMA_API_TOKEN not configured' });
    }

    if (!file_key) {
        return res.status(400).json({ error: 'file_key is required' });
    }

    const baseUrl = `https://api.figma.com/v1/files/${file_key}/comments`;

    try {
        if (req.method === 'GET') {
            const response = await fetch(baseUrl, {
                headers: { 'X-Figma-Token': token }
            });
            const data = await response.json();
            return res.status(response.status).json(data);
        }

        if (req.method === 'POST') {
            const response = await fetch(baseUrl, {
                method: 'POST',
                headers: {
                    'X-Figma-Token': token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(req.body)
            });
            const data = await response.json();
            return res.status(response.status).json(data);
        }

        if (req.method === 'DELETE') {
            const { comment_id } = req.query;
            const deleteUrl = `${baseUrl}/${comment_id}`;
            const response = await fetch(deleteUrl, {
                method: 'DELETE',
                headers: { 'X-Figma-Token': token }
            });
            return res.status(response.status).end();
        }

        res.setHeader('Allow', 'GET, POST, DELETE');
        return res.status(405).json({ error: 'Method Not Allowed' });

    } catch (error) {
        console.error('Figma API proxy error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
