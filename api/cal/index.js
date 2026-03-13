import { getSupabaseAdmin } from '../../server/utils/supabaseServer.js';
import { verifyAdmin, verifyAuthenticated } from '../../server/utils/auth.js';
import { createHmac } from 'node:crypto';
import { getBookingWindowDateLimits, isDateWithinBookingWindow } from '../../src/utils/calBookingWindow.js';


const CAL_API_URL = process.env.CAL_COM_API_URL || 'https://api.cal.com/v2';
const API_KEY = process.env.CAL_COM_API_KEY || process.env.VITE_CAL_COM_API_KEY;
const EVENT_TYPE_ID = process.env.CAL_COM_EVENT_TYPE_ID || process.env.VITE_CAL_COM_EVENT_TYPE_ID;

const CAL_API_VERSION = '2024-08-13';
const CAL_EVENT_TYPES_API_VERSION = '2024-06-14';
const ALLOWED_ACTIONS = new Set([
    'availability',
    'booking-rules',
    'create-booking',
    'bookings',
    'webhook',
    'cancel',
    'reschedule',
]);
const EVENT_TYPE_CACHE_TTL_MS = 5 * 60 * 1000;
const eventTypeCache = new Map();

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
const normalizeShortText = (value, maxLength = 255) => {
    const text = String(value || '').trim();
    if (!text) return null;
    return text.slice(0, maxLength);
};
const DEFAULT_PHONE_COUNTRY_CODE = String(
    process.env.DEFAULT_PHONE_COUNTRY_CODE
    || process.env.SCHEDULE_DEFAULT_PHONE_COUNTRY_CODE
    || '+598'
).replace(/\D/g, '') || '598';
const RECOGNIZED_CALLING_CODES = [
    '598',
    '54',
    '55',
    '591',
    '56',
    '57',
    '593',
    '51',
    '52',
    '506',
    '507',
    '595',
    '34',
    '1',
].sort((a, b) => b.length - a.length);

const compactObject = (value) => Object.fromEntries(
    Object.entries(value).filter(([, entry]) => {
        if (entry == null) return false;
        if (typeof entry === 'string') return entry.trim().length > 0;
        if (typeof entry === 'object') return Object.keys(entry).length > 0;
        return true;
    })
);

const normalizeTrackingPayload = (tracking) => {
    if (!tracking || typeof tracking !== 'object' || Array.isArray(tracking)) return null;

    const rawParamsInput = tracking.rawParams && typeof tracking.rawParams === 'object' && !Array.isArray(tracking.rawParams)
        ? tracking.rawParams
        : {};

    const rawParams = compactObject(
        Object.fromEntries(
            Object.entries(rawParamsInput)
                .slice(0, 25)
                .map(([key, value]) => [normalizeShortText(key, 80), normalizeShortText(value, 500)])
                .filter(([key, value]) => key && value)
        )
    );

    const normalized = compactObject({
        entryPoint: normalizeShortText(tracking.entryPoint, 120),
        bot: normalizeShortText(tracking.bot, 120),
        source: normalizeShortText(tracking.source, 120),
        medium: normalizeShortText(tracking.medium, 120),
        campaign: normalizeShortText(tracking.campaign, 255),
        content: normalizeShortText(tracking.content, 255),
        term: normalizeShortText(tracking.term, 255),
        waId: normalizeShortText(tracking.waId, 64),
        threadId: normalizeShortText(tracking.threadId, 120),
        conversationId: normalizeShortText(tracking.conversationId, 120),
        messageId: normalizeShortText(tracking.messageId, 120),
        clickId: normalizeShortText(tracking.clickId, 120),
        fbclid: normalizeShortText(tracking.fbclid, 255),
        fbc: normalizeShortText(tracking.fbc, 255),
        fbp: normalizeShortText(tracking.fbp, 255),
        gclid: normalizeShortText(tracking.gclid, 255),
        landingPath: normalizeShortText(tracking.landingPath, 500),
        referrer: normalizeShortText(tracking.referrer, 500),
        rawParams,
    });

    if (Object.keys(normalized).length === 0) return null;

    return {
        ...normalized,
        capturedAt: new Date().toISOString(),
    };
};

const serializeMetadataValue = (value, maxLength = 500) => {
    if (value == null) return null;
    const text = typeof value === 'string' ? value.trim() : JSON.stringify(value);
    if (!text) return null;
    return text.slice(0, maxLength);
};

