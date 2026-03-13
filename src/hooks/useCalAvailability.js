import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getScheduleQueryRange, SCHEDULE_TIME_ZONE } from '@/utils/scheduleTime';
import { formatCalendarDate, getTodayCalendarDate, parseCalendarDate } from '@/utils/calBookingWindow';

const normalizeSlots = (data) => {
    const slotsObj = data?.data?.slots || {};
    return Object.values(slotsObj)
        .flat()
        .map((slot) => ({
            ...slot,
            start: slot.start || slot.time
        }));
};

const addCalendarDays = (value, amount) => {
    const date = parseCalendarDate(value) || value;
    if (!date) return null;

    const next = new Date(date.getTime());
    next.setDate(next.getDate() + Number(amount || 0));
    next.setHours(12, 0, 0, 0);
    return next;
};

const buildAvailabilityRange = ({ minDate, maxDate, timeZone = SCHEDULE_TIME_ZONE }) => {
    const rangeStartDate = parseCalendarDate(minDate) || getTodayCalendarDate(timeZone);
    if (!rangeStartDate) return null;

    const rangeEndDate = parseCalendarDate(maxDate) || addCalendarDays(rangeStartDate, 6);
    if (!rangeEndDate) return null;

    const startRange = getScheduleQueryRange(rangeStartDate, timeZone);
    const endRange = getScheduleQueryRange(rangeEndDate, timeZone);
    if (!startRange || !endRange) return null;

    return {
        startIso: startRange.startIso,
        endIso: endRange.endIso,
    };
};

const groupSlotsByCalendarDate = (data, timeZone = SCHEDULE_TIME_ZONE) => {
    const grouped = {};

    normalizeSlots(data).forEach((slot) => {
        const dateKey = formatCalendarDate(parseCalendarDate(slot.start, timeZone));
        if (!dateKey) return;
        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey].push(slot);
    });

    return grouped;
};

const useCalAvailability = ({ selectedDate, enabled = true, onError } = {}) => {
    const [slotsByDate, setSlotsByDate] = useState({});
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [bookingRules, setBookingRules] = useState(null);
    const [loadingBookingRules, setLoadingBookingRules] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const onErrorRef = useRef(onError);

    useEffect(() => {
        onErrorRef.current = onError;
    }, [onError]);

    const resetAvailability = useCallback(() => {
        setSlotsByDate({});
        setSelectedSlot(null);
    }, []);

    useEffect(() => {
        let isCancelled = false;
        const controller = new AbortController();

        const fetchBookingRules = async () => {
            setLoadingBookingRules(true);

            try {
                const response = await fetch(
                    `/api/cal?action=booking-rules&timeZone=${encodeURIComponent(SCHEDULE_TIME_ZONE)}`,
                    { signal: controller.signal }
                );

                if (!response.ok) throw new Error('Failed to fetch booking rules');

                const data = await response.json();
                if (!isCancelled) {
                    setBookingRules(data?.data || null);
                }
            } catch (error) {
                if (!isCancelled && error?.name !== 'AbortError') {
                    console.warn('Error fetching booking rules:', error);
                }
            } finally {
                if (!isCancelled) {
                    setLoadingBookingRules(false);
                }
            }
        };

        fetchBookingRules();

        return () => {
            isCancelled = true;
            controller.abort();
        };
    }, []);

    useEffect(() => {
        if (!enabled || loadingBookingRules) return undefined;

        let isCancelled = false;
        const controller = new AbortController();

        const fetchAvailability = async () => {
            setLoadingSlots(true);
            resetAvailability();

            try {
                const range = buildAvailabilityRange({
                    minDate: bookingRules?.dateLimits?.minDate,
                    maxDate: bookingRules?.dateLimits?.maxDate,
                    timeZone: SCHEDULE_TIME_ZONE,
                });
                if (!range) {
                    throw new Error('Invalid availability range');
                }

                const response = await fetch(
                    `/api/cal?action=availability&start=${range.startIso}&end=${range.endIso}&timeZone=${SCHEDULE_TIME_ZONE}`,
                    { signal: controller.signal }
                );

                if (!response.ok) throw new Error('Failed to fetch slots');

                const data = await response.json();
                if (!isCancelled) {
                    setSlotsByDate(groupSlotsByCalendarDate(data, SCHEDULE_TIME_ZONE));
                }
            } catch (error) {
                if (!isCancelled && error?.name !== 'AbortError') {
                    console.error('Error fetching slots:', error);
                    onErrorRef.current?.(error);
                }
            } finally {
                if (!isCancelled) {
                    setLoadingSlots(false);
                }
            }
        };

        fetchAvailability();

        return () => {
            isCancelled = true;
            controller.abort();
        };
    }, [bookingRules?.dateLimits?.maxDate, bookingRules?.dateLimits?.minDate, enabled, loadingBookingRules, resetAvailability]);

    const selectedDateKey = useMemo(
        () => formatCalendarDate(parseCalendarDate(selectedDate, SCHEDULE_TIME_ZONE)),
        [selectedDate]
    );

    const slots = useMemo(
        () => (selectedDateKey ? slotsByDate[selectedDateKey] || [] : []),
        [selectedDateKey, slotsByDate]
    );

    const availableDates = useMemo(
        () => Object.keys(slotsByDate)
            .sort((left, right) => left.localeCompare(right))
            .map((dateKey) => parseCalendarDate(dateKey, SCHEDULE_TIME_ZONE))
            .filter(Boolean),
        [slotsByDate]
    );

    return {
        bookingRules,
        loadingBookingRules,
        availableDates,
        slots,
        loadingSlots,
        selectedSlot,
        setSelectedSlot,
        resetAvailability
    };
};

export default useCalAvailability;
