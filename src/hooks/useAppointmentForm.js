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
    const { user: supabaseUser } = useAuth(); // Use Supabase User
    const accessToken = !!supabaseUser; // Boolean check for now, or true if user exists
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
        if (user) {
            setFormData((prev) => ({
                ...prev,
                name: user.name,
                email: user.email,
            }));
            fetchBusy(new Date(), new Date(new Date().setDate(new Date().getDate() + 3)));
        }
    }, [user]);

    useEffect(() => {
        const selectedDate = formData.datetime;
        if (!selectedDate) return;

        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(10, 0, 0, 0);

        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(18, 0, 0, 0);

        fetchBusy(startOfDay, endOfDay);
    }, [formData.datetime]);

    const validateFormFields = ({ datetime, phone, message }) => {
        const errors = {};
        const now = new Date();

        if (!datetime) {
            errors.datetime = "Seleccioná una fecha y hora.";
        } else if (datetime < now) {
            errors.datetime = "No puedes seleccionar una fecha pasada.";
        } else {
            const hours = datetime.getHours();
            const minutes = datetime.getMinutes();
            if (hours < 10 || (hours === 18 && minutes > 0) || hours > 18) {
                errors.datetime = "Solo se permiten horarios entre 10:00 y 18:00.";
            }
        }

        if (!phone?.trim()) {
            errors.phone = "El teléfono es obligatorio.";
        } else if (!isValidPhone(phone)) {
            errors.phone = "Ingresá un número de teléfono válido.";
        }

        if (!message?.trim()) {
            errors.message = "El mensaje es obligatorio.";
        } else if (message.trim().length < 10) {
            errors.message = "El mensaje debe tener al menos 10 caracteres.";
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

            const hours = date.getHours();
            if (hours < 10 || hours >= 18) {
                setFieldErrors((prev) => ({ ...prev, datetime: "Solo horarios de 10:00 a 18:00" }));
                return;
            }

            setFormData((prev) => ({ ...prev, datetime: date }));

            setIsDateValidating(true);
            try {
                const available = await checkAvailability(date);
                if (!available) {
                    setFieldErrors((prev) => ({ ...prev, datetime: "Este horario ya está ocupado" }));
                    toast.error("Ese horario ya está ocupado. Por favor, elegí otro.");
                }
            } catch (err) {
                toast.error("Error al verificar disponibilidad.");
                console.error(err);
            } finally {
                setIsDateValidating(false);
            }
        }, 400);
    };

    const { isLoginModalOpen, setIsLoginModalOpen } = useUI(); // NEW: Need to import useUI

    const handleFinalSubmit = async () => {
        const { datetime, phone, message, name, email } = formData;

        const errors = validateFormFields({ datetime, phone, message });
        const hasErrors = Object.keys(errors).length > 0;

        if (hasErrors) {
            setFieldErrors(errors);
            return;
        }

        // Auth Check
        if (!supabaseUser) {
            localStorage.setItem("pendingAppointment", JSON.stringify(formData));
            setIsLoginModalOpen(true);
            return;
        }

        setIsLoading(true);
        try {
            const available = await checkAvailability(datetime);
            if (!available) {
                toast.error("Ese horario ya está ocupado. Elegí otro.");
                setFieldErrors((prev) => ({ ...prev, datetime: "Este horario ya está ocupado" }));
                return;
            }

            await createCalendarEvent({
                name,
                summary: `Reunión con ${name}`,
                description: message,
                startTime: datetime.toISOString(),
                endTime: new Date(datetime.getTime() + 60 * 60 * 1000).toISOString(),
                email,
                // userAccessToken: accessToken, // REMOVED previously
                userId: supabaseUser.id, // NEW
                phone
            });

            console.log("📤 Enviando a HubSpot:", formData);

            try {
                await createHubspotLead(formData);
            } catch (hubErr) {
                console.warn("⚠️ No se pudo registrar en HubSpot:", hubErr.message);
            }

            toast.success(`✅ Gracias ${name.split(" ")[0]} por agendar con nosotros`);
            setShowConfirmation(true);

        } catch (error) {
            console.error("❌ Error al agendar:", error);
            toast.error("Ocurrió un error al enviar el formulario.");
        } finally {
            setIsLoading(false);
        }

        setTimeout(() => {
            setShowConfirmation(false);
            setFormData({
                name: user?.name || "",
                email: user?.email || "",
                phone: "",
                message: "",
                datetime: null,
            });
        }, 3000);
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
