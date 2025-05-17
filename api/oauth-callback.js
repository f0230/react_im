import { google } from 'googleapis';

export default async function handler(req, res) {
  const { code } = req.query;

  console.log('🌍 Código recibido:', code);
  console.log('📦 GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID || '❌ NO CARGADO');
  console.log('📦 GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET || '❌ NO CARGADO');
  console.log('📦 GOOGLE_REDIRECT_URI:', process.env.GOOGLE_REDIRECT_URI || '❌ NO CARGADO');

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI) {
    return res.status(500).json({ error: 'Alguna variable de entorno no está cargada correctamente en Vercel.' });
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

    console.log('✅ REFRESH TOKEN:', tokens.refresh_token || 'No recibido');
    console.log('✅ ACCESS TOKEN:', tokens.access_token);

    res.send('Token recibido correctamente. Revisá logs.');
  } catch (err) {
    console.error('❌ Error en getToken:', err.response?.data || err.message || err);
    res.status(500).json({
      error: 'Error en el intercambio del código',
      detail: err.response?.data || err.message || err
    });
  }
}
