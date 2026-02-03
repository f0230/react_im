import React, { useMemo, useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';
import {
    Zap,
    BarChart3,
    ArrowRight,
    Sparkles,
    Briefcase,
    Calendar,
    Users,
    MessagesSquare
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';

const DashboardHome = () => {
    const { profile, user } = useAuth();
    const role = profile?.role || 'client';
    const [stats, setStats] = useState({
        projectCount: 0,
        appointmentCount: 0,
        upcomingWeekAppointments: 0,
        clientCount: null,
        nextAppointmentAt: null,
    });

    useEffect(() => {
        const run = async () => {
            if (!user?.id) return;

            const getCount = async (queryBuilder) => {
                const { count, error } = await queryBuilder.select('*', { count: 'exact', head: true });
                if (error) return null;
                return count ?? 0;
            };

            if (role === 'client') {
                const [projectCount, appointmentCount, nextAppointment] = await Promise.all([
                    getCount(supabase.from('projects').eq('user_id', user.id)),
                    getCount(supabase.from('appointments').eq('user_id', user.id).eq('status', 'scheduled')),
                    supabase
                        .from('appointments')
                        .select('scheduled_at')
                        .eq('user_id', user.id)
                        .eq('status', 'scheduled')
                        .gte('scheduled_at', new Date().toISOString())
                        .order('scheduled_at', { ascending: true })
                        .limit(1)
                        .maybeSingle(),
                ]);

                setStats({
                    projectCount: projectCount ?? 0,
                    appointmentCount: appointmentCount ?? 0,
                    upcomingWeekAppointments: 0,
                    clientCount: null,
                    nextAppointmentAt: nextAppointment.data?.scheduled_at || null,
                });
                return;
            }

            const weekEnd = new Date();
            weekEnd.setDate(weekEnd.getDate() + 7);

            const [projectCount, appointmentCount, upcomingWeekAppointments, clientCount] = await Promise.all([
                getCount(supabase.from('projects')),
                getCount(supabase.from('appointments').eq('status', 'scheduled')),
                getCount(
                    supabase
                        .from('appointments')
                        .eq('status', 'scheduled')
                        .gte('scheduled_at', new Date().toISOString())
                        .lte('scheduled_at', weekEnd.toISOString())
                ),
                getCount(supabase.from('clients')),
            ]);

            setStats({
                projectCount: projectCount ?? 0,
                appointmentCount: appointmentCount ?? 0,
                upcomingWeekAppointments: upcomingWeekAppointments ?? 0,
                clientCount,
                nextAppointmentAt: null,
            });
        };

        run();
    }, [user?.id, role]);

    const dashboardContent = useMemo(() => {
        if (role === 'client') {
            return {
                sectionLabel: 'Bienvenido de nuevo',
                title: `Hola, ${profile?.full_name || profile?.name || 'Cliente'}`,
                description: `Aquí tienes un resumen de tus proyectos con Grupo DTE.${
                    stats.projectCount > 0
                        ? ` Tienes ${stats.projectCount} proyecto${stats.projectCount !== 1 ? 's' : ''} activo${stats.projectCount !== 1 ? 's' : ''}.`
                        : ''
                }`,
                quickAccessTitle: 'Acceso rápido a tu cuenta',
                quickAccessDescription: 'Gestiona tus proyectos y citas desde aquí.',
                primaryLink: { label: 'Ver mis proyectos', path: '/dashboard/projects' },
                cards: [
                    { label: 'Proyectos', value: stats.projectCount, icon: Briefcase, color: 'text-skyblue', bg: 'bg-skyblue/10', path: '/dashboard/projects' },
                    { label: 'Citas Programadas', value: stats.appointmentCount, icon: Calendar, color: 'text-green', bg: 'bg-green/10', path: '/dashboard/my-appointments' },
                    {
                        label: 'Próxima Cita',
                        value: stats.nextAppointmentAt
                            ? new Date(stats.nextAppointmentAt).toLocaleDateString('es-ES')
                            : 'Sin cita',
                        icon: Zap,
                        color: 'text-amber-500',
                        bg: 'bg-amber-500/10',
                        path: '/dashboard/my-appointments',
                    },
                ],
                quickCards: [
                    {
                        title: '¿Necesitas un nuevo servicio?',
                        body: 'Crea un nuevo proyecto para comenzar a trabajar con nosotros.',
                        action: 'Comenzar un proyecto',
                        path: '/dashboard/projects',
                    },
                    {
                        title: 'Agenda una llamada',
                        body: 'Revisa tus citas o programa una nueva reunión.',
                        action: 'Ir a mis citas',
                        path: '/dashboard/my-appointments',
                    },
                ],
            };
        }

        return {
            sectionLabel: role === 'admin' ? 'Panel administrativo' : 'Panel operativo',
            title: `Hola, ${profile?.full_name || profile?.name || (role === 'admin' ? 'Admin' : 'Equipo')}`,
            description: 'Este es tu resumen operativo de proyectos, clientes y agenda del equipo.',
            quickAccessTitle: role === 'admin' ? 'Gestión del negocio' : 'Gestión del equipo',
            quickAccessDescription: role === 'admin' ? 'Administra clientes, proyectos y citas.' : 'Coordina proyectos y comunicación interna.',
            primaryLink: { label: role === 'admin' ? 'Abrir CRM' : 'Ver proyectos', path: role === 'admin' ? '/dashboard/clients' : '/dashboard/projects' },
            cards: [
                { label: 'Proyectos', value: stats.projectCount, icon: Briefcase, color: 'text-skyblue', bg: 'bg-skyblue/10', path: '/dashboard/projects' },
                { label: 'Citas Programadas', value: stats.appointmentCount, icon: Calendar, color: 'text-green', bg: 'bg-green/10', path: '/dashboard/appointments' },
                { label: 'Próximos 7 días', value: stats.upcomingWeekAppointments, icon: BarChart3, color: 'text-amber-500', bg: 'bg-amber-500/10', path: '/dashboard/appointments' },
                { label: 'Clientes', value: stats.clientCount ?? '-', icon: Users, color: 'text-violet-500', bg: 'bg-violet-500/10', path: '/dashboard/clients' },
            ],
            quickCards: [
                {
                    title: role === 'admin' ? 'Control de clientes' : 'Seguimiento de proyectos',
                    body: role === 'admin' ? 'Consulta y actualiza perfiles de clientes en el CRM.' : 'Revisa el estado de cada proyecto en curso.',
                    action: role === 'admin' ? 'Abrir CRM' : 'Ver proyectos',
                    path: role === 'admin' ? '/dashboard/clients' : '/dashboard/projects',
                },
                {
                    title: 'Comunicación',
                    body: 'Gestiona mensajes del equipo y conversaciones de WhatsApp.',
                    action: 'Abrir bandeja',
                    path: '/dashboard/inbox',
                },
            ],
        };
    }, [profile?.full_name, profile?.name, role, stats]);

    if (role === 'client') {
        return <div className="font-product pb-16" />;
    }

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
                        {dashboardContent.sectionLabel}
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl md:text-6xl font-black text-white tracking-tight"
                    >
                        {dashboardContent.title}
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-neutral-400 mt-6 text-lg max-w-xl leading-relaxed"
                    >
                        {dashboardContent.description}
                    </motion.p>
                </div>
            </header>

            <div className={`grid grid-cols-1 ${dashboardContent.cards.length > 3 ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-3'} gap-8`}>
                {dashboardContent.cards.map((stat, i) => (
                    <motion.div
                        key={`${stat.label}-${i}`}
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
                            <MessagesSquare size={24} className="text-skyblue" />
                            {dashboardContent.quickAccessTitle}
                        </h2>
                        <p className="text-neutral-500 mt-1">{dashboardContent.quickAccessDescription}</p>
                    </div>
                    <Link to={dashboardContent.primaryLink.path} className="px-6 py-3 bg-neutral-50 hover:bg-neutral-100 rounded-full text-sm font-bold transition-all flex items-center gap-2">
                        {dashboardContent.primaryLink.label} <ArrowRight size={16} />
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {dashboardContent.quickCards.map((card) => (
                        <div key={card.title} className="p-6 rounded-[24px] bg-neutral-50/50 border border-neutral-100 hover:bg-white hover:shadow-md transition-all">
                            <h4 className="font-bold text-neutral-800">{card.title}</h4>
                            <p className="text-sm text-neutral-500 mt-2">{card.body}</p>
                            <Link to={card.path} className="inline-flex items-center gap-2 text-skyblue text-sm font-bold mt-4 hover:underline">
                                {card.action} <ArrowRight size={14} />
                            </Link>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
};

export default DashboardHome;
