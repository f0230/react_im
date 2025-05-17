import React, { useState, useEffect } from "react";
import Stepper, { Step } from "./Stepper";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import GoogleLoginWrapper from "./GoogleLoginWrapper";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { toast } from "react-hot-toast";

const StepperModal = ({ isOpen, onClose }) => {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        message: "",
        phone: "",
        datetime: null,
    });

    const [isAuthenticated, setIsAuthenticated] = useState(
        !!localStorage.getItem("google_token")
    );
    const [isLoading, setIsLoading] = useState(false);
    const [busySlots, setBusySlots] = useState([]);
    const [showConfirmation, setShowConfirmation] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem("google_token");
        if (token) {
            const payload = JSON.parse(atob(token.split(".")[1]));
            setFormData((prev) => ({
                ...prev,
                name: payload.name,
                email: payload.email,
            }));
            fetchBusySlots(token);
        }
    }, [isAuthenticated]);

    const fetchBusySlots = async (token) => {
        try {
            const now = new Date();
            const future = new Date();
            future.setDate(future.getDate() + 14);

            const response = await axios.post("/api/check-availability", {
                range: {
                    timeMin: now.toISOString(),
                    timeMax: future.toISOString(),
                },
                token,
                allBusy: true,
            });

            if (response.data.busy) {
                const slots = response.data.busy.map((b) => new Date(b.start));
                setBusySlots(slots);
            }
        } catch (error) {
            console.error("Error obteniendo horarios ocupados:", error);
        }
    };

    const checkAvailability = async () => {
        const res = await axios.post("/api/check-availability", {
            datetime: formData.datetime,
            token: localStorage.getItem("google_token"),
        });
        return res.data.available;
    };

    const handleFinalSubmit = async () => {
        const { datetime, phone, message } = formData;

        if (!datetime || !phone.trim() || !message.trim()) {
            toast.error("Todos los campos son obligatorios.");
            return;
        }

        try {
            const token = localStorage.getItem("google_token");
            if (!token) {
                toast.error("Token no encontrado. Iniciá sesión.");
                return;
            }

            setIsLoading(true);
            const available = await checkAvailability();
            if (!available) {
                toast.error("Ese horario ya está ocupado. Elegí otro.");
                setIsLoading(false);
                return;
            }

            await axios.post("/api/create-event", {
                summary: `Reunión con ${formData.name}`,
                description: formData.message,
                startTime: formData.datetime.toISOString(),
                endTime: new Date(formData.datetime.getTime() + 60 * 60 * 1000).toISOString(),
                email: formData.email,
            });

            await axios.post("/api/hubspot-lead", formData);

            toast.success("✅ Reunión agendada con éxito");
            setIsLoading(false);
            setShowConfirmation(true);
        } catch (error) {
            console.error("Error en el envío:", error);
            toast.error("❌ Ocurrió un error. Revisá consola.");
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
                            <GoogleLoginWrapper onLoginSuccess={() => setIsAuthenticated(true)} />
                        ) : (
                            <Stepper onFinalStepCompleted={handleFinalSubmit}>
                                <Step>
                                    <div className="min-h-[250px] sm:min-h-[320px] flex flex-col justify-start gap-0 text-[11px] ">
                                        <label className="font-semibold">Seleccioná día y hora</label>
                                        <DatePicker
                                            selected={formData.datetime}
                                            onChange={(date) => setFormData((prev) => ({ ...prev, datetime: date }))}
                                            showTimeSelect
                                            timeIntervals={30}
                                            dateFormat="Pp"
                                            excludeTimes={busySlots}
                                            className="w-full text-[10px] sm:text-xs p-1 sm:p-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black"
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
                                            onChange={(e) =>
                                                setFormData((prev) => ({ ...prev, phone: e.target.value }))
                                            }
                                            className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black"
                                            required
                                        />

                                        <label className="text-sm font-semibold">Mensaje</label>
                                        <textarea
                                            placeholder="Contanos en qué te podemos ayudar..."
                                            value={formData.message}
                                            onChange={(e) =>
                                                setFormData((prev) => ({ ...prev, message: e.target.value }))
                                            }
                                            className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black min-h-[120px]"
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
                            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center"
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
