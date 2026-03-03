import { getSupabaseAdmin } from '../../server/utils/supabaseServer.js';
import { verifyAdmin } from '../../server/utils/auth.js';
import { createHmac } from 'node:crypto';


const CAL_API_URL = process.env.CAL_COM_API_URL || 'https://api.cal.com/v2';
const API_KEY = process.env.CAL_COM_API_KEY || process.env.VITE_CAL_COM_API_KEY;
const EVENT_TYPE_ID = process.env.CAL_COM_EVENT_TYPE_ID || process.env.VITE_CAL_COM_EVENT_TYPE_ID;

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

const APPOINTMENT_RELATION_COLUMNS = ['user_id', 'client_id', 'project_id'];

const removeColumns = (row, columns) => {
    const next = { ...row };
    columns.forEach((column) => {
        delete next[column];
    });
    return next;
};

const getLikelyInvalidFkColumns = (error) => {
    const text = `${error?.constraint || ''} ${error?.message || ''} ${error?.details || ''}`.toLowerCase();
    const columns = [];
    if (text.includes('appointments_user_id_fkey') || text.includes('user_id')) columns.push('user_id');
    if (text.includes('appointments_client_id_fkey') || text.includes('client_id')) columns.push('client_id');
    if (text.includes('appointments_project_id_fkey') || text.includes('project_id')) columns.push('project_id');
    return Array.from(new Set(columns));
};

const persistAppointmentWithFallback = async (supabase, row) => {
    const attemptInsert = async (payload) => supabase
        .from('appointments')
        .insert(payload);

    const { error: initialError } = await attemptInsert(row);
    if (!initialError) {
        return { ok: true };
    }
    if (initialError.code === '23505') {
        return { ok: true, warning: 'duplicate' };
    }
    if (initialError.code !== '23503') {
        return { ok: false, error: initialError };
    }

    const firstFallbackColumns = getLikelyInvalidFkColumns(initialError);
    const narrowedColumns = firstFallbackColumns.length > 0
        ? firstFallbackColumns
        : APPOINTMENT_RELATION_COLUMNS;
    const narrowedRow = removeColumns(row, narrowedColumns);
    const { error: narrowedError } = await attemptInsert(narrowedRow);

    if (!narrowedError) {
        return {
            ok: true,
            warning: `dropped_fk:${narrowedColumns.join(',')}`,
        };
    }
    if (narrowedError.code === '23505') {
        return {
            ok: true,
            warning: 'duplicate',
        };
    }

    const needsFullFallback = narrowedColumns.length < APPOINTMENT_RELATION_COLUMNS.length
        && narrowedError.code === '23503';
    if (!needsFullFallback) {
        return { ok: false, error: narrowedError };
    }

    const fullFallbackRow = removeColumns(row, APPOINTMENT_RELATION_COLUMNS);
    const { error: fullFallbackError } = await attemptInsert(fullFallbackRow);
    if (!fullFallbackError) {
        return {
            ok: true,
            warning: `dropped_fk:${APPOINTMENT_RELATION_COLUMNS.join(',')}`,
        };
    }
    if (fullFallbackError.code === '23505') {
        return {
            ok: true,
            warning: 'duplicate',
        };
    }

    return { ok: false, error: fullFallbackError };
};

const mapCalBookingToAppointment = (booking) => {
    const attendee = booking?.attendees?.[0] || {};
    const calIdStr = booking?.id != null ? String(booking.id) : String(booking?.uid || '');
    const mapped = {
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
    };

    if (booking?.metadata?.projectId) {
        mapped.project_id = booking.metadata.projectId;
    }
    if (booking?.metadata?.userId) {
        mapped.user_id = booking.metadata.userId;
    }
    if (booking?.metadata?.clientId) {
        mapped.client_id = booking.metadata.clientId;
    }

    return mapped;
};

