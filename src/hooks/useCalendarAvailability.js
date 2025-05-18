// useCalendarAvailability.js actualizado
import { useState } from "react";
import { getBusySlots, isSlotAvailable } from "../services/calendar";

export const useCalendarAvailability = () => {
    const [busySlots, setBusySlots] = useState([]);

    const fetchBusy = async () => {
        try {
            const now = new Date();
            const future = new Date();
            future.setDate(now.getDate() + 14);

            const slots = await getBusySlots(now, future);
            setBusySlots(slots);
        } catch (error) {
            console.error("Error al obtener horarios ocupados:", error);
        }
    };

    const checkAvailability = async (datetime) => {
        try {
            return await isSlotAvailable(datetime);
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