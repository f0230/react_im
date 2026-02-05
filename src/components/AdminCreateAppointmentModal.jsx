import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock, Check, Loader2, User, Briefcase, Search } from 'lucide-react';
import { useTranslation } from "react-i18next";
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { supabase } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';
import MultiUseSelect from '@/components/MultiUseSelect';
import useCalAvailability from '@/hooks/useCalAvailability';

const AdminCreateAppointmentModal = ({ isOpen, onClose, onUpdate }) => {
    const { t } = useTranslation();
    const [step, setStep] = useState(1); // 1: Client/Project, 2: Date/Time
    const [loading, setLoading] = useState(false);

    // Data
    const [clients, setClients] = useState([]);
    const [projects, setProjects] = useState([]);
    const [filteredProjects, setFilteredProjects] = useState([]);

    // Selection
    const [selectedClient, setSelectedClient] = useState('');
    const [selectedProject, setSelectedProject] = useState('');
    const [notes, setNotes] = useState('');

    // Time
    const [selectedDate, setSelectedDate] = useState(new Date());
    const {
        slots,
        loadingSlots,
        selectedSlot,
        setSelectedSlot,
        resetAvailability
    } = useCalAvailability({
        selectedDate,
        enabled: step === 2 && Boolean(selectedDate)
    });

    // Load initial data
    useEffect(() => {
        if (isOpen) {
            fetchData();
            // Reset state
            setStep(1);
            setSelectedClient('');
            setSelectedProject('');
            setNotes('');
            setSelectedDate(new Date());
            resetAvailability();
        }
    }, [isOpen, resetAvailability]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: clientsData } = await supabase
                .from('clients')
                .select('id, full_name, email, company_name')
                .order('full_name');

            const { data: projectsData } = await supabase
                .from('projects')
                .select('id, name, client_id')
                .order('created_at', { ascending: false });

            setClients(clientsData || []);
            setProjects(projectsData || []);
        } catch (error) {
            console.error(error);
            toast.error(t("admin.createAppointment.form.errorLoading"));
        } finally {
            setLoading(false);
        }
    };

    // Filter projects when client changes
    useEffect(() => {
        if (selectedClient) {
            const clientProjects = projects.filter(p => p.client_id === selectedClient);
            setFilteredProjects(clientProjects);
        } else {
            setFilteredProjects([]);
        }
        setSelectedProject('');
    }, [selectedClient, projects]);

    const handleCreate = async () => {
        if (!selectedSlot || !selectedClient) return;

        setLoading(true);
        try {
            const client = clients.find(c => c.id === selectedClient);

            const payload = {
                start: selectedSlot.start,
                name: client.full_name || client.company_name,
                email: client.email,
                notes: notes,
                projectId: selectedProject || null,
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                // userId is optional, derived from email in create-booking
            };

            const response = await fetch('/api/cal/create-booking', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error('Failed to create booking');

            toast.success(t("admin.createAppointment.form.success"));
            onUpdate();
            onClose();
        } catch (error) {
            console.error(error);
            toast.error(t("admin.createAppointment.form.error"));
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/30 backdrop-blur-sm"
                    onClick={onClose}
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden relative z-[101] flex flex-col md:flex-row h-[600px] max-h-[90vh]"
                >
                    {/* Sidebar / Steps */}
                    <div className="md:w-1/3 bg-gray-50 border-r border-gray-100 p-6 flex flex-col">
                        <h2 className="text-xl font-bold text-gray-900 mb-6">{t("admin.createAppointment.title")}</h2>

                        <div className="space-y-6">
                            <div className={`flex items-start gap-3 ${step === 1 ? 'text-black' : 'text-gray-400'}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 ${step === 1 ? 'border-black bg-black text-white' : 'border-gray-300'}`}>
                                    1
                                </div>
                                <div>
                                    <h3 className="font-semibold">{t("admin.createAppointment.sidebar.step1.title")}</h3>
                                    <p className="text-xs mt-1">{t("admin.createAppointment.sidebar.step1.description")}</p>
                                </div>
                            </div>

                            <div className={`flex items-start gap-3 ${step === 2 ? 'text-black' : 'text-gray-400'}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 ${step === 2 ? 'border-black bg-black text-white' : 'border-gray-300'}`}>
                                    2
                                </div>
                                <div>
                                    <h3 className="font-semibold">{t("admin.createAppointment.sidebar.step2.title")}</h3>
                                    <p className="text-xs mt-1">{t("admin.createAppointment.sidebar.step2.description")}</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-auto">
                            <p className="text-xs text-gray-400">
                                {t("admin.createAppointment.sidebar.footer")}
                            </p>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-black">
                            <X />
                        </button>

                        {step === 1 && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="space-y-6"
                            >
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">{t("admin.createAppointment.form.clientLabel")}</label>
                                    <div className="relative">
                                        <MultiUseSelect
                                            options={clients}
                                            value={selectedClient}
                                            onChange={(val) => setSelectedClient(val)}
                                            placeholder={t("admin.createAppointment.form.clientPlaceholder")}
                                            getOptionValue={(c) => c.id}
                                            getOptionLabel={(c) => `${c.full_name || c.company_name} (${c.email})`}
                                            getDisplayLabel={(c) => `${c.full_name || c.company_name} (${c.email})`}
                                            buttonClassName="pl-10 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-black h-[50px]"
                                            className="w-full"
                                        />
                                        <User className="absolute left-3 top-3.5 text-gray-400 pointer-events-none z-10" size={18} />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">{t("admin.createAppointment.form.projectLabel")}</label>
                                    <div className="relative">
                                        <MultiUseSelect
                                            options={filteredProjects}
                                            value={selectedProject}
                                            onChange={(val) => setSelectedProject(val)}
                                            placeholder={selectedClient && filteredProjects.length === 0 ? t("admin.createAppointment.form.projectPlaceholderEmpty") : t("admin.createAppointment.form.projectPlaceholderActive")}
                                            disabled={!selectedClient}
                                            getOptionValue={(p) => p.id}
                                            getOptionLabel={(p) => p.name}
                                            getDisplayLabel={(p) => p.name}
                                            buttonClassName="pl-10 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-black h-[50px] disabled:bg-gray-100 disabled:cursor-not-allowed"
                                            className="w-full"
                                        />
                                        <Briefcase className="absolute left-3 top-3.5 text-gray-400 pointer-events-none z-10" size={18} />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">{t("admin.createAppointment.form.notesLabel")}</label>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        rows={3}
                                        className="w-full p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black outline-none resize-none"
                                        placeholder={t("admin.createAppointment.form.notesPlaceholder")}
                                    />
                                </div>

                                <div className="pt-4 flex justify-end">
                                    <button
                                        onClick={() => setStep(2)}
                                        disabled={!selectedClient}
                                        className="bg-black text-white px-6 py-3 rounded-xl font-bold hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        {t("admin.createAppointment.form.next")}
                                        <Check size={18} />
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="h-full flex flex-col"
                            >
                                <div className="flex flex-col lg:flex-row gap-8 flex-1">
                                    <div className="flex-shrink-0 flex justify-center bg-gray-50 rounded-xl p-4 h-fit">
                                        <DatePicker
                                            selected={selectedDate}
                                            onChange={(date) => setSelectedDate(date)}
                                            inline
                                            minDate={new Date()}
                                            calendarClassName="!border-0 !font-sans !bg-transparent !shadow-none"
                                        />
                                    </div>

                                    <div className="flex-1 flex flex-col">
                                        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                            <Clock size={16} />
                                            {t("admin.createAppointment.form.slotsTitle")}
                                        </h3>

                                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2 max-h-[350px]">
                                            {loadingSlots ? (
                                                <div className="flex items-center justify-center h-40">
                                                    <Loader2 className="animate-spin text-gray-300" />
                                                </div>
                                            ) : slots.length > 0 ? (
                                                slots.map((slot, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => setSelectedSlot(slot)}
                                                        className={`w-full p-3 rounded-lg border text-left transition-all flex justify-between items-center ${selectedSlot?.start === slot.start
                                                            ? 'border-black bg-black text-white shadow-md'
                                                            : 'border-gray-100 hover:border-gray-300 hover:bg-gray-50'
                                                            }`}
                                                    >
                                                        <span className="font-medium text-sm">
                                                            {new Date(slot.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                        {selectedSlot?.start === slot.start && <Check size={14} />}
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="text-center text-gray-400 text-sm py-10">
                                                    {t("admin.createAppointment.form.noSlots")}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-gray-100 flex justify-between items-center mt-auto">
                                    <button
                                        onClick={() => setStep(1)}
                                        className="text-gray-500 hover:text-black font-medium text-sm"
                                    >
                                        {t("admin.createAppointment.form.back")}
                                    </button>
                                    <button
                                        onClick={handleCreate}
                                        disabled={!selectedSlot || loading}
                                        className="bg-[#0DD122] text-white px-6 py-3 rounded-xl font-bold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        {loading && <Loader2 className="animate-spin" size={18} />}
                                        {t("admin.createAppointment.form.confirm")}
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default AdminCreateAppointmentModal;
