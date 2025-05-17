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
    console.log('Refresh Token:', tokens.refresh_token);
    res.redirect('/?auth=success');
  } catch (err) {
    console.error('Error OAuth:', err);
    res.status(500).json({ error: 'Error en el intercambio del código' });
  }
}