const buildTrackingMetadata = (tracking) => {
    const normalized = normalizeTrackingPayload(tracking);
    if (!normalized) return {};

    return compactObject({
        trackingEntryPoint: serializeMetadataValue(normalized.entryPoint, 120),
        trackingBot: serializeMetadataValue(normalized.bot, 120),
        trackingSource: serializeMetadataValue(normalized.source, 120),
        trackingMedium: serializeMetadataValue(normalized.medium, 120),
        trackingCampaign: serializeMetadataValue(normalized.campaign, 255),
        trackingContent: serializeMetadataValue(normalized.content, 255),
        trackingTerm: serializeMetadataValue(normalized.term, 255),
        trackingWaId: serializeMetadataValue(normalized.waId, 64),
        trackingThreadId: serializeMetadataValue(normalized.threadId, 120),
        trackingConversationId: serializeMetadataValue(normalized.conversationId, 120),
        trackingMessageId: serializeMetadataValue(normalized.messageId, 120),
        trackingClickId: serializeMetadataValue(normalized.clickId, 120),
        trackingFbclid: serializeMetadataValue(normalized.fbclid, 255),
        trackingFbc: serializeMetadataValue(normalized.fbc, 255),
        trackingFbp: serializeMetadataValue(normalized.fbp, 255),
        trackingGclid: serializeMetadataValue(normalized.gclid, 255),
        trackingLandingPath: serializeMetadataValue(normalized.landingPath, 500),
        trackingReferrer: serializeMetadataValue(normalized.referrer, 500),
        trackingCapturedAt: serializeMetadataValue(normalized.capturedAt, 40),
        trackingRawParamsJson: serializeMetadataValue(normalized.rawParams, 500),
    });
};

const normalizePhoneForCal = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return { phone: null, error: null };

    if (raw.startsWith('+')) {
        const digits = raw.replace(/\D/g, '');
        if (digits.length < 8 || digits.length > 15) {
            return { phone: null, error: 'Invalid phone number' };
        }
        return { phone: `+${digits}`, error: null };
    }

    let digits = raw.replace(/\D/g, '');
    if (!digits) return { phone: null, error: null };

    if (digits.startsWith('00')) {
        digits = digits.slice(2);
    }

    const matchedCallingCode = RECOGNIZED_CALLING_CODES.find((code) => digits.startsWith(code));
    if (matchedCallingCode) {
        const nationalNumber = digits.slice(matchedCallingCode.length);
        if (nationalNumber.length >= 6 && nationalNumber.length <= 12) {
            return { phone: `+${digits}`, error: null };
        }
    }

    if (digits.length > 10) {
        return { phone: `+${digits}`, error: null };
    }

    const localDigits = digits.replace(/^0+/, '');
    if (localDigits.length < 7 || localDigits.length > 10) {
        return { phone: null, error: 'Invalid phone number' };
    }

    return { phone: `+${DEFAULT_PHONE_COUNTRY_CODE}${localDigits}`, error: null };
};

const normalizePhoneForStorage = (value) => {
    const { phone } = normalizePhoneForCal(value);
    if (phone) return phone;

    const digits = String(value || '').replace(/\D/g, '');
    if (!digits) return null;
    if (digits.length < 8 || digits.length > 15) return null;
    return `+${digits}`;
};

const getCalErrorMessage = (payload) => {
    if (typeof payload === 'string') {
        return payload.trim();
    }
    if (!payload) return '';
    const direct = payload?.error?.message || payload?.message;
    if (typeof direct === 'string' && direct.trim()) return direct;
    const nested = payload?.error?.details?.message || payload?.error?.details?.error;
    if (typeof nested === 'string' && nested.trim()) return nested;
    return '';
};

const parseCalResponse = async (response) => {
    const rawText = await response.text();
    if (!rawText) return null;

    try {
        return JSON.parse(rawText);
    } catch {
        return rawText;
    }
};

