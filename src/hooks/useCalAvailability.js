import { useCallback, useEffect, useRef, useState } from 'react';
import { getScheduleQueryRange, SCHEDULE_TIME_ZONE } from '@/utils/scheduleTime';

const normalizeSlots = (data) => {
    const slotsObj = data?.data?.slots || {};
    return Object.values(slotsObj)
        .flat()
        .map((slot) => ({
            ...slot,
            start: slot.start || slot.time
        }));
};

const useCalAvailability = ({ selectedDate, enabled = true, onError } = {}) => {
    const [slots, setSlots] = useState([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [bookingRules, setBookingRules] = useState(null);
    const [loadingBookingRules, setLoadingBookingRules] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const onErrorRef = useRef(onError);

    useEffect(() => {
        onErrorRef.current = onError;
    }, [onError]);

    const resetAvailability = useCallback(() => {
        setSlots([]);
        setSelectedSlot(null);
    }, []);

    useEffect(() => {
        let isCancelled = false;
        const controller = new AbortController();

        const fetchBookingRules = async () => {
            setLoadingBookingRules(true);

            try {
                const response = await fetch(
                    `/api/cal/booking-rules?timeZone=${encodeURIComponent(SCHEDULE_TIME_ZONE)}`,
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
        if (!enabled || !selectedDate) return undefined;

        let isCancelled = false;
        const controller = new AbortController();

        const fetchAvailability = async () => {
            setLoadingSlots(true);
            resetAvailability();

            try {
                const range = getScheduleQueryRange(selectedDate, SCHEDULE_TIME_ZONE);
                if (!range) {
                    throw new Error('Invalid selected date');
                }

                const response = await fetch(
                    `/api/cal/availability?start=${range.startIso}&end=${range.endIso}&timeZone=${SCHEDULE_TIME_ZONE}`,
                    { signal: controller.signal }
                );

                if (!response.ok) throw new Error('Failed to fetch slots');

                const data = await response.json();
                if (!isCancelled) {
                    setSlots(normalizeSlots(data));
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
    }, [enabled, resetAvailability, selectedDate]);

    return {
        bookingRules,
        loadingBookingRules,
        slots,
        loadingSlots,
        selectedSlot,
        setSelectedSlot,
        resetAvailability
    };
};

export default useCalAvailability;
