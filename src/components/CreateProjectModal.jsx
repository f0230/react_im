import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import Stepper from '@/components/Form/Stepper';
import MultiUseSelect from '@/components/MultiUseSelect';

const TITLE_FIELDS = ['title', 'name', 'project_name'];

const isColumnError = (error) => {
    const message = error?.message || '';
    return error?.code === '42703' || /column/i.test(message) || /does not exist/i.test(message);
};

const CreateProjectModal = ({
    isOpen,
    onClose,
    onCreated,
    isFirstProject = false,
    role,
    clients = [],
}) => {
    const { t } = useTranslation();
    const { user, client } = useAuth();
    const isAdmin = role === 'admin';
    const labelClass = 'text-[22px] text-[#000000] text-center block';
    const inputClass =
        'w-full bg-[#DBDBDB] h-[51px] rounded-[5px] py-3 px-4 text-[14px] md:text-[18px] lg:text-[22px] text-[#8A8A8A] font-inter';
    const textareaClass =
        'w-full bg-[#DBDBDB] rounded-[5px] py-3 px-4 text-[14px] md:text-[18px] lg:text-[22px] text-[#8A8A8A] font-inter resize-none';
    const selectButtonClass = 'h-[51px] rounded-[5px] text-[14px] md:text-[18px] lg:text-[22px]';
    const selectOptionClass = 'text-[14px] md:text-[18px] lg:text-[22px]';
    const selectSharedProps = {
        variant: 'modal',
        modalScope: 'anchor',
        modalAlign: 'right',
        optionClassName: selectOptionClass,
        listClassName: 'sm:w-[320px]',
    };
    const [formData, setFormData] = useState({
        title: '',
        client_id: '',
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
                client_id: '',
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

    const selectedClient = useMemo(() => {
        if (!isAdmin) return null;
        return clients.find((item) => item.id === formData.client_id) || null;
    }, [clients, formData.client_id, isAdmin]);

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
        const resolvedUserId = isAdmin ? selectedClient?.user_id : user?.id;
        const resolvedClientId = isAdmin ? selectedClient?.id : client?.id;
        if (resolvedUserId) base.user_id = resolvedUserId;
        if (resolvedClientId) base.client_id = resolvedClientId;
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
            if (
                !formData.title.trim() ||
                !formData.need_type ||
                !formData.objective ||
                (isAdmin && !formData.client_id)
            ) {
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
    const handleSelectChange = (name) => (value) => {
        setError(null);
        setFormData((prev) => {
            if (name === 'urgency' && value !== 'specific_date') {
                return { ...prev, urgency: value, urgency_date: '' };
            }
            return { ...prev, [name]: value };
        });
    };

    const errorBlock = error ? (
        <p className="w-full max-w-[600px] text-red-500 text-xs text-center bg-red-50 p-3 rounded-xl border border-red-100">
            {error}
        </p>
    ) : null;

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[110] flex items-center justify-center font-product">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />

                <motion.div
                    initial={{ scale: 0.98, opacity: 0, x: 80 }}
                    animate={{ scale: 1, opacity: 1, x: 0 }}
                    exit={{ scale: 0.98, opacity: 0, x: 80 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                    className="relative w-full h-full bg-[#E8E8E8] overflow-y-auto overflow-x-hidden"
                >
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-neutral-600 transition-colors"
                        aria-label={t('dashboard.projects.create.close')}
                    >
                        <X size={18} />
                    </button>

                    <div className="max-w-[600px] mx-auto w-full flex flex-col items-center justify-center  p-6 sm:p-12 leading-none">
                        <div className="mb-6 text-center ">
                            <h2 className="text-[25px] md:text-[35px] lg:text-[45px] font-bold text-[#000000] mt-4 leading-none">
                                {isFirstProject
                                    ? t('dashboard.projects.create.firstTitle')
                                    : t('dashboard.projects.create.title')}
                            </h2>
                            <p className="text-[#777777] text-[14px] mt-2">
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
                                    'duration-350 flex items-center justify-center gap-2 w-full max-w-[220px] mx-auto bg-[#0DD122] py-3.5 px-6 font-bold text-white rounded-2xl transition hover:bg-green active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed',
                            }}
                            stepCircleContainerClassName="w-full max-w-[350px] mx-auto"
                            stepContainerClassName="px-0 pt-2 pb-6 justify-between"
                            contentClassName="px-0"
                            footerClassName="pt-4"
                            actionsClassName="mt-8 flex justify-center"
                            contentOverflow="visible"
                            renderStepIndicator={({ step, currentStep }) => {
                                const isActive = step <= currentStep;
                                return (
                                    <div
                                        className={`h-[36px] w-[36px] rounded-full ${
                                            isActive ? 'bg-[#0DD122]' : 'bg-[#9E9E9E]'
                                        }`}
                                    />
                                );
                            }}
                            renderStepConnector={({ isComplete }) => (
                                <div className="relative mx-2 h-[4px] flex-1 rounded-full bg-[#CFCFCF] overflow-hidden">
                                    {isComplete && <span className="absolute inset-0 bg-[#0DD122]" />}
                                </div>
                            )}
                        >
                            <div className="space-y-4 w-full max-w-[300px] mx-auto">
                                {isAdmin && (
                                    <div className="space-y-1">
                                        <label className={labelClass}>
                                            {t('dashboard.projects.create.fields.clientLabel')}
                                        </label>
                                        <MultiUseSelect
                                            {...selectSharedProps}
                                            options={clients.map((item) => ({
                                                value: item.id,
                                                label: item.company_name || item.full_name || item.email || item.id,
                                            }))}
                                            value={formData.client_id}
                                            onChange={handleSelectChange('client_id')}
                                            placeholder={t('dashboard.projects.create.fields.clientPlaceholder')}
                                            getOptionLabel={(option) => option.label}
                                            getOptionValue={(option) => option.value}
                                            buttonClassName={selectButtonClass}
                                        />
                                    </div>
                                )}

                                <div className="space-y-1">
                                    <label className={labelClass}>
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
                                        className={inputClass}
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className={labelClass}>
                                        {t('dashboard.projects.create.fields.needTypeLabel')}
                                    </label>
                                    <MultiUseSelect
                                        {...selectSharedProps}
                                        options={[
                                            {
                                                value: 'social_media',
                                                label: t('dashboard.projects.create.fields.needTypeOptions.socialMedia'),
                                            },
                                            {
                                                value: 'digital_ads',
                                                label: t('dashboard.projects.create.fields.needTypeOptions.digitalAds'),
                                            },
                                            {
                                                value: 'website_landing',
                                                label: t('dashboard.projects.create.fields.needTypeOptions.websiteLanding'),
                                            },
                                            {
                                                value: 'design_branding',
                                                label: t('dashboard.projects.create.fields.needTypeOptions.designBranding'),
                                            },
                                            {
                                                value: 'automation_tech',
                                                label: t('dashboard.projects.create.fields.needTypeOptions.automationTech'),
                                            },
                                            {
                                                value: 'content',
                                                label: t('dashboard.projects.create.fields.needTypeOptions.content'),
                                            },
                                            {
                                                value: 'other',
                                                label: t('dashboard.projects.create.fields.needTypeOptions.other'),
                                            },
                                        ]}
                                        value={formData.need_type}
                                        onChange={handleSelectChange('need_type')}
                                        placeholder={t('dashboard.projects.create.fields.needTypePlaceholder')}
                                        getOptionLabel={(option) => option.label}
                                        getOptionValue={(option) => option.value}
                                        buttonClassName={selectButtonClass}
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className={labelClass}>
                                        {t('dashboard.projects.create.fields.objectiveLabel')}
                                    </label>
                                    <MultiUseSelect
                                        {...selectSharedProps}
                                        options={[
                                            {
                                                value: 'sell_more',
                                                label: t('dashboard.projects.create.fields.objectiveOptions.sellMore'),
                                            },
                                            {
                                                value: 'get_leads',
                                                label: t('dashboard.projects.create.fields.objectiveOptions.getLeads'),
                                            },
                                            {
                                                value: 'improve_brand',
                                                label: t('dashboard.projects.create.fields.objectiveOptions.improveBrand'),
                                            },
                                            {
                                                value: 'launch_product',
                                                label: t('dashboard.projects.create.fields.objectiveOptions.launchProduct'),
                                            },
                                            {
                                                value: 'optimize_process',
                                                label: t('dashboard.projects.create.fields.objectiveOptions.optimizeProcess'),
                                            },
                                            {
                                                value: 'not_sure',
                                                label: t('dashboard.projects.create.fields.objectiveOptions.notSure'),
                                            },
                                        ]}
                                        value={formData.objective}
                                        onChange={handleSelectChange('objective')}
                                        placeholder={t('dashboard.projects.create.fields.objectivePlaceholder')}
                                        getOptionLabel={(option) => option.label}
                                        getOptionValue={(option) => option.value}
                                        buttonClassName={selectButtonClass}
                                    />
                                </div>

                                {errorBlock}
                            </div>

                            <div className="space-y-4 w-full max-w-[300px] mx-auto">
                                <div className="space-y-1">
                                    <label className={labelClass}>
                                        {t('dashboard.projects.create.fields.descriptionLabel')}
                                    </label>
                                    <textarea
                                        required
                                        name="description"
                                        value={formData.description}
                                        onChange={handleChange}
                                        placeholder={t('dashboard.projects.create.fields.descriptionPlaceholder')}
                                        rows={5}
                                        className={textareaClass}
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className={labelClass}>
                                        {t('dashboard.projects.create.fields.urgencyLabel')}
                                    </label>
                                    <MultiUseSelect
                                        {...selectSharedProps}
                                        options={[
                                            {
                                                value: 'no_rush',
                                                label: t('dashboard.projects.create.fields.urgencyOptions.noRush'),
                                            },
                                            {
                                                value: 'next_weeks',
                                                label: t('dashboard.projects.create.fields.urgencyOptions.nextWeeks'),
                                            },
                                            {
                                                value: 'asap',
                                                label: t('dashboard.projects.create.fields.urgencyOptions.asap'),
                                            },
                                            {
                                                value: 'specific_date',
                                                label: t('dashboard.projects.create.fields.urgencyOptions.specificDate'),
                                            },
                                        ]}
                                        value={formData.urgency}
                                        onChange={handleSelectChange('urgency')}
                                        placeholder={t('dashboard.projects.create.fields.urgencyPlaceholder')}
                                        getOptionLabel={(option) => option.label}
                                        getOptionValue={(option) => option.value}
                                        buttonClassName={selectButtonClass}
                                    />
                                    {formData.urgency === 'specific_date' && (
                                        <input
                                            required
                                            type="date"
                                            name="urgency_date"
                                            value={formData.urgency_date}
                                            onChange={handleChange}
                                            className={`${inputClass} mt-2`}
                                        />
                                    )}
                                </div>

                                <div className="space-y-1">
                                    <label className={labelClass}>
                                        {t('dashboard.projects.create.fields.budgetLabel')}
                                    </label>
                                    <MultiUseSelect
                                        {...selectSharedProps}
                                        options={[
                                            {
                                                value: 'unknown',
                                                label: t('dashboard.projects.create.fields.budgetOptions.unknown'),
                                            },
                                            {
                                                value: 'low',
                                                label: t('dashboard.projects.create.fields.budgetOptions.low'),
                                            },
                                            {
                                                value: 'medium',
                                                label: t('dashboard.projects.create.fields.budgetOptions.medium'),
                                            },
                                            {
                                                value: 'high',
                                                label: t('dashboard.projects.create.fields.budgetOptions.high'),
                                            },
                                            {
                                                value: 'advise_me',
                                                label: t('dashboard.projects.create.fields.budgetOptions.adviseMe'),
                                            },
                                        ]}
                                        value={formData.budget_range}
                                        onChange={handleSelectChange('budget_range')}
                                        placeholder={t('dashboard.projects.create.fields.budgetPlaceholder')}
                                        getOptionLabel={(option) => option.label}
                                        getOptionValue={(option) => option.value}
                                        buttonClassName={selectButtonClass}
                                    />
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
