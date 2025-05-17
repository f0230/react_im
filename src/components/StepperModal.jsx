import React, { useState, useEffect } from "react";
import Stepper, { Step } from "./Form/Stepper";
import { motion, AnimatePresence } from "framer-motion";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { toast } from "react-hot-toast";

import GoogleLoginWrapper from "./Form/GoogleLoginWrapper";
import { useAuthUser } from "../hooks/useAuthUser";
import { useCalendarAvailability } from "../hooks/useCalendarAvailability";
import { createCalendarEvent } from "../services/calendar";
import { createHubspotLead } from "../services/hubspot";

const StepperModal = ({ isOpen, onClose }) => {
    const { user, token, isAuthenticated, setToken } = useAuthUser();
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
    const [showConfirmation, setShowConfirmation] = useState(false);

    useEffect(() => {
        if (user && token) {
            setFormData((prev) => ({
                ...prev,
                name: user.name,
                email: user.email,
            }));
            fetchBusy(token);
        }
    }, [user, token]);

    const validateFields = () => {
        const errors = {};
        if (!formData.datetime) errors.datetime = true;
        if (!formData.phone.trim()) errors.phone = true;
        if (!formData.message.trim()) errors.message = true;
        setFieldErrors(errors);
        return errors;
    };

    const handleFinalSubmit = async () => {
        const errors = validateFields();
        if (Object.keys(errors).length > 0) {
            if (errors.datetime) toast.error("Seleccioná una fecha y hora para continuar.");
            if (errors.phone) toast.error("El teléfono es obligatorio.");
            if (errors.message) toast.error("El mensaje es obligatorio.");
            return;
        }

        const { datetime, phone, message, name, email } = formData;

        if (!token) {
            toast.error("No hay sesión activa. Iniciá sesión.");
            return;
        }

        setIsLoading(true);
        const available = await checkAvailability(datetime, token);
        if (!available) {
            toast.error("Ese horario ya está ocupado. Elegí otro.");
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

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md overflow-y-auto flex items-center justify-center p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <button
                        className="absolute top-6 right-6 text-white hover:scale-110 transition-transform duration-200 z-50"
                        onClick={onClose}
                        aria-label="Cerrar"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    <motion.div
                        className="bg-white/90 text-bold rounded-2xl shadow-xl w-full max-w-[95vw] sm:max-w-[90vw] md:max-w-xl p-3 sm:p-4 md:p-8 z-40"
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                    >
                        <h2 className="text-base sm:text-lg md:text-2xl font-bold mb-6 text-center">
                            Agendá tu cita
                        </h2>

                        {!isAuthenticated ? (
                            <GoogleLoginWrapper onLoginSuccess={() => setToken(localStorage.getItem("google_token"))} />
                        ) : (
                            <Stepper onFinalStepCompleted={handleFinalSubmit}>
                                <Step>
                                    <div className="min-h-[250px] sm:min-h-[320px] flex flex-col justify-start gap-0 text-[11px]">
                                        <label className="font-semibold">Seleccioná día y hora</label>
                                        <DatePicker
                                            selected={formData.datetime}
                                            onChange={(date) => setFormData((prev) => ({ ...prev, datetime: date }))}
                                            showTimeSelect
                                            timeIntervals={30}
                                            dateFormat="Pp"
                                            excludeTimes={busySlots}
                                            withPortal={typeof window !== 'undefined' && window.innerWidth < 640}
                                            className={`w-full text-[10px] sm:text-xs p-1 sm:p-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-black ${fieldErrors.datetime ? "border-red-500" : "border-gray-300"}`}
                                            placeholderText="Elegí fecha y hora"
                                            calendarClassName="dark-calendar"
                                            popperClassName="dark-datepicker-popper"
                                            required
                                        />
                                    </div>
                                </Step>

                                <Step>
                                    <div className="min-h-[320px] flex flex-col gap-4">
                                        <label className="text-sm font-semibold">Teléfono</label>
                                        <input
                                            type="tel"
                                            placeholder="Ej: +598 99 123 456"
                                            value={formData.phone}
                                            onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                                            className={`w-full p-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-black ${fieldErrors.phone ? "border-red-500" : "border-gray-300"}`}
                                            required
                                        />

                                        <label className="text-sm font-semibold">Mensaje</label>
                                        <textarea
                                            placeholder="Contanos en qué te podemos ayudar..."
                                            value={formData.message}
                                            onChange={(e) => setFormData((prev) => ({ ...prev, message: e.target.value }))}
                                            className={`w-full p-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-black min-h-[120px] ${fieldErrors.message ? "border-red-500" : "border-gray-300"}`}
                                            required
                                        />
                                    </div>
                                </Step>
                            </Stepper>
                        )}

                        {isLoading && (
                            <p className="text-center text-sm mt-4 text-gray-600 animate-pulse">
                                Verificando disponibilidad y agendando...
                            </p>
                        )}
                    </motion.div>

                    {showConfirmation && (
                        <motion.div
                            className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <div className="bg-white rounded-xl shadow-lg p-6 text-center max-w-sm">
                                <h3 className="text-xl font-semibold mb-2">¡Cita confirmada!</h3>
                                <p className="text-gray-700 mb-4">Gracias por agendar con nosotros. Te esperamos en el horario elegido.</p>
                                <button
                                    className="bg-black text-white px-4 py-2 rounded hover:bg-gray-900"
                                    onClick={() => {
                                        setShowConfirmation(false);
                                        onClose();
                                    }}
                                >
                                    Cerrar
                                </button>
                            </div>
                        </motion.div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default StepperModal;
