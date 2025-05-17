import { google } from 'googleapis';
import { getAccessTokenFromRefresh } from '../src/utils/getAccessToken';

export default async function handler(req, res) {
  try {
    const token = await getAccessTokenFromRefresh();

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: token });

    const calendar = google.calendar({ version: 'v3', auth });
    const { datetime, range, allBusy } = req.body;
    const calendarId = 'aae871d62f645bd35cd19dd60165006f7128898b9dda88151a24648d531bee2d@group.calendar.google.com';

    if (allBusy && range) {
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

    const start = new Date(datetime);
    const end = new Date(start.getTime() + 60 * 60 * 1000);

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
    console.error('Error disponibilidad:', error);
    res.status(500).json({ error: 'Error consultando disponibilidad' });
  }
}