const fetchCalEventType = async (eventTypeId) => {
    const cacheKey = String(eventTypeId || '').trim();
    if (!cacheKey) {
        throw new Error('Missing Event Type ID');
    }

    const cachedEntry = eventTypeCache.get(cacheKey);
    if (cachedEntry && cachedEntry.expiresAt > Date.now()) {
        return cachedEntry.value;
    }

    const response = await fetch(`${CAL_API_URL}/event-types/${cacheKey}`, {
        headers: {
            Authorization: `Bearer ${API_KEY}`,
            'cal-api-version': CAL_EVENT_TYPES_API_VERSION,
        },
    });

    const payload = await parseCalResponse(response);
    if (!response.ok) {
        const error = new Error(getCalErrorMessage(payload) || `Failed to fetch event type ${cacheKey}`);
        error.status = response.status;
        error.details = payload;
        throw error;
    }

    const eventType = payload?.data || null;
    eventTypeCache.set(cacheKey, {
        value: eventType,
        expiresAt: Date.now() + EVENT_TYPE_CACHE_TTL_MS,
    });

    return eventType;
};

const buildBookingRulesPayload = ({ eventType, timeZone = 'UTC' }) => {
    const dateLimits = getBookingWindowDateLimits({
        bookingWindow: eventType?.bookingWindow || null,
        timeZone,
    });

    return {
        eventTypeId: eventType?.id != null ? String(eventType.id) : null,
        title: normalizeShortText(eventType?.title, 255),
        bookingWindow: eventType?.bookingWindow || null,
        dateLimits: {
            minDate: dateLimits.minDateString,
            maxDate: dateLimits.maxDateString,
        },
    };
};

const normalizeUtcDateTime = (value) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString();
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

const parseObjectJson = (value) => {
    if (!value) return null;
    if (typeof value === 'object' && !Array.isArray(value)) return value;
    if (typeof value !== 'string') return null;

    try {
        const parsed = JSON.parse(value);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            return parsed;
        }
    } catch {
        return null;
    }

    return null;
};

const getPrimaryAttendee = (booking) => {
    const attendees = Array.isArray(booking?.attendees) ? booking.attendees : [];
    if (attendees.length > 0 && attendees[0] && typeof attendees[0] === 'object') {
        return attendees[0];
    }

    const fallback = compactObject({
        name: booking?.name || booking?.attendee?.name || booking?.responses?.name,
        email: booking?.email || booking?.attendee?.email || booking?.responses?.email,
        phoneNumber: booking?.phoneNumber || booking?.attendee?.phoneNumber || booking?.responses?.phone,
        timeZone: booking?.timeZone || booking?.attendee?.timeZone,
    });

    return fallback;
};

const parseTrackingMetadata = (metadata) => {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
        return {};
    }

    const legacyTracking = parseObjectJson(metadata.tracking);
    const rawParams = parseObjectJson(metadata.trackingRawParamsJson) || {};

    return compactObject({
        entryPoint: metadata.trackingEntryPoint || legacyTracking?.entryPoint || null,
        source: metadata.trackingSource || legacyTracking?.source || rawParams.utm_source || null,
        medium: metadata.trackingMedium || legacyTracking?.medium || rawParams.utm_medium || null,
        campaign: metadata.trackingCampaign || legacyTracking?.campaign || rawParams.utm_campaign || null,
        waId: metadata.trackingWaId || legacyTracking?.waId || null,
        rawParams,
    });
};

const getBookingStatusFromTriggerEvent = (triggerEvent, fallbackStatus) => {
    const normalizedTrigger = String(triggerEvent || '').trim().toUpperCase();
    if (normalizedTrigger.includes('CANCEL')) return 'cancelled';
    if (normalizedTrigger.includes('RESCHED')) return 'scheduled';
    if (normalizedTrigger.includes('COMPLETE')) return 'completed';
    return normalizeBookingStatus(fallbackStatus);
};

const computeBookingEnd = ({ start, end, durationMinutes }) => {
    const normalizedEnd = normalizeUtcDateTime(end);
    if (normalizedEnd) return normalizedEnd;

    const normalizedStart = normalizeUtcDateTime(start);
    if (!normalizedStart) return null;

    const duration = Number(durationMinutes);
    if (!Number.isFinite(duration) || duration <= 0) return null;

    return new Date(new Date(normalizedStart).getTime() + duration * 60 * 1000).toISOString();
};

