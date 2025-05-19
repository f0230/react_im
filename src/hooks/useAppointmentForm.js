import { useReducer, useEffect, useRef } from "react";
import { toast } from "react-hot-toast";
import { useCalendarAvailability } from "./useCalendarAvailability";
import { createCalendarEvent } from "@/services/calendar";
import { createHubspotLead } from "@/services/hubspot";
import { validateAppointmentFields } from "@/utils/validators";
import { useAuthUser } from "@/hooks/useAuthUser";

const initialState = (user) => ({
    formData: {
        name: user?.name || "",
        email: user?.email || "",
        phone: "",
        message: "",
        datetime: null,
    },
    errors: {},
    isLoading: false,
    isDateValidating: false,
    showConfirmation: false,
});

function reducer(state, action) {
    switch (action.type) {
        case "SET_FIELD":
            return {
                ...state,
                formData: { ...state.formData, [action.field]: action.value },
            };
        case "SET_ERRORS":
            return { ...state, errors: action.errors };
        case "SET_LOADING":
            return { ...state, isLoading: action.value };
        case "SET_DATE_VALIDATING":
            return { ...state, isDateValidating: action.value };
        case "SET_CONFIRMATION":
            return { ...state, showConfirmation: action.value };
        case "RESET":
            return initialState(action.user);
        default:
            return state;
    }
}

export const useAppointmentForm = ({ user }) => {
    const { busySlots, fetchBusy, checkAvailability } = useCalendarAvailability();
    const { accessToken } = useAuthUser();
    const [state, dispatch] = useReducer(reducer, user, initialState);
    const debounceRef = useRef(null);

    const { formData, errors, isLoading, isDateValidating, showConfirmation } = state;

    // SSR-safe localStorage restoration
    useEffect(() => {
        if (typeof window !== "undefined") {
            const stored = localStorage.getItem("appointmentForm");
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    if (parsed.phone) dispatch({ type: "SET_FIELD", field: "phone", value: parsed.phone });
                    if (parsed.message) dispatch({ type: "SET_FIELD", field: "message", value: parsed.message });
                } catch { }
            }
        }
    }, []);

    useEffect(() => {
        if (typeof window !== "undefined") {
            localStorage.setItem("appointmentForm", JSON.stringify({
                phone: formData.phone,
                message: formData.message,
            }));
        }
    }, [formData.phone, formData.message]);

    useEffect(() => {
        if (formData.datetime) {
            const start = new Date(formData.datetime);
            const end = new Date(start);
            start.setHours(10, 0, 0, 0);
            end.setHours(18, 0, 0, 0);
            fetchBusy(start, end);
        }
    }, [formData.datetime]);

    const handleDateChange = (date) => {
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            if (!date) return dispatch({ type: "SET_FIELD", field: "datetime", value: null });

            const now = new Date();
            if (date < now || date.getHours() < 10 || date.getHours() >= 18) {
                dispatch({ type: "SET_ERRORS", errors: { ...errors, datetime: "Horario inválido" } });
                return;
            }

            dispatch({ type: "SET_FIELD", field: "datetime", value: date });
            dispatch({ type: "SET_DATE_VALIDATING", value: true });

            try {
                const available = await checkAvailability(date);
                if (!available) {
                    toast.error("Ese horario ya está ocupado.");
                    dispatch({ type: "SET_ERRORS", errors: { ...errors, datetime: "Este horario ya está ocupado" } });
                }
            } catch (err) {
                toast.error("Error al verificar disponibilidad.");
                console.error(err);
            } finally {
                dispatch({ type: "SET_DATE_VALIDATING", value: false });
            }
        }, 500);
    };

    const handleFinalSubmit = async () => {
        const validationErrors = validateAppointmentFields(formData);
        if (Object.keys(validationErrors).length > 0) {
            dispatch({ type: "SET_ERRORS", errors: validationErrors });
            return;
        }

        dispatch({ type: "SET_LOADING", value: true });

        try {
            const available = await checkAvailability(formData.datetime);
            if (!available) {
                toast.error("Ese horario ya está ocupado.");
                dispatch({ type: "SET_ERRORS", errors: { datetime: "Este horario ya está ocupado" } });
                return;
            }

            await createCalendarEvent({
                name: formData.name,
                summary: `Reunión con ${formData.name}`,
                description: formData.message,
                startTime: formData.datetime.toISOString(),
                endTime: new Date(formData.datetime.getTime() + 60 * 60 * 1000).toISOString(),
                email: formData.email,
                userAccessToken: accessToken,
            });

            try {
                await createHubspotLead(formData);
            } catch (err) {
                console.warn("HubSpot error:", err);
            }

            toast.success(`Gracias ${formData.name.split(" ")[0]} por agendar con nosotros`);
            dispatch({ type: "SET_CONFIRMATION", value: true });

            setTimeout(() => {
                dispatch({ type: "RESET", user });
            }, 3000);

        } catch (err) {
            console.error("Error al enviar:", err);
            toast.error("Ocurrió un error al enviar el formulario.");
        } finally {
            dispatch({ type: "SET_LOADING", value: false });
        }
    };

    return {
        formData,
        errors,
        isLoading,
        isDateValidating,
        showConfirmation,
        busySlots,
        handleDateChange,
        handleFinalSubmit,
        dispatch,
    };
};
