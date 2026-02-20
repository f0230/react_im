import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import Stepper from '@/components/Form/Stepper';
import MultiUseSelect from '@/components/MultiUseSelect';
import RotatingText from '@/components/ui/RotatingText';

const CreateProjectModal = ({
    isOpen,
    onClose,
    onCreated,
    isFirstProject = false,
    role,
    clients = [],
}) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user, client } = useAuth();
    const isAdmin = role === 'admin';
    const labelClass = 'text-[22px] text-[#000000] text-center block';
    const inputClass =
        'w-full bg-[#DBDBDB] h-[51px] rounded-[5px] py-3 px-4 text-[14px] md:text-[18px] lg:text-[22px] text-[#8A8A8A] font-inter';
    const textareaClass =
        'w-full bg-[#DBDBDB] rounded-[5px] py-3 px-4 text-[14px] md:text-[16px] lg:text-[17px] text-[#8A8A8A] font-inter resize-none';
    const selectButtonClass = 'h-[51px] rounded-[5px] text-[14px] md:text-[18px] lg:text-[22px]';
    const selectOptionClass = 'text-[14px] md:text-[16px] lg:text-[17px]';
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
    const [showHint, setShowHint] = useState(false);
    const rotatingTitleOptions = useMemo(() => {
        const rawOptions = t('dashboard.projects.create.firstTitleOptions', { returnObjects: true });
        const options = Array.isArray(rawOptions) ? rawOptions : [rawOptions];
        return options.filter(Boolean);
    }, [t]);
    const firstTitlePrefix = t('dashboard.projects.create.firstTitlePrefix');
    const firstTitleFallback = t('dashboard.projects.create.firstTitle');

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
            setShowHint(false);
        }
    }, [isOpen]);

    useEffect(() => {
        let timer;
        if (isOpen && isFirstProject) {
            timer = setTimeout(() => {
                setShowHint(true);
            }, 6000); // 6 seconds delay
        }
        return () => clearTimeout(timer);
    }, [isOpen, isFirstProject]);

    const selectedClient = useMemo(() => {
        if (!isAdmin) return null;
        return clients.find((item) => item.id === formData.client_id) || null;
    }, [clients, formData.client_id, isAdmin]);

    const normalizePhoneForWhatsapp = (value) => {
        const digits = String(value || '').replace(/\D/g, '');
        return digits || null;
    };

    const buildWhatsappMessage = (project) => {
        const clientSnapshot = isAdmin ? selectedClient : client;
        const name = clientSnapshot?.full_name || clientSnapshot?.company_name || '';
        const title =
            project?.title || project?.name || project?.project_name || formData.title.trim();

        const greetingName = name ? ` ${name}` : '';
        const titleLine = title ? ` sobre “${title}”` : '';

        return `Hola${greetingName}! Ya creamos tu proyecto${titleLine} en Grupo DTE. Para avanzar, ¿querés coordinar una breve llamada? Decime qué día y horario te sirve y lo agendamos.`;
    };

    const sendProjectCreatedWhatsapp = async (project) => {
        const clientSnapshot = isAdmin ? selectedClient : client;
        const rawPhone =
            clientSnapshot?.phone || project?.client_phone || project?.phone || null;
        const to = normalizePhoneForWhatsapp(rawPhone);
        if (!to) return;

        const text = buildWhatsappMessage(project);
        if (!text) return;

        try {
            await fetch('/api/whatsapp-send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ to, text }),
                keepalive: true,
            });
        } catch (err) {
            console.warn('WhatsApp project message failed:', err);
        }
    };

    const buildProjectWebhookPayload = (project) => {
        const clientSnapshot = isAdmin ? selectedClient : client;
        const resolvedTitle =
            project?.title || project?.name || project?.project_name || formData.title.trim();
        const description = formData.description.trim();

        return {
            event: 'project_created',
            project: {
                id: project?.id ?? null,
                title: resolvedTitle || null,
                name: project?.name ?? null,
                project_name: project?.project_name ?? null,
                need_type: project?.need_type ?? formData.need_type ?? null,
                objective: project?.objective ?? formData.objective ?? null,
                description: project?.description ?? (description || null),
                urgency: project?.urgency ?? formData.urgency ?? null,
                urgency_date:
                    project?.urgency_date ??
                    (formData.urgency === 'specific_date' ? formData.urgency_date || null : null),
                budget_range: project?.budget_range ?? formData.budget_range ?? null,
                client_id: project?.client_id ?? clientSnapshot?.id ?? null,
                user_id: project?.user_id ?? clientSnapshot?.user_id ?? user?.id ?? null,
                created_at: project?.created_at ?? null,
            },
            client: clientSnapshot
                ? {
                    id: clientSnapshot.id,
                    company_name: clientSnapshot.company_name || null,
                    full_name: clientSnapshot.full_name || null,
                    email: clientSnapshot.email || null,
                    phone: clientSnapshot.phone || null,
                    user_id: clientSnapshot.user_id || null,
                }
                : null,
            actor: {
                id: user?.id ?? null,
                role: role ?? null,
            },
            source: 'create_project_modal',
            timestamp: new Date().toISOString(),
        };
    };

    const sendProjectCreatedWebhook = async (project) => {
        if (!project) return;
        try {
            const payload = buildProjectWebhookPayload(project);
            await fetch('/api/project-created', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                keepalive: true,
            });
        } catch (err) {
            console.warn('Project webhook failed:', err);
        }
    };

    const resolveClientForSubmit = async () => {
        if (isAdmin) {
            if (selectedClient?.id) {
                return {
                    resolvedClientId: selectedClient.id,
                    resolvedUserId: selectedClient.user_id ?? null,
                };
            }

            if (!formData.client_id) {
                return {
                    resolvedClientId: null,
                    resolvedUserId: null,
                };
            }

            const { data: clientById, error: clientByIdError } = await supabase
                .from('clients')
                .select('id, user_id')
                .eq('id', formData.client_id)
                .maybeSingle();

            if (clientByIdError) {
                console.error('Error resolving selected client:', clientByIdError);
                return {
                    resolvedClientId: null,
                    resolvedUserId: null,
                };
            }

            return {
                resolvedClientId: clientById?.id ?? null,
                resolvedUserId: clientById?.user_id ?? null,
            };
        }

        if (client?.id) {
            return {
                resolvedClientId: client.id,
                resolvedUserId: user?.id ?? null,
            };
        }

        if (!user?.id) {
            return {
                resolvedClientId: null,
                resolvedUserId: null,
            };
        }

        const { data: clientByUser, error: clientByUserError } = await supabase
            .from('clients')
            .select('id')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (clientByUserError) {
            console.error('Error resolving client by user:', clientByUserError);
            return {
                resolvedClientId: null,
                resolvedUserId: user.id,
            };
        }

        return {
            resolvedClientId: clientByUser?.id ?? null,
            resolvedUserId: user.id,
        };
    };


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
            const description = formData.description.trim();
            const { resolvedClientId, resolvedUserId } = await resolveClientForSubmit();

            if (!resolvedClientId) {
                console.warn('Create project blocked due to missing client_id', {
                    role,
                    selectedClientId: formData.client_id || null,
                    contextClientId: client?.id || null,
                    userId: user?.id || null,
                });
                setError(t('dashboard.projects.create.errorMissingClient'));
                return;
            }

            const payload = {
                name: formData.title.trim(),
                client_id: resolvedClientId,
            };
            if (resolvedUserId) payload.user_id = resolvedUserId;
            if (formData.need_type) payload.need_type = formData.need_type;
            if (formData.objective) payload.objective = formData.objective;
            if (description) payload.description = description;
            if (formData.urgency) payload.urgency = formData.urgency;
            if (formData.budget_range) payload.budget_range = formData.budget_range;

            if (formData.urgency === 'specific_date' && formData.urgency_date) {
                payload.urgency_date = formData.urgency_date;
            }

            const { data, error: insertError } = await supabase
                .from('projects')
                .insert(payload)
                .select('*')
                .single();

            if (insertError) {
                console.error('Insert attempt failed for payload:', payload, 'with error:', insertError);
                throw insertError;
            }

            void sendProjectCreatedWebhook(data);
            if (onCreated) {
                onCreated(data);
            } else {
                onClose();
                // Redirect to calendar booking
                navigate(`/schedule-call/${data.id}`);
            }
            setLoading(false);

        } catch (err) {
            console.error('Error creating project payload details:', JSON.stringify(err, null, 2));
            const isOutdatedProjectTrigger =
                err?.code === '42703' && /record\s+"new"\s+has\s+no\s+field\s+"title"/i.test(err?.message || '');
            if (isOutdatedProjectTrigger) {
                setError(t('dashboard.projects.create.errorOutdatedTrigger'));
                return;
            }
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

    const containerVariants = {
        hidden: {},
        visible: {
            transition: { staggerChildren: 0.04 }
        },
        exit: {
            transition: { staggerChildren: 0.02, staggerDirection: -1 }
        }
    };
    const overlayVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.25, ease: 'easeOut' } },
        exit: { opacity: 0, transition: { duration: 0.2, ease: 'easeIn' } }
    };
    const panelVariants = {
        hidden: { opacity: 0, x: 28, scale: 0.985 },
        visible: {
            opacity: 1,
            x: 0,
            scale: 1,
            transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] }
        },
        exit: {
            opacity: 0,
            x: 14,
            scale: 0.985,
            transition: { duration: 0.24, ease: [0.4, 0, 1, 1] }
        }
    };

    return (
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
            <AnimatePresence>
                {isOpen && (
                    <Dialog.Portal forceMount>
                        <Dialog.Overlay asChild>
                            <motion.div
                                className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm"
                                variants={overlayVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                onClick={onClose}
                            />
                        </Dialog.Overlay>

                        <Dialog.Content aria-describedby={undefined} asChild>
                            <motion.div
                                className="fixed inset-0 z-[120] flex items-center justify-center font-product pointer-events-none"
                                variants={containerVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                            >
                                <Dialog.Title className="sr-only">Crear Proyecto</Dialog.Title>
                                <Dialog.Description className="sr-only">Formulario para crear proyecto</Dialog.Description>
                                <motion.div
                                    variants={panelVariants}
                                    className="relative w-full h-full bg-[#E8E8E8] overflow-y-auto overflow-x-hidden pointer-events-auto"
                                >
                                    <button
                                        onClick={onClose}
                                        className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-neutral-600 transition-colors z-[120]"
                                        aria-label={t('dashboard.projects.create.close')}
                                    >
                                        <X size={18} />
                                    </button>

                                    <AnimatePresence>
                                        {showHint && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.9, y: -10 }}
                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                                                className="absolute top-16 right-4 sm:right-10 z-[130] max-w-[280px]"
                                            >
                                                <div className="relative bg-white p-4 rounded-2xl shadow-2xl border border-neutral-100">
                                                    {/* Arrow pointing to X */}
                                                    <div className="absolute -top-2 right-2 w-4 h-4 bg-white rotate-45 border-l border-t border-neutral-100" />

                                                    <button
                                                        onClick={() => setShowHint(false)}
                                                        className="absolute top-2 right-2 text-neutral-300 hover:text-neutral-500"
                                                    >
                                                        <X size={14} />
                                                    </button>

                                                    <h4 className="text-[#0DD122] font-bold text-sm mb-1 pr-4">
                                                        {t('dashboard.projects.create.helpfulHint.title')}
                                                    </h4>
                                                    <p className="text-neutral-600 text-xs leading-relaxed">
                                                        {t('dashboard.projects.create.helpfulHint.description')}
                                                    </p>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <div className="max-w-[600px] mx-auto w-full flex flex-col items-center justify-center  p-6 sm:p-12 leading-none">
                                        <div className="mb-6 text-center ">
                                            <h2 className="text-[25px] md:text-[35px] lg:text-[45px] font-bold text-[#000000] mt-4 leading-none">
                                                {isFirstProject ? (
                                                    rotatingTitleOptions.length ? (
                                                        <span className="inline-flex flex-wrap items-baseline justify-center gap-2">
                                                            <span>{firstTitlePrefix}</span>
                                                            <RotatingText
                                                                texts={rotatingTitleOptions}
                                                                rotationInterval={2200}
                                                                splitBy="words"
                                                                staggerDuration={0.03}
                                                                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                                                                mainClassName="inline-flex font-bold"
                                                            />
                                                        </span>
                                                    ) : (
                                                        firstTitleFallback
                                                    )
                                                ) : (
                                                    t('dashboard.projects.create.title')
                                                )}
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
                                                        className={`h-[36px] w-[36px] rounded-full ${isActive ? 'bg-[#0DD122]' : 'bg-[#9E9E9E]'
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
                                                                value: 'web_landing',
                                                                label: t('dashboard.projects.create.fields.needTypeOptions.webLanding'),
                                                            },
                                                            {
                                                                value: 'ecommerce',
                                                                label: t('dashboard.projects.create.fields.needTypeOptions.ecommerce'),
                                                            },
                                                            {
                                                                value: 'ads_meta_google',
                                                                label: t('dashboard.projects.create.fields.needTypeOptions.adsMetaGoogle'),
                                                            },
                                                            {
                                                                value: 'sales_funnel',
                                                                label: t('dashboard.projects.create.fields.needTypeOptions.salesFunnel'),
                                                            },
                                                            {
                                                                value: 'automations_crm_whatsapp',
                                                                label: t('dashboard.projects.create.fields.needTypeOptions.automationsCrmWhatsApp'),
                                                            },
                                                            {
                                                                value: 'custom_system',
                                                                label: t('dashboard.projects.create.fields.needTypeOptions.customSystem'),
                                                            },
                                                            {
                                                                value: 'integrations',
                                                                label: t('dashboard.projects.create.fields.needTypeOptions.integrations'),
                                                            },
                                                            {
                                                                value: 'seo_google',
                                                                label: t('dashboard.projects.create.fields.needTypeOptions.seoGoogle'),
                                                            },
                                                            {
                                                                value: 'analytics_reporting',
                                                                label: t('dashboard.projects.create.fields.needTypeOptions.analyticsReporting'),
                                                            },
                                                            {
                                                                value: 'social_content',
                                                                label: t('dashboard.projects.create.fields.needTypeOptions.socialContent'),
                                                            },
                                                            {
                                                                value: 'branding_identity',
                                                                label: t('dashboard.projects.create.fields.needTypeOptions.brandingIdentity'),
                                                            },
                                                            {
                                                                value: 'launch_360',
                                                                label: t('dashboard.projects.create.fields.needTypeOptions.launch360'),
                                                            },
                                                            {
                                                                value: 'commercial_architecture',
                                                                label: t('dashboard.projects.create.fields.needTypeOptions.commercialArchitecture'),
                                                            },
                                                            {
                                                                value: 'growth_strategy',
                                                                label: t('dashboard.projects.create.fields.needTypeOptions.growthStrategy'),
                                                            },
                                                            {
                                                                value: 'cro_optimization',
                                                                label: t('dashboard.projects.create.fields.needTypeOptions.croOptimization'),
                                                            },
                                                            {
                                                                value: 'crm_pipeline',
                                                                label: t('dashboard.projects.create.fields.needTypeOptions.crmPipeline'),
                                                            },
                                                            {
                                                                value: 'onboarding_cx',
                                                                label: t('dashboard.projects.create.fields.needTypeOptions.onboardingCx'),
                                                            },
                                                            {
                                                                value: 'lead_content',
                                                                label: t('dashboard.projects.create.fields.needTypeOptions.leadContent'),
                                                            },
                                                            {
                                                                value: 'consulting_diagnosis',
                                                                label: t('dashboard.projects.create.fields.needTypeOptions.consultingDiagnosis'),
                                                            },
                                                            {
                                                                value: 'other_unsure',
                                                                label: t('dashboard.projects.create.fields.needTypeOptions.otherUnsure'),
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
                                                                value: 'sell_more_online',
                                                                label: t('dashboard.projects.create.fields.objectiveOptions.sellMoreOnline'),
                                                            },
                                                            {
                                                                value: 'get_more_leads',
                                                                label: t('dashboard.projects.create.fields.objectiveOptions.getMoreLeads'),
                                                            },
                                                            {
                                                                value: 'improve_presence',
                                                                label: t('dashboard.projects.create.fields.objectiveOptions.improvePresence'),
                                                            },
                                                            {
                                                                value: 'launch_product',
                                                                label: t('dashboard.projects.create.fields.objectiveOptions.launchProduct'),
                                                            },
                                                            {
                                                                value: 'improve_website',
                                                                label: t('dashboard.projects.create.fields.objectiveOptions.improveWebsite'),
                                                            },
                                                            {
                                                                value: 'automate_tasks',
                                                                label: t('dashboard.projects.create.fields.objectiveOptions.automateTasks'),
                                                            },
                                                            {
                                                                value: 'organize_business',
                                                                label: t('dashboard.projects.create.fields.objectiveOptions.organizeBusiness'),
                                                            },
                                                            {
                                                                value: 'improve_campaigns',
                                                                label: t('dashboard.projects.create.fields.objectiveOptions.improveCampaigns'),
                                                            },
                                                            {
                                                                value: 'measure_better',
                                                                label: t('dashboard.projects.create.fields.objectiveOptions.measureBetter'),
                                                            },
                                                            {
                                                                value: 'scale_business',
                                                                label: t('dashboard.projects.create.fields.objectiveOptions.scaleBusiness'),
                                                            },
                                                            {
                                                                value: 'recover_clients',
                                                                label: t('dashboard.projects.create.fields.objectiveOptions.recoverClients'),
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
                                                                value: 'asap',
                                                                label: t('dashboard.projects.create.fields.urgencyOptions.asap'),
                                                            },
                                                            {
                                                                value: 'this_week',
                                                                label: t('dashboard.projects.create.fields.urgencyOptions.thisWeek'),
                                                            },
                                                            {
                                                                value: 'two_weeks',
                                                                label: t('dashboard.projects.create.fields.urgencyOptions.twoWeeks'),
                                                            },
                                                            {
                                                                value: 'one_month',
                                                                label: t('dashboard.projects.create.fields.urgencyOptions.oneMonth'),
                                                            },
                                                            {
                                                                value: 'two_three_months',
                                                                label: t('dashboard.projects.create.fields.urgencyOptions.twoThreeMonths'),
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
                                                                value: 'under_300',
                                                                label: t('dashboard.projects.create.fields.budgetOptions.under300'),
                                                            },
                                                            {
                                                                value: '300_600',
                                                                label: t('dashboard.projects.create.fields.budgetOptions.between300And600'),
                                                            },
                                                            {
                                                                value: '600_1200',
                                                                label: t('dashboard.projects.create.fields.budgetOptions.between600And1200'),
                                                            },
                                                            {
                                                                value: '1200_2500',
                                                                label: t('dashboard.projects.create.fields.budgetOptions.between1200And2500'),
                                                            },
                                                            {
                                                                value: 'over_2500',
                                                                label: t('dashboard.projects.create.fields.budgetOptions.over2500'),
                                                            },
                                                            {
                                                                value: 'recommend',
                                                                label: t('dashboard.projects.create.fields.budgetOptions.recommend'),
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
                            </motion.div>
                        </Dialog.Content>
                    </Dialog.Portal>
                )}
            </AnimatePresence>
        </Dialog.Root>
    );
};

export default CreateProjectModal;
