import dotenv from 'dotenv';
import { getSupabaseAdmin } from '../../server/utils/supabaseServer.js';

dotenv.config();

const CAL_API_URL = process.env.CAL_COM_API_URL || 'https://api.cal.com/v2';
const API_KEY = process.env.VITE_CAL_COM_API_KEY;
const EVENT_TYPE_ID = process.env.VITE_CAL_COM_EVENT_TYPE_ID;

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!API_KEY) {
        return res.status(500).json({ error: 'Server configuration error' });
    }

    const {
        start,
        name,
        email,
        phone,
        notes,
        projectId,
        userId,
        timeZone,
        eventTypeId: bodyEventTypeId
    } = req.body;

    const eventTypeId = bodyEventTypeId || EVENT_TYPE_ID;

    if (!start || !name || !email || !eventTypeId) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        // 1. Create Booking in Cal.com
        const bookingPayload = {
            eventTypeId: Number(eventTypeId),
            start: start,
            attendee: {
                name,
                email,
                timeZone: timeZone || 'UTC',
                phoneNumber: phone
            },
            metadata: {
                projectId,
                userId,
                notes
            }
        };

        const calResponse = await fetch(`${CAL_API_URL}/bookings`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json',
                'cal-api-version': '2024-08-13',
            },
            body: JSON.stringify(bookingPayload)
        });

        const calData = await calResponse.json();

        if (!calResponse.ok) {
            console.error('Cal.com Booking Error:', calData);
            return res.status(calResponse.status).json({
                error: 'Failed to create booking in Cal.com',
                details: calData
            });
        }

        // 2. Save to Supabase
        const supabase = getSupabaseAdmin();
        if (!supabase) {
            return res.status(200).json({
                ok: true,
                data: calData.data,
                warning: 'Booking created but DB not reachable.'
            });
        }

        const booking = calData.data;

        // Resolve Client ID
        let resolvedClientId = null;

        // Try by User ID first
        if (userId) {
            const { data: clientByUser } = await supabase
                .from('clients')
                .select('id')
                .eq('user_id', userId)
                .maybeSingle();

            if (clientByUser) resolvedClientId = clientByUser.id;
        }

        // Fallback by Email
        if (!resolvedClientId && email) {
            const { data: clientByEmail } = await supabase
                .from('clients')
                .select('id')
                .eq('email', email)
                .maybeSingle();

            if (clientByEmail) resolvedClientId = clientByEmail.id;
        }

        // Try Insert
        const { error: dbError } = await supabase
            .from('appointments')
            .insert({
                cal_booking_id: booking.id.toString(),
                project_id: projectId || null,
                client_id: resolvedClientId, // Resolved ID
                user_id: userId || null,
                event_type_id: String(eventTypeId),
                scheduled_at: start,
                duration_minutes: booking.duration || 30,
                status: 'scheduled',
                client_name: name,
                client_email: email,
                client_phone: phone,
                notes: notes,
                meeting_link: booking.meetingUrl || booking.location || null,
                cal_metadata: booking
            });

        if (dbError) {
            if (dbError.code === '23505') {
                console.log('Booking already exists (webhook race condition handled).');
            } else {
                console.error('Supabase Insert Error:', dbError);
            }
        }

        return res.status(200).json({ ok: true, data: booking });

    } catch (error) {
        console.error('Error in cal-create-booking:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
