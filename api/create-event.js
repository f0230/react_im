import { google } from 'googleapis';
import { getAccessTokenFromRefresh } from './utils/getAccessToken.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    const { summary, description, startTime, endTime, email, name } = req.body;

    if (!summary || !startTime || !endTime) {
        return res.status(400).json({ error: 'Faltan datos requeridos' });
    }

    try {
        const token = await getAccessTokenFromRefresh();

        const auth = new google.auth.OAuth2();
        auth.setCredentials({ access_token: token });

        const calendar = google.calendar({ version: 'v3', auth });

        const calendarId = 'aae871d62f645bd35cd19dd60165006f7128898b9dda88151a24648d531bee2d@group.calendar.google.com';

        const event = {
            summary: `#Landing #LeadConsulta Consulta de ${name}`,
            description: description || '',
            start: {
                dateTime: startTime,
                timeZone: 'America/Montevideo',
            },
            end: {
                dateTime: endTime,
                timeZone: 'America/Montevideo',
            },
            attendees: email ? [{ email }] : [],
            reminders: {
                useDefault: true,
            },
        };
          
        const response = await calendar.events.insert({
            calendarId,
            requestBody: event,
            sendUpdates: 'all', // 👈 notifica a todos los asistentes
          });

        res.status(200).json({ success: true, eventId: response.data.id });
    } catch (err) {
        console.error('🟥 Error creando evento:', err.response?.data || err.message || err);
        res.status(500).json({ error: 'No se pudo crear el evento' });
    }
}