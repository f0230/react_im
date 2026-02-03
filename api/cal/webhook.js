import { getSupabaseAdmin } from '../../server/utils/supabaseServer.js';
import dotenv from 'dotenv';

dotenv.config();

export default async function handler(req, res) {
    // Cal.com webhooks are POST requests
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const body = req.body;
        console.log('--- Cal.com Webhook Received ---');
        console.log('Event Type:', body.triggerEvent);
        console.log('Booking ID:', body.payload?.id);

        const triggerEvent = body.triggerEvent;
        const payload = body.payload;

        if (!payload || !payload.id) {
            console.error('Invalid webhook payload: Missing booking ID');
            return res.status(400).json({ error: 'Missing booking ID in payload' });
        }

        const supabase = getSupabaseAdmin();
        if (!supabase) {
            console.error('Missing Supabase Admin Client');
            return res.status(500).json({ error: 'Database connection error' });
        }

        const calBookingId = payload.id;
        let updateData = {};

        switch (triggerEvent) {
            case 'BOOKING_CREATED':
                // Check if it already exists (to avoid duplicate from our manual creation)
                const { data: existing } = await supabase
                    .from('appointments')
                    .select('id')
                    .eq('cal_booking_id', calBookingId)
                    .single();

                if (!existing) {
                    // It's a booking created directly on Cal.com, not via our app
                    updateData = {
                        cal_booking_id: calBookingId,
                        client_name: payload.attendees?.[0]?.name || 'Unknown',
                        client_email: payload.attendees?.[0]?.email || 'Unknown',
                        scheduled_at: payload.startTime,
                        duration_minutes: payload.duration || 30,
                        status: 'scheduled',
                        meeting_link: payload.videoCallData?.url || payload.location || null,
                        cal_metadata: payload,
                        event_type_id: String(payload.eventTypeId)
                    };

                    const { error: insertError } = await supabase
                        .from('appointments')
                        .insert(updateData);

                    if (insertError) {
                        console.error('Error inserting booking from webhook:', insertError);
                        return res.status(500).json({ error: 'Failed to insert booking' });
                    }
                }
                break;

            case 'BOOKING_CANCELLED':
                updateData = {
                    status: 'cancelled',
                    cal_metadata: payload // Record latest cancellation reason etc
                };
                break;

            case 'BOOKING_RESCHEDULED':
                updateData = {
                    scheduled_at: payload.startTime,
                    status: 'scheduled',
                    cal_metadata: payload
                };
                break;

            default:
                console.log(`Unhandled webhook event: ${triggerEvent}`);
                return res.status(200).json({ message: 'Event not handled, but acknowledged' });
        }

        // Apply updates if any (for non-CREATED events that made it here)
        if (Object.keys(updateData).length > 0 && triggerEvent !== 'BOOKING_CREATED') {
            const { error: updateError } = await supabase
                .from('appointments')
                .update(updateData)
                .eq('cal_booking_id', calBookingId);

            if (updateError) {
                console.error(`Error updating booking ${calBookingId}:`, updateError);
                return res.status(500).json({ error: 'Failed to update booking status' });
            }
        }

        console.log(`Successfully processed ${triggerEvent} for booking ${calBookingId}`);
        return res.status(200).json({ success: true });

    } catch (error) {
        console.error('Webhook processing error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
