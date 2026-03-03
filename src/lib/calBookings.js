import { supabase } from '@/lib/supabaseClient';

const appendParam = (params, key, value) => {
    if (value === undefined || value === null) return;
    const text = String(value).trim();
    if (!text) return;
    params.set(key, text);
};

export const fetchCalBookings = async ({
    status,
    afterStart,
    beforeEnd,
    attendeeEmail,
    eventTypeId,
} = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;
    if (!accessToken) {
        throw new Error('Sesión expirada. Vuelve a iniciar sesión.');
    }

    const params = new URLSearchParams();
    params.set('source', 'cal');
    appendParam(params, 'status', status);
    appendParam(params, 'afterStart', afterStart);
    appendParam(params, 'beforeEnd', beforeEnd);
    appendParam(params, 'attendeeEmail', attendeeEmail);
    appendParam(params, 'eventTypeId', eventTypeId);

    const response = await fetch(`/api/cal/bookings?${params.toString()}`, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(payload?.error || 'Error al cargar las citas');
    }

    return Array.isArray(payload?.data) ? payload.data : [];
};

