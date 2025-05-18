// ✅ useAppointmentForm.js
import { useState, useEffect, useRef } from "react";
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
    const debounceRef = useRef(null);

    useEffect(() => {
        if (user && token) {
            setFormData((prev) => ({
                ...prev,
                name: user.name,
                email: user.email,
            }));
            // carga inicial genérica
            fetchBusy(new Date(), new Date(new Date().setDate(new Date().getDate() + 3)), token);
        }
    }, [user, token]);

    useEffect(() => {
        const selectedDate = formData.datetime;
        if (!selectedDate || !token) return;

        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(10, 0, 0, 0);

        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(18, 0, 0, 0);

        fetchBusy(startOfDay, endOfDay, token);
    }, [formData.datetime, token]);

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

            if (token) {
                setIsDateValidating(true);
                try {
                    const available = await checkAvailability(date, token);
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
            }
        }, 400);
    };
    const handleFinalSubmit = async () => {
        const { datetime, phone, message, name, email } = formData;
        let hasErrors = false;
        const errors = {};

        if (!datetime) {
            errors.datetime = "Seleccioná una fecha y hora.";
            hasErrors = true;
        } else {
            const now = new Date();
            const hours = datetime.getHours();
            const minutes = datetime.getMinutes();
            if (datetime < now) {
                errors.datetime = "No puedes seleccionar una fecha pasada.";
                hasErrors = true;
            } else if (hours < 9 || (hours === 18 && minutes > 0) || hours > 18) {
                errors.datetime = "Solo horarios entre 9:00 y 18:00.";
                hasErrors = true;
            }
        }

        const phoneRegex = /^(\+?[0-9]{1,4})?[-\s]?([0-9]{3,4})[-\s]?([0-9]{3,4})[-\s]?([0-9]{0,4})$/;
        const digitsOnly = phone?.replace(/[\s\-()]/g, '');
        const hasMinimumDigits = digitsOnly?.length >= 8;

        if (!phone?.trim()) {
            errors.phone = "El teléfono es obligatorio.";
            hasErrors = true;
        } else if (!(phoneRegex.test(phone) && hasMinimumDigits)) {
            errors.phone = "Ingresá un número de teléfono válido.";
            hasErrors = true;
        }

        if (!message?.trim()) {
            errors.message = "El mensaje es obligatorio.";
            hasErrors = true;
        } else if (message.trim().length < 10) {
            errors.message = "El mensaje debe tener al menos 10 caracteres.";
            hasErrors = true;
        }

        if (hasErrors) {
            setFieldErrors(errors);
            return;
        }

        setIsLoading(true);
        try {
            const available = await checkAvailability(datetime, token);
            if (!available) {
                toast.error("Ese horario ya está ocupado. Elegí otro.");
                setFieldErrors((prev) => ({ ...prev, datetime: "Este horario ya está ocupado" }));
                return;
            }

            await createCalendarEvent({
                summary: `Reunión con ${name}`,
                description: message,
                startTime: datetime.toISOString(),
                endTime: new Date(datetime.getTime() + 60 * 60 * 1000).toISOString(),
                email,
                token,
            });

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
    