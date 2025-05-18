import { google } from 'googleapis';
import { getAccessTokenFromRefresh } from './utils/getAccessToken.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Se requiere POST.' });
  }

  const { datetime, range, allBusy } = req.body;
  const calendarId = process.env.CALENDAR_ID || 'default_calendar_id@group.calendar.google.com';

  try {
    const token = await getAccessTokenFromRefresh();
    if (!token) {
      throw new Error('Token de acceso no válido.');
    }

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: token });

    const calendar = google.calendar({ version: 'v3', auth });

    if (allBusy && range?.timeMin && range?.timeMax) {
      const response = await calendar.freebusy.query({
        requestBody: {
          timeMin: range.timeMin,
          timeMax: range.timeMax,
          timeZone: 'America/Montevideo',
          items: [{ id: calendarId }],
        },
      });

      const busy = response.data.calendars[calendarId].busy;
      return res.status(200).json({ busy });
    }

    if (!datetime) {
      return res.status(400).json({
        error: 'El parámetro datetime es obligatorio.',
        detail: 'datetime no fue proporcionado en el body.'
      });
    }

    const start = new Date(datetime);
    const end = new Date(start.getTime() + 60 * 60 * 1000); // 1 hora

    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin: start.toISOString(),
        timeMax: end.toISOString(),
        timeZone: 'America/Montevideo',
        items: [{ id: calendarId }],
      },
    });

    const busy = response.data.calendars[calendarId].busy;
    return res.status(200).json({ available: busy.length === 0 });
  } catch (err) {
    const apiError = err.response?.data;
    console.error('🟥 Error consultando disponibilidad:', apiError || err.message || err);
    return res.status(500).json({
      error: 'Fallo al consultar disponibilidad.',
      detail: apiError?.error?.message || err.message,
      status: apiError?.error?.code || 500
    });
  }
}
