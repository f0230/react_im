import { google } from 'googleapis';

export default async function handler(req, res) {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'Falta el parámetro `code` en la URL' });
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  try {
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      console.warn('⚠️ No se recibió refresh_token. ¿Ya autorizaste esta cuenta antes sin prompt=consent?');
    }

    console.log('✅ REFRESH TOKEN:', tokens.refresh_token || 'No recibido');
    console.log('✅ ACCESS TOKEN:', tokens.access_token);

    // Opcional: podrías redirigir a la home con un mensaje
    return res.redirect('/?oauth=success'); // o usar res.send() como antes
  } catch (err) {
    console.error('❌ Error intercambiando el code:', err.response?.data || err.message || err);
    return res.status(500).json({ error: 'Error en el intercambio del código', detail: err.message });
  }
}
