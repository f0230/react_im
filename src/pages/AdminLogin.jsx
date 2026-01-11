import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Mail, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import Aurora from '@/components/ui/Aurora';

const AdminLogin = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: {
                    emailRedirectTo: `${window.location.origin}/dashboard`,
                    shouldCreateUser: false,
                },
            });

            if (error) throw error;

            setMessage('Enviamos un magic link a tu correo.');
        } catch (error) {
            setError(error.message || 'Error al enviar el magic link');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen w-full flex items-center justify-center bg-black overflow-hidden font-product selection:bg-indigo-500/30">
            {/* Background Effects */}
            <div className="absolute inset-0 z-0 opacity-40">
                <Aurora
                    colorStops={["#ff2222", "#000000", "#f2f2f2"]}
                    speed={0.5}
                />
            </div>

            <div className="relative z-10 w-full max-w-md px-6">

                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

                <div className="mb-10 text-center">

                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60 mb-2 tracking-tight">
                        DTE Portal
                    </h1>
                    <p className="text-zinc-500 text-sm">
                        Acceso exclusivo para administradores y workers.
                    </p>
                </div>

                <AnimatePresence mode="wait">
                    {message ? (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="text-center py-8"
                        >
                            <div className="mx-auto w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4 text-emerald-400 border border-emerald-500/20">
                                <CheckCircle size={32} />
                            </div>
                            <h3 className="text-xl font-medium text-white mb-2">¡Revisa tu correo!</h3>
                            <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                                Hemos enviado un enlace mágico a <span className="text-white font-medium">{email}</span>.
                                <br /> Haz clic en él para acceder.
                            </p>
                            <button
                                onClick={() => setMessage(null)}
                                className="text-sm text-zinc-500 hover:text-white transition-colors"
                            >
                                Volver a intentar
                            </button>
                        </motion.div>
                    ) : (
                        <motion.form
                            key="form"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onSubmit={handleLogin}
                            className="space-y-6"
                        >
                            <div className="space-y-2">

                                <div className="relative group/input">

                                    <input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="nombre@dte.com"
                                        required
                                        className="w-full pl-11 pr-4 py-3.5 bg-black/50  text-white "
                                    />
                                </div>
                            </div>

                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-3"
                                >
                                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-200">{error}</p>
                                </motion.div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full relative group overflow-hidden bg-white text-black font-semibold py-3.5 rounded-xl hover:bg-indigo-50 transition-all duration-300 transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                <div className="relative z-10 flex items-center justify-center gap-2">
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            <span>Enviando...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Ingresar con Magic Link</span>
                                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
                            </button>
                        </motion.form>
                    )}
                </AnimatePresence>

            </div>
        </div>
    );
};

export default AdminLogin;
