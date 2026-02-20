import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Loader2, User, Phone } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from "react-i18next";
import MultiUseSelect from '@/components/MultiUseSelect';

const DEFAULT_COUNTRY_CODE = '+598';
const COUNTRY_CODE_OPTIONS = [
    { value: '+598', label: 'Uruguay (+598)' },
    { value: '+54', label: 'Argentina (+54)' },
    { value: '+55', label: 'Brazil (+55)' },
    { value: '+591', label: 'Bolivia (+591)' },
    { value: '+56', label: 'Chile (+56)' },
    { value: '+57', label: 'Colombia (+57)' },
    { value: '+593', label: 'Ecuador (+593)' },
    { value: '+51', label: 'Peru (+51)' },
    { value: '+52', label: 'Mexico (+52)' },
    { value: '+506', label: 'Costa Rica (+506)' },
    { value: '+507', label: 'Panama (+507)' },
    { value: '+595', label: 'Paraguay (+595)' },
    { value: '+34', label: 'Spain (+34)' },
    { value: '+1', label: 'United States (+1)' },
];

const parsePhoneForForm = (phone, fallbackCountryCode = DEFAULT_COUNTRY_CODE) => {
    if (!phone) return { countryCode: fallbackCountryCode, number: '' };
    const normalized = String(phone).trim().replace(/[^\d+]/g, '');
    if (!normalized.startsWith('+')) return { countryCode: fallbackCountryCode, number: normalized.replace(/\D/g, '') };
    const match = COUNTRY_CODE_OPTIONS.find((opt) => normalized.startsWith(opt.value));
    if (match) return { countryCode: match.value, number: normalized.slice(match.value.length).replace(/\D/g, '') };
    return { countryCode: fallbackCountryCode, number: normalized.replace(/\D/g, '') };
};

