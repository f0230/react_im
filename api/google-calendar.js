// /api/google-calendar.js
import { google } from 'googleapis';

export default async function handler(req, res) {
    const { name, email, message, datetime, token } = req.body;

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: token });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const start = new Date(datetime);
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    const event = {
        summary: `Reunión con ${name}`,
        description: message,
        start: {
            dateTime: start.toISOString(),
            timeZone: 'America/Montevideo',
        },
        end: {
            dateTime: end.toISOString(),
            timeZone: 'America/Montevideo',
        },
        attendees: [{ email }],
    };

    try {
        await calendar.events.insert({
            calendarId: 'aae871d62f645bd35cd19dd60165006f7128898b9dda88151a24648d531bee2d@group.calendar.google.com',
            resource: event,
        });
        res.status(200).json({ message: 'Evento creado con éxito' });
    } catch (error) {
        console.error('Error al crear evento:', error);
        res.status(500).json({ error: 'Error al crear evento en Calendar' });
    }
}