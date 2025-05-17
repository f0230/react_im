import React from "react";
import Stepper, { Step } from "./Stepper";
import { motion, AnimatePresence } from "framer-motion";

const StepperModal = ({ isOpen, onClose }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <button
                        className="absolute top-4 right-4 text-white text-2xl font-bold z-50"
                        onClick={onClose}
                    >
                        ✕
                    </button>

                    <motion.div
                        className="bg-white text-black rounded-xl max-w-xl w-full p-6 z-40"
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <Stepper onFinalStepCompleted={onClose}>
                            <Step>
                                <label>Nombre:</label>
                                <input className="w-full p-2 rounded border mt-1" />
                            </Step>
                            <Step>
                                <label>Email:</label>
                                <input className="w-full p-2 rounded border mt-1" />
                            </Step>
                            <Step>
                                <label>Mensaje:</label>
                                <textarea className="w-full p-2 rounded border mt-1" />
                            </Step>
                        </Stepper>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default StepperModal;
