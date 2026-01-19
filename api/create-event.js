import { google } from 'googleapis';
import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';
import { getAccessTokenFromRefresh } from '../server/utils/getAccessToken.js';
import { supabaseAdmin } from '../server/utils/supabaseAdmin.js';

const resend = new Resend(process.env.RESEND_API_KEY);
const GOOGLE_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID;

const renderTemplate = (templatePath, data) => {
    try {
        const raw = fs.readFileSync(templatePath, 'utf8');
        return raw.replace(/{{(.*?)}}/g, (_, key) => data[key.trim()] || '');
    } catch (e) {
        console.warn(`Template ${templatePath} not found.`);
        return "";
    }
};

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { summary, description, startTime, endTime, email, name, userId, phone } = req.body;

    if (!summary || !startTime || !endTime || !email || !name) {
        return res.status(400).json({ error: 'Missing req fields' });
    }

    try {
        // 1. Supabase Writes (Admin)
        if (userId) {
            const { error: upsertError } = await supabaseAdmin
                .from('clients')
                .upsert({ user_id: userId, email, full_name: name, phone, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
            if (upsertError) console.error("Clients Error:", upsertError);
        }

        const { data: appointmentData, error: apptError } = await supabaseAdmin
            .from('appointments')
            .insert({ user_id: userId, summary, description, start_time: startTime, end_time: endTime, status: 'scheduled' })
            .select()
            .single();

        if (apptError) {
            console.error("Appointment Error:", apptError);
            return res.status(500).json({ error: 'DB Save Failed' });
        }

        // 2. Google Calendar
        let googleEventId = null;
        try {
            const token = await getAccessTokenFromRefresh();
            const auth = new google.auth.OAuth2();
            auth.setCredentials({ access_token: token });
            const calendar = google.calendar({ version: 'v3', auth });

            const event = {
                summary, description,
                start: { dateTime: startTime, timeZone: 'America/Montevideo' },
                end: { dateTime: endTime, timeZone: 'America/Montevideo' },
                attendees: [{ email }],
                reminders: { useDefault: true },
            };

            const gResponse = await calendar.events.insert({ calendarId: GOOGLE_CALENDAR_ID || 'primary', requestBody: event });
            googleEventId = gResponse.data.id;

            await supabaseAdmin.from('appointments').update({ google_event_id: googleEventId }).eq('id', appointmentData.id);
        } catch (googleError) {
            console.error("Google Error:", googleError);
            await supabaseAdmin.from('appointments').delete().eq('id', appointmentData.id);
            return res.status(500).json({ error: 'Calendar Sync Failed' });
        }

        // 3. Emails (Async-ish)
        // Note: For serverless, we must await or Vercel kills process.
        try {
            const date = startTime.slice(0, 10);
            const hour = new Date(startTime).toTimeString().slice(0, 5);
            const icsLink = `https://grupodte.com/api/ics?name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}&date=${date}&hour=${hour}&summary=${encodeURIComponent(summary)}`;

            // Simplificado para demo, usar templates reales
            await resend.emails.send({
                from: `Grupo DTE <${process.env.RESEND_FROM}>`,
                to: email,
                subject: '✅ Cita Confirmada',
                html: `<p>Hola ${name}, tu cita está confirmada para el ${date} a las ${hour}.</p>`
            });
        } catch (e) {
            console.error("Email error:", e);
        }

        res.status(200).json({ ok: true, appointmentId: appointmentData.id });

    } catch (err) {
        console.error('Critical:', err);
        res.status(500).json({ error: 'Server Error' });
    }
}
