import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Mail, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import Aurora from '@/components/ui/Aurora';
import { useTranslation, Trans } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

// Figma logo SVG oficial
const FigmaLogo = ({ className }) => (
    <svg className={className} viewBox="0 0 38 57" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M19 28.5C19 25.9804 20.0009 23.5641 21.7825 21.7825C23.5641 20.0009 25.9804 19 28.5 19C31.0196 19 33.4359 20.0009 35.2175 21.7825C36.9991 23.5641 38 25.9804 38 28.5C38 31.0196 36.9991 33.4359 35.2175 35.2175C33.4359 36.9991 31.0196 38 28.5 38C25.9804 38 23.5641 36.9991 21.7825 35.2175C20.0009 33.4359 19 31.0196 19 28.5Z" fill="#1ABCFE" />
        <path d="M0 47.5C0 44.9804 1.00089 42.5641 2.78249 40.7825C4.56408 39.0009 6.98044 38 9.5 38H19V47.5C19 50.0196 17.9991 52.4359 16.2175 54.2175C14.4359 55.9991 12.0196 57 9.5 57C6.98044 57 4.56408 55.9991 2.78249 54.2175C1.00089 52.4359 0 50.0196 0 47.5Z" fill="#0ACF83" />
        <path d="M19 0V19H28.5C31.0196 19 33.4359 17.9991 35.2175 16.2175C36.9991 14.4359 38 12.0196 38 9.5C38 6.98044 36.9991 4.56408 35.2175 2.78249C33.4359 1.00089 31.0196 0 28.5 0H19Z" fill="#FF7262" />
        <path d="M0 9.5C0 12.0196 1.00089 14.4359 2.78249 16.2175C4.56408 17.9991 6.98044 19 9.5 19H19V0H9.5C6.98044 0 4.56408 1.00089 2.78249 2.78249C1.00089 4.56408 0 6.98044 0 9.5Z" fill="#F24E1E" />
        <path d="M0 28.5C0 31.0196 1.00089 33.4359 2.78249 35.2175C4.56408 36.9991 6.98044 38 9.5 38H19V19H9.5C6.98044 19 4.56408 20.0009 2.78249 21.7825C1.00089 23.5641 0 25.9804 0 28.5Z" fill="#A259FF" />
    </svg>
);

const AdminLogin = () => {
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [figmaLoading, setFigmaLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);

    // Detectar error de OAuth en la URL (?error=...)
    useEffect(() => {
        const oauthError = searchParams.get('error');
        const oauthErrorDesc = searchParams.get('error_description');
        if (oauthError) {
            setError(oauthErrorDesc || 'Error al iniciar sesión con Figma.');
        }
    }, [searchParams]);

    // Magic link por email
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
            setMessage(true);
        } catch (err) {
            setError(err.message || t('admin.login.errors.magicLink'));
        } finally {
            setLoading(false);
        }
    };

    // OAuth nativo de Supabase con Figma
    const handleFigmaLogin = async () => {
        setFigmaLoading(true);
        setError(null);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'figma',
                options: {
                    redirectTo: `${window.location.origin}/dashboard`,
                },
            });
            if (error) throw error;
        } catch (err) {
            setError(err.message || 'Error al conectar con Figma.');
            setFigmaLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen w-full flex items-center justify-center bg-black overflow-hidden font-product selection:bg-indigo-500/30">
            {/* Background */}
            <div className="absolute inset-0 z-0 opacity-40">
                <Aurora colorStops={['#ff2222', '#000000', '#f2f2f2']} speed={0.5} />
            </div>

            <div className="relative z-10 w-full max-w-md px-6">
                <div className="mb-10 text-center">
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60 mb-2 tracking-tight">
                        {t('admin.login.title')}
                    </h1>
                    <p className="text-zinc-500 text-sm">
                        {t('admin.login.subtitle')}
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
                            <h3 className="text-xl font-medium text-white mb-2">{t('admin.login.success.title')}</h3>
                            <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                                <Trans
                                    i18nKey="admin.login.success.message"
                                    values={{ email }}
                                    components={{ span: <span className="text-white font-medium" />, br: <br /> }}
                                />
                            </p>
                            <button
                                onClick={() => setMessage(null)}
                                className="text-sm text-zinc-500 hover:text-white transition-colors"
                            >
                                {t('admin.login.success.cta')}
                            </button>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="form"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="space-y-4"
                        >
                            {/* ── Botón Figma OAuth nativo ────────────────────── */}
                            <motion.button
                                id="figma-login-btn"
                                type="button"
                                onClick={handleFigmaLogin}
                                disabled={figmaLoading || loading}
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.98 }}
                                className="w-full relative flex items-center justify-center gap-3 bg-white/5 border border-white/10 hover:border-white/25 hover:bg-white/10 text-white font-medium py-3.5 rounded-xl transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed group"
                            >
                                {figmaLoading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin text-zinc-300" />
                                        <span className="text-sm">Conectando con Figma...</span>
                                    </>
                                ) : (
                                    <>
                                        <FigmaLogo className="w-5 h-5 flex-shrink-0" />
                                        <span className="text-sm">Continuar con Figma</span>
                                        <ArrowRight className="w-4 h-4 ml-auto text-zinc-500 group-hover:text-white group-hover:translate-x-0.5 transition-all duration-200" />
                                    </>
                                )}
                            </motion.button>

                            {/* ── Separador ──────────────────────────────────── */}
                            <div className="relative flex items-center gap-3 py-1">
                                <div className="flex-1 h-px bg-white/10" />
                                <span className="text-xs text-zinc-600 uppercase tracking-widest">o</span>
                                <div className="flex-1 h-px bg-white/10" />
                            </div>

                            {/* ── Magic link por email ────────────────────────── */}
                            <form onSubmit={handleLogin} className="space-y-4">
                                <div className="relative group/input">
                                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within/input:text-white transition-colors" />
                                    <input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder={t('admin.login.form.emailPlaceholder')}
                                        required
                                        className="w-full pl-10 pr-4 py-3.5 bg-white/5 border border-white/10 hover:border-white/20 focus:border-white/30 focus:outline-none rounded-xl text-white text-sm placeholder-zinc-600 transition-all duration-200"
                                    />
                                </div>

                                <AnimatePresence>
                                    {error && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-3"
                                        >
                                            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                                            <p className="text-sm text-red-200">{error}</p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <button
                                    id="email-login-btn"
                                    type="submit"
                                    disabled={loading || figmaLoading}
                                    className="w-full relative group overflow-hidden bg-white text-black font-semibold py-3.5 rounded-xl hover:bg-indigo-50 transition-all duration-300 transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    <div className="relative z-10 flex items-center justify-center gap-2">
                                        {loading ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                <span>{t('admin.login.form.sending')}</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>{t('admin.login.form.submit')}</span>
                                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                            </>
                                        )}
                                    </div>
                                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
                                </button>
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default AdminLogin;
