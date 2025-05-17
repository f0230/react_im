import { useState } from "react";
import { getBusySlots, isSlotAvailable } from "../services/calendar";

export const useCalendarAvailability = () => {
    const [busySlots, setBusySlots] = useState([]);

    const fetchBusy = async (token) => {
        try {
            const now = new Date();
            const future = new Date();
            future.setDate(now.getDate() + 14);

            const slots = await getBusySlots(token, now, future);
            setBusySlots(slots);
        } catch (error) {
            console.error("Error al obtener horarios ocupados:", error);
        }
    };

    const checkAvailability = async (datetime, token) => {
        try {
            return await isSlotAvailable(datetime, token);
        } catch (error) {
            console.error("Error al verificar disponibilidad:", error);
            return false;
        }
    };

    return {
        busySlots,
        fetchBusy,
        checkAvailability,
    };
};
