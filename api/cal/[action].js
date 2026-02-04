import dotenv from 'dotenv';
import crypto from 'crypto';
import { getSupabaseAdmin } from '../../server/utils/supabaseServer.js';

dotenv.config();

const CAL_API_URL = process.env.CAL_COM_API_URL || 'https://api.cal.com/v2';
const API_KEY = process.env.VITE_CAL_COM_API_KEY;
const EVENT_TYPE_ID = process.env.VITE_CAL_COM_EVENT_TYPE_ID;

const CAL_API_VERSION = '2024-08-13';
const ALLOWED_ACTIONS = new Set([
    'availability',
    'create-booking',
    'bookings',
    'webhook',
    'cancel',
    'reschedule',
]);

const getAction = (req) => {
    if (Array.isArray(req.query?.action)) return req.query.action[0];
    return req.query?.action || req.params?.action || null;
};

const getMeetingLink = (payload) => {
    if (payload?.videoCallData?.url) return payload.videoCallData.url;

    const location = payload?.location;
    if (location && (location.startsWith('http') || location.startsWith('https'))) {
        return location;
    }

    return payload?.metadata?.meeting_url || null;
};

const verifySignature = (body, signature, secret) => {
    if (!secret) return true;
    if (!signature) return false;

    const payload = JSON.stringify(body);
    const hmac = crypto.createHmac('sha256', secret);
    const digest = hmac.update(payload).digest('hex');
    return signature === digest;
};

