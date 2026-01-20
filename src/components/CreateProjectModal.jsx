import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Briefcase, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import Stepper from '@/components/Form/Stepper';

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
        need_type: '',
        objective: '',
        description: '',
        urgency: '',
        urgency_date: '',
        budget_range: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen) {
            setFormData({
                title: '',
                need_type: '',
                objective: '',
                description: '',
                urgency: '',
                urgency_date: '',
                budget_range: '',
            });
            setError(null);
        }
    }, [isOpen]);

    const payloadVariants = useMemo(() => {
        const description = formData.description.trim();
        const payload = {
            need_type: formData.need_type,
            objective: formData.objective,
            description,
            urgency: formData.urgency || null,
            urgency_date: formData.urgency === 'specific_date' ? formData.urgency_date || null : null,
            budget_range: formData.budget_range || null,
        };
        const base = {};
        if (user?.id) base.user_id = user.id;
        if (client?.id) base.client_id = client.id;
        if (payload.need_type) base.need_type = payload.need_type;
        if (payload.objective) base.objective = payload.objective;
        if (payload.description) base.description = payload.description;
        if (payload.urgency) base.urgency = payload.urgency;
        if (payload.urgency_date) base.urgency_date = payload.urgency_date;
        if (payload.budget_range) base.budget_range = payload.budget_range;

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

        return variants.length ? variants : [{}];
    }, [
        formData.description,
        formData.need_type,
        formData.objective,
        formData.urgency,
        formData.urgency_date,
        formData.budget_range,
        user?.id,
        client?.id,
    ]);

    const handleStepChange = async (nextStep) => {
        if (loading) return false;
        setError(null);

        if (nextStep === 2) {
            if (!formData.title.trim() || !formData.need_type || !formData.objective) {
                setError(t('dashboard.projects.create.errorMissingRequired'));
                return false;
            }
        }

        if (nextStep === 3) {
            if (!formData.description.trim()) {
                setError(t('dashboard.projects.create.errorMissingRequired'));
                return false;
            }
            if (formData.urgency === 'specific_date' && !formData.urgency_date) {
                setError(t('dashboard.projects.create.errorMissingDate'));
                return false;
            }
        }

        return true;
    };

    const handleSubmit = async () => {
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
        setError(null);
        setFormData((prev) => {
            if (name === 'urgency' && value !== 'specific_date') {
                return { ...prev, urgency: value, urgency_date: '' };
            }
            return { ...prev, [name]: value };
        });
    };

    const errorBlock = error ? (
        <p className="text-red-500 text-xs text-center bg-red-50 p-3 rounded-xl border border-red-100">
            {error}
        </p>
    ) : null;

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

                    <div className="p-6 sm:p-8 max-h-[85vh] overflow-y-auto">
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

                        <Stepper
                            formData={formData}
                            onStepChange={handleStepChange}
                            onFinalStepCompleted={handleSubmit}
                            disableStepIndicators
                            backButtonText={t('dashboard.projects.create.back')}
                            nextButtonText={t('dashboard.projects.create.next')}
                            finalButtonText={
                                loading
                                    ? t('dashboard.projects.create.saving')
                                    : t('dashboard.projects.create.cta')
                            }
                            backButtonProps={{
                                type: 'button',
                                className:
                                    'duration-350 rounded px-2 py-1 transition text-neutral-400 hover:text-neutral-700',
                            }}
                            nextButtonProps={{
                                type: 'button',
                                disabled: loading,
                                className:
                                    'duration-350 flex items-center justify-center rounded-full bg-black py-2.5 px-4 font-semibold text-white transition hover:bg-neutral-800 active:bg-neutral-900 disabled:opacity-70 disabled:cursor-not-allowed',
                            }}
                            stepContainerClassName="px-0 pt-2 pb-6"
                            contentClassName="px-0"
                            footerClassName="pt-4"
                        >
                            <div className="space-y-4">
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
                                        {t('dashboard.projects.create.fields.needTypeLabel')}
                                    </label>
                                    <select
                                        required
                                        name="need_type"
                                        value={formData.need_type}
                                        onChange={handleChange}
                                        className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-900 transition-all font-inter appearance-none"
                                    >
                                        <option value="">{t('dashboard.projects.create.fields.needTypePlaceholder')}</option>
                                        <option value="social_media">
                                            {t('dashboard.projects.create.fields.needTypeOptions.socialMedia')}
                                        </option>
                                        <option value="digital_ads">
                                            {t('dashboard.projects.create.fields.needTypeOptions.digitalAds')}
                                        </option>
                                        <option value="website_landing">
                                            {t('dashboard.projects.create.fields.needTypeOptions.websiteLanding')}
                                        </option>
                                        <option value="design_branding">
                                            {t('dashboard.projects.create.fields.needTypeOptions.designBranding')}
                                        </option>
                                        <option value="automation_tech">
                                            {t('dashboard.projects.create.fields.needTypeOptions.automationTech')}
                                        </option>
                                        <option value="content">
                                            {t('dashboard.projects.create.fields.needTypeOptions.content')}
                                        </option>
                                        <option value="other">
                                            {t('dashboard.projects.create.fields.needTypeOptions.other')}
                                        </option>
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-neutral-400 uppercase tracking-widest ml-1">
                                        {t('dashboard.projects.create.fields.objectiveLabel')}
                                    </label>
                                    <select
                                        required
                                        name="objective"
                                        value={formData.objective}
                                        onChange={handleChange}
                                        className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-900 transition-all font-inter appearance-none"
                                    >
                                        <option value="">
                                            {t('dashboard.projects.create.fields.objectivePlaceholder')}
                                        </option>
                                        <option value="sell_more">
                                            {t('dashboard.projects.create.fields.objectiveOptions.sellMore')}
                                        </option>
                                        <option value="get_leads">
                                            {t('dashboard.projects.create.fields.objectiveOptions.getLeads')}
                                        </option>
                                        <option value="improve_brand">
                                            {t('dashboard.projects.create.fields.objectiveOptions.improveBrand')}
                                        </option>
                                        <option value="launch_product">
                                            {t('dashboard.projects.create.fields.objectiveOptions.launchProduct')}
                                        </option>
                                        <option value="optimize_process">
                                            {t('dashboard.projects.create.fields.objectiveOptions.optimizeProcess')}
                                        </option>
                                        <option value="not_sure">
                                            {t('dashboard.projects.create.fields.objectiveOptions.notSure')}
                                        </option>
                                    </select>
                                </div>

                                {errorBlock}
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-neutral-400 uppercase tracking-widest ml-1">
                                        {t('dashboard.projects.create.fields.descriptionLabel')}
                                    </label>
                                    <textarea
                                        required
                                        name="description"
                                        value={formData.description}
                                        onChange={handleChange}
                                        placeholder={t('dashboard.projects.create.fields.descriptionPlaceholder')}
                                        rows={5}
                                        className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-900 transition-all font-inter resize-none"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-neutral-400 uppercase tracking-widest ml-1">
                                        {t('dashboard.projects.create.fields.urgencyLabel')}
                                    </label>
                                    <select
                                        name="urgency"
                                        value={formData.urgency}
                                        onChange={handleChange}
                                        className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-900 transition-all font-inter appearance-none"
                                    >
                                        <option value="">
                                            {t('dashboard.projects.create.fields.urgencyPlaceholder')}
                                        </option>
                                        <option value="no_rush">
                                            {t('dashboard.projects.create.fields.urgencyOptions.noRush')}
                                        </option>
                                        <option value="next_weeks">
                                            {t('dashboard.projects.create.fields.urgencyOptions.nextWeeks')}
                                        </option>
                                        <option value="asap">
                                            {t('dashboard.projects.create.fields.urgencyOptions.asap')}
                                        </option>
                                        <option value="specific_date">
                                            {t('dashboard.projects.create.fields.urgencyOptions.specificDate')}
                                        </option>
                                    </select>
                                    {formData.urgency === 'specific_date' && (
                                        <input
                                            required
                                            type="date"
                                            name="urgency_date"
                                            value={formData.urgency_date}
                                            onChange={handleChange}
                                            className="w-full mt-2 bg-neutral-50 border border-neutral-200 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-900 transition-all font-inter"
                                        />
                                    )}
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-neutral-400 uppercase tracking-widest ml-1">
                                        {t('dashboard.projects.create.fields.budgetLabel')}
                                    </label>
                                    <select
                                        name="budget_range"
                                        value={formData.budget_range}
                                        onChange={handleChange}
                                        className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-900 transition-all font-inter appearance-none"
                                    >
                                        <option value="">
                                            {t('dashboard.projects.create.fields.budgetPlaceholder')}
                                        </option>
                                        <option value="unknown">
                                            {t('dashboard.projects.create.fields.budgetOptions.unknown')}
                                        </option>
                                        <option value="low">
                                            {t('dashboard.projects.create.fields.budgetOptions.low')}
                                        </option>
                                        <option value="medium">
                                            {t('dashboard.projects.create.fields.budgetOptions.medium')}
                                        </option>
                                        <option value="high">
                                            {t('dashboard.projects.create.fields.budgetOptions.high')}
                                        </option>
                                        <option value="advise_me">
                                            {t('dashboard.projects.create.fields.budgetOptions.adviseMe')}
                                        </option>
                                    </select>
                                </div>

                                {errorBlock}
                            </div>
                        </Stepper>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default CreateProjectModal;
