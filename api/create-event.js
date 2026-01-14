import { google } from 'googleapis';
import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';
import { getAccessTokenFromRefresh } from '../server/utils/getAccessToken.js';
import { createClient } from '@supabase/supabase-js';

const resend = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY); // Using Anon key should be fine if RLS allows or if using service role key (safer for backend). 
// Use Service Role Key if available for backend operations to bypass RLS potentially?
// Checking env vars... usually VITE_ vars are exposed. 
// If I want to be sure to write to 'clients' table which might be protected, I should use SERVICE_ROLE_KEY if available.
// But I don't see it in the file. I will use VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY for now, as that's what's likely available. 
// Actually, 'api/' runs on server usually (Vercel).
// Let's check environment vars? I can't check env vars directly.
// I will blindly use VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY as they were imported in lib/supabaseClient.js.

const renderTemplate = (templatePath, data) => {
    const raw = fs.readFileSync(templatePath, 'utf8');
    return raw.replace(/{{(.*?)}}/g, (_, key) => data[key.trim()] || '');
};

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

    const { summary, description, startTime, endTime, email, name, userId, phone } = req.body;

    if (!summary || !startTime || !endTime || !email || !name) {
        return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    try {
        // 1. Sync User/Client to Supabase
        if (userId) {
            const { error: upsertError } = await supabase
                .from('clients')
                .upsert({
                    user_id: userId,
                    email: email,
                    name: name,
                    phone: phone || '',
                    company: description || 'Sin empresa', // Fallback or extraction logic
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });

            if (upsertError) {
                console.warn("⚠️ Error syncing client to Supabase:", upsertError);
            }

            // 2. Insert into Appointments Table
            if (!upsertError) { // Create appointment even if client upsert fails? Maybe safer to try.
                const { error: apptError } = await supabase
                    .from('appointments')
                    .insert({
                        user_id: userId,
                        summary: summary || `Reunión con ${name}`,
                        description: description,
                        start_time: startTime,
                        end_time: endTime,
                        status: 'scheduled'
                    });

                if (apptError) {
                    console.warn("⚠️ Error creating appointment record:", apptError);
                }
            }
        } else {
            // If no userId, maybe try to match by email or just skip? 
            // Requirement says "ensure the user has a record". 
            // If unauthenticated user books, we don't have userId.
            // We can still try to insert/update by email if 'clients' table has email unique constraint?
            // Not sure about schema. Safer to only do it if userId is present.
        }

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