const mapBookingToAppointmentRecord = ({ booking, triggerEvent, source }) => {
    const attendee = getPrimaryAttendee(booking);
    const metadata = booking?.metadata || {};
    const tracking = parseTrackingMetadata(metadata);
    const calIdStr = booking?.id != null ? String(booking.id) : String(booking?.uid || '');
    const projectId = normalizeUuid(getMetadataValue(metadata, ['projectId', 'project_id']));
    const userId = normalizeUuid(getMetadataValue(metadata, ['userId', 'user_id', 'participantId', 'participant_id']));
    const clientId = normalizeUuid(getMetadataValue(metadata, ['clientId', 'client_id']));
    const rawPhone = attendee?.phoneNumber || attendee?.phone || booking?.phoneNumber || null;
    const normalizedPhone = normalizePhoneForStorage(rawPhone);
    const bookingTimeZone = normalizeShortText(
        attendee?.timeZone
        || booking?.timeZone
        || getMetadataValue(metadata, ['bookingTimeZone', 'booking_time_zone']),
        64
    );
    const durationMinutes = Number(booking?.duration);
    const hasDurationMinutes = Number.isFinite(durationMinutes) && durationMinutes > 0;
    const startAt = normalizeUtcDateTime(booking?.start || booking?.startTime || booking?.scheduled_at);
    const status = getBookingStatusFromTriggerEvent(triggerEvent, booking?.status);

    return compactObject({
        cal_booking_id: calIdStr,
        cal_booking_uid: normalizeShortText(booking?.uid, 255),
        scheduled_at: startAt,
        start_at: startAt,
        end_at: computeBookingEnd({
            start: startAt,
            end: booking?.end || booking?.endTime,
            durationMinutes,
        }),
        booking_time_zone: bookingTimeZone,
        duration_minutes: hasDurationMinutes ? durationMinutes : null,
        status,
        client_name: normalizeShortText(attendee?.name, 255),
        client_email: normalizeEmail(attendee?.email || booking?.email || null) || null,
        client_phone: normalizeShortText(rawPhone, 64),
        client_phone_normalized: normalizeShortText(normalizedPhone, 32),
        whatsapp_normalized: normalizeShortText(normalizedPhone, 32),
        meeting_link: normalizeShortText(booking?.meetingUrl || booking?.location || booking?.videoCallUrl, 500),
        event_type_id: booking?.eventTypeId != null ? String(booking.eventTypeId) : normalizeShortText(getMetadataValue(metadata, ['eventTypeId', 'event_type_id']), 255),
        event_type_name: normalizeShortText(
            booking?.title
            || booking?.eventType?.title
            || getMetadataValue(metadata, ['eventTypeName', 'event_type_name']),
            255
        ),
        project_id: projectId,
        user_id: userId,
        client_id: clientId,
        source: normalizeShortText(
            source
            || tracking.source
            || tracking.entryPoint
            || getMetadataValue(metadata, ['source', 'origen']),
            120
        ) || 'cal.com',
        utm_source: normalizeShortText(tracking.rawParams?.utm_source || tracking.source, 255),
        utm_campaign: normalizeShortText(tracking.rawParams?.utm_campaign || tracking.campaign, 255),
        setter_assigned: normalizeShortText(
            getMetadataValue(metadata, ['setterAssigned', 'setter_asignado', 'participantId', 'participant_id']),
            255
        ),
        notes: normalizeShortText(getMetadataValue(metadata, ['notes', 'observaciones']), 2000),
        last_cal_event: normalizeShortText(triggerEvent, 120),
        cal_metadata: booking,
        raw_payload: booking,
        updated_at: new Date().toISOString(),
    });
};

const hydrateAppointmentRecord = async ({ supabase, record }) => {
    if (!supabase || !record?.cal_booking_id) {
        throw new Error('Cannot hydrate appointment record without Supabase or cal_booking_id');
    }

    if (record.scheduled_at) return record;

    const { data: existing, error } = await supabase
        .from('appointments')
        .select(`
            scheduled_at,
            start_at,
            end_at,
            booking_time_zone,
            duration_minutes,
            status,
            client_name,
            client_email,
            client_phone,
            client_phone_normalized,
            whatsapp_normalized,
            notes,
            meeting_link,
            event_type_id,
            event_type_name,
            project_id,
            user_id,
            client_id,
            source,
            utm_source,
            utm_campaign,
            setter_assigned
        `)
        .eq('cal_booking_id', record.cal_booking_id)
        .maybeSingle();

    if (error) {
        throw new Error(`Failed to load existing appointment ${record.cal_booking_id}: ${error.message}`);
    }

    return {
        ...(existing || {}),
        ...record,
    };
};

