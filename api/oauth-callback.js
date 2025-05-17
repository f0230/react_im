import { google } from 'googleapis';

export default async function handler(req, res) {
  const { code } = req.query;

  if (!code || !process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI) {
    return res.status(500).json({ error: 'Faltan parámetros o variables de entorno requeridas.' });
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  try {
    const { tokens } = await oauth2Client.getToken({
      code,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI
    });

    // Aquí podrías guardar el refresh_token en una base de datos si quisieras.
    if (!tokens.refresh_token) {
      console.warn('⚠️ No se recibió refresh_token (es posible que ya se haya autorizado este usuario antes)');
    }

    res.send('Token recibido correctamente. Ya podés usar el API de Google Calendar.');
  } catch (err) {
    console.error('❌ Error en getToken:', err.response?.data || err.message || err);
    res.status(500).json({
      error: 'Error en el intercambio del código',
      detail: err.response?.data || err.message || err
    });
  }
}
