import { google } from 'googleapis';

export default async function handler(req, res) {
  const { code } = req.query;

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  try {
    const { tokens } = await oauth2Client.getToken(code);

    console.log('REFRESH TOKEN:', tokens.refresh_token); // 👈 mirá esto en los logs
    console.log('ACCESS TOKEN:', tokens.access_token);

    res.send('Token recibido. Revisá la consola/logs en Vercel.');
  } catch (err) {
    console.error('Error OAuth:', err.response?.data || err.message || err);
    res.status(500).json({ error: 'Error en el intercambio del código' });
  }
}
