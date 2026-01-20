import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, User, Building2, Phone, Compass } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from "react-i18next";

const CompleteProfileModal = ({ isOpen, onClose }) => {
    const { t } = useTranslation();
    const { user, profile, refreshClient } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        full_name: '',
        company_name: '',
        phone: '',
        source: '',
    });
    const hasEditedRef = useRef(false);

    useEffect(() => {
        if (!isOpen) {
            hasEditedRef.current = false;
            return;
        }
        if (!profile || hasEditedRef.current) return;
        setFormData(prev => ({
            ...prev,
            full_name: profile.full_name || '',
            phone: profile.phone || '',
        }));
    }, [profile, isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Check if client already exists to get its ID or decide between insert/update
            const { data: existingClient, error: fetchError } = await supabase
                .from('clients')
                .select('id')
                .eq('user_id', user.id)
                .maybeSingle();

            if (fetchError) throw fetchError;

            let result;
            if (existingClient) {
                result = await supabase
                    .from('clients')
                    .update({
                        full_name: formData.full_name,
                        company_name: formData.company_name,
                        phone: formData.phone,
                        source: formData.source,
                    })
                    .eq('id', existingClient.id);
            } else {
                result = await supabase
                    .from('clients')
                    .insert({
                        user_id: user.id,
                        full_name: formData.full_name,
                        company_name: formData.company_name,
                        email: user.email,
                        phone: formData.phone,
                        source: formData.source,
                        status: 'lead'
                    });
            }

            if (result.error) throw result.error;

            await refreshClient();
            onClose();
        } catch (err) {
            console.error('Error saving profile:', err);
            setError(t("auth.completeProfile.error"));
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        hasEditedRef.current = true;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 font-product">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />

                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    className="relative w-full max-w-[500px] bg-white rounded-3xl shadow-2xl overflow-hidden"
                >
                    <div className="p-8">
                        <div className="mb-6 text-center">
                            <h2 className="text-2xl font-bold text-neutral-900 mb-2">{t("auth.completeProfile.title")}</h2>
                            <p className="text-neutral-500 text-sm">
                                {t("auth.completeProfile.description")}
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-neutral-400 uppercase tracking-widest ml-1">
                                    {t("auth.completeProfile.labels.fullName")}
                                </label>
                                <div className="relative">
                                    <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                                    <input
                                        required
                                        type="text"
                                        name="full_name"
                                        value={formData.full_name}
                                        onChange={handleChange}
                                        placeholder={t("auth.completeProfile.placeholders.name")}
                                        className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-900 transition-all font-inter"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-neutral-400 uppercase tracking-widest ml-1">
                                    {t("auth.completeProfile.labels.company")}
                                </label>
                                <div className="relative">
                                    <Building2 size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                                    <input
                                        required
                                        type="text"
                                        name="company_name"
                                        value={formData.company_name}
                                        onChange={handleChange}
                                        placeholder={t("auth.completeProfile.placeholders.company")}
                                        className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-900 transition-all font-inter"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-neutral-400 uppercase tracking-widest ml-1">
                                    {t("auth.completeProfile.labels.phone")}
                                </label>
                                <div className="relative">
                                    <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                                    <input
                                        required
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        placeholder={t("auth.completeProfile.placeholders.phone")}
                                        className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-900 transition-all font-inter"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-neutral-400 uppercase tracking-widest ml-1">
                                    {t("auth.completeProfile.labels.source")}
                                </label>
                                <div className="relative">
                                    <Compass size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                                    <select
                                        required
                                        name="source"
                                        value={formData.source}
                                        onChange={handleChange}
                                        className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-900 transition-all font-inter appearance-none"
                                    >
                                        <option value="" disabled>{t("auth.completeProfile.placeholders.source")}</option>
                                        <option value="website">{t("auth.completeProfile.sources.website")}</option>
                                        <option value="referral">{t("auth.completeProfile.sources.referral")}</option>
                                        <option value="social">{t("auth.completeProfile.sources.social")}</option>
                                        <option value="whatsapp">{t("auth.completeProfile.sources.whatsapp")}</option>
                                        <option value="other">{t("auth.completeProfile.sources.other")}</option>
                                    </select>
                                </div>
                            </div>

                            {error && (
                                <p className="text-red-500 text-xs text-center bg-red-50 p-3 rounded-xl border border-red-100">
                                    {error}
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-black text-white font-bold py-4 rounded-2xl hover:bg-neutral-800 transition-all shadow-xl shadow-black/10 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
                            >
                                {loading && <Loader2 size={18} className="animate-spin" />}
                                {loading ? t("auth.completeProfile.saving") : t("auth.completeProfile.cta")}
                            </button>
                        </form>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default CompleteProfileModal;
