import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { useCalendarAvailability } from "./useCalendarAvailability";
import { createCalendarEvent } from "../services/calendar";
import { createHubspotLead } from "../services/hubspot";

export const useAppointmentForm = ({ user, token }) => {
    const { busySlots, fetchBusy, checkAvailability } = useCalendarAvailability();

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        message: "",
        datetime: null,
    });
    const [fieldErrors, setFieldErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [isDateValidating, setIsDateValidating] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);

    useEffect(() => {
        if (user && token) {
            setFormData((prev) => ({
                ...prev,
                name: user.name,
                email: user.email,
            }));
            fetchBusy();
        }
    }, [user, token]);

    const handleDateChange = async (date) => {
        setFieldErrors((prev) => ({ ...prev, datetime: null }));

        if (!date) {
            setFormData((prev) => ({ ...prev, datetime: null }));
            return;
        }

        const now = new Date();
        if (date < now) {
            setFieldErrors((prev) => ({ ...prev, datetime: "No puedes seleccionar una fecha pasada" }));
            return;
        }

        const hours = date.getHours();
        if (hours < 9 || hours >= 18) {
            setFieldErrors((prev) => ({ ...prev, datetime: "Solo horarios de 9:00 a 18:00" }));
            return;
        }

        setFormData((prev) => ({ ...prev, datetime: date }));

        if (token) {
            setIsDateValidating(true);
            const available = await checkAvailability(date);
            setIsDateValidating(false);

            if (!available) {
                setFieldErrors((prev) => ({ ...prev, datetime: "Este horario ya está ocupado" }));
                toast.error("Ese horario ya está ocupado. Por favor, elige otro.");
            }
        }
    };

    const handleFinalSubmit = async () => {
        const { datetime, phone, message, name, email } = formData;

        if (!datetime) {
            setFieldErrors((prev) => ({ ...prev, datetime: "Seleccioná una fecha y hora." }));
            return;
        }

        setIsLoading(true);
        const available = await checkAvailability(datetime);
        if (!available) {
            toast.error("Ese horario ya está ocupado. Elegí otro.");
            setFieldErrors((prev) => ({ ...prev, datetime: "Este horario ya está ocupado" }));
            setIsLoading(false);
            return;
        }

        try {
            await createCalendarEvent({
                summary: `Reunión con ${name}`,
                description: message,
                startTime: datetime.toISOString(),
                endTime: new Date(datetime.getTime() + 60 * 60 * 1000).toISOString(),
                email,
            });

            await createHubspotLead(formData);
            toast.success("✅ Reunión agendada con éxito");
            setShowConfirmation(true);
        } catch (error) {
            console.error("❌ Error al agendar:", error);
            toast.error("Ocurrió un error al enviar el formulario.");
        } finally {
            setIsLoading(false);
        }
    };

    return {
        formData,
        setFormData,
        fieldErrors,
        setFieldErrors,
        isLoading,
        isDateValidating,
        showConfirmation,
        setShowConfirmation,
        busySlots,
        handleDateChange,
        handleFinalSubmit,
    };
};
