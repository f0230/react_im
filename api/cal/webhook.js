import { getSupabaseAdmin } from '../../server/utils/supabaseServer.js';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

// Helper to extract meeting link consistently
const getMeetingLink = (payload) => {
    // 1. Video Call Data (Explicit URL)
    if (payload?.videoCallData?.url) return payload.videoCallData.url;

    // 2. Location (Only if it looks like a URL)
    const location = payload?.location;
    if (location && (location.startsWith('http') || location.startsWith('https'))) {
        return location;
    }

    // 3. Metadata fallback
    return payload?.metadata?.meeting_url || null;
};

// Helper to verify Cal.com signature
const verifySignature = (body, signature, secret) => {
    if (!secret) return true; // Bypass if no secret configured (Development)
    if (!signature) return false;

    // Cal.com v2 signature verification often uses the raw body or JSON string. 
    // Standard approach: HMAC-SHA256 of the JSON body.
    const payload = JSON.stringify(body);
    const hmac = crypto.createHmac('sha256', secret);
    const digest = hmac.update(payload).digest('hex');

    return signature === digest;
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const body = req.body;
        const signature = req.headers['cal-signature-256'];
        const webhookSecret = process.env.CAL_WEBHOOK_SECRET;

        // Security check
        if (webhookSecret && !verifySignature(body, signature, webhookSecret)) {
            console.error('Invalid Cal.com webhook signature');
            return res.status(401).json({ error: 'Invalid signature' });
        }

        const triggerEvent = body.triggerEvent;
        const payload = body.payload;

        if (!payload || !payload.id) {
            return res.status(400).json({ error: 'Missing booking ID' });
        }

        console.log(`--- Processing Webhook: ${triggerEvent} for ${payload.id} ---`);

        const supabase = getSupabaseAdmin();
        if (!supabase) {
            console.error('Missing Supabase Admin Client');
            return res.status(500).json({ error: 'Database error' });
        }

        let status = 'scheduled';
        if (triggerEvent === 'BOOKING_CANCELLED') status = 'cancelled';
        if (triggerEvent === 'BOOKING_COMPLETED') status = 'completed';

        // Prepare Upsert Data
        const upsertData = {
            cal_booking_id: payload.id.toString(),
            scheduled_at: payload.startTime,
            // end_at: payload.endTime, // Optional if column exists
            duration_minutes: payload.duration || 30,
            status: status,
            client_name: payload.attendees?.[0]?.name || 'Unknown',
            client_email: payload.attendees?.[0]?.email || 'Unknown',
            client_phone: payload.attendees?.[0]?.phoneNumber || null, // Capture phone from webhook
            meeting_link: getMeetingLink(payload),
            event_type_id: String(payload.eventTypeId),
            cal_metadata: payload // Store full payload
        };

        // Perform Upsert (Idempotent)
        const { error } = await supabase
            .from('appointments')
            .upsert(upsertData, { onConflict: 'cal_booking_id' });

        if (error) {
            console.error('Upsert Error:', error);
            return res.status(500).json({ error: 'Failed to sync booking' });
        }

        return res.status(200).json({ success: true });

    } catch (error) {
        console.error('Webhook Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
