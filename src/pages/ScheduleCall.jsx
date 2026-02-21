import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import DatePicker from 'react-datepicker';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Check, Loader2, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';
import MultiUseSelect from '@/components/MultiUseSelect';
import useCalAvailability from '@/hooks/useCalAvailability';
import Navbar from '@/components/Navbar';

import "react-datepicker/dist/react-datepicker.css";
import '@/index.css';

const ScheduleCall = () => {
    const { t } = useTranslation();
    const { projectId } = useParams();
    const navigate = useNavigate();
    const { user, client } = useAuth();

    const [selectedDate, setSelectedDate] = useState(new Date());
    const [bookingPhase, setBookingPhase] = useState('slots'); // 'slots', 'form', 'success'
    const [submitting, setSubmitting] = useState(false);

    const [projects, setProjects] = useState([]);
    const [selectedProjectId, setSelectedProjectId] = useState(projectId || '');

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        notes: ''
    });

    const fetchProjectsInternal = useCallback(async () => {
        if (!user?.id) return;
        try {
            const { data, error } = await supabase
                .from('projects')
                .select('id, name')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (!error && data) {
                const formattedProjects = data.map(p => ({
                    id: p.id,
                    name: p.title || p.name || p.project_name || 'Project'
                }));
                setProjects(formattedProjects);
                if (formattedProjects.length === 1 && !selectedProjectId) {
                    setSelectedProjectId(formattedProjects[0].id);
                }
            }
        } catch (err) {
            console.error('Error fetching projects:', err);
        }
    }, [user?.id, selectedProjectId]);

    const {
        slots,
        loadingSlots,
        selectedSlot,
        setSelectedSlot
    } = useCalAvailability({
        selectedDate,
        enabled: Boolean(selectedDate),
        onError: () => toast.error(t('calendar.errorFetchingSlots'))
    });

    useEffect(() => {
        if (client || user) {
            setFormData(prev => ({
                ...prev,
                name: client?.full_name || client?.company_name || user?.user_metadata?.full_name || '',
                email: client?.email || user?.email || '',
                phone: client?.phone || user?.phone || ''
            }));
            fetchProjectsInternal();
        }
    }, [client, user, fetchProjectsInternal]);

    const handleSlotSelect = (slot) => {
        setSelectedSlot(slot);
        setBookingPhase('form');
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const response = await fetch('/api/cal/create-booking', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    start: selectedSlot.start,
                    ...formData,
                    projectId: selectedProjectId || projectId,
                    userId: user?.id,
                    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                })
            });
            if (!response.ok) throw new Error('Booking failed');
            setBookingPhase('success');
            toast.success(t('calendar.bookingSuccess'));
        } catch (error) {
            console.error('Booking error:', error);
            toast.error(t('calendar.bookingError'));
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
                        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#0DD122]/10">
                            <Check className="h-10 w-10 text-[#0DD122]" />
                        </div>
                        <h2 className="mt-6 text-2xl font-bold">{t('calendar.successTitle')}</h2>
                        <p className="mt-2 text-gray-600">{t('calendar.successMessage')}</p>
                        <button
                            onClick={() => navigate('/dashboard')}
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
                    className="mx-auto flex w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-[0_24px_60px_-35px_rgba(0,0,0,0.35)] md:flex-row"
                >
                    <div className="flex flex-col justify-between bg-black px-5 py-6 text-white sm:px-8 sm:py-8 md:w-[34%]">
                        <div>
                            <button
                                onClick={() => navigate(-1)}
                                className="mb-6 w-fit rounded-full p-2 transition-colors hover:bg-white/10 sm:mb-8"
                            >
                                <ArrowLeft size={20} />
                            </button>
                            <h1 className="mb-3 text-3xl font-bold leading-tight sm:text-4xl">
                                {t('calendar.title')}
                            </h1>
                            <p className="mb-6 max-w-sm text-sm leading-relaxed text-gray-400 sm:mb-7 sm:text-base">
                                {t('calendar.description')}
                            </p>
                            <div className="space-y-3 sm:space-y-4">
                                <div className="flex items-center gap-3">
                                    <Clock className="text-[#0DD122]" />
                                    <span>30 min</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0DD122] text-xs font-bold text-black">
                                        D
                                    </div>
                                    <span>Grupo DTE Team</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="px-4 py-5 sm:px-6 sm:py-8 md:w-[66%]">
                        <AnimatePresence mode="wait">
                            {bookingPhase === 'slots' ? (
                                <motion.div
                                    key="slots"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="flex h-full min-h-[420px] flex-col"
                                >
                                    <h2 className="mb-5 text-lg font-bold sm:mb-6 sm:text-xl">
                                        {t('calendar.selectDateTime')}
                                    </h2>
                                    <div className="flex flex-1 flex-col gap-6 xl:flex-row xl:gap-7">
                                        <div className="w-full shrink-0 xl:max-w-[320px]">
                                            <div className="overflow-x-auto rounded-2xl border border-gray-100 p-2 sm:p-3">
                                                <DatePicker
                                                    selected={selectedDate}
                                                    onChange={(date) => setSelectedDate(date)}
                                                    inline
                                                    minDate={new Date()}
                                                    calendarClassName="!border-0 !font-sans"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <div className="custom-scrollbar max-h-[290px] overflow-y-auto pr-1 sm:max-h-[360px] sm:pr-2 xl:max-h-[430px]">
                                                {loadingSlots ? (
                                                    <div className="flex h-full min-h-[150px] items-center justify-center">
                                                        <Loader2 className="animate-spin text-gray-400" />
                                                    </div>
                                                ) : slots.length > 0 ? (
                                                    <div className="grid grid-cols-1 gap-2">
                                                        {slots.map((slot, idx) => (
                                                            <button
                                                                key={idx}
                                                                onClick={() => handleSlotSelect(slot)}
                                                                className="group flex w-full items-center justify-between rounded-xl border border-gray-200 px-4 py-3 text-left text-sm font-medium transition-all hover:border-[#0DD122] hover:bg-[#0DD122]/5 sm:text-base"
                                                            >
                                                                <span>
                                                                    {new Date(slot.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                                <span className="text-[#0DD122] opacity-0 transition-opacity group-hover:opacity-100">
                                                                    {t('calendar.book')}
                                                                </span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="flex min-h-[150px] items-center justify-center text-sm text-gray-400">
                                                        {t('calendar.noSlots')}
                                                    </div>
                                                )}
                                            </div>
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
                                        <p className="text-sm text-gray-500">Selected Time</p>
                                        <p className="mt-1 font-bold">
                                            {selectedDate?.toLocaleDateString()} at {new Date(selectedSlot?.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>

                                    <form onSubmit={handleFormSubmit} className="space-y-4">
                                        {projects.length > 0 && (
                                            <div>
                                                <label className="mb-1 block text-sm font-medium text-gray-700">Select Project</label>
                                                <MultiUseSelect
                                                    options={projects}
                                                    value={selectedProjectId}
                                                    onChange={setSelectedProjectId}
                                                    placeholder="Select a project"
                                                    getOptionValue={(p) => p.id}
                                                    getOptionLabel={(p) => p.name}
                                                    getDisplayLabel={(p) => p.name}
                                                    buttonClassName="h-[50px] rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 focus:ring-2 focus:ring-[#0DD122]"
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
                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-[#0DD122]"
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-sm font-medium text-gray-700">{t('form.email')}</label>
                                            <input
                                                type="email"
                                                required
                                                value={formData.email}
                                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-[#0DD122]"
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-sm font-medium text-gray-700">{t('form.phone')}</label>
                                            <input
                                                type="tel"
                                                value={formData.phone}
                                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-[#0DD122]"
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-sm font-medium text-gray-700">{t('form.notes')}</label>
                                            <textarea
                                                rows="3"
                                                value={formData.notes}
                                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                                className="w-full resize-none rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-[#0DD122]"
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={submitting}
                                            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0DD122] py-4 font-bold text-white transition-colors hover:bg-[#0bc01f] disabled:opacity-70"
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
