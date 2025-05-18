// /api/ics.js
import { createEvent } from 'ics';

export default async function handler(req, res) {
    const { query } = req;

    // 🔒 Validar parámetros requeridos
    const { name, email, date, hour, duration = 60, summary, description } = query;
    if (!name || !email || !date || !hour || !summary) {
        return res.status(400).json({ error: 'Faltan datos para generar el .ics' });
    }

    try {
        // Parsear fecha y hora a array [yyyy, mm, dd, hh, mm]
        const [yyyy, mm, dd] = date.split('-').map(Number);
        const [hh, min] = hour.split(':').map(Number);

        const event = {
            start: [yyyy, mm, dd, hh, min],
            duration: { minutes: Number(duration) },
            title: summary,
            description,
            location: 'https://grupodte.com',
            url: 'https://grupodte.com',
            organizer: { name: 'Grupo DTE', email: 'info@grupodte.com' },
            attendees: [{ name, email }],
        };

        createEvent(event, (error, value) => {
            if (error) {
                console.error('❌ Error al generar .ics:', error);
                return res.status(500).send('Error al generar el archivo');
            }

            res.setHeader('Content-Disposition', 'attachment; filename=evento.ics');
            res.setHeader('Content-Type', 'text/calendar');
            res.status(200).send(value);
        });
    } catch (err) {
        console.error('❌ Error al procesar .ics:', err);
        res.status(500).send('Error interno');
    }
}
