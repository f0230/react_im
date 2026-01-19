import React, { useEffect } from "react";
import Stepper, { Step } from "@/components/Form/Stepper";
import { motion, AnimatePresence } from "framer-motion";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useAppointmentForm } from "@/hooks/useAppointmentForm";
import { Link } from 'react-router-dom';
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { Mail, User, Phone, MessageSquare, Calendar as CalendarIcon, LogIn } from 'lucide-react';

const ErrorMessage = ({ message }) => {
    if (!message) return null;
    return (
        <div className="flex items-center mt-1 text-xs text-red-500 font-inter animate-shake">
            <span>{message}</span>
        </div>
    );
};

const StepperModal = ({ isOpen, onClose }) => {
    const { user: authUser } = useAuth();
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
        validateFormFields
    } = useAppointmentForm({ user: authUser });

    useEffect(() => {
        if (showConfirmation) {
            const timer = setTimeout(() => {
                setShowConfirmation(false);
                onClose(true);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [showConfirmation, onClose]);

    const handleGoogleSync = async () => {
        // Save current progress to resume after redirect
        localStorage.setItem("pendingAppointment", JSON.stringify(formData));
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/dashboard`,
            }
        });
    };

    const handleStepChange = async (toStep, data) => {
        const fromStep = toStep - 1;
        const errors = {};

        if (toStep > fromStep) { // Moving forward
            if (fromStep === 1) { // Validate Date
                if (!data.datetime) errors.datetime = "Seleccioná un horario.";
            } else if (fromStep === 2) { // Validate Identity
                if (!data.name?.trim()) errors.name = "El nombre es obligatorio.";
                if (!data.email?.trim()) errors.email = "El email es obligatorio.";
                else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = "Email inválido.";
            }
        }

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            return false;
        }

        setFieldErrors({});
        return true;
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 font-product">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => onClose(false)}
                        className="absolute inset-0 bg-black/60 backdrop-blur-md"
                    />

                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-6 pb-0 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-neutral-900">
                                {showConfirmation ? "¡Todo listo!" : "Agendá tu cita"}
                            </h2>
                            <button
                                onClick={() => onClose(false)}
                                className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
                            >
                                <svg className="w-6 h-6 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {!showConfirmation ? (
                            <Stepper
                                formData={formData}
                                setFieldErrors={setFieldErrors}
                                onFinalStepCompleted={handleFinalSubmit}
                                onStepChange={handleStepChange}
                                nextButtonText="Siguiente"
                                backButtonText="Atrás"
                                nextButtonProps={{
                                    className: "bg-black text-white px-8 py-3 rounded-2xl font-bold hover:bg-neutral-800 transition-all active:scale-95 disabled:opacity-50"
                                }}
                            >
                                {/* P1: Calendario */}
                                <Step title="Fecha">
                                    <div className="space-y-4 py-4 min-h-[300px]">
                                        <div className="flex items-center gap-2 mb-2 text-neutral-400">
                                            <CalendarIcon size={18} />
                                            <label className="text-sm font-semibold uppercase tracking-widest">Elegí el momento</label>
                                        </div>
                                        <DatePicker
                                            selected={formData.datetime}
                                            onChange={handleDateChange}
                                            inline
                                            showTimeSelect
                                            timeIntervals={60}
                                            minDate={new Date()}
                                            excludeTimes={busySlots}
                                            calendarClassName="custom-datepicker"
                                        />
                                        <div className="mt-4">
                                            {isDateValidating && (
                                                <div className="flex items-center gap-2 text-blue-500 animate-pulse text-sm">
                                                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                                                    Verificando disponibilidad...
                                                </div>
                                            )}
                                            <ErrorMessage message={fieldErrors.datetime} />
                                        </div>
                                    </div>
                                </Step>

                                {/* P2: Identidad */}
                                <Step title="Vos">
                                    <div className="space-y-6 py-4 min-h-[300px]">
                                        <div className="space-y-4">
                                            <div className="relative">
                                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                                                <input
                                                    type="text"
                                                    disabled={!!authUser}
                                                    placeholder="Tu nombre completo"
                                                    value={formData.name}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                                    className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-black transition-all"
                                                />
                                                <ErrorMessage message={fieldErrors.name} />
                                            </div>

                                            <div className="relative">
                                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                                                <input
                                                    type="email"
                                                    disabled={!!authUser}
                                                    placeholder="Tu correo electrónico"
                                                    value={formData.email}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                                    className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-black transition-all"
                                                />
                                                <ErrorMessage message={fieldErrors.email} />
                                            </div>
                                        </div>

                                        {!authUser && (
                                            <div className="mt-8 p-4 bg-neutral-50 rounded-2xl border border-dashed border-neutral-200 text-center">
                                                <p className="text-xs text-neutral-500 mb-3">¿Querés que esta cita aparezca en tu Dashboard?</p>
                                                <button
                                                    onClick={handleGoogleSync}
                                                    className="flex items-center justify-center gap-2 w-full bg-white border border-neutral-200 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-neutral-50 transition-all"
                                                >
                                                    <LogIn size={16} />
                                                    Sincronizar con Google
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </Step>

                                {/* P3: Detalles */}
                                <Step title="Contacto">
                                    <div className="space-y-6 py-4 min-h-[300px]">
                                        <div className="relative">
                                            <Phone className="absolute left-4 top-4 text-neutral-400" size={18} />
                                            <input
                                                type="tel"
                                                placeholder="WhatsApp (ej: +598 99 123 456)"
                                                value={formData.phone}
                                                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                                className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-black transition-all"
                                            />
                                            <ErrorMessage message={fieldErrors.phone} />
                                        </div>

                                        <div className="relative">
                                            <MessageSquare className="absolute left-4 top-4 text-neutral-400" size={18} />
                                            <textarea
                                                placeholder="¿En qué te podemos ayudar?"
                                                value={formData.message}
                                                onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                                                className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-black transition-all min-h-[140px] resize-none"
                                            />
                                            <ErrorMessage message={fieldErrors.message} />
                                        </div>
                                    </div>
                                </Step>
                            </Stepper>
                        ) : (
                            <div className="p-12 text-center space-y-4">
                                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <h3 className="text-2xl font-bold">¡Cita Agendada!</h3>
                                <p className="text-neutral-500 max-w-xs mx-auto">
                                    Enviamos los detalles a <strong>{formData.email}</strong>. Nos vemos pronto.
                                </p>
                                <button
                                    onClick={() => onClose(true)}
                                    className="mt-8 bg-black text-white px-10 py-3 rounded-2xl font-bold hover:scale-105 transition-all"
                                >
                                    Cerrar
                                </button>
                            </div>
                        )}

                        {isLoading && (
                            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
                                <div className="flex flex-col items-center gap-4">
                                    <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin" />
                                    <p className="font-bold text-sm animate-pulse">Confirmando tu cita...</p>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default StepperModal;
