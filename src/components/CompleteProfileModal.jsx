import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, User, Phone } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from "react-i18next";
import MultiUseSelect from './MultiUseSelect';

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

const SORTED_COUNTRY_CODES = [...COUNTRY_CODE_OPTIONS]
    .map((option) => option.value)
    .sort((a, b) => b.length - a.length);

const parsePhoneForForm = (phone, fallbackCountryCode = DEFAULT_COUNTRY_CODE) => {
    if (!phone) {
        return { countryCode: fallbackCountryCode, number: '' };
    }

    const normalized = String(phone).trim().replace(/[^\d+]/g, '');
    if (!normalized.startsWith('+')) {
        return {
            countryCode: fallbackCountryCode,
            number: normalized.replace(/\D/g, ''),
        };
    }

    const match = SORTED_COUNTRY_CODES.find((code) => normalized.startsWith(code));
    if (match) {
        return {
            countryCode: match,
            number: normalized.slice(match.length).replace(/\D/g, ''),
        };
    }

    return {
        countryCode: fallbackCountryCode,
        number: normalized.replace(/\D/g, ''),
    };
};

const formatPhoneForSave = (countryCode, number) => {
    const digits = String(number || '').replace(/\D/g, '');
    return `${countryCode}${digits}`;
};

const sendProfileCompleteEmail = async ({ email, full_name, phone }) => {
    if (!email) return;
    try {
        await fetch('/api/profile-complete-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, full_name, phone }),
        });
    } catch (err) {
        console.warn('Profile email failed:', err);
    }
};

const CompleteProfileModal = ({ isOpen, onClose, onComplete }) => {
    const { t } = useTranslation();
    const { user, profile, client, refreshClient } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        full_name: '',
        phone_country: DEFAULT_COUNTRY_CODE,
        phone_number: '',
    });
    const hasEditedRef = useRef(false);

    useEffect(() => {
        if (!isOpen) {
            hasEditedRef.current = false;
            return;
        }
        if (hasEditedRef.current) return;
        if (!profile && !client) return;
        setFormData(prev => {
            const phoneSeed = client?.phone || profile?.phone;
            const parsedPhone = phoneSeed
                ? parsePhoneForForm(phoneSeed, prev.phone_country)
                : { countryCode: prev.phone_country, number: prev.phone_number };

            return {
                ...prev,
                full_name: profile?.full_name || client?.full_name || prev.full_name || '',
                phone_country: parsedPhone.countryCode,
                phone_number: parsedPhone.number,
            };
        });
    }, [profile, client, isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const phone = formatPhoneForSave(formData.phone_country, formData.phone_number);

            // Check if client already exists to get its ID or decide between insert/update
            const { data: existingClient, error: fetchError } = await supabase
                .from('clients')
                .select('id')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (fetchError) throw fetchError;

            let result;
            if (existingClient) {
                result = await supabase
                    .from('clients')
                    .update({
                        full_name: formData.full_name,
                        phone,
                    })
                    .eq('id', existingClient.id);
            } else {
                result = await supabase
                    .from('clients')
                    .insert({
                        user_id: user.id,
                        full_name: formData.full_name,
                        company_name: '',
                        email: user.email,
                        phone,
                        source: 'other',
                        status: 'lead'
                    });
            }

            if (result.error) throw result.error;

            await refreshClient({
                id: existingClient?.id,
                full_name: formData.full_name,
                phone,
            });
            void sendProfileCompleteEmail({
                email: user.email,
                full_name: formData.full_name,
                phone,
            });
            onClose();
            if (onComplete) {
                onComplete();
            }
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
        if (name === 'phone_number' && value.trim().startsWith('+')) {
            const parsed = parsePhoneForForm(value, formData.phone_country);
            setFormData(prev => ({
                ...prev,
                phone_country: parsed.countryCode,
                phone_number: parsed.number,
            }));
            return;
        }
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center font-product">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />

                <motion.div
                    initial={{ scale: 0.98, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, x: 0, y: 0 }}
                    exit={{ scale: 0.98, opacity: 0, x: -80 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                    className="relative w-full  h-full bg-[#E8E8E8] overflow-hidden"
                >
                    <div className="max-w-[600px] mx-auto w-full h-full flex flex-col items-center justify-center p-6 sm:p-12 leading-none">
                        <div className="mb-6 text-center">
                            <h2 className="text-[25px]  md:text-[35px] lg:text-[45px]  font-bold text-neutral-900 mb-2">{t("auth.completeProfile.title")}</h2>
                            <p className="text-[#777777] text-[14px] ">
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
                                        className="w-full bg-[#DBDBDB] h-[51px]  rounded-[5px] py-3 pl-12 pr-4 text-[14px] md:text-[18px] lg:text-[22px] text-[#8A8A8A]   font-inter"
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
                                        <Phone size={14} className=" absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                                        <input
                                            required
                                            type="tel"
                                            name="phone_number"
                                            autoComplete="tel"
                                            inputMode="numeric"
                                            value={formData.phone_number}
                                            onChange={handleChange}
                                            placeholder={t("auth.completeProfile.placeholders.phone")}
                                        className="w-full bg-[#DBDBDB] h-[51px]  rounded-[5px] py-3 pl-12 pr-4 text-[14px] md:text-[18px] lg:text-[22px] text-[#8A8A8A]   font-inter"
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
        </AnimatePresence>
    );
};

export default CompleteProfileModal;
