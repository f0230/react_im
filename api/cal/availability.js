import dotenv from 'dotenv';

dotenv.config();

const CAL_API_URL = process.env.CAL_COM_API_URL || 'https://api.cal.com/v2';
const API_KEY = process.env.VITE_CAL_COM_API_KEY;
const EVENT_TYPE_ID = process.env.VITE_CAL_COM_EVENT_TYPE_ID;

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Allow passing eventTypeId from query, otherwise use default from env
    const eventTypeId = req.query.eventTypeId || EVENT_TYPE_ID;

    if (!API_KEY) {
        console.error('Missing Cal.com API Key');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    if (!eventTypeId) {
        return res.status(400).json({ error: 'Missing Event Type ID' });
    }

    const { start, end, timeZone } = req.query;

    if (!start || !end) {
        return res.status(400).json({ error: 'Missing start or end date parameters' });
    }

    try {
        const params = new URLSearchParams({
            startTime: start,
            endTime: end,
            eventTypeId,
            ...(timeZone && { timeZone }),
        });

        const response = await fetch(`${CAL_API_URL}/slots/available?${params}`, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'cal-api-version': '2024-08-13',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Cal.com API error:', response.status, errorData);
            return res.status(response.status).json({
                error: 'Failed to fetch availability from Cal.com',
                details: errorData
            });
        }

        const data = await response.json();
        return res.status(200).json(data);

    } catch (error) {
        console.error('Error in cal-availability:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
