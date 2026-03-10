export const SCHEDULE_TIME_ZONE = 'America/Montevideo';
export const SCHEDULE_LOCALE = 'es-UY';
export const SCHEDULE_TIME_ZONE_LABEL = 'Hora Uruguay';

const getDateFromValue = (value) => {
    const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

const getFormatterParts = (date, timeZone = SCHEDULE_TIME_ZONE) => {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
    });

    return formatter.formatToParts(date).reduce((acc, part) => {
        if (part.type !== 'literal') {
            acc[part.type] = part.value;
        }
        return acc;
    }, {});
};

const getTimeZoneOffsetMs = (date, timeZone = SCHEDULE_TIME_ZONE) => {
    const parts = getFormatterParts(date, timeZone);
    const asUtc = Date.UTC(
        Number(parts.year),
        Number(parts.month) - 1,
        Number(parts.day),
        Number(parts.hour),
        Number(parts.minute),
        Number(parts.second),
        0
    );

    return asUtc - date.getTime();
};

const zonedDateTimeToUtc = (
    { year, month, day, hour = 0, minute = 0, second = 0, millisecond = 0 },
    timeZone = SCHEDULE_TIME_ZONE
) => {
    const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, second, millisecond));
    let offset = getTimeZoneOffsetMs(utcGuess, timeZone);
    let result = new Date(utcGuess.getTime() - offset);
    const adjustedOffset = getTimeZoneOffsetMs(result, timeZone);

    if (adjustedOffset !== offset) {
        offset = adjustedOffset;
        result = new Date(utcGuess.getTime() - offset);
    }

    return result;
};

export const getScheduleQueryRange = (value, timeZone = SCHEDULE_TIME_ZONE) => {
    const date = getDateFromValue(value);
    if (!date) return null;

    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    const start = zonedDateTimeToUtc({ year, month, day }, timeZone);
    const nextDay = new Date(date.getTime());
    nextDay.setDate(nextDay.getDate() + 1);
    const nextYear = nextDay.getFullYear();
    const nextMonth = nextDay.getMonth() + 1;
    const nextDate = nextDay.getDate();
    const nextStart = zonedDateTimeToUtc({ year: nextYear, month: nextMonth, day: nextDate }, timeZone);
    const end = new Date(nextStart.getTime() - 1);

    return {
        start,
        end,
        startIso: start.toISOString(),
        endIso: end.toISOString(),
    };
};

export const formatScheduleDateTime = (
    value,
    {
        locale = SCHEDULE_LOCALE,
        timeZone = SCHEDULE_TIME_ZONE,
        ...options
    } = {}
) => {
    const date = getDateFromValue(value);
    if (!date) return '';

    return new Intl.DateTimeFormat(locale, {
        timeZone,
        ...options,
    }).format(date);
};

export const formatScheduleTime = (
    value,
    {
        locale = SCHEDULE_LOCALE,
        timeZone = SCHEDULE_TIME_ZONE,
        hour: _hour,
        minute: _minute,
        ...options
    } = {}
) => formatScheduleDateTime(value, {
    locale,
    timeZone,
    hour: _hour || '2-digit',
    minute: _minute || '2-digit',
    ...options,
});

export const formatScheduleDate = (
    value,
    {
        locale = SCHEDULE_LOCALE,
        timeZone = SCHEDULE_TIME_ZONE,
        day: _day,
        month: _month,
        year: _year,
        ...options
    } = {}
) => formatScheduleDateTime(value, {
    locale,
    timeZone,
    day: _day || '2-digit',
    month: _month || '2-digit',
    year: _year || 'numeric',
    ...options,
});

export const getScheduleDayParts = (value, timeZone = SCHEDULE_TIME_ZONE) => {
    const date = getDateFromValue(value);
    if (!date) return null;

    return {
        monthShort: formatScheduleDateTime(date, { timeZone, month: 'short' }),
        dayOfMonth: formatScheduleDateTime(date, { timeZone, day: '2-digit' }),
    };
};

export const getScheduleDisplayDate = (value, timeZone = SCHEDULE_TIME_ZONE) => {
    const date = getDateFromValue(value);
    if (!date) return null;

    const targetOffset = getTimeZoneOffsetMs(date, timeZone);
    const browserOffset = -date.getTimezoneOffset() * 60 * 1000;
    return new Date(date.getTime() + (targetOffset - browserOffset));
};
