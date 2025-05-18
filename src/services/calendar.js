import axios from "axios";

// Retorna un array de Date con los slots ocupados
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

// Retorna true si el datetime está disponible
export const isSlotAvailable = async (datetime) => {
    const response = await axios.post("/api/check-availability", {
        datetime,
    });

    return response.data.available;
};

// Crea un evento y devuelve el response del backend
export const createCalendarEvent = async ({ summary, description, startTime, endTime, email }) => {
    const response = await axios.post("/api/create-event", {
        summary,
        description,
        startTime,
        endTime,
        email,s
    });

    return response.data;
};
