// ✅ useCalendarAvailability.js
import { useState } from "react";
import axios from "axios";

export const useCalendarAvailability = () => {
    const [busySlots, setBusySlots] = useState([]);

    const fetchBusy = async (start, end, token) => {
        try {
            const response = await axios.post("/api/check-availability", {
                range: {
                    timeMin: start.toISOString(),
                    timeMax: end.toISOString(),
                },
                allBusy: true,
                token,
            });
            setBusySlots(response.data.busy.map((b) => new Date(b.start)));
        } catch (error) {
            console.error("❌ Error al obtener slots ocupados:", error);
        }
    };

    const checkAvailability = async (datetime, token) => {
        try {
            const response = await axios.post("/api/check-availability", {
                datetime,
                token,
            });
            return response.data.available;
        } catch (error) {
            console.error("❌ Error verificando disponibilidad:", error);
            return false;
        }
    };

    return { busySlots, fetchBusy, checkAvailability };
};
