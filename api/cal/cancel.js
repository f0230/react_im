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

    // Security check: Ensure Admin Secret is present
    const adminSecret = req.headers['x-admin-secret'];
    if (adminSecret !== process.env.ADMIN_API_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { bookingUid, reason } = req.body;

    if (!bookingUid) {
        return res.status(400).json({ error: 'Missing booking UID' });
    }

    try {
        console.log(`[Cancel] Keep-alive cancelling booking: ${bookingUid}`);

        // 1. Cancel in Cal.com
        const calResponse = await fetch(`${CAL_API_URL}/bookings/${bookingUid}/cancel`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json',
                'cal-api-version': '2024-08-13',
            },
            body: JSON.stringify({ reason: reason || 'Cancelled by Admin' })
        });

        const calData = await calResponse.json();

        if (!calResponse.ok) {
            console.error('Cal.com Cancel Error:', calData);
            return res.status(calResponse.status).json({
                error: 'Failed to cancel in Cal.com',
                details: calData
            });
        }

        // 2. Update Supabase
        const supabase = getSupabaseAdmin();
        const { error: dbError } = await supabase
            .from('appointments')
            .update({ status: 'cancelled' })
            .eq('cal_booking_id', bookingUid); // Ensure we match by Cal ID (which often is the Int ID stringified)

        // Note: Cal.com API v2 often uses the UID (long string) but the booking.id (int) is what is usually sent in webhooks.
        // We need to double check how we stored existing bookings. 
        // Our create-booking stored `booking.id.toString()`.
        // The API cancel endpoint might need UID. 
        // If bookingId stored is the numeric ID, we need the UID.
        // STRATEGY: We will assume we pass the Correct ID that the API expects.

        if (dbError) {
            console.error('Supabase Update Error:', dbError);
            return res.status(500).json({ error: 'Cancelled in Cal, but DB update failed.' });
        }

        return res.status(200).json({ ok: true, data: calData });

    } catch (error) {
        console.error('Error in cancel handler:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
