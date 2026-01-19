// ✅ calendar.js simplificado sin uso de token
import axios from "axios";
import { supabase } from "../lib/supabaseClient";

// 🔹 1. Obtener slots ocupados para renderizar en DatePicker
export const getBusySlots = async (start, end) => {
    const response = await axios.post("/api/check-availability", {
        range: {
            timeMin: start.toISOString(),
            timeMax: end.toISOString(),
        },
        allBusy: true
    });

    return response.data.busy.map(b => new Date(b.start));
};

// 🔹 2. Verificar si un datetime está libre
export const checkAvailability = async (date) => {
    const response = await axios.post("/api/check-availability", {
        datetime: date
    });
    return response.data.available;
};

// 🔹 3. Crear evento en Google Calendar
export const createCalendarEvent = async ({ name, summary, description, startTime, endTime, email, userId, phone }) => {
    try {
        // Obtener el token de sesión actual
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        const response = await axios.post("/api/create-event", {
            name,
            summary,
            description,
            startTime,
            endTime,
            email,
            userAccessToken: token, // Legacy param kept just in case
            userId,
            phone
        }, {
            headers: {
                'Authorization': token ? `Bearer ${token}` : ''
            }
        });
        return response.data;
    } catch (error) {
        console.error("Error creating event:", error);
        throw error;
    }
};