const fetchAllCalBookings = async ({ status, eventTypeId, afterStart, beforeEnd }) => {
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

        const response = await fetch(`${CAL_API_URL}/bookings?${params.toString()}`, {
            headers: {
                Authorization: `Bearer ${API_KEY}`,
                'cal-api-version': CAL_API_VERSION,
            },
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(data?.error || `Cal.com error: ${response.status}`);
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

        if (!calResponse.ok && calData?.error?.message?.includes('invalid_number')) {
            console.warn('Cal.com rejected phone number, retrying with dummy phone...');
            bookingPayload.attendee.phoneNumber = '+5491155667788';

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

        if (!supabase) {
            return res.status(200).json({
                ok: true,
                data: calData.data,
                warning: 'Booking created but DB not reachable.',
            });
        }

        const booking = calData.data;
        let resolvedClientId = clientId || null;
        const shouldResolveClientByIdentity = !resolvedClientId
            && (
                participantType === 'client'
                || participantRole === 'client'
                || (!participantType && !participantRole)
            );

        if (shouldResolveClientByIdentity && userId) {
            const { data: clientByUser } = await supabase
                .from('clients')
                .select('id')
                .eq('user_id', userId)
                .maybeSingle();
            if (clientByUser) resolvedClientId = clientByUser.id;
        }

        if (shouldResolveClientByIdentity && !resolvedClientId && resolvedEmail) {
            const { data: clientByEmail } = await supabase
                .from('clients')
                .select('id')
                .eq('email', resolvedEmail)
                .maybeSingle();
            if (clientByEmail) resolvedClientId = clientByEmail.id;
        }

        // Client team members are linked through profiles.client_id (not clients.user_id).
        // Resolve this path so dashboard bookings are consistently classified as client appointments.
        if (shouldResolveClientByIdentity && !resolvedClientId && userId) {
            const { data: profileRow } = await supabase
                .from('profiles')
                .select('client_id')
                .eq('id', userId)
                .maybeSingle();
            if (profileRow?.client_id) resolvedClientId = profileRow.client_id;
        }

        const appointmentRow = {
            cal_booking_id: booking.id.toString(),
            project_id: projectId || null,
            client_id: resolvedClientId,
            user_id: userId || null,
            event_type_id: String(eventTypeId),
            scheduled_at: start,
            duration_minutes: booking.duration || 30,
            status: 'scheduled',
            client_name: resolvedName,
            client_email: resolvedEmail,
            client_phone: phone,
            notes,
            meeting_link: booking.meetingUrl || booking.location || null,
            cal_metadata: booking,
        };

        const persisted = await persistAppointmentWithFallback(supabase, appointmentRow);
        if (!persisted.ok) {
            console.error('Supabase Insert Error after fallbacks:', persisted.error);
            return res.status(500).json({
                error: 'Booking created in Cal.com but failed to persist in database',
                details: {
                    calBookingId: booking.id?.toString?.() || null,
                },
            });
        }

        if (persisted.warning === 'duplicate') {
            console.log('Booking already exists (webhook race condition handled).');
        } else if (persisted.warning?.startsWith('dropped_fk:')) {
            console.warn(`Booking persisted with relation fallback: ${persisted.warning}`);
        }

        return res.status(200).json({
            ok: true,
            data: booking,
            ...(persisted.warning ? { warning: persisted.warning } : {}),
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

    const { error: authError } = await verifyAdmin(req);
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
        const syncFilter = Array.isArray(query.sync) ? query.sync[0] : query.sync;

        const requestedSource = String(sourceFilter || 'db').toLowerCase();
        const syncMode = String(syncFilter || '').toLowerCase();
        const supabase = getSupabaseAdmin();

        if (requestedSource !== 'cal') {
            if (!supabase) {
                return res.status(500).json({ error: 'Database error' });
            }

            let dbQuery = supabase
                .from('appointments')
                .select(`
                    *,
                    projects ( name ),
                    clients ( company_name, full_name, email )
                `)
                .order('scheduled_at', { ascending: true });

            if (statusFilter) {
                dbQuery = dbQuery.eq('status', statusFilter);
            }
            if (eventTypeIdFilter) {
                dbQuery = dbQuery.eq('event_type_id', String(eventTypeIdFilter));
            }
            if (afterStartFilter) {
                dbQuery = dbQuery.gte('scheduled_at', afterStartFilter);
            }
            if (beforeEndFilter) {
                dbQuery = dbQuery.lte('scheduled_at', beforeEndFilter);
            }

            const { data: dbAppointments, error: dbError } = await dbQuery;
            if (dbError) {
                console.error('Supabase Appointments Fetch Error:', dbError);
                return res.status(500).json({ error: 'Failed to load appointments from database' });
            }

            return res.status(200).json({ ok: true, data: dbAppointments || [], source: 'db' });
        }

        if (!API_KEY) {
            return res.status(500).json({ error: 'Server configuration error' });
        }

        // For direct Cal.com reads, default to upcoming accepted bookings
        // to match dashboard "next appointments" semantics.
        const isDefaultUpcomingQuery = !statusFilter && !afterStartFilter && !beforeEndFilter;
        const calStatus = statusFilter || (isDefaultUpcomingQuery ? 'accepted' : undefined);
        const calAfterStart = afterStartFilter || (isDefaultUpcomingQuery ? new Date().toISOString() : undefined);
        const queryBase = {
            eventTypeId: eventTypeIdFilter,
            afterStart: calAfterStart,
            beforeEnd: beforeEndFilter,
        };

        const safeFetchBookingsByStatus = async (targetStatus) => {
            try {
                return await fetchAllCalBookings({ ...queryBase, status: targetStatus });
            } catch (error) {
                console.warn(`Cal.com fetch failed for status "${targetStatus}":`, error?.message || error);
                return [];
            }
        };

        let bookings = [];
        if (calStatus) {
            bookings = await fetchAllCalBookings({ ...queryBase, status: calStatus });
        } else {
            const [defaultBookings, cancelledBookings, pastBookings] = await Promise.all([
                fetchAllCalBookings(queryBase),
                safeFetchBookingsByStatus('cancelled'),
                safeFetchBookingsByStatus('past'),
            ]);

            const byId = new Map();
            [...defaultBookings, ...cancelledBookings, ...pastBookings].forEach((booking) => {
                const key = booking?.id != null ? String(booking.id) : String(booking?.uid || '');
                if (!key) return;
                byId.set(key, booking);
            });
            bookings = Array.from(byId.values());
        }

        const upsertData = bookings
            .map(mapCalBookingToAppointment)
            .filter((row) => row.cal_booking_id);

        if (supabase && upsertData.length > 0) {
            const { error: upsertError } = await supabase
                .from('appointments')
                .upsert(upsertData, { onConflict: 'cal_booking_id' });

            if (upsertError) {
                if (upsertError.code !== '23503') {
                    console.error('Supabase Batch Upsert Error:', upsertError);
                }
                // Fallback to individual upserts if bulk fails (e.g., due to missing user/client/project)
                for (const row of upsertData) {
                    const { error: singleError } = await supabase
                        .from('appointments')
                        .upsert(row, { onConflict: 'cal_booking_id' });

                    if (singleError && singleError.code === '23503') {
                        const { user_id, client_id, project_id, ...fallbackRow } = row;
                        const { error: fallbackError } = await supabase
                            .from('appointments')
                            .upsert(fallbackRow, { onConflict: 'cal_booking_id' });
                        if (fallbackError) {
                            console.error('Supabase Fallback Upsert Error:', fallbackError);
                        }
                    } else if (singleError) {
                        console.error('Supabase Single Upsert Error:', singleError);
                    }
                }
            }

            // Sync: delete ghost appointments that no longer exist in Cal.com
            const calIds = upsertData.map(r => r.cal_booking_id);
            if (calIds.length > 0) {
                // Ghost cleanup is explicit to avoid accidental deletes from scoped reads.
                // Use ?sync=all only when you really want full DB<->Cal reconciliation.
                const shouldDeleteGhosts = syncMode === 'all'
                    && !statusFilter
                    && !eventTypeIdFilter
                    && !afterStartFilter
                    && !beforeEndFilter;

                if (shouldDeleteGhosts) {
                    const { error: deleteError } = await supabase
                        .from('appointments')
                        .delete()
                        .not('cal_booking_id', 'in', `(${calIds.join(',')})`);

                    if (deleteError) {
                        console.error('Supabase Sync Delete Error:', deleteError);
                    } else {
                        console.log(`Synced DB: Kept ${calIds.length} bookings, removed any ghosts.`);
                    }
                }
            }
        }

        if (!supabase || upsertData.length === 0) {
            return res.status(200).json({ ok: true, data: upsertData, source: 'cal' });
        }

        const calIds = upsertData.map((row) => row.cal_booking_id);

        let mergedData = [...upsertData];
        const { data: dbData, error } = await supabase
            .from('appointments')
            .select(`
                cal_booking_id,
                projects ( name ),
                clients ( company_name, full_name, email )
            `)
            .in('cal_booking_id', calIds);

        if (!error && dbData) {
            mergedData = upsertData.map(calItem => {
                const dbMatch = dbData.find(dbInfo => dbInfo.cal_booking_id === calItem.cal_booking_id);
                return {
                    ...calItem,
                    projects: dbMatch?.projects || null,
                    clients: dbMatch?.clients || null
                };
            });
        }

        mergedData.sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));

        return res.status(200).json({ ok: true, data: mergedData, source: 'cal' });
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
