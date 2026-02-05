import { useCallback, useEffect, useRef, useState } from 'react';

const getDayRange = (date) => {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return { startOfDay, endOfDay };
};

const normalizeSlots = (data) => {
    const slotsObj = data?.data?.slots || {};
    return Object.values(slotsObj)
        .flat()
        .map((slot) => ({
            ...slot,
            start: slot.time
        }));
};

const useCalAvailability = ({ selectedDate, enabled = true, onError } = {}) => {
    const [slots, setSlots] = useState([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
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
        if (!enabled || !selectedDate) return undefined;

        let isCancelled = false;

        const fetchAvailability = async () => {
            setLoadingSlots(true);
            resetAvailability();

            try {
                const { startOfDay, endOfDay } = getDayRange(selectedDate);
                const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                const response = await fetch(
                    `/api/cal/availability?start=${startOfDay.toISOString()}&end=${endOfDay.toISOString()}&timeZone=${timeZone}`
                );

                if (!response.ok) throw new Error('Failed to fetch slots');

                const data = await response.json();
                if (!isCancelled) {
                    setSlots(normalizeSlots(data));
                }
            } catch (error) {
                if (!isCancelled) {
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
        };
    }, [enabled, resetAvailability, selectedDate]);

    return {
        slots,
        loadingSlots,
        selectedSlot,
        setSelectedSlot,
        resetAvailability
    };
};

export default useCalAvailability;
