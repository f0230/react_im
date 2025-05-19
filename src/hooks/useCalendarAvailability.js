import { useState, useRef, useEffect } from "react";
import { getBusySlots, checkAvailability as apiCheckAvailability } from "../services/calendar";

export const useCalendarAvailability = () => {
    const [busySlots, setBusySlots] = useState([]);
    const isMountedRef = useRef(true);
    const lastFetchedRef = useRef({ start: null, end: null });

    useEffect(() => {
        return () => {
            isMountedRef.current = false; // evita setState en componente desmontado
        };
    }, []);

    const fetchBusy = async (start, end) => {
        // evita llamadas duplicadas con los mismos rangos
        if (
            lastFetchedRef.current.start?.getTime() === start.getTime() &&
            lastFetchedRef.current.end?.getTime() === end.getTime()
        ) {
            return;
        }

        try {
            const busy = await getBusySlots(start, end);
            if (isMountedRef.current) {
                setBusySlots(busy);
                lastFetchedRef.current = { start, end };
            }
        } catch (error) {
            console.error("❌ Error al obtener slots ocupados:", error);
        }
    };

    const checkAvailability = async (datetime) => {
        try {
            return await apiCheckAvailability(datetime);
        } catch (error) {
            console.error("❌ Error verificando disponibilidad:", error);
            return false;
        }
    };

    return { busySlots, fetchBusy, checkAvailability };
};
