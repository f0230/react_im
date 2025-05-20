// ✅ useCalendarAvailability.js simplificado sin uso de token
import { useState } from "react";
import { getBusySlots, checkAvailability as apiCheckAvailability } from "../services/calendar";

export const useCalendarAvailability = () => {
    const [busySlots, setBusySlots] = useState([]);

    const fetchBusy = async (start, end) => {
        try {
            const busy = await getBusySlots(start, end);
            setBusySlots(busy);
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
