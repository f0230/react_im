import { google } from 'googleapis';

export default function handler(req, res) {
    try {
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
        );

        const scopes = [
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/calendar.events'
        ];

        const url = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            prompt: 'consent', // CRITICAL: This forces Google to send a new refresh_token
            scope: scopes,
        });

        res.redirect(url);
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate auth URL', details: error.message });
    }
}
