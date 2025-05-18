import axios from "axios";

// 🔹 1. Obtener slots ocupados para renderizar en DatePicker
export const getBusySlots = async (start, end) => {
    const response = await axios.post("/api/check-availability", {
        range: {
            timeMin: start.toISOString(),
            timeMax: end.toISOString(),
        },
        allBusy: true,
    });

    return response.data.busy.map(b => new Date(b.start));
};

// 🔹 2. Verificar si un datetime está libre (sin token)
export const isSlotAvailable = async (datetime) => {
    const response = await axios.post("/api/check-availability", {
        datetime,
    });

    return response.data.available;
};

// 🔹 3. Verificar disponibilidad con token (usado por el form)
export const checkAvailability = async (date, token) => {
    const response = await axios.post("/api/check-availability", {
        datetime: date,
        token,
    });
    return response.data.available;
};

// 🔹 4. Crear evento en Google Calendar, pasando el token
export const createCalendarEvent = async ({ summary, description, startTime, endTime, email, token }) => {
    const response = await axios.post("/api/create-event", {
        summary,
        description,
        startTime,
        endTime,
        email,
        token,
    });

    return response.data;
};