const CompleteProfile = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user, profile, client, refreshClient, onboardingStatus, isProfileIncomplete } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        full_name: '',
        phone_country: DEFAULT_COUNTRY_CODE,
        phone_number: '',
    });
    const hasEditedRef = useRef(false);

    useEffect(() => {
        if (!user) return;
        if (hasEditedRef.current) return;

        const phoneSeed = client?.phone || profile?.phone;
        const parsedPhone = phoneSeed
            ? parsePhoneForForm(phoneSeed, formData.phone_country)
            : { countryCode: formData.phone_country, number: formData.phone_number };

        setFormData({
            full_name: profile?.full_name || client?.full_name || '',
            phone_country: parsedPhone.countryCode,
            phone_number: parsedPhone.number,
        });
    }, [profile, client, user]);

    // If already complete, redirect away
    useEffect(() => {
        if (!isProfileIncomplete && user && !loading) {
            if (onboardingStatus === 'new') {
                navigate('/dashboard/projects', { state: { showCreateProject: true, isOnboarding: true } });
            } else {
                navigate('/dashboard');
            }
        }
    }, [isProfileIncomplete, user, onboardingStatus, navigate, loading]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const phone = `${formData.phone_country.replace(/\D/g, '')}${formData.phone_number.replace(/\D/g, '')}`;

            const { data: existingClient } = await supabase
                .from('clients')
                .select('id')
                .eq('user_id', user.id)
                .maybeSingle();

            let result;
            if (existingClient) {
                result = await supabase
                    .from('clients')
                    .update({ full_name: formData.full_name, phone })
                    .eq('id', existingClient.id);
            } else {
                result = await supabase
                    .from('clients')
                    .insert({
                        user_id: user.id,
                        full_name: formData.full_name,
                        email: user.email,
                        phone,
                        status: 'lead'
                    });
            }

            if (result.error) throw result.error;

            await refreshClient();
            // Redirect will happen via useEffect
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

    const panelVariants = {
        hidden: { opacity: 0, scale: 0.98 },
        visible: {
            opacity: 1,
            scale: 1,
            transition: { duration: 0.38, ease: [0.16, 1, 0.3, 1] }
        }
    };

    return (
        <div className="fixed inset-0 z-[101] flex items-center justify-center font-product bg-[#E8E8E8]">
            <motion.div
                variants={panelVariants}
                initial="hidden"
                animate="visible"
                className="relative w-full h-full bg-[#E8E8E8] overflow-hidden"
            >
                <div className="max-w-[600px] mx-auto w-full h-full flex flex-col items-center justify-center p-6 sm:p-12 leading-none">
                    <div className="mb-6 text-center">
                        <h2 className="text-[25px] md:text-[35px] lg:text-[45px] font-bold text-neutral-900 mb-2">
                            {t("auth.completeProfile.title")}
                        </h2>
                        <p className="text-[#777777] text-[14px]">
                            {t("auth.completeProfile.description")}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4 w-full flex flex-col items-center">
                        <div className="space-y-3 w-full max-w-[360px]">
                            <label className="text-[22px] text-[#000000] text-center block">
                                {t("auth.completeProfile.labels.fullName")}
                            </label>
                            <div className="relative">
                                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                                <input
                                    required
                                    type="text"
                                    name="full_name"
                                    autoComplete="name"
                                    value={formData.full_name}
                                    onChange={handleChange}
                                    placeholder={t("auth.completeProfile.placeholders.name")}
                                    className="w-full bg-[#DBDBDB] h-[51px] rounded-[5px] py-3 pl-12 pr-4 text-[14px] md:text-[18px] lg:text-[22px] text-[#8A8A8A] font-inter"
                                />
                            </div>
                        </div>

                        <div className="space-y-3 w-full max-w-[360px]">
                            <label className="text-[22px] text-[#000000] text-center block">
                                {t("auth.completeProfile.labels.phone")}
                            </label>
                            <div className="flex flex-row gap-2 justify-center w-full">
                                <div className="relative w-[120px] sm:w-[160px]">
                                    <MultiUseSelect
                                        options={COUNTRY_CODE_OPTIONS}
                                        value={formData.phone_country}
                                        onChange={(value) => {
                                            hasEditedRef.current = true;
                                            setFormData((prev) => ({ ...prev, phone_country: value }));
                                        }}
                                        getOptionLabel={(option) => option.label}
                                        getDisplayLabel={(option) => option.value}
                                        getOptionValue={(option) => option.value}
                                        placeholder={t("auth.completeProfile.labels.countryCode")}
                                        buttonClassName="h-[51px] text-[14px] md:text-[18px] lg:text-[22px]"
                                        variant="modal"
                                        modalAlign="right"
                                        modalScope="anchor"
                                    />
                                </div>
                                <div className="relative flex-1">
                                    <Phone size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                                    <input
                                        required
                                        type="tel"
                                        name="phone_number"
                                        autoComplete="tel"
                                        inputMode="numeric"
                                        value={formData.phone_number}
                                        onChange={(e) => {
                                            hasEditedRef.current = true;
                                            setFormData(prev => ({ ...prev, phone_number: e.target.value.replace(/\D/g, '') }));
                                        }}
                                        placeholder={t("auth.completeProfile.placeholders.phone")}
                                        className="w-full bg-[#DBDBDB] h-[51px] rounded-[5px] py-3 pl-12 pr-4 text-[14px] md:text-[18px] lg:text-[22px] text-[#8A8A8A] font-inter"
                                    />
                                </div>
                            </div>
                        </div>

                        {error && (
                            <p className="w-full max-w-[360px] text-red-500 text-xs text-center bg-red-50 p-3 rounded-xl border border-red-100">
                                {error}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full max-w-[220px] mx-auto bg-[#0DD122] text-white font-bold py-4 rounded-2xl hover:bg-green transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-4"
                        >
                            {loading && <Loader2 size={18} className="animate-spin" />}
                            {loading ? t("auth.completeProfile.saving") : t("auth.completeProfile.cta")}
                        </button>
                    </form>
                </div>
            </motion.div>
        </div>
    );
};

export default CompleteProfile;