const upsertAppointmentRecord = async ({ supabase, booking, triggerEvent, source }) => {
    if (!supabase) {
        throw new Error('Supabase admin client is not configured');
    }

    const record = mapBookingToAppointmentRecord({ booking, triggerEvent, source });
    if (!record.cal_booking_id) {
        throw new Error('Missing Cal booking ID');
    }

    const hydratedRecord = await hydrateAppointmentRecord({ supabase, record });
    if (!hydratedRecord.scheduled_at) {
        throw new Error(`Booking ${record.cal_booking_id} is missing scheduled_at`);
    }

    const { error } = await supabase
        .from('appointments')
        .upsert(hydratedRecord, {
            onConflict: 'cal_booking_id',
        });

    if (error) {
        throw new Error(`Failed to upsert appointment ${record.cal_booking_id}: ${error.message}`);
    }

    return hydratedRecord;
};

const mapCalBookingToAppointment = (booking) => {
    const attendee = booking?.attendees?.[0] || {};
    const calIdStr = booking?.id != null ? String(booking.id) : String(booking?.uid || '');
    const metadata = booking?.metadata || {};
    const projectId = normalizeUuid(getMetadataValue(metadata, ['projectId', 'project_id']));
    const userId = normalizeUuid(getMetadataValue(metadata, ['userId', 'user_id', 'participantId', 'participant_id']));
    const clientId = normalizeUuid(getMetadataValue(metadata, ['clientId', 'client_id']));
    const bookingTimeZone = normalizeShortText(
        attendee?.timeZone || getMetadataValue(metadata, ['bookingTimeZone', 'booking_time_zone']),
        64
    );

    const mapped = {
        id: calIdStr,
        cal_booking_id: calIdStr,
        scheduled_at: booking?.start || null,
        booking_time_zone: bookingTimeZone,
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

const handleBookingRules = async (req, res) => {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const eventTypeId = req.query.eventTypeId || EVENT_TYPE_ID;
    const timeZone = normalizeShortText(req.query.timeZone, 64) || 'UTC';

    if (!API_KEY) {
        return res.status(500).json({ error: 'Server configuration error' });
    }

    if (!eventTypeId) {
        return res.status(400).json({ error: 'Missing Event Type ID' });
    }

    try {
        const eventType = await fetchCalEventType(eventTypeId);

        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        return res.status(200).json({
            ok: true,
            data: buildBookingRulesPayload({ eventType, timeZone }),
        });
    } catch (error) {
        console.error('Error in cal-booking-rules:', error);
        return res.status(error?.status || 500).json({
            error: error?.message || 'Failed to fetch booking rules',
            details: error?.details || null,
        });
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
        tracking,
    } = req.body || {};

    const eventTypeId = bodyEventTypeId || EVENT_TYPE_ID;
    const resolvedTimeZone = normalizeShortText(timeZone, 64) || 'UTC';
    const normalizedParticipantType = participantType ? String(participantType).toLowerCase() : null;
    const normalizedParticipantRole = participantRole ? String(participantRole).toLowerCase() : null;
    const isTeamParticipant = normalizedParticipantType === 'profile'
        || normalizedParticipantRole === 'admin'
        || normalizedParticipantRole === 'worker';

    try {
        const parsedEventTypeId = Number(eventTypeId);
        const normalizedStart = normalizeUtcDateTime(start);
        if (!Number.isFinite(parsedEventTypeId)) {
            return res.status(400).json({
                error: 'Invalid Event Type ID',
                details: { eventTypeId },
            });
        }
        if (!normalizedStart) {
            return res.status(400).json({
                error: 'Invalid booking start time',
                details: { start },
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

        try {
            const eventType = await fetchCalEventType(parsedEventTypeId);
            const bookingWindow = eventType?.bookingWindow || null;

            if (
                bookingWindow
                && !isDateWithinBookingWindow({
                    date: normalizedStart,
                    bookingWindow,
                    timeZone: resolvedTimeZone,
                })
            ) {
                return res.status(400).json({
                    error: 'Selected time is outside the allowed booking window',
                    details: buildBookingRulesPayload({ eventType, timeZone: resolvedTimeZone }),
                });
            }
        } catch (bookingWindowError) {
            console.warn('Unable to validate booking window before booking creation:', bookingWindowError);
        }

        const { phone: normalizedPhone, error: phoneError } = normalizePhoneForCal(phone);
        if (phone && phoneError) {
            return res.status(400).json({
                error: 'Invalid phone / WhatsApp number',
                details: { phone },
            });
        }
        if (!normalizedPhone && !isTeamParticipant) {
            return res.status(400).json({
                error: 'A valid phone / WhatsApp number is required',
            });
        }

        const attendee = {
            name: resolvedName,
            email: resolvedEmail,
            timeZone: resolvedTimeZone,
        };
        if (normalizedPhone) {
            attendee.phoneNumber = normalizedPhone;
        }

        const metadata = compactObject({
            projectId: serializeMetadataValue(projectId, 64),
            userId: serializeMetadataValue(userId, 64),
            clientId: serializeMetadataValue(clientId, 64),
            bookingTimeZone: serializeMetadataValue(resolvedTimeZone, 64),
            participantType: serializeMetadataValue(participantType, 40),
            participantRole: serializeMetadataValue(participantRole, 40),
            participantId: serializeMetadataValue(participantId, 64),
            notes: serializeMetadataValue(notes, 500),
            ...buildTrackingMetadata(tracking),
        });

        const bookingPayload = {
            eventTypeId: parsedEventTypeId,
            start: normalizedStart,
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

        let calData = await parseCalResponse(calResponse);

        if (!calResponse.ok) {
            const calErrorMessage = getCalErrorMessage(calData).toLowerCase();
            const hasPhoneError = calErrorMessage.includes('invalid_number')
                || calErrorMessage.includes('missing attendee phone number')
                || calErrorMessage.includes('required by the event type');
            console.error('Cal.com Booking Error:', calData);
            return res.status(calResponse.status).json({
                error: hasPhoneError
                    ? 'Cal.com rejected the participant phone number'
                    : getCalErrorMessage(calData) || 'Failed to create booking in Cal.com',
                details: typeof calData === 'string' ? { raw: calData } : calData,
            });
        }

        if (supabase) {
            try {
                await upsertAppointmentRecord({
                    supabase,
                    booking: calData?.data || {},
                    triggerEvent: 'BOOKING_CREATED',
                    source: 'cal.com:create-booking',
                });
            } catch (upsertError) {
                console.error('Failed to persist booking after creation:', upsertError);
            }
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
        const todayMidnight = new Date();
        todayMidnight.setHours(0, 0, 0, 0);
        const calAfterStart = afterStartFilter || (isDefaultUpcomingQuery ? todayMidnight.toISOString() : undefined);
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

        const supabase = getSupabaseAdmin();
        if (!supabase) {
            console.error('Missing Supabase admin client for Cal webhook sync');
            return res.status(500).json({ error: 'Database connection error' });
        }

        await upsertAppointmentRecord({
            supabase,
            booking: payload,
            triggerEvent,
            source: 'cal.com:webhook',
        });

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
        const normalizedStart = normalizeUtcDateTime(start);
        if (!normalizedStart) {
            return res.status(400).json({ error: 'Invalid reschedule start time', details: { start } });
        }

        console.log(`[Reschedule] Rescheduling booking: ${bookingUid} to ${normalizedStart}`);

        const calResponse = await fetch(`${CAL_API_URL}/bookings/${bookingUid}/reschedule`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${API_KEY}`,
                'Content-Type': 'application/json',
                'cal-api-version': CAL_API_VERSION,
            },
            body: JSON.stringify({
                start: normalizedStart,
                reschedulingReason: reason || 'Rescheduled by Admin',
            }),
        });

        const calData = await parseCalResponse(calResponse);
        if (!calResponse.ok) {
            console.error('Cal.com Reschedule Error:', calData);
            return res.status(calResponse.status).json({
                error: getCalErrorMessage(calData) || 'Failed to reschedule in Cal.com',
                details: typeof calData === 'string' ? { raw: calData } : calData,
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
    if (action === 'booking-rules') return handleBookingRules(req, res);
    if (action === 'create-booking') return handleCreateBooking(req, res);
    if (action === 'bookings') return handleBookings(req, res);
    if (action === 'webhook') return handleWebhook(req, res);
    if (action === 'cancel') return handleCancel(req, res);
    if (action === 'reschedule') return handleReschedule(req, res);

    return res.status(404).json({ error: 'Cal endpoint not found' });
}
