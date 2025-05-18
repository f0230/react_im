import { google } from 'googleapis';
import { getAccessTokenFromRefresh } from './utils/getAccessToken.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido. Se requiere POST.' });
    }

    const { summary, description, startTime, endTime, email } = req.body;

    if (!summary || !startTime || !endTime) {
        return res.status(400).json({
            error: 'Datos incompletos',
            missing: {
                summary: !summary,
                startTime: !startTime,
                endTime: !endTime
            }
        });
    }

    try {
        const token = await getAccessTokenFromRefresh();
        if (!token) {
            throw new Error('Token de acceso no recibido o inválido.');
        }

        const auth = new google.auth.OAuth2();
        auth.setCredentials({ access_token: token });

        const calendar = google.calendar({ version: 'v3', auth });
        const calendarId = process.env.CALENDAR_ID || 'default_calendar_id@group.calendar.google.com';

        const event = {
            summary,
            description: description || '',
            start: {
                dateTime: startTime,
                timeZone: 'America/Montevideo',
            },
            end: {
                dateTime: endTime,
                timeZone: 'America/Montevideo',
            },
            ...(email && { attendees: [{ email }] }),
        };

        const response = await calendar.events.insert({
            calendarId,
            requestBody: event,
        });

        return res.status(200).json({ success: true, eventId: response.data.id });
    } catch (err) {
        const apiError = err.response?.data;
        console.error('🟥 Error creando evento:', apiError || err.message || err);
        return res.status(500).json({
            error: 'No se pudo crear el evento',
            detail: apiError?.error?.message || err.message,
            status: apiError?.error?.code || 500
        });
    }
}
