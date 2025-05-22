// StepperModal.jsx optimizado con comentarios en línea
import React, { useEffect } from "react";
import Stepper, { Step } from "@/components/Form/Stepper";
import { motion, AnimatePresence } from "framer-motion";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { toast } from "react-hot-toast";
import GoogleLoginWrapper from "@/components/Form/GoogleLoginWrapper";
import { useAuthUser } from "@/hooks/useAuthUser";
import { useAppointmentForm } from "@/hooks/useAppointmentForm";
import { Link } from 'react-router-dom';


// Componente de error reutilizable
const ErrorMessage = ({ message }) => {
    if (!message) return null;
    return (
        <div className="flex items-center mt-1 text-xs text-red-500">
            <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{message}</span>
        </div>
    );
};

const StepperModal = ({ isOpen, onClose }) => {
    const { user, token, isAuthenticated, setToken } = useAuthUser();
    const {
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
    } = useAppointmentForm({ user, token });

    // Efecto de cierre automático del modal después de confirmar cita
    useEffect(() => {
        if (!showConfirmation) return;
        const timer = setTimeout(() => {
            setShowConfirmation(false);
            onClose(true); // ✅ Se confirmó la cita → notificar a Cleo
        }, 3000);
        return () => clearTimeout(timer);
    }, [showConfirmation, onClose]);
    

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md overflow-y-auto flex items-center justify-center p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    {/* Botón cerrar modal */}
                    <button
                        className="absolute top-6 right-6 text-white hover:scale-110 transition-transform duration-200 z-50"
                        onClick={() => onClose(false)} // ❌ Se cerró sin agendar → notificar a Cleo
                        aria-label="Cerrar"
                    >
                        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>


                    {/* Contenido del modal */}
                    <motion.div
                        className="bg-white/90 text-bold rounded-2xl shadow-xl w-full max-w-[95vw] sm:max-w-[90vw] md:max-w-xl p-3 sm:p-4 md:p-8 z-40"
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                    >
                        {/* Saludo personalizado */}
                        <h2 className="text-base sm:text-lg md:text-2xl font-bold mb-6 text-center">
                            {user?.name ? `Hola ${user.name.split(" ")[0]} 👋` : "Agendá tu cita"}
                        </h2>

                        {/* Si no está autenticado, muestra login */}
                        {!isAuthenticated ? (

                            
<>
                                <p className="text-xs text-gray-500 text-center mb-4">
                                    Usamos tu cuenta de Google únicamente para identificarte y agendar tu cita. Nunca compartiremos tus datos sin tu consentimiento.
                                </p>

                                <GoogleLoginWrapper onLoginSuccess={() => setToken(localStorage.getItem("google_token"))} />

                                <p className="text-xs text-center text-gray-400 mt-2">
                                    Al continuar aceptás nuestra{' '}
                                    <Link to="/politica-privacidad" className="underline text-blue-600">
                                        Política de Privacidad
                                    </Link>.
                                </p>
                            </>
                        ) : (
                            <Stepper
                                formData={formData}
                                setFieldErrors={setFieldErrors}
                                onFinalStepCompleted={handleFinalSubmit}
                            >
                                {/* Paso 1: seleccionar fecha y hora */}
                                <Step>
                                    <div className="min-h-[250px] sm:min-h-[320px] flex flex-col justify-start gap-1 text-sm sm:text-base">
                                        <label className="font-semibold mb-1">Seleccioná día y hora</label>
                                        <DatePicker
                                            selected={formData.datetime}
                                            onChange={handleDateChange}
                                            showTimeSelect
                                            timeIntervals={60}
                                            timeCaption="Horario"
                                            dateFormat="HH:mm, eeee d MMMM"
                                            minDate={new Date()}
                                            minTime={new Date(new Date().setHours(10, 0, 0, 0))}
                                            maxTime={new Date(new Date().setHours(18, 0, 0, 0))}
                                            placeholderText="Ej: 10:00, lunes 20 mayo"
                                            excludeTimes={busySlots}
                                            withPortal={window.innerWidth < 640}
                                            className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-black transition-colors duration-150 ${fieldErrors.datetime ? "border-red-500" : "border-gray-300"}`}
                                            calendarClassName="dark-calendar"
                                            popperClassName="dark-datepicker-popper"
                                            required
                                        />
                                        {isDateValidating && (
                                            <p className="text-blue-500 text-xs mt-1 animate-pulse flex items-center gap-1">
                                                <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.37 0 0 5.37 0 12h4zm2 5.29A7.96 7.96 0 014 12H0c0 3.04 1.13 5.82 3 7.94l3-2.65z"></path>
                                                </svg>
                                                Verificando disponibilidad...
                                            </p>
                                        )}
                                        <ErrorMessage message={fieldErrors.datetime} />
                                    </div>
                                </Step>

                                {/* Paso 2: datos adicionales */}
                                <Step>
                                    <div className="min-h-[320px] flex flex-col gap-4">
                                        <div>
                                            <label className="text-sm font-semibold">Teléfono</label>
                                            <input
                                                type="tel"
                                                placeholder="Ej: +598 99 123 456"
                                                value={formData.phone}
                                                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                                                className={`w-full p-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-black ${fieldErrors.phone ? "border-red-500" : "border-gray-300"}`}
                                                required
                                            />
                                            <ErrorMessage message={fieldErrors.phone} />
                                        </div>
                                        <div>
                                            <label className="text-sm font-semibold">Mensaje</label>
                                            <textarea
                                                placeholder="Contanos en qué te podemos ayudar..."
                                                value={formData.message}
                                                onChange={(e) => setFormData((prev) => ({ ...prev, message: e.target.value }))}
                                                className={`w-full p-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-black min-h-[120px] ${fieldErrors.message ? "border-red-500" : "border-gray-300"}`}
                                                required
                                            />
                                            <ErrorMessage message={fieldErrors.message} />
                                        </div>
                                    </div>
                                </Step>
                            </Stepper>
                        )}

                        {/* Loader de agendamiento */}
                        {isLoading && (
                            <p className="text-center text-sm mt-4 text-gray-600 animate-pulse">
                                Agendando...
                            </p>
                        )}
                    </motion.div>

                    {/* Confirmación visual de éxito */}
                    {showConfirmation && (
                        <motion.div
                            className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <div className="bg-white rounded-xl shadow-lg p-6 text-center max-w-sm">
                                <h3 className="text-xl font-semibold mb-2">¡Cita confirmada!</h3>
                                <p className="text-gray-700 mb-4">
                                    Gracias {formData.name?.split(" ")[0] || ""}, te esperamos en el horario elegido.
                                </p>
                                <button
                                    className="bg-black text-white px-4 py-2 rounded hover:bg-gray-900"
                                    onClick={onClose}
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
