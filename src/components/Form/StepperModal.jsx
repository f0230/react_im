import React, { useState } from "react";
import Stepper, { Step } from "./Stepper";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import GoogleLoginWrapper from "./GoogleLoginWrapper";

const StepperModal = ({ isOpen, onClose }) => {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        message: "",
    });

    const [isAuthenticated, setIsAuthenticated] = useState(
        !!localStorage.getItem("google_token")
    );

    const handleFinalSubmit = async () => {
        try {
            const token = localStorage.getItem("google_token");
            if (!token) {
                alert("Token no encontrado. Por favor, iniciá sesión.");
                return;
            }

            // 🔁 Enviar a Google Calendar
            await axios.post("/api/google-calendar", {
                ...formData,
                token,
            });

            // 🔁 Enviar a HubSpot
            await axios.post("/api/hubspot-lead", formData);

            alert("✅ Reunión agendada y contacto registrado con éxito.");
            onClose();
        } catch (error) {
            console.error("Error en el envío:", error);
            alert("❌ Ocurrió un error. Revisá consola.");
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    {/* Botón cerrar */}
                    <button
                        className="absolute top-6 right-6 text-white hover:scale-110 transition-transform duration-200 z-50"
                        onClick={onClose}
                        aria-label="Cerrar"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    {/* Contenido del modal */}
                    <motion.div
                        className="bg-white/85 text-bold rounded-2xl shadow-xl w-full max-w-xl p-8 z-40"
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                    >
                        <h2 className="text-2xl font-bold mb-6 text-center">
                            Formulario de Contacto
                        </h2>

                        {/* Si no está logueado, mostrar Google Login */}
                        {!isAuthenticated ? (
                            <GoogleLoginWrapper onLoginSuccess={() => setIsAuthenticated(true)} />
                        ) : (
                            <Stepper onFinalStepCompleted={handleFinalSubmit}>
                                <Step>
                                    <label className="block text-sm font-semibold mb-1">Nombre</label>
                                    <input
                                        type="text"
                                        placeholder="Ej: Juan Pérez"
                                        value={formData.name}
                                        onChange={(e) =>
                                            setFormData((prev) => ({ ...prev, name: e.target.value }))
                                        }
                                        className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black transition"
                                        required
                                    />
                                </Step>

                                <Step>
                                    <label className="block text-sm font-semibold mb-1">Email</label>
                                    <input
                                        type="email"
                                        placeholder="Ej: juan@email.com"
                                        value={formData.email}
                                        onChange={(e) =>
                                            setFormData((prev) => ({ ...prev, email: e.target.value }))
                                        }
                                        className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black transition"
                                        required
                                    />
                                </Step>

                                <Step>
                                    <label className="block text-sm font-semibold mb-1">Mensaje</label>
                                    <textarea
                                        placeholder="Contanos en qué te podemos ayudar..."
                                        value={formData.message}
                                        onChange={(e) =>
                                            setFormData((prev) => ({ ...prev, message: e.target.value }))
                                        }
                                        className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black transition min-h-[120px]"
                                        required
                                    />
                                </Step>
                            </Stepper>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default StepperModal;
