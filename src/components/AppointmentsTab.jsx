import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Clock, Video } from 'lucide-react';

const AppointmentsTab = () => {
    const { user } = useAuth();
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchAppointments();
        }
    }, [user]);

    const fetchAppointments = async () => {
        try {
            const { data, error } = await supabase
                .from('appointments')
                .select('*')
                .eq('user_id', user.id)
                .order('start_time', { ascending: true });

            if (error) throw error;
            setAppointments(data || []);
        } catch (error) {
            console.error('Error fetching appointments:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="text-white p-4">Cargando citas...</div>;

    return (
        <div className="p-6 md:p-8 font-product text-white">
            <h2 className="text-3xl font-bold mb-6">Mis Citas</h2>

            {appointments.length === 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center text-gray-400">
                    <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No tienes citas programadas.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {appointments.map((apt) => (
                        <div key={apt.id} className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between hover:bg-white/10 transition-colors">
                            <div className="flex gap-4 items-center">
                                <div className="bg-blue-500/20 p-3 rounded-full text-blue-400">
                                    <Calendar size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold mb-1">{apt.summary}</h3>
                                    <div className="flex items-center gap-4 text-sm text-gray-300">
                                        <div className="flex items-center gap-1.5">
                                            <Calendar size={14} />
                                            {format(new Date(apt.start_time), "d 'de' MMMM, yyyy", { locale: es })}
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Clock size={14} />
                                            {format(new Date(apt.start_time), "HH:mm", { locale: es })}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 w-full md:w-auto">
                                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${apt.status === 'confirmed' || apt.status === 'scheduled'
                                        ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                        : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                                    }`}>
                                    {apt.status === 'scheduled' ? 'Confirmada' : apt.status}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AppointmentsTab;
