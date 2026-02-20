import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import DatePicker from 'react-datepicker';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, Check, Loader2, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';
import MultiUseSelect from '@/components/MultiUseSelect';
import useCalAvailability from '@/hooks/useCalAvailability';
import dteLogo from '@/assets/LOGODTE.svg';

import "react-datepicker/dist/react-datepicker.css";
import '@/index.css';

const ScheduleCall = () => {
    const { t } = useTranslation();
    const { projectId } = useParams();
    const navigate = useNavigate();
    const { user, client, profile, loading } = useAuth();
    const role = profile?.role;

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
            <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center p-4">
                <motion.div initial="hidden" animate="visible" variants={containerVariants} className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-6">
                    <div className="w-20 h-20 bg-[#0DD122]/10 rounded-full flex items-center justify-center mx-auto">
                        <Check className="w-10 h-10 text-[#0DD122]" />
                    </div>
                    <h2 className="text-2xl font-bold">{t('calendar.successTitle')}</h2>
                    <p className="text-gray-600">{t('calendar.successMessage')}</p>
                    <button onClick={() => navigate('/dashboard')} className="w-full bg-black text-white py-3 rounded-xl font-bold hover:opacity-90 transition-opacity">
                        {t('calendar.goToDashboard')}
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F5F5F5] py-12 px-4 sm:px-6 lg:px-8">
            <motion.div initial="hidden" animate="visible" variants={containerVariants} className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden min-h-[600px] flex flex-col md:flex-row">
                <div className="bg-black text-white p-8 md:w-1/3 flex flex-col justify-between">
                    <div>
                        <button onClick={() => navigate(-1)} className="mb-8 p-2 hover:bg-white/10 rounded-full transition-colors w-fit">
                            <ArrowLeft size={20} />
                        </button>
                        <h1 className="text-3xl font-bold mb-4">{t('calendar.title')}</h1>
                        <p className="text-gray-400 mb-6">{t('calendar.description')}</p>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <Clock className="text-[#0DD122]" />
                                <span>30 min</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-5 h-5 rounded-full bg-[#0DD122] flex items-center justify-center text-black text-xs font-bold">D</div>
                                <span>Grupo DTE Team</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-8 md:w-2/3">
                    <AnimatePresence mode="wait">
                        {bookingPhase === 'slots' ? (
                            <motion.div key="slots" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="h-full flex flex-col">
                                <h2 className="text-xl font-bold mb-6">{t('calendar.selectDateTime')}</h2>
                                <div className="flex flex-col lg:flex-row gap-8 flex-1">
                                    <div className="flex-shrink-0">
                                        <DatePicker selected={selectedDate} onChange={(date) => setSelectedDate(date)} inline minDate={new Date()} calendarClassName="!border-0 !font-sans" />
                                    </div>
                                    <div className="flex-1 min-w-[200px] h-96 overflow-y-auto pr-2 custom-scrollbar">
                                        {loadingSlots ? (
                                            <div className="flex justify-center items-center h-full">
                                                <Loader2 className="animate-spin text-gray-400" />
                                            </div>
                                        ) : slots.length > 0 ? (
                                            <div className="grid grid-cols-1 gap-2">
                                                {slots.map((slot, idx) => (
                                                    <button key={idx} onClick={() => handleSlotSelect(slot)} className="w-full py-3 px-4 rounded-xl border border-gray-200 hover:border-[#0DD122] hover:bg-[#0DD122]/5 transition-all text-left font-medium flex justify-between group">
                                                        <span>{new Date(slot.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                        <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[#0DD122]">{t('calendar.book')}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="h-full flex items-center justify-center text-gray-400 text-sm">{t('calendar.noSlots')}</div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div key="form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                <div className="flex items-center gap-4 mb-6">
                                    <button onClick={() => setBookingPhase('slots')} className="text-sm text-gray-500 hover:text-black hover:underline">{t('calendar.back')}</button>
                                    <h2 className="text-xl font-bold">{t('calendar.enterDetails')}</h2>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-xl mb-6">
                                    <p className="text-sm text-gray-500">Selected Time</p>
                                    <p className="font-bold">{selectedDate?.toLocaleDateString()} at {new Date(selectedSlot?.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                                <form onSubmit={handleFormSubmit} className="space-y-4">
                                    {projects.length > 0 && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Select Project</label>
                                            <MultiUseSelect options={projects} value={selectedProjectId} onChange={setSelectedProjectId} placeholder="Select a project" getOptionValue={(p) => p.id} getOptionLabel={(p) => p.name} getDisplayLabel={(p) => p.name} buttonClassName="px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#0DD122] bg-white text-gray-900 h-[50px]" className="w-full" />
                                        </div>
                                    )}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('form.fullName')}</label>
                                        <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#0DD122] outline-none bg-white" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('form.email')}</label>
                                        <input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#0DD122] outline-none bg-white" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('form.phone')}</label>
                                        <input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#0DD122] outline-none bg-white" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('form.notes')}</label>
                                        <textarea rows="3" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#0DD122] outline-none bg-white resize-none" />
                                    </div>
                                    <button type="submit" disabled={submitting} className="w-full bg-[#0DD122] text-white font-bold py-4 rounded-xl mt-6 hover:bg-[#0bc01f] transition-colors disabled:opacity-70 flex items-center justify-center gap-2">
                                        {submitting && <Loader2 className="animate-spin w-5 h-5" />}
                                        {t('calendar.confirmBooking')}
                                    </button>
                                </form>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
};

export default ScheduleCall;
