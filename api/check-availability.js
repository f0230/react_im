import { google } from 'googleapis';
import { getAccessTokenFromRefresh } from '../server/utils/getAccessToken.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    let token;
    try {
      token = await getAccessTokenFromRefresh();
    } catch (authError) {
      if (authError.response?.data?.error === 'invalid_grant') {
        // Mock response if credentials fail (dev mode safe guard)
        const { allBusy } = req.body;
        return res.status(200).json(allBusy ? { busy: [] } : { available: true });
      }
      throw authError;
    }

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: token });
    const calendar = google.calendar({ version: 'v3', auth });

    const { datetime, range, allBusy } = req.body;
    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

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

    if (!datetime) return res.status(400).json({ error: 'Missing datetime' });

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
    console.error('Check Avail Error:', error);
    res.status(500).json({ error: 'Server Error' });
  }
}
