import { useState, useEffect, useRef } from "react";
import { toast } from "react-hot-toast";
import { useCalendarAvailability } from "./useCalendarAvailability";
import { createCalendarEvent } from "@/services/calendar";
import { createHubspotLead } from "@/services/hubspot";
import { isValidPhone } from "@/utils/phone-validation";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
// import { useAuthUser } from "@/hooks/useAuthUser"; // REMOVED (or keep if needed for other things, but we use useAuth for auth check)

export const useAppointmentForm = ({ user }) => {
    const { busySlots, fetchBusy, checkAvailability } = useCalendarAvailability();
    const { user: supabaseUser } = useAuth();

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
    const debounceRef = useRef(null);

    useEffect(() => {
        if (supabaseUser) {
            setFormData((prev) => ({
                ...prev,
                name: supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0],
                email: supabaseUser.email,
            }));
            fetchBusy(new Date(), new Date(new Date().setDate(new Date().getDate() + 7)));
        }
    }, [supabaseUser]);

    useEffect(() => {
        const selectedDate = formData.datetime;
        if (!selectedDate) return;

        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(10, 0, 0, 0);

        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(18, 0, 0, 0);

        fetchBusy(startOfDay, endOfDay);
    }, [formData.datetime]);

    const validateFormFields = (data) => {
        const errors = {};
        const now = new Date();

        if (!data.datetime) {
            errors.datetime = "Seleccioná una fecha y hora.";
        } else if (data.datetime < now) {
            errors.datetime = "No puedes seleccionar una fecha pasada.";
        } else {
            const hours = data.datetime.getHours();
            if (hours < 10 || hours >= 18) {
                errors.datetime = "Solo horarios entre 10:00 y 18:00.";
            }
        }

        if (!data.name?.trim()) {
            errors.name = "El nombre es obligatorio.";
        }

        if (!data.email?.trim()) {
            errors.email = "El email es obligatorio.";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
            errors.email = "Email inválido.";
        }

        if (!data.phone?.trim()) {
            errors.phone = "El teléfono es obligatorio.";
        } else if (!isValidPhone(data.phone)) {
            errors.phone = "Número inválido.";
        }

        if (!data.message?.trim()) {
            errors.message = "El mensaje es obligatorio.";
        }

        return errors;
    };

    const handleDateChange = (date) => {
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
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

            setFormData((prev) => ({ ...prev, datetime: date }));

            setIsDateValidating(true);
            try {
                const available = await checkAvailability(date);
                if (!available) {
                    setFieldErrors((prev) => ({ ...prev, datetime: "Este horario ya está ocupado" }));
                    toast.error("Ese horario ya está ocupado.");
                }
            } catch (err) {
                console.error(err);
            } finally {
                setIsDateValidating(false);
            }
        }, 400);
    };

    const handleFinalSubmit = async () => {
        const errors = validateFormFields(formData);
        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            toast.error("Por favor, completa correctamente todos los campos.");
            return;
        }

        setIsLoading(true);
        try {
            // Re-check availability
            const available = await checkAvailability(formData.datetime);
            if (!available) {
                toast.error("Ese horario ya no está disponible.");
                setIsLoading(false);
                return;
            }

            // 1. Logic for Authenticated users (Calendar Sync)
            if (supabaseUser) {
                await createCalendarEvent({
                    name: formData.name,
                    summary: `Cita DTE: ${formData.name}`,
                    description: formData.message,
                    startTime: formData.datetime.toISOString(),
                    endTime: new Date(formData.datetime.getTime() + 60 * 60 * 1000).toISOString(),
                    email: formData.email,
                    userId: supabaseUser.id,
                    phone: formData.phone
                });
            }

            // 2. Logic for EVERYONE (HubSpot)
            try {
                await createHubspotLead(formData);
            } catch (hubErr) {
                console.warn("⚠️ HubSpot fail:", hubErr.message);
            }

            toast.success(`✅ ¡Cita agendada con éxito, ${formData.name.split(" ")[0]}!`);
            setShowConfirmation(true);

        } catch (error) {
            console.error("❌ Error booking:", error);
            toast.error("Ocurrió un error al agendar la cita.");
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
        validateFormFields
    };
};
