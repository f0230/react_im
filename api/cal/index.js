import { getSupabaseAdmin } from '../../server/utils/supabaseServer.js';
import { verifyAdmin, verifyAuthenticated } from '../../server/utils/auth.js';
import { createHmac } from 'node:crypto';


const CAL_API_URL = process.env.CAL_COM_API_URL || 'https://api.cal.com/v2';
const API_KEY = process.env.CAL_COM_API_KEY || process.env.VITE_CAL_COM_API_KEY;
const EVENT_TYPE_ID = process.env.CAL_COM_EVENT_TYPE_ID || process.env.VITE_CAL_COM_EVENT_TYPE_ID;
const CAL_FALLBACK_PHONE = process.env.CAL_COM_FALLBACK_PHONE || '+5491155667788';

const CAL_API_VERSION = '2024-08-13';
const ALLOWED_ACTIONS = new Set([
    'availability',
    'create-booking',
    'bookings',
    'webhook',
    'cancel',
    'reschedule',
]);

const normalizeBookingStatus = (status) => {
    if (!status) return 'scheduled';
    const value = String(status).trim().toLowerCase();
    if (value === 'cancelled' || value === 'canceled' || value === 'rejected') return 'cancelled';
    if (value === 'completed' || value === 'past') return 'completed';
    if (value === 'accepted' || value === 'pending' || value === 'confirmed' || value === 'upcoming' || value === 'recurring' || value === 'unconfirmed') {
        return 'scheduled';
    }
    return 'scheduled';
};

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
const normalizeEmail = (value) => {
    const trimmed = String(value || '').trim().toLowerCase();
    return isValidEmail(trimmed) ? trimmed : '';
};

const getCalErrorMessage = (payload) => {
    if (!payload) return '';
    const direct = payload?.error?.message || payload?.message;
    if (typeof direct === 'string' && direct.trim()) return direct;
    const nested = payload?.error?.details?.message || payload?.error?.details?.error;
    if (typeof nested === 'string' && nested.trim()) return nested;
    return '';
};

const normalizeUuid = (value) => {
    const text = String(value || '').trim();
    return /^[0-9a-fA-F-]{36}$/.test(text) ? text : null;
};

const getMetadataValue = (metadata, keys) => {
    for (const key of keys) {
        if (metadata?.[key]) return metadata[key];
    }
    return null;
};

const mapCalBookingToAppointment = (booking) => {
    const attendee = booking?.attendees?.[0] || {};
    const calIdStr = booking?.id != null ? String(booking.id) : String(booking?.uid || '');
    const metadata = booking?.metadata || {};
    const projectId = normalizeUuid(getMetadataValue(metadata, ['projectId', 'project_id']));
    const userId = normalizeUuid(getMetadataValue(metadata, ['userId', 'user_id', 'participantId', 'participant_id']));
    const clientId = normalizeUuid(getMetadataValue(metadata, ['clientId', 'client_id']));

    const mapped = {
        id: calIdStr,
        cal_booking_id: calIdStr,
        scheduled_at: booking?.start || null,
        duration_minutes: booking?.duration || 30,
        status: normalizeBookingStatus(booking?.status),
        client_name: attendee?.name || 'Unknown',
        client_email: attendee?.email || 'Unknown',
        client_phone: attendee?.phoneNumber || null,
        meeting_link: booking?.meetingUrl || booking?.location || null,
        event_type_id: booking?.eventTypeId != null ? String(booking.eventTypeId) : null,
        cal_metadata: booking,
        project_id: projectId,
        user_id: userId,
        client_id: clientId,
        projects: null,
        clients: null,
    };

    return mapped;
};