const handleAvailability = async (req, res) => {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const eventTypeId = req.query.eventTypeId || EVENT_TYPE_ID;

    if (!API_KEY) {
        console.error('Missing Cal.com API Key');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    if (!eventTypeId) {
        return res.status(400).json({ error: 'Missing Event Type ID' });
    }

    const { start, end, timeZone } = req.query;
    if (!start || !end) {
        return res.status(400).json({ error: 'Missing start or end date parameters' });
    }

    try {
        const params = new URLSearchParams({
            startTime: start,
            endTime: end,
            eventTypeId,
            ...(timeZone && { timeZone }),
        });

        const response = await fetch(`${CAL_API_URL}/slots/available?${params}`, {
            headers: {
                Authorization: `Bearer ${API_KEY}`,
                'cal-api-version': CAL_API_VERSION,
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Cal.com API error:', response.status, errorData);
            return res.status(response.status).json({
                error: 'Failed to fetch availability from Cal.com',
                details: errorData,
            });
        }

        const data = await response.json();
        return res.status(200).json(data);
    } catch (error) {
        console.error('Error in cal-availability:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

const handleCreateBooking = async (req, res) => {
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
        eventTypeId: bodyEventTypeId,
    } = req.body || {};

    const eventTypeId = bodyEventTypeId || EVENT_TYPE_ID;
    if (!start || !name || !email || !eventTypeId) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const bookingPayload = {
            eventTypeId: Number(eventTypeId),
            start,
            attendee: {
                name,
                email,
                timeZone: timeZone || 'UTC',
                phoneNumber: phone,
            },
            metadata: {
                projectId,
                userId,
                notes,
            },
        };

        const calResponse = await fetch(`${CAL_API_URL}/bookings`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${API_KEY}`,
                'Content-Type': 'application/json',
                'cal-api-version': CAL_API_VERSION,
            },
            body: JSON.stringify(bookingPayload),
        });

        const calData = await calResponse.json();
        if (!calResponse.ok) {
            console.error('Cal.com Booking Error:', calData);
            return res.status(calResponse.status).json({
                error: 'Failed to create booking in Cal.com',
                details: calData,
            });
        }

        const supabase = getSupabaseAdmin();
        if (!supabase) {
            return res.status(200).json({
                ok: true,
                data: calData.data,
                warning: 'Booking created but DB not reachable.',
            });
        }

        const booking = calData.data;
        let resolvedClientId = null;

        if (userId) {
            const { data: clientByUser } = await supabase
                .from('clients')
                .select('id')
                .eq('user_id', userId)
                .maybeSingle();
            if (clientByUser) resolvedClientId = clientByUser.id;
        }

        if (!resolvedClientId && email) {
            const { data: clientByEmail } = await supabase
                .from('clients')
                .select('id')
                .eq('email', email)
                .maybeSingle();
            if (clientByEmail) resolvedClientId = clientByEmail.id;
        }

        const { error: dbError } = await supabase
            .from('appointments')
            .insert({
                cal_booking_id: booking.id.toString(),
                project_id: projectId || null,
                client_id: resolvedClientId,
                user_id: userId || null,
                event_type_id: String(eventTypeId),
                scheduled_at: start,
                duration_minutes: booking.duration || 30,
                status: 'scheduled',
                client_name: name,
                client_email: email,
                client_phone: phone,
                notes,
                meeting_link: booking.meetingUrl || booking.location || null,
                cal_metadata: booking,
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
};

const handleBookings = async (req, res) => {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const secret = req.headers['x-admin-secret'];
    const envSecret = process.env.ADMIN_API_SECRET;
    if (!envSecret || secret !== envSecret) {
        return res.status(401).json({ error: 'Unauthorized: Missing or invalid credentials' });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
        return res.status(500).json({ error: 'Missing server credentials' });
    }

    try {
        const { data, error } = await supabase
            .from('appointments')
            .select(`
                *,
                projects ( name ),
                clients ( company_name, full_name, email )
            `)
            .order('scheduled_at', { ascending: true });

        if (error) {
            return res.status(500).json({
                error: 'Failed to fetch bookings',
                details: error.message,
            });
        }

        return res.status(200).json({ ok: true, data });
    } catch (error) {
        console.error('Internal Error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

const handleWebhook = async (req, res) => {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const body = req.body;
        const signature = req.headers['cal-signature-256'];
        const webhookSecret = process.env.CAL_WEBHOOK_SECRET;

        if (webhookSecret && !verifySignature(body, signature, webhookSecret)) {
            console.error('Invalid Cal.com webhook signature');
            return res.status(401).json({ error: 'Invalid signature' });
        }

        const triggerEvent = body?.triggerEvent;
        const payload = body?.payload;
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

        const upsertData = {
            cal_booking_id: payload.id.toString(),
            scheduled_at: payload.startTime,
            duration_minutes: payload.duration || 30,
            status,
            client_name: payload.attendees?.[0]?.name || 'Unknown',
            client_email: payload.attendees?.[0]?.email || 'Unknown',
            client_phone: payload.attendees?.[0]?.phoneNumber || null,
            meeting_link: getMeetingLink(payload),
            event_type_id: String(payload.eventTypeId),
            cal_metadata: payload,
        };

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
};

const handleCancel = async (req, res) => {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const adminSecret = req.headers['x-admin-secret'];
    if (adminSecret !== process.env.ADMIN_API_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { bookingUid, reason } = req.body || {};
    if (!bookingUid) {
        return res.status(400).json({ error: 'Missing booking UID' });
    }

    try {
        console.log(`[Cancel] Keep-alive cancelling booking: ${bookingUid}`);

        const calResponse = await fetch(`${CAL_API_URL}/bookings/${bookingUid}/cancel`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${API_KEY}`,
                'Content-Type': 'application/json',
                'cal-api-version': CAL_API_VERSION,
            },
            body: JSON.stringify({ reason: reason || 'Cancelled by Admin' }),
        });

        const calData = await calResponse.json();
        if (!calResponse.ok) {
            console.error('Cal.com Cancel Error:', calData);
            return res.status(calResponse.status).json({
                error: 'Failed to cancel in Cal.com',
                details: calData,
            });
        }

        const supabase = getSupabaseAdmin();
        const { error: dbError } = await supabase
            .from('appointments')
            .update({ status: 'cancelled' })
            .eq('cal_booking_id', bookingUid);

        if (dbError) {
            console.error('Supabase Update Error:', dbError);
            return res.status(500).json({ error: 'Cancelled in Cal, but DB update failed.' });
        }

        return res.status(200).json({ ok: true, data: calData });
    } catch (error) {
        console.error('Error in cancel handler:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

const handleReschedule = async (req, res) => {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const adminSecret = req.headers['x-admin-secret'];
    if (adminSecret !== process.env.ADMIN_API_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { bookingUid, start, reason } = req.body || {};
    if (!bookingUid || !start) {
        return res.status(400).json({ error: 'Missing booking UID or new start time' });
    }

    try {
        console.log(`[Reschedule] Rescheduling booking: ${bookingUid} to ${start}`);

        const calResponse = await fetch(`${CAL_API_URL}/bookings/${bookingUid}/reschedule`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${API_KEY}`,
                'Content-Type': 'application/json',
                'cal-api-version': CAL_API_VERSION,
            },
            body: JSON.stringify({
                start,
                reschedulingReason: reason || 'Rescheduled by Admin',
            }),
        });

        const calData = await calResponse.json();
        if (!calResponse.ok) {
            console.error('Cal.com Reschedule Error:', calData);
            return res.status(calResponse.status).json({
                error: 'Failed to reschedule in Cal.com',
                details: calData,
            });
        }

        const supabase = getSupabaseAdmin();
        const { error: dbError } = await supabase
            .from('appointments')
            .update({
                status: 'scheduled',
                scheduled_at: start,
                updated_at: new Date().toISOString(),
            })
            .eq('cal_booking_id', bookingUid);

        if (dbError) {
            console.error('Supabase Update Error:', dbError);
        }

        return res.status(200).json({ ok: true, data: calData });
    } catch (error) {
        console.error('Error in reschedule handler:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export default async function handler(req, res) {
    const action = getAction(req);

    if (!action || !ALLOWED_ACTIONS.has(action)) {
        return res.status(404).json({ error: 'Cal endpoint not found' });
    }

    if (action === 'availability') return handleAvailability(req, res);
    if (action === 'create-booking') return handleCreateBooking(req, res);
    if (action === 'bookings') return handleBookings(req, res);
    if (action === 'webhook') return handleWebhook(req, res);
    if (action === 'cancel') return handleCancel(req, res);
    if (action === 'reschedule') return handleReschedule(req, res);

    return res.status(404).json({ error: 'Cal endpoint not found' });
}
