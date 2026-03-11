import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';
import MultiUseSelect from '@/components/MultiUseSelect';
import { MorphingText } from '@/components/ui/morphing-text';
import useCalAvailability from '@/hooks/useCalAvailability';
import Navbar from '@/components/Navbar';
import { formatCalendarDate, getTodayCalendarDate, parseCalendarDate } from '@/utils/calBookingWindow';
import { isValidPhone } from '@/utils/phone-validation';
import { stripLeadingPlus } from '@/utils/phone-format';
import { formatScheduleDate, formatScheduleDateTime, formatScheduleTime, SCHEDULE_TIME_ZONE, SCHEDULE_TIME_ZONE_LABEL } from '@/utils/scheduleTime';

import '@/index.css';
import '@/styles/schedule-call-calendar.css';

const TRACKING_QUERY_KEYS = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_content',
    'utm_term',
    'source',
    'medium',
    'campaign',
    'content',
    'term',
    'bot',
    'entry_point',
    'entrypoint',
    'wa_id',
    'thread_id',
    'conversation_id',
    'message_id',
    'click_id',
    'fbclid',
    'fbc',
    'fbp',
    'gclid',
];

const normalizeText = (value) => {
    const text = String(value || '').trim();
    return text || null;
};

const compactObject = (value) => Object.fromEntries(
    Object.entries(value).filter(([, entry]) => {
        if (entry == null) return false;
        if (typeof entry === 'string') return entry.trim().length > 0;
        if (typeof entry === 'object') return Object.keys(entry).length > 0;
        return true;
    })
);

const buildTrackingPayload = ({ pathname, search }) => {
    const params = new URLSearchParams(search || '');
    const rawParams = {};

    TRACKING_QUERY_KEYS.forEach((key) => {
        const value = normalizeText(params.get(key));
        if (value) rawParams[key] = value;
    });

    const tracking = compactObject({
        entryPoint: normalizeText(params.get('entry_point')) || normalizeText(params.get('entrypoint')),
        bot: normalizeText(params.get('bot')),
        source: normalizeText(params.get('utm_source')) || normalizeText(params.get('source')),
        medium: normalizeText(params.get('utm_medium')) || normalizeText(params.get('medium')),
        campaign: normalizeText(params.get('utm_campaign')) || normalizeText(params.get('campaign')),
        content: normalizeText(params.get('utm_content')) || normalizeText(params.get('content')),
        term: normalizeText(params.get('utm_term')) || normalizeText(params.get('term')),
        waId: normalizeText(params.get('wa_id')),
        threadId: normalizeText(params.get('thread_id')),
        conversationId: normalizeText(params.get('conversation_id')),
        messageId: normalizeText(params.get('message_id')),
        clickId: normalizeText(params.get('click_id')),
        fbclid: normalizeText(params.get('fbclid')),
        fbc: normalizeText(params.get('fbc')),
        fbp: normalizeText(params.get('fbp')),
        gclid: normalizeText(params.get('gclid')),
        landingPath: normalizeText(`${pathname || '/schedule-call'}${search || ''}`),
        referrer: typeof document !== 'undefined' ? normalizeText(document.referrer) : null,
        rawParams,
    });

    return Object.keys(tracking).length > 0 ? tracking : null;
};

const getProjectLabel = (project) => project?.title || project?.name || project?.project_name || 'Project';
const isSameCalendarDay = (left, right) => {
    if (!left || !right) return false;

    return left.getFullYear() === right.getFullYear()
        && left.getMonth() === right.getMonth()
        && left.getDate() === right.getDate();
};

const clampDateToRange = (value, minDate, maxDate) => {
    const normalizedDate = parseCalendarDate(value) || getTodayCalendarDate(SCHEDULE_TIME_ZONE) || new Date();
    if (minDate && normalizedDate < minDate) return minDate;
    if (maxDate && normalizedDate > maxDate) return maxDate;
    return normalizedDate;
};

const addDays = (value, amount) => {
    const date = parseCalendarDate(value) || value;
    if (!date) return null;

    const next = new Date(date.getTime());
    next.setDate(next.getDate() + Number(amount || 0));
    next.setHours(12, 0, 0, 0);
    return next;
};

