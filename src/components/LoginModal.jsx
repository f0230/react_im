import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const LoginModal = ({ isOpen, onClose }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleGoogleLogin = async () => {
        try {
            setLoading(true);
            setError(null);
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/dashboard`,
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                    },
                }
            });
            if (error) throw error;
        } catch (err) {
            console.error('Login error:', err);
            setError('Error al iniciar sesión. Intenta nuevamente.');
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 font-product">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        className="relative w-full max-w-[1080px] h-[600px] bg-[#111] rounded-[10px] shadow-2xl overflow-hidden justify-center items-center flex"
                    >
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 text-gray-400 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors z-10"
                        >
                            <X size={20} />
                        </button>

                        <div className="p-8 pt-10 text-center">


                            <h2 className="text-[25px] md:text-[45px] font-bold mb-2 text-white ">
                                DTE <span className="text-skyblue">Platform</span>
                            </h2>
                            <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-xs mx-auto text-sm font-inter">
                                Accede al portal para gestionar todos tus proyectos en un solo lugar.
                            </p>

                            <div className="flex flex-col gap-4 max-w-xs mx-auto">
                                <button
                                    onClick={handleGoogleLogin}
                                    disabled={loading}
                                    className="flex items-center justify-center gap-3 w-full bg-black dark:bg-white text-white dark:text-black border border-transparent hover:scale-[1.02] active:scale-[0.98] font-bold py-3.5 px-4 rounded-[30px] transition-all duration-300 shadow-lg disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
                                >
                                    {loading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <img
                                            src="https://www.svgrepo.com/show/475656/google-color.svg"
                                            alt="Google"
                                            className="w-5 h-5"
                                        />
                                    )}
                                    <span>Continuar con Google</span>
                                </button>

                                {error && (
                                    <p className="text-red-500 text-xs mt-2 bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">
                                        {error}
                                    </p>
                                )}


                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default LoginModal;
