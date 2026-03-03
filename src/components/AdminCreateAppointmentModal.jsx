import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Check, Loader2, User, Briefcase } from 'lucide-react';
import { useTranslation } from "react-i18next";
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { supabase } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';
import MultiUseSelect from '@/components/MultiUseSelect';
import useCalAvailability from '@/hooks/useCalAvailability';

const PARTICIPANT_TYPE = {
    CLIENT: 'client',
    PROFILE: 'profile',
};

const APPOINTMENT_AUDIENCE = {
    CLIENT: 'client',
    TEAM: 'team',
};

const parseParticipantValue = (value) => {
    if (!value) return { type: null, id: null };
    const [type, id] = String(value).split(':');
    return { type: type || null, id: id || null };
};

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());

const AdminCreateAppointmentModal = ({ isOpen, onClose, onUpdate }) => {
    const { t } = useTranslation();
    const [step, setStep] = useState(1); // 1: Participant/Project, 2: Date/Time
    const [loading, setLoading] = useState(false);

    // Data
    const [clients, setClients] = useState([]);
    const [teamMembers, setTeamMembers] = useState([]);
    const [projects, setProjects] = useState([]);
    const [filteredProjects, setFilteredProjects] = useState([]);

    // Selection
    const [appointmentAudience, setAppointmentAudience] = useState(APPOINTMENT_AUDIENCE.CLIENT);
    const [selectedParticipant, setSelectedParticipant] = useState('');
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
            setAppointmentAudience(APPOINTMENT_AUDIENCE.CLIENT);
            setSelectedParticipant('');
            setSelectedProject('');
            setNotes('');
            setSelectedDate(new Date());
            resetAvailability();
        }
    }, [isOpen, resetAvailability]);

    const roleLabel = (role) => {
        if (role === 'admin') return 'Admin';
        if (role === 'worker') return 'Worker';
        return 'Cliente';
    };

    const participants = useMemo(() => {
        const teamEmailSet = new Set(
            teamMembers
                .map((member) => (member.email || '').trim().toLowerCase())
                .filter(Boolean)
        );
        const teamIdSet = new Set(teamMembers.map((member) => member.id).filter(Boolean));

        const clientOptions = clients
            .filter((client) => {
                const clientEmail = (client.email || '').trim().toLowerCase();
                if (client.user_id && teamIdSet.has(client.user_id)) return false;
                if (clientEmail && teamEmailSet.has(clientEmail)) return false;
                return true;
            })
            .map((client) => ({
                value: `${PARTICIPANT_TYPE.CLIENT}:${client.id}`,
                id: client.id,
                type: PARTICIPANT_TYPE.CLIENT,
                role: 'client',
                name: client.full_name || client.company_name || 'Cliente',
                email: client.email || '',
                phone: client.phone || '',
                user_id: client.user_id || null,
                client_id: client.id,
            }));

        const profileOptions = teamMembers.map((member) => ({
            value: `${PARTICIPANT_TYPE.PROFILE}:${member.id}`,
            id: member.id,
            type: PARTICIPANT_TYPE.PROFILE,
            role: member.role,
            name: member.full_name || member.email || 'Sin nombre',
            email: isValidEmail(member.email) ? member.email : '',
            phone: '',
            user_id: member.id,
            client_id: member.client_id || null,
        }));

        const allParticipants = [...clientOptions, ...profileOptions].sort((a, b) => a.name.localeCompare(b.name));
        if (appointmentAudience === APPOINTMENT_AUDIENCE.CLIENT) {
            return allParticipants.filter((participant) => participant.type === PARTICIPANT_TYPE.CLIENT);
        }
        return allParticipants.filter((participant) => participant.type === PARTICIPANT_TYPE.PROFILE);
    }, [appointmentAudience, clients, teamMembers]);

    const selectedParticipantData = useMemo(() => {
        if (!selectedParticipant) return null;
        return participants.find((participant) => participant.value === selectedParticipant) || null;
    }, [participants, selectedParticipant]);

    useEffect(() => {
        if (!selectedParticipant) return;
        const existsInAudience = participants.some((participant) => participant.value === selectedParticipant);
        if (!existsInAudience) {
            setSelectedParticipant('');
            setSelectedProject('');
        }
    }, [participants, selectedParticipant]);

    const selectedParticipantType = selectedParticipantData?.type || null;

    const fetchData = async () => {
        setLoading(true);
        try {
            const [clientsResult, projectsResult, membersResult] = await Promise.all([
                supabase
                    .from('clients')
                    .select('id, full_name, email, company_name, phone, user_id')
                    .order('full_name'),
                supabase
                    .from('projects')
                    .select('id, name, client_id, project_clients(client_id)')
                    .order('created_at', { ascending: false }),
                supabase
                    .from('profiles')
                    .select('id, full_name, email, role, client_id')
                    .in('role', ['admin', 'worker'])
                    .order('full_name'),
            ]);

            if (clientsResult.error) throw clientsResult.error;
            if (projectsResult.error) throw projectsResult.error;
            if (membersResult.error) throw membersResult.error;

            setClients(clientsResult.data || []);
            setProjects(projectsResult.data || []);
            setTeamMembers(membersResult.data || []);
        } catch (error) {
            console.error(error);
            toast.error(t("admin.createAppointment.form.errorLoading"));
        } finally {
            setLoading(false);
        }
    };

    // Filter projects when participant changes
    useEffect(() => {
        if (!selectedParticipantData) {
            setFilteredProjects([]);
            setSelectedProject('');
            return;
        }

        const { type, id } = parseParticipantValue(selectedParticipant);

        if (type === PARTICIPANT_TYPE.CLIENT && id) {
            const clientProjects = projects.filter((project) => {
                if (project.client_id === id) return true;
                return (project.project_clients || []).some((projectClient) => projectClient.client_id === id);
            });
            setFilteredProjects(clientProjects);
        } else {
            setFilteredProjects(projects);
        }

        setSelectedProject('');
    }, [projects, selectedParticipant, selectedParticipantData]);

    const handleCreate = async () => {
        if (!selectedSlot || !selectedParticipantData) return;

        setLoading(true);
        try {
            const canResolveTeamEmailServerSide = (
                selectedParticipantData.type === PARTICIPANT_TYPE.PROFILE
                && Boolean(selectedParticipantData.user_id)
            );

            if (!selectedParticipantData.email && !canResolveTeamEmailServerSide) {
                toast.error(t("admin.createAppointment.form.errorMissingEmail"));
                return;
            }

            const payload = {
                start: selectedSlot.start,
                name: selectedParticipantData.name,
                email: selectedParticipantData.email || null,
                notes: notes,
                projectId: selectedProject || null,
                userId: selectedParticipantData.user_id || null,
                clientId: selectedParticipantData.type === PARTICIPANT_TYPE.CLIENT ? selectedParticipantData.client_id : null,
                participantType: selectedParticipantData.type,
                participantRole: selectedParticipantData.role,
                participantId: selectedParticipantData.id,
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            };
            if (selectedParticipantData.phone) {
                payload.phone = selectedParticipantData.phone;
            }

            const response = await fetch('/api/cal/create-booking', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorPayload = await response.json().catch(() => ({}));
                const detailedError = errorPayload?.details?.error?.message || errorPayload?.details?.message;
                throw new Error(detailedError || errorPayload?.error || 'Failed to create booking');
            }

            toast.success(t("admin.createAppointment.form.success"));
            onUpdate();
            onClose();
        } catch (error) {
            console.error(error);
            toast.error(error?.message || t("admin.createAppointment.form.error"));
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
                                    <label className="block text-sm font-medium text-gray-700 mb-2">{t("admin.createAppointment.form.audienceLabel") || 'Tipo de cita'}</label>
                                    <div className="inline-flex bg-gray-100 p-1 rounded-xl gap-1">
                                        <button
                                            type="button"
                                            onClick={() => setAppointmentAudience(APPOINTMENT_AUDIENCE.CLIENT)}
                                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${appointmentAudience === APPOINTMENT_AUDIENCE.CLIENT
                                                ? 'bg-white text-black shadow-sm'
                                                : 'text-gray-500 hover:text-black'
                                                }`}
                                        >
                                            {t("admin.createAppointment.form.audienceClient") || 'Clientes'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setAppointmentAudience(APPOINTMENT_AUDIENCE.TEAM)}
                                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${appointmentAudience === APPOINTMENT_AUDIENCE.TEAM
                                                ? 'bg-white text-black shadow-sm'
                                                : 'text-gray-500 hover:text-black'
                                                }`}
                                        >
                                            {t("admin.createAppointment.form.audienceTeam") || 'Equipo'}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">{t("admin.createAppointment.form.participantLabel")}</label>
                                    <div className="relative">
                                        <MultiUseSelect
                                            variant="modal"
                                            modalScope="anchor"
                                            options={participants}
                                            value={selectedParticipant}
                                            onChange={(val) => setSelectedParticipant(val)}
                                            placeholder={appointmentAudience === APPOINTMENT_AUDIENCE.CLIENT
                                                ? (t("admin.createAppointment.form.participantPlaceholderClient") || t("admin.createAppointment.form.participantPlaceholder"))
                                                : (t("admin.createAppointment.form.participantPlaceholderTeam") || t("admin.createAppointment.form.participantPlaceholder"))
                                            }
                                            getOptionValue={(participant) => participant.value}
                                            getOptionLabel={(participant) => `${participant.name} (${participant.email || 'sin correo'}) - ${roleLabel(participant.role)}`}
                                            getDisplayLabel={(participant) => `${participant.name} (${participant.email || 'sin correo'}) - ${roleLabel(participant.role)}`}
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
                                            variant="modal"
                                            modalScope="anchor"
                                            options={filteredProjects}
                                            value={selectedProject}
                                            onChange={(val) => setSelectedProject(val)}
                                            placeholder={selectedParticipantType === PARTICIPANT_TYPE.CLIENT && filteredProjects.length === 0 ? t("admin.createAppointment.form.projectPlaceholderEmpty") : t("admin.createAppointment.form.projectPlaceholderActive")}
                                            disabled={!selectedParticipantData}
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
                                        disabled={!selectedParticipantData}
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
