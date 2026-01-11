import { google } from 'googleapis';
import { getAccessTokenFromRefresh } from '../server/utils/getAccessToken.js';

export default async function handler(req, res) {
  console.log('Checking environment variables:', {
    clientId: process.env.GOOGLE_CLIENT_ID ? 'Loaded' : 'Missing',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ? 'Loaded' : 'Missing',
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN ? 'Loaded' : 'Missing',
  });
  try {
    const token = await getAccessTokenFromRefresh();
    if (!token) {
      return res.status(500).json({ error: 'No se pudo obtener un access_token válido.' });
    }

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: token });

    const calendar = google.calendar({ version: 'v3', auth });
    const { datetime, range, allBusy } = req.body;

    const calendarId = 'aae871d62f645bd35cd19dd60165006f7128898b9dda88151a24648d531bee2d@group.calendar.google.com';

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
      return res.status(400).json({ error: 'El parámetro datetime es obligatorio.' });
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
  } catch (error) {
    console.error('🟥 Error en disponibilidad:', error.response?.data || error.message || error);
    res.status(500).json({ error: 'Error consultando disponibilidad', detail: error.message });
  }
}
