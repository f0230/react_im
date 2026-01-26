export default function handler(req, res) {
    res.status(200).json({
        GOOGLE: {
            CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? '✅' : '❌',
            CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? '✅' : '❌',
        },
        WHATSAPP: {
            PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID ? '✅' : '❌',
            ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN ? '✅' : '❌ (Muy importante)',
            VERIFY_TOKEN: process.env.WHATSAPP_VERIFY_TOKEN ? '✅' : '❌ (Falta para Meta)',
        },
        SUPABASE: {
            URL: (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) ? '✅' : '❌',
            SERVICE_KEY: (
                process.env.SUPABASE_SERVICE_ROLE_KEY ||
                process.env.SUPABASE_SERVICE_KEY ||
                process.env.SERVICE_ROLE_KEY
            ) ? '✅' : '❌ (Falta para guardar mensajes)',
        },
        N8N: {
            WEBHOOK_URL: process.env.N8N_WEBHOOK_URL ? '✅' : '❌ (No llegará a n8n)',
            WEBHOOK_URL_2: process.env.N8N_WEBHOOK_URL_2 ? '✅' : '❌ (No llegará a n8n)',
        },
        NODE_ENV: process.env.NODE_ENV,
    });
}