const buildSelectableDates = (minDate, maxDate) => {
    if (!minDate) return [];

    const start = parseCalendarDate(minDate) || minDate;
    const fallbackEnd = addDays(start, 6);
    const end = parseCalendarDate(maxDate) || maxDate || fallbackEnd;
    if (!start || !end || start > end) return [];

    const dates = [];
    const cursor = new Date(start.getTime());

    while (cursor <= end) {
        dates.push(new Date(cursor.getTime()));
        cursor.setDate(cursor.getDate() + 1);
        cursor.setHours(12, 0, 0, 0);
    }

    return dates;
};

const ScheduleCall = () => {
    const { t } = useTranslation();
    const { projectId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user, client, profile } = useAuth();
    const role = profile?.role || null;
    const isAdmin = role === 'admin';
    const isWorker = role === 'worker';
    const isClient = role === 'client';
    const requiresPhone = !isAdmin && !isWorker;
    const dateStripRef = useRef(null);

    const [selectedDate, setSelectedDate] = useState(() => getTodayCalendarDate(SCHEDULE_TIME_ZONE) || new Date());
    const [bookingPhase, setBookingPhase] = useState('slots'); // 'slots', 'form', 'success'
    const [submitting, setSubmitting] = useState(false);

    const [projects, setProjects] = useState([]);
    const [selectedProjectId, setSelectedProjectId] = useState(projectId || '');
    const [fieldErrors, setFieldErrors] = useState({});

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        notes: ''
    });

    const tracking = useMemo(
        () => buildTrackingPayload({ pathname: location.pathname, search: location.search }),
        [location.pathname, location.search]
    );

    useEffect(() => {
        setSelectedProjectId(projectId || '');
    }, [projectId]);

    const fetchProjectsInternal = useCallback(async () => {
        if (!user?.id) {
            setProjects([]);
            return;
        }

        try {
            const selectStr = 'id, name, title, project_name, user_id, project_client_users(user_id)';
            let response;

            if (isAdmin) {
                response = await supabase
                    .from('projects')
                    .select(selectStr)
                    .order('created_at', { ascending: false });
            } else if (isWorker) {
                const { data: assignmentsData, error: assignmentsError } = await supabase
                    .from('project_assignments')
                    .select('project_id')
                    .eq('worker_id', user.id);

                if (assignmentsError) {
                    throw assignmentsError;
                }

                const projectIds = assignmentsData?.map((assignment) => assignment.project_id).filter(Boolean) || [];
                if (projectIds.length === 0) {
                    response = { data: [], error: null };
                } else {
                    response = await supabase
                        .from('projects')
                        .select(selectStr)
                        .in('id', projectIds)
                        .order('created_at', { ascending: false });
                }
            } else if (isClient) {
                response = await supabase
                    .from('projects')
                    .select(selectStr)
                    .order('created_at', { ascending: false });
            } else {
                response = await supabase
                    .from('projects')
                    .select(selectStr)
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false });
            }

            if (response.error) {
                throw response.error;
            }

            let fetchedProjects = response.data || [];
            const isClientOwner = isClient && client?.user_id === user.id;
            const isClientLeader = isClient && (profile?.is_client_leader || isClientOwner);

            if (isClient && !isClientLeader) {
                fetchedProjects = fetchedProjects.filter((project) => {
                    const explicitlyAssigned = (project?.project_client_users || []).some(
                        (assignment) => assignment?.user_id === user.id
                    );
                    const isCreator = project?.user_id === user.id;
                    return explicitlyAssigned || isCreator;
                });
            }

            const formattedProjects = fetchedProjects.map((project) => ({
                id: project.id,
                name: getProjectLabel(project),
            }));

            setProjects(formattedProjects);
            setSelectedProjectId((currentValue) => {
                const currentSelection = currentValue || projectId || '';
                const hasCurrentSelection = formattedProjects.some((project) => project.id === currentSelection);

                if (hasCurrentSelection) return currentSelection;
                if (formattedProjects.length === 1) return formattedProjects[0].id;
                return projectId || '';
            });
        } catch (err) {
            console.error('Error fetching projects:', err);
            setProjects([]);
        }
    }, [client?.user_id, isAdmin, isClient, isWorker, profile?.is_client_leader, projectId, user?.id]);

    const {
        bookingRules,
        loadingBookingRules,
        slots,
        loadingSlots,
        selectedSlot,
        setSelectedSlot
    } = useCalAvailability({
        selectedDate,
        enabled: Boolean(selectedDate),
        onError: () => toast.error(t('calendar.errorFetchingSlots'))
    });

    const todayDate = useMemo(
        () => getTodayCalendarDate(SCHEDULE_TIME_ZONE) || new Date(),
        []
    );

    const minSelectableDate = useMemo(
        () => parseCalendarDate(bookingRules?.dateLimits?.minDate) || todayDate,
        [bookingRules?.dateLimits?.minDate, todayDate]
    );

    const maxSelectableDate = useMemo(
        () => parseCalendarDate(bookingRules?.dateLimits?.maxDate),
        [bookingRules?.dateLimits?.maxDate]
    );

    const selectableDates = useMemo(
        () => buildSelectableDates(minSelectableDate, maxSelectableDate),
        [maxSelectableDate, minSelectableDate]
    );

    const selectedDateKey = useMemo(
        () => formatCalendarDate(selectedDate),
        [selectedDate]
    );

    const selectedDateLabel = useMemo(
        () => formatScheduleDateTime(selectedDate, {
            day: 'numeric',
            month: 'long',
            weekday: 'long',
            timeZone: SCHEDULE_TIME_ZONE,
        }),
        [selectedDate]
    );

    const minSelectableDateLabel = useMemo(
        () => minSelectableDate
            ? formatScheduleDateTime(minSelectableDate, {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                timeZone: SCHEDULE_TIME_ZONE,
            })
            : '',
        [minSelectableDate]
    );

    const maxSelectableDateLabel = useMemo(
        () => maxSelectableDate
            ? formatScheduleDateTime(maxSelectableDate, {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                timeZone: SCHEDULE_TIME_ZONE,
            })
            : '',
        [maxSelectableDate]
    );

    const bookingWindowMessage = useMemo(() => {
        const type = bookingRules?.bookingWindow?.type;
        const value = bookingRules?.bookingWindow?.value;

        if (type === 'businessDays' && value != null && maxSelectableDateLabel) {
            return t('calendar.futureLimitBusinessDays', {
                count: value,
                date: maxSelectableDateLabel,
            });
        }

        if ((type === 'calendarDays' || type === 'days') && value != null && maxSelectableDateLabel) {
            return t('calendar.futureLimitDays', {
                count: value,
                date: maxSelectableDateLabel,
            });
        }

        if (minSelectableDateLabel && maxSelectableDateLabel && !isSameCalendarDay(minSelectableDate, maxSelectableDate)) {
            return t('calendar.futureLimitRange', {
                start: minSelectableDateLabel,
                end: maxSelectableDateLabel,
            });
        }

        if (maxSelectableDateLabel) {
            return t('calendar.futureLimitUntil', { date: maxSelectableDateLabel });
        }

        return t('calendar.futureLimitFallback');
    }, [
        bookingRules?.bookingWindow?.type,
        bookingRules?.bookingWindow?.value,
        maxSelectableDate,
        maxSelectableDateLabel,
        minSelectableDate,
        minSelectableDateLabel,
        t,
    ]);

    useEffect(() => {
        if (!selectedDate) return;

        const nextSelectedDate = clampDateToRange(selectedDate, minSelectableDate, maxSelectableDate);
        if (!isSameCalendarDay(selectedDate, nextSelectedDate)) {
            setSelectedDate(nextSelectedDate);
        }
    }, [maxSelectableDate, minSelectableDate, selectedDate]);

    useEffect(() => {
        if (!dateStripRef.current || !selectedDateKey) return;

        const selectedNode = dateStripRef.current.querySelector(`[data-date-key="${selectedDateKey}"]`);
        if (!selectedNode) return;

        selectedNode.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'center',
        });
    }, [selectedDateKey, selectableDates]);

    useEffect(() => {
        if (client || user) {
            setFormData(prev => ({
                ...prev,
                name: client?.full_name || client?.company_name || user?.user_metadata?.full_name || '',
                email: client?.email || user?.email || '',
                phone: stripLeadingPlus(client?.phone || user?.phone || '')
            }));
            fetchProjectsInternal();
        }
    }, [client, user, fetchProjectsInternal]);

    const handleFieldChange = useCallback((field, value) => {
        const nextValue = field === 'phone' ? stripLeadingPlus(value) : value;
        setFormData((prev) => ({ ...prev, [field]: nextValue }));
        setFieldErrors((prev) => {
            if (!prev[field]) return prev;
            const next = { ...prev };
            delete next[field];
            return next;
        });
    }, []);

    const handleSlotSelect = (slot) => {
        setSelectedSlot(slot);
        setFieldErrors((prev) => {
            if (!prev.slot) return prev;
            const next = { ...prev };
            delete next.slot;
            return next;
        });
        setBookingPhase('form');
    };

    const handleDateChange = useCallback((date) => {
        if (!date) return;
        setSelectedDate(clampDateToRange(date, minSelectableDate, maxSelectableDate));
    }, [maxSelectableDate, minSelectableDate]);

    const heroMorphTexts = [
        t('calendar.heroMorph1'),
        t('calendar.heroMorph2'),
        t('calendar.heroMorph3'),
        t('calendar.heroMorph4'),
    ].filter(Boolean);

    const renderScheduleHero = () => (
        <div className="relative overflow-hidden bg-[#09090b] px-5 py-10 text-white sm:px-8 sm:py-14 lg:px-10 lg:py-16">
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute -left-14 top-0 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
                <div className="absolute right-0 top-10 h-56 w-56 rounded-full bg-[rgba(0,113,227,0.16)] blur-3xl" />
                <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),transparent_42%)]" />
            </div>

            <div className="relative">
                            <MorphingText
                    texts={heroMorphTexts}
                    className="!mx-0 !h-[3.2rem] !max-w-none font-product !text-[2.05rem] uppercase tracking-[-0.08em] text-white sm:!h-[4.5rem] sm:!text-[3.75rem] lg:!h-[6rem] lg:!text-[5.1rem]"
                />
            </div>
        </div>
    );

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        const nextErrors = {};
        const trimmedPhone = formData.phone.trim();

        if (!selectedSlot?.start) {
            nextErrors.slot = t('calendar.selectSlotFirst');
        }

        if (requiresPhone) {
            if (!trimmedPhone) {
                nextErrors.phone = t('calendar.phoneRequired');
            } else if (!isValidPhone(trimmedPhone)) {
                nextErrors.phone = t('calendar.invalidPhone');
            }
        }

        if (Object.keys(nextErrors).length > 0) {
            setFieldErrors(nextErrors);
            const firstError = nextErrors.slot || nextErrors.phone || t('calendar.bookingError');
            toast.error(firstError);
            if (nextErrors.slot) {
                setBookingPhase('slots');
            }
            return;
        }

        setSubmitting(true);
        try {
            setFieldErrors({});
            const participantRole = role;
            const participantType = participantRole === 'client' ? 'client' : (participantRole ? 'profile' : null);
            const resolvedClientId = client?.id || profile?.client_id || null;

            const response = await fetch('/api/cal/create-booking', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    start: selectedSlot.start,
                    ...formData,
                    phone: trimmedPhone,
                    projectId: selectedProjectId || projectId,
                    userId: user?.id,
                    clientId: resolvedClientId,
                    participantType,
                    participantRole,
                    participantId: user?.id || null,
                    timeZone: SCHEDULE_TIME_ZONE,
                    tracking,
                })
            });
            if (!response.ok) {
                const errorPayload = await response.json().catch(() => ({}));
                const detailedError = errorPayload?.details?.error?.message || errorPayload?.details?.message || errorPayload?.error || 'Booking failed';
                if (/phone|whatsapp/i.test(detailedError)) {
                    setFieldErrors((prev) => ({ ...prev, phone: detailedError }));
                }
                throw new Error(detailedError);
            }
            setBookingPhase('success');
            toast.success(t('calendar.bookingSuccess'));
        } catch (error) {
            console.error('Booking error:', error);
            toast.error(error.message || t('calendar.bookingError'));
        } finally {
            setSubmitting(false);
        }
    };

    const containerVariants = {
        hidden: { opacity: 0, y: 10 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 1.2, ease: [0.22, 1, 0.36, 1] }
        }
    };

    if (bookingPhase === 'success') {
        return (
            <div className="min-h-screen bg-[#F5F5F5]">
                <Navbar />
                <div className="mx-auto w-full max-w-[1440px] px-4 pb-10 pt-[72px] sm:px-6 sm:pt-[84px]">
                    <motion.div
                        initial="hidden"
                        animate="visible"
                        variants={containerVariants}
                        className="mx-auto w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-xl sm:p-8"
                    >
                        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-black/5">
                            <Check className="h-10 w-10 text-black" />
                        </div>
                        <h2 className="mt-6 text-2xl font-bold">{t('calendar.successTitle')}</h2>
                        <p className="mt-2 text-gray-600">{t('calendar.successMessage')}</p>
                        <button
                            onClick={() => navigate(user ? '/dashboard' : '/')}
                            className="mt-6 w-full rounded-xl bg-black py-3 font-bold text-white transition-opacity hover:opacity-90"
                        >
                            {t('calendar.goToDashboard')}
                        </button>
                    </motion.div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F5F5F5]">
            <Navbar />
            <div className="mx-auto w-full max-w-[1440px] px-3 pb-8 pt-[64px] sm:px-6 sm:pb-12 sm:pt-[84px] lg:px-8">
                <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={containerVariants}
                    className="mx-auto w-full max-w-6xl overflow-hidden rounded-[32px] bg-white font-product shadow-[0_24px_60px_-35px_rgba(0,0,0,0.35)]"
                >
                    {renderScheduleHero()}

                    <div className="px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
                        <AnimatePresence mode="wait">
                            {bookingPhase === 'slots' ? (
                                <motion.div
                                    key="slots"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="flex h-full min-h-[420px] flex-col"
                                >
                                    <div className="relative overflow-hidden rounded-[32px] border border-white/40 bg-[rgba(255,255,255,0.14)] p-4 shadow-[0_28px_70px_-34px_rgba(15,23,42,0.55)] backdrop-blur-[26px] sm:p-5">
                                        <div className="pointer-events-none absolute inset-0">
                                            <div className="absolute -left-10 top-0 h-36 w-36 rounded-full bg-white/30 blur-3xl" />
                                            <div className="absolute right-0 top-12 h-44 w-44 rounded-full bg-sky-200/45 blur-3xl" />
                                            <div className="absolute bottom-0 left-1/3 h-32 w-32 rounded-full bg-zinc-300/30 blur-3xl" />
                                            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.18),rgba(255,255,255,0.05)_45%,rgba(15,23,42,0.06))]" />
                                        </div>

                                        <div className="relative flex h-[300px] flex-col">
                                            <div className="mb-4 flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
                                                        {t('calendar.availabilityWindowLabel')}
                                                    </p>
                                                    <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
                                                        {loadingBookingRules ? t('calendar.loadingWindow') : bookingWindowMessage}
                                                    </p>
                                                </div>
                                                {selectableDates.length > 0 && (
                                                    <div className="rounded-full border border-white/60 bg-white/35 px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-[0_10px_25px_-20px_rgba(15,23,42,0.55)] backdrop-blur-xl">
                                                        {selectableDates.length}
                                                    </div>
                                                )}
                                            </div>

                                            {loadingBookingRules ? (
                                                <>
                                                    <div className="mb-4 flex gap-3 overflow-hidden">
                                                        {Array.from({ length: 5 }).map((_, index) => (
                                                            <div
                                                                key={index}
                                                                className="h-[108px] min-w-[92px] animate-pulse rounded-[26px] border border-white/60 bg-white/35 backdrop-blur-xl"
                                                            />
                                                        ))}
                                                    </div>
                                                    <div className="space-y-2">
                                                        {Array.from({ length: 3 }).map((_, index) => (
                                                            <div
                                                                key={index}
                                                                className="h-[54px] animate-pulse rounded-[18px] border border-white/60 bg-white/35 backdrop-blur-xl"
                                                            />
                                                        ))}
                                                    </div>
                                                </>
                                            ) : selectableDates.length > 0 ? (
                                                <>
                                                    <div className="dte-date-strip mb-4">
                                                        <div className="dte-date-strip__edge dte-date-strip__edge--left" />
                                                        <div className="dte-date-strip__edge dte-date-strip__edge--right" />
                                                        <div ref={dateStripRef} className="dte-date-strip__scroller">
                                                            {selectableDates.map((date, index) => {
                                                                const isSelected = isSameCalendarDay(date, selectedDate);
                                                                const isToday = isSameCalendarDay(date, todayDate);
                                                                const dateKey = formatCalendarDate(date);

                                                                return (
                                                                    <motion.button
                                                                        key={dateKey || date.toISOString()}
                                                                        type="button"
                                                                        data-date-key={dateKey}
                                                                        onClick={() => handleDateChange(date)}
                                                                        className={`dte-date-strip__item ${isSelected ? 'dte-date-strip__item--selected' : ''} ${isToday ? 'dte-date-strip__item--today' : ''}`}
                                                                        aria-pressed={isSelected}
                                                                        aria-label={formatScheduleDateTime(date, {
                                                                            weekday: 'long',
                                                                            day: 'numeric',
                                                                            month: 'long',
                                                                            year: 'numeric',
                                                                            timeZone: SCHEDULE_TIME_ZONE,
                                                                        })}
                                                                        initial={{ opacity: 0, y: 12 }}
                                                                        animate={{ opacity: 1, y: 0 }}
                                                                        transition={{ duration: 0.35, delay: index * 0.03 }}
                                                                        whileHover={{ y: -4, scale: 1.01 }}
                                                                        whileTap={{ scale: 0.98 }}
                                                                    >
                                                                        {isToday && (
                                                                            <span className="dte-date-strip__today-pill">
                                                                                {t('calendar.today')}
                                                                            </span>
                                                                        )}
                                                                        <span className="dte-date-strip__weekday">
                                                                            {formatScheduleDateTime(date, {
                                                                                weekday: 'short',
                                                                                timeZone: SCHEDULE_TIME_ZONE,
                                                                            })}
                                                                        </span>
                                                                        <span className="dte-date-strip__day">
                                                                            {formatScheduleDateTime(date, {
                                                                                day: 'numeric',
                                                                                timeZone: SCHEDULE_TIME_ZONE,
                                                                            })}
                                                                        </span>
                                                                        <span className="dte-date-strip__month">
                                                                            {formatScheduleDateTime(date, {
                                                                                month: 'short',
                                                                                timeZone: SCHEDULE_TIME_ZONE,
                                                                            })}
                                                                        </span>
                                                                    </motion.button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>

                                                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-t border-white/35 pt-4">
                                                        <div>
                                                            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
                                                                {SCHEDULE_TIME_ZONE_LABEL}
                                                            </p>
                                                            <h3 className="mt-2 text-lg font-semibold capitalize text-slate-900 sm:text-xl">
                                                                {selectedDateLabel}
                                                            </h3>
                                                        </div>
                                                        <div className="rounded-full border border-white/60 bg-white/35 px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-[0_10px_25px_-20px_rgba(15,23,42,0.55)] backdrop-blur-xl">
                                                            {slots.length}
                                                        </div>
                                                    </div>

                                                    {fieldErrors.slot && (
                                                        <p className="mb-3 rounded-2xl border border-red-200/70 bg-red-50/70 px-3 py-2 text-sm text-red-700 backdrop-blur-xl">
                                                            {fieldErrors.slot}
                                                        </p>
                                                    )}

                                                    <div className="dte-slot-list custom-scrollbar flex-1 overflow-y-auto pr-1">
                                                        {loadingSlots ? (
                                                            <div className="flex h-full min-h-[92px] items-center justify-center">
                                                                <Loader2 className="animate-spin text-slate-500" />
                                                            </div>
                                                        ) : slots.length > 0 ? (
                                                            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                                                                {slots.map((slot, idx) => (
                                                                    <button
                                                                        key={idx}
                                                                        onClick={() => handleSlotSelect(slot)}
                                                                        className="group flex w-full items-center justify-between rounded-[20px] border border-white/60 bg-white/35 px-4 py-3 text-left text-sm shadow-[0_14px_30px_-22px_rgba(15,23,42,0.5)] backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:border-white hover:bg-white/50 sm:text-base"
                                                                    >
                                                                        <span className="font-semibold text-slate-900">
                                                                            {formatScheduleTime(slot.start)}
                                                                        </span>
                                                                        <span className="rounded-full border border-slate-200/70 bg-white/70 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-slate-700 transition-colors group-hover:border-white group-hover:bg-white">
                                                                            {t('calendar.book')}
                                                                        </span>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div className="flex h-full min-h-[100px] flex-col items-center justify-center rounded-[24px] border border-white/50 bg-white/25 px-6 text-center backdrop-blur-xl">
                                                                <p className="text-sm font-semibold text-slate-700">
                                                                    {t('calendar.noSlots')}
                                                                </p>
                                                                <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
                                                                    {t('calendar.noSlotsDescription')}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="flex flex-1 items-center justify-center rounded-[28px] border border-white/50 bg-white/25 px-6 text-center backdrop-blur-xl">
                                                    <p className="max-w-md text-sm leading-relaxed text-slate-600">
                                                        {bookingWindowMessage}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div key="form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                    <div className="mb-5 flex flex-wrap items-center gap-3 sm:mb-6 sm:gap-4">
                                        <button
                                            onClick={() => setBookingPhase('slots')}
                                            className="rounded-full border border-gray-300 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:border-black hover:text-black"
                                        >
                                            {t('calendar.back')}
                                        </button>
                                        <h2 className="text-lg font-bold sm:text-xl">{t('calendar.enterDetails')}</h2>
                                    </div>

                                    <div className="mb-6 rounded-xl bg-gray-50 p-4">
                                        <p className="text-sm text-gray-500">{t('calendar.selectedTimeLabel')} · {SCHEDULE_TIME_ZONE_LABEL}</p>
                                        <p className="mt-1 font-bold">
                                            {selectedSlot?.start
                                                ? `${formatScheduleDate(selectedSlot.start)} a las ${formatScheduleTime(selectedSlot.start)}`
                                                : ''}
                                        </p>
                                    </div>

                                    <form onSubmit={handleFormSubmit} className="space-y-4">
                                        {projects.length > 0 && (
                                            <div>
                                                <label className="mb-1 block text-sm font-medium text-gray-700">{t('calendar.projectLabel')}</label>
                                                <MultiUseSelect
                                                    options={projects}
                                                    value={selectedProjectId}
                                                    onChange={setSelectedProjectId}
                                                    placeholder={t('calendar.projectPlaceholder')}
                                                    getOptionValue={(p) => p.id}
                                                    getOptionLabel={(p) => p.name}
                                                    getDisplayLabel={(p) => p.name}
                                                    buttonClassName="h-[50px] rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 focus:ring-2 focus:ring-black/15"
                                                    className="w-full"
                                                />
                                            </div>
                                        )}
                                        <div>
                                            <label className="mb-1 block text-sm font-medium text-gray-700">{t('form.fullName')}</label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.name}
                                                onChange={e => handleFieldChange('name', e.target.value)}
                                                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-black/15"
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-sm font-medium text-gray-700">{t('form.email')}</label>
                                            <input
                                                type="email"
                                                required
                                                value={formData.email}
                                                onChange={e => handleFieldChange('email', e.target.value)}
                                                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-black/15"
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-sm font-medium text-gray-700">{t('form.phone')}</label>
                                            <input
                                                type="tel"
                                                required={requiresPhone}
                                                value={formData.phone}
                                                onChange={e => handleFieldChange('phone', e.target.value)}
                                                className={`w-full rounded-xl bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-black/15 ${fieldErrors.phone ? 'border border-red-400' : 'border border-gray-300'}`}
                                            />
                                            {fieldErrors.phone ? (
                                                <p className="mt-2 text-sm text-red-600">{fieldErrors.phone}</p>
                                            ) : requiresPhone ? (
                                                <p className="mt-2 text-sm text-gray-500">{t('calendar.phoneHelp')}</p>
                                            ) : null}
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-sm font-medium text-gray-700">{t('form.notes')}</label>
                                            <textarea
                                                rows="3"
                                                value={formData.notes}
                                                onChange={e => handleFieldChange('notes', e.target.value)}
                                                className="w-full resize-none rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-black/15"
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={submitting}
                                            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-black py-4 font-bold text-white transition-colors hover:bg-zinc-800 disabled:opacity-70"
                                        >
                                            {submitting && <Loader2 className="h-5 w-5 animate-spin" />}
                                            {t('calendar.confirmBooking')}
                                        </button>
                                    </form>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default ScheduleCall;
