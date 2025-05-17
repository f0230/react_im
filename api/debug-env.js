export default function handler(req, res) {
    res.status(200).json({
        GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '❌ no cargada',
        GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '❌ no cargada',
        GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || '❌ no cargada',
        NODE_ENV: process.env.NODE_ENV,
    });
}
  