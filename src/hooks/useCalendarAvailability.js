// ✅ useCalendarAvailability.js actualizado
import { useState } from "react";
import { getBusySlots, checkAvailability as apiCheckAvailability } from "../services/calendar";

export const useCalendarAvailability = () => {
    const [busySlots, setBusySlots] = useState([]);

    const fetchBusy = async (start, end, token) => {
        try {
            const busy = await getBusySlots(start, end, token);
            setBusySlots(busy);
        } catch (error) {
            console.error("❌ Error al obtener slots ocupados:", error);
        }
    };

    const checkAvailability = async (datetime, token) => {
        try {
            return await apiCheckAvailability(datetime, token);
        } catch (error) {
            console.error("❌ Error verificando disponibilidad:", error);
            return false;
        }
    };

    return { busySlots, fetchBusy, checkAvailability };
};