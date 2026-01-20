import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Briefcase, Loader2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';

const TITLE_FIELDS = ['title', 'name', 'project_name'];

const isColumnError = (error) => {
    const message = error?.message || '';
    return error?.code === '42703' || /column/i.test(message) || /does not exist/i.test(message);
};

const CreateProjectModal = ({ isOpen, onClose, onCreated, isFirstProject = false }) => {
    const { t } = useTranslation();
    const { user, client } = useAuth();
    const [formData, setFormData] = useState({
        title: '',
        description: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen) {
            setFormData({ title: '', description: '' });
            setError(null);
        }
    }, [isOpen]);

    const payloadVariants = useMemo(() => {
        const description = formData.description.trim();
        const base = {};
        if (user?.id) base.user_id = user.id;
        if (client?.id) base.client_id = client.id;
        if (description) base.description = description;

        const variants = [];
        const pushVariant = (variant) => {
            if (!variant || Object.keys(variant).length === 0) return;
            const key = JSON.stringify(variant);
            if (!variants.some((item) => JSON.stringify(item) === key)) {
                variants.push(variant);
            }
        };

        pushVariant(base);

        if (base.client_id) {
            const { client_id, ...rest } = base;
            pushVariant(rest);
        }

        if (base.description) {
            const { description, ...rest } = base;
            pushVariant(rest);
        }

        if (base.client_id && base.description) {
            const { client_id, description, ...rest } = base;
            pushVariant(rest);
        }

        return variants.length ? variants : [{}];
    }, [formData.description, user?.id, client?.id]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!user?.id) return;
        setLoading(true);
        setError(null);

        try {
            let lastError = null;

            for (const basePayload of payloadVariants) {
                for (const field of TITLE_FIELDS) {
                    const payload = {
                        ...basePayload,
                        [field]: formData.title.trim(),
                    };

                    const { data, error: insertError } = await supabase
                        .from('projects')
                        .insert(payload)
                        .select('*')
                        .single();

                    if (!insertError) {
                        if (onCreated) {
                            onCreated(data);
                        } else {
                            onClose();
                        }
                        setLoading(false);
                        return;
                    }

                    lastError = insertError;
                    const message = insertError?.message || '';
                    const isTitleColumn = message.includes(`"${field}"`) || message.includes(field);

                    if (isColumnError(insertError)) {
                        if (isTitleColumn) {
                            continue;
                        }
                        break;
                    }

                    throw insertError;
                }
            }

            throw lastError;
        } catch (err) {
            console.error('Error creating project:', err);
            setError(t('dashboard.projects.create.error'));
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (event) => {
        const { name, value } = event.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 font-product">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />

                <motion.div
                    initial={{ scale: 0.96, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.96, opacity: 0, y: 20 }}
                    className="relative w-full max-w-[520px] bg-white rounded-3xl shadow-2xl overflow-hidden"
                >
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-neutral-600 transition-colors"
                        aria-label={t('dashboard.projects.create.close')}
                    >
                        <X size={18} />
                    </button>

                    <div className="p-8">
                        <div className="mb-6 text-center">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-600">
                                <Briefcase size={20} />
                            </div>
                            <h2 className="text-2xl font-bold text-neutral-900 mt-4">
                                {isFirstProject
                                    ? t('dashboard.projects.create.firstTitle')
                                    : t('dashboard.projects.create.title')}
                            </h2>
                            <p className="text-neutral-500 text-sm mt-2">
                                {t('dashboard.projects.create.description')}
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-neutral-400 uppercase tracking-widest ml-1">
                                    {t('dashboard.projects.create.fields.titleLabel')}
                                </label>
                                <input
                                    required
                                    type="text"
                                    name="title"
                                    autoFocus
                                    value={formData.title}
                                    onChange={handleChange}
                                    placeholder={t('dashboard.projects.create.fields.titlePlaceholder')}
                                    className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-900 transition-all font-inter"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-neutral-400 uppercase tracking-widest ml-1">
                                    {t('dashboard.projects.create.fields.descriptionLabel')}
                                </label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    placeholder={t('dashboard.projects.create.fields.descriptionPlaceholder')}
                                    rows={4}
                                    className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-900 transition-all font-inter resize-none"
                                />
                            </div>

                            {error && (
                                <p className="text-red-500 text-xs text-center bg-red-50 p-3 rounded-xl border border-red-100">
                                    {error}
                                </p>
                            )}

                            <div className="flex flex-col sm:flex-row gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="w-full sm:w-1/3 border border-neutral-200 text-neutral-600 font-semibold py-3 rounded-2xl hover:bg-neutral-50 transition-all"
                                >
                                    {t('dashboard.projects.create.cancel')}
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full sm:w-2/3 bg-black text-white font-bold py-3 rounded-2xl hover:bg-neutral-800 transition-all shadow-xl shadow-black/10 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {loading && <Loader2 size={18} className="animate-spin" />}
                                    {loading ? t('dashboard.projects.create.saving') : t('dashboard.projects.create.cta')}
                                </button>
                            </div>
                        </form>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default CreateProjectModal;
