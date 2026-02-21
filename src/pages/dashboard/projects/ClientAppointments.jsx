import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Calendar, Link as LinkIcon, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import LoadingFallback from '@/components/ui/LoadingFallback';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

const ClientAppointments = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchAppointments = async () => {
            if (!user?.id) return;

            try {
                const { data, error: dbError } = await supabase
                    .from('appointments')
                    .select('*, projects(name)')
                    .eq('user_id', user.id)
                    .order('scheduled_at', { ascending: true });

                if (dbError) throw dbError;
                setAppointments(data || []);
            } catch (err) {
                console.error('Error fetching appointments:', err);
                setError(err.message);
                toast.error('Error al cargar tus citas');
            } finally {
                setLoading(false);
            }
        };

        fetchAppointments();
    }, [user?.id]);

    const getStatusColor = (status) => {
        switch (status) {
            case 'scheduled': return 'bg-green/10 text-green border-green/20';
            case 'completed': return 'bg-skyblue/10 text-skyblue border-skyblue/20';
            case 'cancelled': return 'bg-red-100 text-red-600 border-red-200';
            default: return 'bg-neutral-100 text-neutral-600 border-neutral-200';
        }
    };

    const containerVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
    };

    return (
        <div className="w-full pb-20 font-product">
            <header className="mb-10">
          
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-4xl font-black text-black mb-2"
                >
                    Tus Citas Programadas
                </motion.h1>
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-neutral-500 text-lg"
                >
                    Aquí puedes ver y gestionar las llamadas que has agendado con nuestro equipo.
                </motion.p>
            </header>

            {loading ? (
                <LoadingFallback type="spinner" />
            ) : error ? (
                <div className="bg-red-50 p-6 rounded-[24px] border border-red-100 flex items-center gap-4 text-red-600">
                    <AlertCircle />
                    <span className="font-bold">{error}</span>
                </div>
            ) : appointments.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white p-16 rounded-[40px] shadow-sm text-center border border-neutral-100"
                >
                    <div className="w-20 h-20 bg-neutral-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Calendar className="text-neutral-300" size={40} />
                    </div>
                    <h3 className="text-2xl font-black text-neutral-900 mb-2">No tienes citas agendadas</h3>
                    <p className="text-neutral-500 mb-8 max-w-md mx-auto">
                        Aún no has programado ninguna llamada. Cuando lo hagas, aparecerán aquí con todos los detalles.
                    </p>
                    <Link
                        to="/schedule-call"
                        className="inline-flex items-center gap-2 px-8 py-4 bg-black text-white rounded-full font-bold hover:scale-105 transition-all shadow-lg"
                    >
                        Agendar mi primera cita <ArrowRight size={18} />
                    </Link>
                </motion.div>
            ) : (
                <div className="grid gap-6">
                    {appointments.map((apt, i) => (
                        <motion.div
                            key={apt.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="group bg-white p-8 rounded-[32px] border border-neutral-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-6"
                        >
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 bg-neutral-50 rounded-2xl flex flex-col items-center justify-center border border-neutral-100 group-hover:border-skyblue/30 transition-colors">
                                    <span className="text-[10px] font-black uppercase text-neutral-400">
                                        {new Date(apt.scheduled_at).toLocaleDateString('es-ES', { month: 'short' })}
                                    </span>
                                    <span className="text-2xl font-black text-black">
                                        {new Date(apt.scheduled_at).getDate()}
                                    </span>
                                </div>
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <h3 className="font-black text-xl text-neutral-900">
                                            {new Date(apt.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </h3>
                                        <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${getStatusColor(apt.status)}`}>
                                            {apt.status === 'scheduled' ? 'Programada' : apt.status}
                                        </span>
                                    </div>
                                    <p className="text-neutral-500 text-sm flex items-center gap-2">
                                        {apt.projects?.title || apt.projects?.name || 'Consulta General'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                {apt.meeting_link && (
                                    <a
                                        href={apt.meeting_link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 bg-black text-white px-6 py-3 rounded-full text-sm font-bold shadow-md hover:scale-105 transition-all"
                                    >
                                        <LinkIcon size={16} />
                                        Unirse a la llamada
                                    </a>
                                )}
                            </div>
                        </motion.div>
                    ))}

                    <div className="mt-8 text-center">
                        <Link
                            to="/schedule-call"
                            className="text-skyblue font-bold hover:underline flex items-center justify-center gap-2"
                        >
                            <Calendar size={18} />
                            Agendar otra cita
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClientAppointments;
