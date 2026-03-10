import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar as CalendarIcon, List, Link as LinkIcon, AlertCircle, Plus } from 'lucide-react';
import { fetchCalBookings } from '@/lib/calBookings';
import toast from 'react-hot-toast';
import AdminCalendar from '@/components/AdminCalendar';
import AppointmentActionModal from '@/components/AppointmentActionModal';
import AdminCreateAppointmentModal from '@/components/AdminCreateAppointmentModal';
import LoadingFallback from '@/components/ui/LoadingFallback';

const AdminAppointments = () => {
    const { t } = useTranslation();
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [viewMode, setViewMode] = useState('list'); // 'list' | 'calendar'
    const [listTypeFilter, setListTypeFilter] = useState('all'); // 'all' | 'client' | 'team'
    const [selectedAppointment, setSelectedAppointment] = useState(null);
    const [modalPosition, setModalPosition] = useState(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const normalizeStatus = (status) => {
        const value = String(status || '').trim().toLowerCase();
        if (value === 'canceled') return 'cancelled';
        return value;
    };

    const isUpcomingActiveAppointment = (apt) => {
        if (!apt?.scheduled_at) return false;
        const aptDate = new Date(apt.scheduled_at);
        if (Number.isNaN(aptDate.getTime())) return false;
        if (aptDate <= new Date()) return false;
        return normalizeStatus(apt.status) !== 'cancelled';
    };

    const getAppointmentType = (apt) => {
        const metadata = apt?.cal_metadata?.metadata || {};
        const participantType = metadata.participantType;
        const participantRole = metadata.participantRole;

        if (participantType === 'client' || participantRole === 'client' || apt?.client_id) {
            return 'client';
        }
        return 'team';
    };

    const formatTrackingLabel = (value, uppercase = false) => {
        const text = String(value || '').trim().replace(/[_-]+/g, ' ');
        if (!text) return '';
        return uppercase ? text.toUpperCase() : text;
    };

    const getTrackingSummary = (apt) => {
        const tracking = apt?.cal_metadata?.metadata?.tracking || {};
        const main = [];

        if (tracking.bot) {
            main.push(formatTrackingLabel(tracking.bot, true));
        }

        if (tracking.source && tracking.source !== tracking.bot) {
            main.push(formatTrackingLabel(tracking.source));
        } else if (!tracking.bot && tracking.source) {
            main.push(formatTrackingLabel(tracking.source));
        }

        if (!main.length && tracking.entryPoint) {
            main.push(formatTrackingLabel(tracking.entryPoint));
        }

        if (!main.length) return null;

        const secondary = [
            formatTrackingLabel(tracking.medium),
            formatTrackingLabel(tracking.campaign),
            tracking.waId ? `WA ${tracking.waId}` : null,
        ].filter(Boolean).join(' · ');

        return {
            main: main.join(' / '),
            secondary,
        };
    };

    const upcomingAppointments = useMemo(() => (
        appointments.filter((apt) => isUpcomingActiveAppointment(apt))
    ), [appointments]);

    const listAppointments = useMemo(() => {
        if (listTypeFilter === 'all') return upcomingAppointments;
        return upcomingAppointments.filter((apt) => getAppointmentType(apt) === listTypeFilter);
    }, [upcomingAppointments, listTypeFilter]);

    const handleAppointmentClick = (apt, e) => {
        // Capture click coordinates
        // If it's a synthesis event from Table, use clientX/Y
        // If it's from BigCalendar, 'e' is the event or synthetic event
        const x = e?.clientX || e?.nativeEvent?.clientX || window.innerWidth / 2;
        const y = e?.clientY || e?.nativeEvent?.clientY || window.innerHeight / 2;

        setModalPosition({ x, y });
        setSelectedAppointment(apt);
    };

    const fetchAppointments = async () => {
        setLoading(true);
        try {
            const bookings = await fetchCalBookings();
            setAppointments(bookings);
        } catch (err) {
            console.error('Error fetching appointments:', err);
            setError(err.message);
            toast.error('Error al cargar las citas');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAppointments();

        const intervalId = window.setInterval(() => {
            fetchAppointments();
        }, 30000);

        return () => {
            window.clearInterval(intervalId);
        };
    }, []);

    const getStatusColor = (status) => {
        switch (normalizeStatus(status)) {
            case 'scheduled': return 'bg-green-100 text-green-800 border-green-200';
            case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getStatusLabel = (status) => {
        const normalizedStatus = normalizeStatus(status);
        return t(`admin.appointments.status.${normalizedStatus}`) || normalizedStatus;
    };

    return (
        <div className="w-full pb-20">
            <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-product text-black mb-2">
                        {t('admin.appointments.title') || 'Scheduled Appointments'}
                    </h1>
                    <p className="text-gray-500">
                        {t('admin.appointments.subtitle') || 'Manage and view all team and client bookings.'}
                    </p>
                </div>

                <div className="w-full md:w-auto">
                    <div className="overflow-x-auto md:overflow-visible pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                        <div className="flex items-center gap-3 flex-nowrap min-w-max pr-1">
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="px-4 py-2 bg-black text-white rounded-xl text-sm font-bold shadow-lg shadow-black/20 hover:scale-105 transition-transform flex items-center gap-2"
                            >
                                <Plus size={18} />
                                {t("admin.appointments.newAppointment")}
                            </button>

                            {/* View Toggler */}
                            <div className="bg-gray-100 p-1 rounded-xl flex items-center w-fit">
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${viewMode === 'list'
                                        ? 'bg-white text-black shadow-sm'
                                        : 'text-gray-500 hover:text-black'
                                        }`}
                                >
                                    <List size={16} />
                                    {t("admin.appointments.viewList")}
                                </button>
                                <button
                                    onClick={() => setViewMode('calendar')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${viewMode === 'calendar'
                                        ? 'bg-white text-black shadow-sm'
                                        : 'text-gray-500 hover:text-black'
                                        }`}
                                >
                                    <CalendarIcon size={16} />
                                    {t("admin.appointments.viewCalendar")}
                                </button>
                            </div>

                            {viewMode === 'list' && (
                                <div className="bg-gray-100 p-1 rounded-xl flex items-center w-fit">
                                    <button
                                        onClick={() => setListTypeFilter('all')}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${listTypeFilter === 'all'
                                            ? 'bg-white text-black shadow-sm'
                                            : 'text-gray-500 hover:text-black'
                                            }`}
                                    >
                                        {t("admin.appointments.filters.all") || 'Todas'}
                                    </button>
                                    <button
                                        onClick={() => setListTypeFilter('client')}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${listTypeFilter === 'client'
                                            ? 'bg-white text-black shadow-sm'
                                            : 'text-gray-500 hover:text-black'
                                            }`}
                                    >
                                        {t("admin.appointments.filters.clients") || 'Clientes'}
                                    </button>
                                    <button
                                        onClick={() => setListTypeFilter('team')}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${listTypeFilter === 'team'
                                            ? 'bg-white text-black shadow-sm'
                                            : 'text-gray-500 hover:text-black'
                                            }`}
                                    >
                                        {t("admin.appointments.filters.team") || 'Equipo'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {loading ? (
                <LoadingFallback type="spinner" />
            ) : error ? (
                <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex items-center gap-3 text-red-600">
                    <AlertCircle />
                    <span>{error}</span>
                </div>
            ) : appointments.length === 0 ? (
                <div className="bg-white p-12 rounded-3xl shadow-sm text-center border border-gray-100">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CalendarIcon className="text-gray-400" size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                        {t('admin.appointments.noAppointments') || 'No appointments found'}
                    </h3>
                    <p className="text-gray-500">
                        {t('admin.appointments.emptyDescription') || 'When meetings are scheduled, they will appear here.'}
                    </p>
                </div>
            ) : (
                <AnimatePresence mode="wait">
                    {viewMode === 'list' ? (
                        <motion.div
                            key="list"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden"
                        >
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-gray-100 bg-gray-50/50">
                                            <th className="p-5 font-semibold text-gray-600 text-sm">{t("admin.appointments.table.dateTime")}</th>
                                            <th className="p-5 font-semibold text-gray-600 text-sm">{t("admin.appointments.table.type") || 'Tipo'}</th>
                                            <th className="p-5 font-semibold text-gray-600 text-sm">{t("admin.appointments.table.participant")}</th>
                                            <th className="p-5 font-semibold text-gray-600 text-sm">{t("admin.appointments.table.project")}</th>
                                            <th className="p-5 font-semibold text-gray-600 text-sm">Origen</th>
                                            <th className="p-5 font-semibold text-gray-600 text-sm">{t("admin.appointments.table.status")}</th>
                                            <th className="p-5 font-semibold text-gray-600 text-sm">{t("admin.appointments.table.actions")}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {listAppointments.map((apt) => {
                                            const trackingSummary = getTrackingSummary(apt);

                                            return (
                                                <tr
                                                    key={apt.id}
                                                    onClick={(e) => handleAppointmentClick(apt, e)}
                                                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors last:border-0 cursor-pointer"
                                                >
                                                    <td className="p-5">
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-gray-900">
                                                                {new Date(apt.scheduled_at).toLocaleDateString()}
                                                            </span>
                                                            <span className="text-sm text-gray-500">
                                                                {new Date(apt.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="p-5">
                                                        {getAppointmentType(apt) === 'client' ? (
                                                            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                                                                {t("admin.appointments.type.client") || 'Cliente'}
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs font-bold text-violet-700 bg-violet-50 px-3 py-1 rounded-full border border-violet-100">
                                                                {t("admin.appointments.type.team") || 'Equipo'}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="p-5">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-[#E8E8E8] flex items-center justify-center text-xs font-bold">
                                                                {(apt.client_name || apt.client_email || '?').charAt(0)}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="font-medium text-gray-900">{apt.client_name || '-'}</span>
                                                                <span className="text-xs text-gray-500">{apt.client_email || '-'}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-5">
                                                        {apt.projects ? (
                                                            <span className="text-sm font-medium text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                                                                {apt.projects.name || 'Project'}
                                                            </span>
                                                        ) : (
                                                            <span className="text-sm text-gray-400">-</span>
                                                        )}
                                                    </td>
                                                    <td className="p-5">
                                                        {trackingSummary ? (
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-medium text-gray-900">{trackingSummary.main}</span>
                                                                {trackingSummary.secondary && (
                                                                    <span className="text-xs text-gray-500">{trackingSummary.secondary}</span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-sm text-gray-400">-</span>
                                                        )}
                                                    </td>
                                                    <td className="p-5">
                                                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(apt.status)} capitalize`}>
                                                            {getStatusLabel(apt.status)}
                                                        </span>
                                                    </td>
                                                    <td className="p-5">
                                                        {apt.meeting_link && (
                                                            <a
                                                                href={apt.meeting_link}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-black hover:underline"
                                                            >
                                                                <LinkIcon size={14} />
                                                                {t("admin.appointments.table.join")}
                                                            </a>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                                {listAppointments.length === 0 && (
                                    <div className="p-8 text-center text-sm text-gray-500">
                                        {t("admin.appointments.emptyFiltered") || 'No hay citas próximas para este filtro.'}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ) : (
                        <AdminCalendar
                            key="calendar"
                            appointments={upcomingAppointments}
                            onSelectAppointment={(apt, e) => handleAppointmentClick(apt, e)}
                        />
                    )}
                </AnimatePresence>
            )}

            {/* Action Popup */}
            <AppointmentActionModal
                isOpen={!!selectedAppointment}
                appointment={selectedAppointment}
                position={modalPosition}
                onClose={() => setSelectedAppointment(null)}
                onUpdate={() => fetchAppointments()}
            />

            {/* Create Modal */}
            <AdminCreateAppointmentModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onUpdate={() => fetchAppointments()}
            />
        </div>
    );
};

export default AdminAppointments;
