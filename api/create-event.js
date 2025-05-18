import { google } from 'googleapis';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import ConfirmationEmail from '@/emails/ConfirmationEmail';
import { getAccessTokenFromRefresh } from './utils/getAccessToken.js';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

    const { summary, description, startTime, endTime, email, name } = req.body;

    if (!summary || !startTime || !endTime || !email || !name) {
        return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    try {
        // 1. Crear evento en Google Calendar
        const token = await getAccessTokenFromRefresh();
        const auth = new google.auth.OAuth2();
        auth.setCredentials({ access_token: token });

        const calendar = google.calendar({ version: 'v3', auth });

        const event = {
            summary,
            description,
            start: { dateTime: startTime, timeZone: 'America/Montevideo' },
            end: { dateTime: endTime, timeZone: 'America/Montevideo' },
            sendUpdates: 'none',
        };

        const insertedEvent = await calendar.events.insert({
            calendarId: 'primary',
            resource: event,
        });

        // 2. Preparar HTML dinámico con react-email
        const formattedDate = new Date(startTime).toLocaleString('es-UY', {
            dateStyle: 'full',
            timeStyle: 'short',
        });

        const html = render(
            <ConfirmationEmail
                name={name}
                summary={summary}
                description={description}
                formattedDate={formattedDate}
            />
        );

        // 3. Enviar el mail con Resend
        await resend.emails.send({
            from: `Grupo DTE <${process.env.RESEND_FROM}>`,
            to: email,
            subject: '✅ ¡Reunión confirmada con Grupo DTE!',
            html,
        });

        res.status(200).json({ ok: true, event: insertedEvent.data });
    } catch (err) {
        console.error('❌ Error:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
}
