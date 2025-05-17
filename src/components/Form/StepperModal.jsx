import React from "react";
import Stepper, { Step } from "./Stepper";
import { motion, AnimatePresence } from "framer-motion";

const StepperModal = ({ isOpen, onClose }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    {/* Botón de cierre con SVG */}
                    <button
                        className="absolute top-6 right-6 text-white hover:scale-110 transition-transform duration-200 z-50"
                        onClick={onClose}
                        aria-label="Cerrar"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-7 h-7"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>

                    {/* Contenedor del modal */}
                    <motion.div
                        className="bg-white/85 text-bold rounded-2xl shadow-xl w-full max-w-xl p-8 z-40"
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                    >
                        <h2 className="text-2xl font-bold mb-6 text-center">Formulario de Contacto</h2>

                        <Stepper onFinalStepCompleted={onClose}>
                            <Step>
                                <label className="block text-sm font-semibold mb-1">Nombre</label>
                                <input
                                    type="text"
                                    placeholder="Ej: Juan Pérez"
                                    className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black transition"
                                />
                            </Step>

                            <Step>
                                <label className="block text-sm font-semibold mb-1">Email</label>
                                <input
                                    type="email"
                                    placeholder="Ej: juan@email.com"
                                    className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black transition"
                                />
                            </Step>

                            <Step>
                                <label className="block text-sm font-semibold mb-1">Mensaje</label>
                                <textarea
                                    placeholder="Contanos en qué te podemos ayudar..."
                                    className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black transition min-h-[120px]"
                                />
                            </Step>
                        </Stepper>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default StepperModal;
85