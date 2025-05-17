import { google } from 'googleapis';

export default async function handler(req, res) {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'Falta el parámetro `code` en la URL' });
  }

  console.log('🌍 Código recibido:', code);
  console.log('📦 GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID);
  console.log('📦 GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET);
  console.log('📦 GOOGLE_REDIRECT_URI:', process.env.GOOGLE_REDIRECT_URI);

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  try {
    const { tokens } = await oauth2Client.getToken({
      code,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    });

    console.log('✅ REFRESH TOKEN:', tokens.refresh_token || 'No recibido');
    console.log('✅ ACCESS TOKEN:', tokens.access_token);

    res.send('Token recibido correctamente. Revisá logs.');
  } catch (err) {
    console.error('❌ Error en getToken:', err.response?.data || err.message || err);
    res.status(500).json({ error: 'Error en el intercambio del código', detail: err.message });
  }
}