const fetchAllCalBookings = async ({ status, eventTypeId, afterStart, beforeEnd, attendeeEmail }) => {
    const all = [];
    let skip = 0;
    const take = 100;
    let hasNextPage = true;
    let pages = 0;
    const maxPages = 50;

    while (hasNextPage && pages < maxPages) {
        const params = new URLSearchParams({
            take: String(take),
            skip: String(skip),
            sortStart: 'asc',
        });

        if (status) params.set('status', status);
        if (eventTypeId) params.set('eventTypeId', String(eventTypeId));
        if (afterStart) params.set('afterStart', afterStart);
        if (beforeEnd) params.set('beforeEnd', beforeEnd);
        if (attendeeEmail) params.set('attendeeEmail', attendeeEmail);

        const response = await fetch(`${CAL_API_URL}/bookings?${params.toString()}`, {
            headers: {
                Authorization: `Bearer ${API_KEY}`,
                'cal-api-version': CAL_API_VERSION,
            },
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            const rawError = data?.error;
            let message = `Cal.com error: ${response.status}`;
            if (typeof rawError === 'string' && rawError.trim()) {
                message = rawError;
            } else if (rawError && typeof rawError === 'object') {
                message = rawError.message || rawError.error || rawError.code || message;
            } else if (typeof data?.message === 'string' && data.message.trim()) {
                message = data.message;
            }

            const err = new Error(message);
            err.status = response.status;
            err.details = data;
            throw err;
        }

        const bookings = Array.isArray(data?.data) ? data.data : [];
        all.push(...bookings);

        const pagination = data?.pagination;
        hasNextPage = Boolean(pagination?.hasNextPage);
        const returned = pagination?.returnedItems || bookings.length;
        skip += returned;
        pages += 1;

        if (!hasNextPage || returned === 0) break;
    }

    return all;
};

const enrichBookingsWithSupabaseRelations = async ({ supabase, rows }) => {
    if (!supabase || !Array.isArray(rows) || rows.length === 0) return rows;

    const projectIds = Array.from(new Set(rows.map((row) => row.project_id).filter(Boolean)));
    const clientIds = Array.from(new Set(rows.map((row) => row.client_id).filter(Boolean)));

    const [projectsResult, clientsResult] = await Promise.all([
        projectIds.length > 0
            ? supabase.from('projects').select('id, name, title').in('id', projectIds)
            : Promise.resolve({ data: [], error: null }),
        clientIds.length > 0
            ? supabase.from('clients').select('id, company_name, full_name, email').in('id', clientIds)
            : Promise.resolve({ data: [], error: null }),
    ]);

    if (projectsResult.error) {
        console.warn('Failed to enrich bookings with projects:', projectsResult.error);
    }
    if (clientsResult.error) {
        console.warn('Failed to enrich bookings with clients:', clientsResult.error);
    }

    const projectsById = new Map((projectsResult.data || []).map((project) => [project.id, project]));
    const clientsById = new Map((clientsResult.data || []).map((client) => [client.id, client]));

    return rows.map((row) => {
        const project = row.project_id ? projectsById.get(row.project_id) : null;
        const client = row.client_id ? clientsById.get(row.client_id) : null;
        return {
            ...row,
            projects: project ? { name: project.name || project.title || null } : null,
            clients: client ? {
                company_name: client.company_name || null,
                full_name: client.full_name || null,
                email: client.email || null,
            } : null,
        };
    });
};

const getAction = (req) => {
    if (Array.isArray(req.query?.action)) return req.query.action[0];
    return req.query?.action || req.params?.action || null;
};

const verifySignature = (body, signature, secret) => {
    if (!secret) return true;
    if (!signature) return false;

    const payload = JSON.stringify(body);
    const hmac = createHmac('sha256', secret);
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

        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

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
        clientId,
        participantType,
        participantRole,
        participantId,
        timeZone,
        eventTypeId: bodyEventTypeId,
    } = req.body || {};

    const eventTypeId = bodyEventTypeId || EVENT_TYPE_ID;
    const normalizedParticipantType = participantType ? String(participantType).toLowerCase() : null;
    const normalizedParticipantRole = participantRole ? String(participantRole).toLowerCase() : null;
    const isTeamParticipant = normalizedParticipantType === 'profile'
        || normalizedParticipantRole === 'admin'
        || normalizedParticipantRole === 'worker';

    try {
        const parsedEventTypeId = Number(eventTypeId);
        if (!Number.isFinite(parsedEventTypeId)) {
            return res.status(400).json({
                error: 'Invalid Event Type ID',
                details: { eventTypeId },
            });
        }

        const supabase = getSupabaseAdmin();

        let resolvedName = typeof name === 'string' ? name.trim() : '';
        let resolvedEmail = normalizeEmail(email);

        if ((!resolvedName || !resolvedEmail) && isTeamParticipant && userId && supabase) {
            const { data: profileData } = await supabase
                .from('profiles')
                .select('full_name, email')
                .eq('id', userId)
                .maybeSingle();

            if (!resolvedName && profileData?.full_name) {
                resolvedName = profileData.full_name;
            }
            if (!resolvedEmail && profileData?.email) {
                resolvedEmail = normalizeEmail(profileData.email);
            }

            if (!resolvedEmail) {
                const { data: authUserData, error: authUserError } = await supabase.auth.admin.getUserById(userId);
                if (!authUserError && authUserData?.user?.email) {
                    resolvedEmail = normalizeEmail(authUserData.user.email);
                }
                if (!resolvedName && authUserData?.user?.user_metadata?.full_name) {
                    resolvedName = authUserData.user.user_metadata.full_name;
                }
            }
        }

        if (!start || !resolvedName || !resolvedEmail || !eventTypeId) {
            const missingTeamEmail = isTeamParticipant && !resolvedEmail;
            return res.status(400).json({
                error: missingTeamEmail
                    ? 'Selected team member has no email configured'
                    : 'Missing required fields',
                details: {
                    hasStart: Boolean(start),
                    hasName: Boolean(resolvedName),
                    hasEmail: Boolean(resolvedEmail),
                    hasEventTypeId: Boolean(eventTypeId),
                    isTeamParticipant,
                    userId: userId || null,
                },
            });
        }

        let normalizedPhone = typeof phone === 'string' ? phone.trim() : '';
        if (normalizedPhone) {
            const cleanPhone = normalizedPhone.replace(/[\s\-\(\)]/g, '');
            if (cleanPhone.startsWith('+')) {
                normalizedPhone = cleanPhone;
            } else if (/^\d{10}$/.test(cleanPhone)) {
                normalizedPhone = `+549${cleanPhone}`;
            } else if (/^\d{8,15}$/.test(cleanPhone)) {
                normalizedPhone = `+549${cleanPhone}`;
            } else {
                normalizedPhone = '';
            }
        }

        const attendee = {
            name: resolvedName,
            email: resolvedEmail,
            timeZone: timeZone || 'UTC',
        };
        if (normalizedPhone) {
            attendee.phoneNumber = normalizedPhone;
        }

        const metadata = {};
        if (projectId) metadata.projectId = projectId;
        if (userId) metadata.userId = userId;
        if (clientId) metadata.clientId = clientId;
        if (participantType) metadata.participantType = participantType;
        if (participantRole) metadata.participantRole = participantRole;
        if (participantId) metadata.participantId = participantId;
        if (notes) metadata.notes = notes;

        const bookingPayload = {
            eventTypeId: parsedEventTypeId,
            start,
            attendee,
            metadata,
        };

        let calResponse = await fetch(`${CAL_API_URL}/bookings`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${API_KEY}`,
                'Content-Type': 'application/json',
                'cal-api-version': CAL_API_VERSION,
            },
            body: JSON.stringify(bookingPayload),
        });

        let calData = await calResponse.json();

        const calErrorMessage = getCalErrorMessage(calData).toLowerCase();
        const needsPhoneRetry = calErrorMessage.includes('invalid_number')
            || calErrorMessage.includes('missing attendee phone number')
            || calErrorMessage.includes('required by the event type');

        if (!calResponse.ok && needsPhoneRetry) {
            console.warn('Cal.com rejected/required attendee phone, retrying with fallback phone...');
            bookingPayload.attendee.phoneNumber = CAL_FALLBACK_PHONE;

            calResponse = await fetch(`${CAL_API_URL}/bookings`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${API_KEY}`,
                    'Content-Type': 'application/json',
                    'cal-api-version': CAL_API_VERSION,
                },
                body: JSON.stringify(bookingPayload),
            });
            calData = await calResponse.json();
        }

        if (!calResponse.ok) {
            console.error('Cal.com Booking Error:', calData);
            return res.status(calResponse.status).json({
                error: 'Failed to create booking in Cal.com',
                details: calData,
            });
        }

        return res.status(200).json({
            ok: true,
            data: calData.data,
        });
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

    const { user, profile, error: authError } = await verifyAuthenticated(req);
    if (authError) {
        return res.status(authError.includes('Forbidden') ? 403 : 401).json({ error: authError });
    }

    try {
        const query = req.query || {};
        const statusFilter = Array.isArray(query.status) ? query.status[0] : query.status;
        const eventTypeIdFilter = Array.isArray(query.eventTypeId) ? query.eventTypeId[0] : query.eventTypeId;
        const afterStartFilter = Array.isArray(query.afterStart) ? query.afterStart[0] : query.afterStart;
        const beforeEndFilter = Array.isArray(query.beforeEnd) ? query.beforeEnd[0] : query.beforeEnd;
        const sourceFilter = Array.isArray(query.source) ? query.source[0] : query.source;
        const attendeeEmailFilter = Array.isArray(query.attendeeEmail) ? query.attendeeEmail[0] : query.attendeeEmail;

        const requestedSource = String(sourceFilter || 'cal').toLowerCase();
        const supabase = getSupabaseAdmin();

        if (requestedSource !== 'cal') {
            console.warn(`Deprecated bookings source "${requestedSource}" requested; using Cal.com source.`);
        }

        if (!API_KEY) {
            return res.status(500).json({ error: 'Server configuration error' });
        }

        const normalizedRequestedEmail = normalizeEmail(attendeeEmailFilter);
        let effectiveAttendeeEmail = normalizedRequestedEmail || null;

        const isAdmin = profile?.role === 'admin';
        if (!isAdmin) {
            const userEmail = normalizeEmail(user?.email);
            if (!userEmail) {
                return res.status(400).json({ error: 'Authenticated user has no valid email' });
            }
            if (effectiveAttendeeEmail && effectiveAttendeeEmail !== userEmail) {
                return res.status(403).json({ error: 'Forbidden: attendeeEmail must match authenticated user' });
            }
            effectiveAttendeeEmail = userEmail;
        }

        const normalizedStatusInput = statusFilter ? String(statusFilter).trim().toLowerCase() : null;
        const normalizedStatus = normalizedStatusInput === 'canceled' ? 'cancelled' : normalizedStatusInput;

        // For direct Cal.com reads, default to upcoming bookings
        // to match dashboard "next appointments" semantics.
        const isDefaultUpcomingQuery = !normalizedStatus && !afterStartFilter && !beforeEndFilter;
        const calStatus = normalizedStatus || undefined;
        const calAfterStart = afterStartFilter || (isDefaultUpcomingQuery ? new Date().toISOString() : undefined);
        const queryBase = {
            eventTypeId: eventTypeIdFilter,
            afterStart: calAfterStart,
            beforeEnd: beforeEndFilter,
            attendeeEmail: effectiveAttendeeEmail,
        };

        let bookings = [];
        try {
            bookings = await fetchAllCalBookings({ ...queryBase, status: calStatus });
        } catch (error) {
            // Compatibility fallback: some Cal workspaces reject certain status filters.
            // If this happens, retry once without status and filter in-app.
            const shouldRetryWithoutStatus = Boolean(calStatus) && Number(error?.status) === 400;
            if (!shouldRetryWithoutStatus) throw error;

            console.warn(
                `Cal.com rejected status "${calStatus}". Retrying without status filter.`,
                error?.details || error?.message || error
            );
            bookings = await fetchAllCalBookings({ ...queryBase, status: undefined });
        }
        let mapped = bookings
            .map(mapCalBookingToAppointment)
            .filter((row) => row.cal_booking_id);

        if (isDefaultUpcomingQuery) {
            mapped = mapped.filter((row) => row.status !== 'cancelled');
        }

        const mergedData = await enrichBookingsWithSupabaseRelations({
            supabase,
            rows: mapped,
        });

        mergedData.sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));

        return res.status(200).json({ ok: true, data: mergedData, source: 'cal' });
    } catch (error) {
        console.error('Internal Error:', error);
        if (Number(error?.status) >= 400 && Number(error?.status) < 600) {
            return res.status(Number(error.status)).json({
                error: error?.message || 'Cal.com request failed',
                details: error?.details || null,
            });
        }
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

    const { error: authError } = await verifyAdmin(req);
    if (authError) {
        return res.status(authError.includes('Forbidden') ? 403 : 401).json({ error: authError });
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

    const { error: authError } = await verifyAdmin(req);
    if (authError) {
        return res.status(authError.includes('Forbidden') ? 403 : 401).json({ error: authError });
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
