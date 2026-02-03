import dotenv from 'dotenv';
import { getSupabaseAdmin } from '../../server/utils/supabaseServer.js';

dotenv.config();

const CAL_API_URL = process.env.CAL_COM_API_URL || 'https://api.cal.com/v2';
const API_KEY = process.env.VITE_CAL_COM_API_KEY;

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Security check
    const adminSecret = req.headers['x-admin-secret'];
    if (adminSecret !== process.env.ADMIN_API_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { bookingUid, start, reason } = req.body;

    if (!bookingUid || !start) {
        return res.status(400).json({ error: 'Missing booking UID or new start time' });
    }

    try {
        console.log(`[Reschedule] Rescheduling booking: ${bookingUid} to ${start}`);

        // 1. Reschedule in Cal.com
        const calResponse = await fetch(`${CAL_API_URL}/bookings/${bookingUid}/reschedule`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json',
                'cal-api-version': '2024-08-13',
            },
            body: JSON.stringify({
                start: start,
                reschedulingReason: reason || 'Rescheduled by Admin'
            })
        });

        const calData = await calResponse.json();

        if (!calResponse.ok) {
            console.error('Cal.com Reschedule Error:', calData);
            return res.status(calResponse.status).json({
                error: 'Failed to reschedule in Cal.com',
                details: calData
            });
        }

        // 2. Update Supabase
        const supabase = getSupabaseAdmin();
        const { error: dbError } = await supabase
            .from('appointments')
            .update({
                status: 'scheduled', // Ensure it's active
                scheduled_at: start,
                updated_at: new Date().toISOString()
            })
            .eq('cal_booking_id', bookingUid);

        if (dbError) {
            console.error('Supabase Update Error:', dbError);
            // Don't fail the request if just local DB failed, but warn
        }

        return res.status(200).json({ ok: true, data: calData });

    } catch (error) {
        console.error('Error in reschedule handler:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
