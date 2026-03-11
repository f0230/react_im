const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const toNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};

const getZonedDayParts = (value, timeZone = 'UTC') => {
    const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
    if (Number.isNaN(date.getTime())) return null;

    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });

    return formatter.formatToParts(date).reduce((acc, part) => {
        if (part.type !== 'literal') {
            acc[part.type] = Number(part.value);
        }
        return acc;
    }, {});
};

export const createCalendarDate = (year, month, day) => (
    new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0, 0)
);

export const parseCalendarDate = (value, timeZone = 'UTC') => {
    if (!value) return null;

    if (value instanceof Date) {
        return createCalendarDate(value.getFullYear(), value.getMonth() + 1, value.getDate());
    }

    const text = String(value).trim();
    if (!text) return null;

    if (DATE_ONLY_PATTERN.test(text)) {
        const [year, month, day] = text.split('-').map(Number);
        return createCalendarDate(year, month, day);
    }

    const parts = getZonedDayParts(text, timeZone);
    if (!parts?.year || !parts?.month || !parts?.day) return null;
    return createCalendarDate(parts.year, parts.month, parts.day);
};

export const formatCalendarDate = (value) => {
    const date = parseCalendarDate(value);
    if (!date) return null;

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const getTodayCalendarDate = (timeZone = 'UTC') => {
    const parts = getZonedDayParts(new Date(), timeZone);
    if (!parts?.year || !parts?.month || !parts?.day) return null;
    return createCalendarDate(parts.year, parts.month, parts.day);
};

const addCalendarDays = (value, amount) => {
    const date = parseCalendarDate(value);
    if (!date) return null;

    const next = new Date(date.getTime());
    next.setDate(next.getDate() + Number(amount || 0));
    next.setHours(12, 0, 0, 0);
    return next;
};

const isWeekend = (value) => {
    const date = parseCalendarDate(value);
    if (!date) return false;

    const day = date.getDay();
    return day === 0 || day === 6;
};

const addBusinessDays = (value, amount) => {
    const date = parseCalendarDate(value);
    if (!date) return null;

    let remaining = Math.max(0, Number(amount || 0));
    let cursor = new Date(date.getTime());

    while (remaining > 0) {
        cursor = addCalendarDays(cursor, 1);
        if (!isWeekend(cursor)) {
            remaining -= 1;
        }
    }

    return cursor;
};

const getFirstDefinedValue = (bookingWindow, paths) => {
    for (const path of paths) {
        const keys = path.split('.');
        let cursor = bookingWindow;

        for (const key of keys) {
            cursor = cursor?.[key];
        }

        if (cursor != null && cursor !== '') {
            return cursor;
        }
    }

    return null;
};

export const normalizeBookingWindow = (bookingWindow) => {
    const raw = Array.isArray(bookingWindow) ? bookingWindow[0] : bookingWindow;
    if (!raw || typeof raw !== 'object') return null;

    return {
        ...raw,
        type: raw.type ? String(raw.type).trim() : null,
        value: toNumber(raw.value),
        rolling: Boolean(raw.rolling),
    };
};

export const getBookingWindowDateLimits = ({ bookingWindow, now = new Date(), timeZone = 'UTC' } = {}) => {
    const normalizedWindow = normalizeBookingWindow(bookingWindow);
    const today = parseCalendarDate(now, timeZone) || getTodayCalendarDate(timeZone);
    let minDate = today;
    let maxDate = null;

    if (normalizedWindow?.type === 'businessDays' && normalizedWindow.value != null) {
        maxDate = addBusinessDays(today, normalizedWindow.value);
    } else if (
        (normalizedWindow?.type === 'calendarDays' || normalizedWindow?.type === 'days')
        && normalizedWindow.value != null
    ) {
        maxDate = addCalendarDays(today, normalizedWindow.value);
    } else if (normalizedWindow) {
        const rawStartDate = getFirstDefinedValue(normalizedWindow, [
            'startDate',
            'start',
            'from',
            'range.startDate',
            'range.start',
            'dates.startDate',
            'dates.start',
        ]);
        const rawEndDate = getFirstDefinedValue(normalizedWindow, [
            'endDate',
            'end',
            'to',
            'range.endDate',
            'range.end',
            'dates.endDate',
            'dates.end',
        ]);

        const parsedStartDate = parseCalendarDate(rawStartDate, timeZone);
        const parsedEndDate = parseCalendarDate(rawEndDate, timeZone);

        if (parsedStartDate) minDate = parsedStartDate;
        if (parsedEndDate) maxDate = parsedEndDate;
    }

    if (minDate && maxDate && maxDate < minDate) {
        maxDate = minDate;
    }

    return {
        bookingWindow: normalizedWindow,
        minDate,
        maxDate,
        minDateString: formatCalendarDate(minDate),
        maxDateString: formatCalendarDate(maxDate),
    };
};

export const isDateWithinBookingWindow = ({ date, bookingWindow, now = new Date(), timeZone = 'UTC' } = {}) => {
    const targetDate = parseCalendarDate(date, timeZone);
    if (!targetDate) return false;

    const { minDate, maxDate } = getBookingWindowDateLimits({ bookingWindow, now, timeZone });
    if (minDate && targetDate < minDate) return false;
    if (maxDate && targetDate > maxDate) return false;
    return true;
};
