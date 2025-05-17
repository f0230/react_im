import axios from "axios";

export const getBusySlots = async (token, start, end) => {
    const response = await axios.post("/api/check-availability", {
        range: {
            timeMin: start.toISOString(),
            timeMax: end.toISOString(),
        },
        token,
        allBusy: true,
    });

    return response.data.busy.map(b => new Date(b.start));
};

export const isSlotAvailable = async (datetime, token) => {
    const response = await axios.post("/api/check-availability", {
        datetime,
        token,
    });

    return response.data.available;
};

export const createCalendarEvent = async ({ summary, description, startTime, endTime, email }) => {
    return axios.post("/api/create-event", {
        summary,
        description,
        startTime,
        endTime,
        email,
    });
};
