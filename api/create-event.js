import { google } from 'googleapis';
import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';
import { getAccessTokenFromRefresh } from './utils/getAccessToken.js';

const resend = new Resend(process.env.RESEND_API_KEY);

const renderTemplate = (templatePath, data) => {
    const raw = fs.readFileSync(templatePath, 'utf8');
    return raw.replace(/{{(.*?)}}/g, (_, key) => data[key.trim()] || '');
};

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

    const { summary, description, startTime, endTime, email, name } = req.body;

    if (!summary || !startTime || !endTime || !email || !name) {
        return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    try {
        // Crear evento en el calendario interno de Grupo DTE
        const token = await getAccessTokenFromRefresh();
        const auth = new google.auth.OAuth2();
        auth.setCredentials({ access_token: token });

        const calendar = google.calendar({ version: 'v3', auth });
        const calendarId = 'aae871d62f645bd35cd19dd60165006f7128898b9dda88151a24648d531bee2d@group.calendar.google.com';

        const event = {
            summary: summary || `Consulta de ${name}`,
            description: description || '',
            start: {
                dateTime: startTime,
                timeZone: 'America/Montevideo',
            },
            end: {
                dateTime: endTime,
                timeZone: 'America/Montevideo',
            },
            attendees: [{ email }],
            reminders: { useDefault: true },
        };

        await calendar.events.insert({
            calendarId,
            requestBody: event,
            sendUpdates: 'none', // no notifica al cliente
        });

        // 📅 Generar link dinámico al archivo ICS
        const date = startTime.slice(0, 10); // YYYY-MM-DD
        const hour = new Date(startTime).toTimeString().slice(0, 5); // HH:mm

        const icsLink = `https://grupodte.com/api/ics?name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}&date=${date}&hour=${hour}&summary=${encodeURIComponent(summary)}&description=${encodeURIComponent(description || '')}`;

        const formattedDate = new Date(startTime).toLocaleString('es-UY', {
            dateStyle: 'full',
            timeStyle: 'short',
        });

        const htmlCliente = renderTemplate(
            path.resolve(process.cwd(), 'emails/confirmation.html'),
            {
                name,
                summary,
                description,
                formattedDate,
                year: new Date().getFullYear(),
                icsLink
            }
        );

        await resend.emails.send({
            from: `Grupo DTE <${process.env.RESEND_FROM}>`,
            to: email,
            subject: '✅ ¡Reunión confirmada con Grupo DTE!',
            html: htmlCliente,
            reply_to: "grupo@grupodte.com"
        });


        const internalHtml = renderTemplate(
            path.resolve(process.cwd(), 'emails/internal-notification.html'),
            {
                name,
                email,
                summary,
                description: description || 'Sin descripción',
                formattedDate,
            }
        );
        

        // Enviar una copia interna a grupo@grupodte.com
        await resend.emails.send({
            from: `Grupo DTE <${process.env.RESEND_FROM}>`,
            to: 'grupo@grupodte.com',
            subject: `📩 Nueva reunión agendada: ${summary}`,
            html: internalHtml, // Podés usar el mismo HTML, o crear uno distinto si preferís
            reply_to: email
        });


        res.status(200).json({ ok: true });
    } catch (err) {
        console.error('❌ Error creando evento o enviando email:', err.response?.data || err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
}
