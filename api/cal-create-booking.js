import dotenv from 'dotenv';
import { getSupabaseAdmin } from '../server/utils/supabaseServer.js';

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
        console.error('Missing Cal.com API Key');
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
            eventTypeId: Number(eventTypeId), // Cal.com typically expects number for ID, but v2 might be string? Docs say ID. Let's send as is or number if numeric.
            start: start, // ISO String
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

        // Note: 'notes' might need to go into specific field or custom inputs depending on event type config.
        // For now, putting it in metadata. 

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
            console.error('Missing Supabase Admin Client');
            // We still return success because booking was made, but log error. 
            // Ideally we might want to cancel booking if DB save fails, but for now let's just warn.
            return res.status(200).json({
                ok: true,
                data: calData.data,
                warning: 'Booking created but failed to save to local database.'
            });
        }

        // Access the created booking data
        const booking = calData.data;

        // Insert into appointments table
        const { error: dbError } = await supabase
            .from('appointments')
            .insert({
                cal_booking_id: booking.id, // ID from Cal.com
                project_id: projectId || null,
                client_id: null, // We might need to look up client_id from user_id if not provided
                user_id: userId || null, // authenticated user id
                event_type_id: String(eventTypeId),
                scheduled_at: start,
                duration_minutes: booking.duration || 30, // Default or from response
                status: 'scheduled',
                client_name: name,
                client_email: email,
                client_phone: phone,
                notes: notes,
                meeting_link: booking.meetingUrl || booking.location || null, // Adjust based on actual response structure
                cal_metadata: booking // Store full response for future ref
            });

        if (dbError) {
            console.error('Supabase Insert Error:', dbError);
            return res.status(200).json({
                ok: true,
                data: booking,
                warning: 'Booking created but failed to save to local database.'
            });
        }

        return res.status(200).json({ ok: true, data: booking });

    } catch (error) {
        console.error('Error in cal-create-booking:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
