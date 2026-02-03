import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';
import {
    Zap,
    FileText,
    BarChart3,
    ArrowRight,
    Sparkles,
    Briefcase
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';

const DashboardHome = () => {
    const { profile, user } = useAuth();
    const [projectCount, setProjectCount] = useState(0);

    useEffect(() => {
        const fetchStats = async () => {
            if (user?.id) {
                const { count } = await supabase
                    .from('projects')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', user.id);
                setProjectCount(count || 0);
            }
        };
        fetchStats();
    }, [user?.id]);

    const stats = [
        { label: 'Servicios Activos', value: '2', icon: Zap, color: 'text-skyblue', bg: 'bg-skyblue/10', path: '/dashboard/services' },
        { label: 'Facturas Pendientes', value: '1', icon: FileText, color: 'text-amber-500', bg: 'bg-amber-500/10', path: '/dashboard/invoices' },
        { label: 'Reportes Nuevos', value: '3', icon: BarChart3, color: 'text-green', bg: 'bg-green/10', path: '/dashboard/reports' },
    ];

    return (
        <div className="space-y-10 font-product pb-16">
            <header className="relative py-12 px-10 bg-black rounded-[40px] overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-skyblue/20 rounded-full blur-[100px]" />
                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-60 h-60 bg-purple-500/10 rounded-full blur-[80px]" />

                <div className="relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2 text-skyblue text-sm font-bold uppercase tracking-[0.3em] mb-4"
                    >
                        <Sparkles size={16} />
                        Bienvenido de nuevo
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl md:text-6xl font-black text-white tracking-tight"
                    >
                        Hola, {profile?.full_name || profile?.name || 'Cliente'}
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-neutral-400 mt-6 text-lg max-w-xl leading-relaxed"
                    >
                        Aquí tienes un resumen del estado de tus proyectos y servicios con Grupo DTE.
                        {projectCount > 0 ? ` Tienes ${projectCount} proyecto${projectCount !== 1 ? 's' : ''} activo${projectCount !== 1 ? 's' : ''}.` : ''}
                    </motion.p>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {stats.map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 + (i * 0.1) }}
                    >
                        <Link
                            to={stat.path}
                            className="block group p-8 bg-white rounded-[32px] border border-neutral-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
                                    <stat.icon size={24} />
                                </div>
                                <ArrowRight className="text-neutral-300 group-hover:text-black group-hover:translate-x-1 transition-all" size={20} />
                            </div>
                            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 mb-1">{stat.label}</div>
                            <div className="text-3xl font-black text-neutral-900">{stat.value}</div>
                        </Link>
                    </motion.div>
                ))}
            </div>

            <section className="bg-white rounded-[40px] p-10 border border-neutral-100 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                    <div>
                        <h2 className="text-2xl font-bold flex items-center gap-3">
                            <Briefcase size={24} className="text-skyblue" />
                            Acceso Rápido a Proyectos
                        </h2>
                        <p className="text-neutral-500 mt-1">Gestiona tus proyectos específicos desde aquí.</p>
                    </div>
                    <Link to="/dashboard/projects" className="px-6 py-3 bg-neutral-50 hover:bg-neutral-100 rounded-full text-sm font-bold transition-all flex items-center gap-2">
                        Ver todos <ArrowRight size={16} />
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-6 rounded-[24px] bg-neutral-50/50 border border-neutral-100 hover:bg-white hover:shadow-md transition-all">
                        <h4 className="font-bold text-neutral-800">¿Necesitas un nuevo servicio?</h4>
                        <p className="text-sm text-neutral-500 mt-2">Crea un nuevo proyecto para comenzar a trabajar con nosotros.</p>
                        <Link to="/dashboard/projects" className="inline-flex items-center gap-2 text-skyblue text-sm font-bold mt-4 hover:underline">
                            Comenzar un proyecto <ArrowRight size={14} />
                        </Link>
                    </div>
                    <div className="p-6 rounded-[24px] bg-neutral-50/50 border border-neutral-100 hover:bg-white hover:shadow-md transition-all">
                        <h4 className="font-bold text-neutral-800">Centro de Ayuda</h4>
                        <p className="text-sm text-neutral-500 mt-2">Accede a tutoriales y guías para maximizar tu experiencia.</p>
                        <button className="inline-flex items-center gap-2 text-skyblue text-sm font-bold mt-4 hover:underline">
                            Ir al centro de ayuda <ArrowRight size={14} />
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default DashboardHome;
