import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Calendar, User, Link as LinkIcon, AlertCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminAppointments = () => {
    const { t } = useTranslation();
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchAppointments = async () => {
            try {
                const response = await fetch('/api/cal/bookings');
                if (!response.ok) throw new Error('Failed to fetch bookings');
                const result = await response.json();

                // Assuming result.data is the array
                setAppointments(result.data || []);
            } catch (err) {
                console.error('Error fetching appointments:', err);
                setError(err.message);
                toast.error(t('calendar.errorFetchingSlots') || 'Error fetching appointments');
            } finally {
                setLoading(false);
            }
        };

        fetchAppointments();
    }, [t]);

    const getStatusColor = (status) => {
        switch (status) {
            case 'scheduled': return 'bg-green-100 text-green-800 border-green-200';
            case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const containerVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
    };

    return (
        <div className="w-full pb-20">
            <header className="mb-8">
                <h1 className="text-3xl font-bold font-product text-black mb-2">
                    {t('admin.appointments.title') || 'Scheduled Appointments'}
                </h1>
                <p className="text-gray-500">
                    {t('admin.appointments.subtitle') || 'Manage and view all client bookings.'}
                </p>
            </header>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="animate-spin text-black w-8 h-8" />
                </div>
            ) : error ? (
                <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex items-center gap-3 text-red-600">
                    <AlertCircle />
                    <span>{error}</span>
                </div>
            ) : appointments.length === 0 ? (
                <div className="bg-white p-12 rounded-3xl shadow-sm text-center border border-gray-100">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Calendar className="text-gray-400" size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                        {t('admin.appointments.noAppointments') || 'No appointments found'}
                    </h3>
                    <p className="text-gray-500">
                        {t('admin.appointments.emptyDescription') || 'When clients schedule a call, they will appear here.'}
                    </p>
                </div>
            ) : (
                <div className="grid gap-4">
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-gray-50/50">
                                        <th className="p-5 font-semibold text-gray-600 text-sm">Date & Time</th>
                                        <th className="p-5 font-semibold text-gray-600 text-sm">Client</th>
                                        <th className="p-5 font-semibold text-gray-600 text-sm">Project</th>
                                        <th className="p-5 font-semibold text-gray-600 text-sm">Status</th>
                                        <th className="p-5 font-semibold text-gray-600 text-sm">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {appointments.map((apt) => (
                                        <tr key={apt.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors last:border-0">
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
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-[#E8E8E8] flex items-center justify-center text-xs font-bold">
                                                        {(apt.client_name || '?').charAt(0)}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-gray-900">{apt.client_name}</span>
                                                        <span className="text-xs text-gray-500">{apt.client_email}</span>
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
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(apt.status)} capitalize`}>
                                                    {apt.status}
                                                </span>
                                            </td>
                                            <td className="p-5">
                                                {apt.meeting_link && (
                                                    <a
                                                        href={apt.meeting_link}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-black hover:underline"
                                                    >
                                                        <LinkIcon size={14} />
                                                        Join
                                                    </a>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminAppointments;
