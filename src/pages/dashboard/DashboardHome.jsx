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
    Users
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import heroBgMobile from '../../assets/PORTADA_1_MOVIL.webp';
import heroBgDesktop from '../../assets/PORTADA_1.webp';
import dteLogo from '../../assets/LOGODTE.svg';

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
                primaryLink: { label: 'Ver mis proyectos', path: '/dashboard/projects' },
                secondaryLink: { label: 'Ir a mis citas', path: '/dashboard/my-appointments' },
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
            };
        }

        if (role === 'admin') {
            return {
                sectionLabel: 'Panel administrativo',
                title: `Hola, ${profile?.full_name || profile?.name || 'Admin'}`,
                description: 'Este es tu resumen operativo de proyectos, clientes y agenda del equipo.',
                primaryLink: { label: 'Abrir CRM', path: '/dashboard/clients' },
                secondaryLink: { label: 'Abrir bandeja', path: '/dashboard/inbox' },
                cards: [
                    { label: 'Proyectos', value: stats.projectCount, icon: Briefcase, color: 'text-skyblue', bg: 'bg-skyblue/10', path: '/dashboard/projects' },
                    { label: 'Citas Programadas', value: stats.appointmentCount, icon: Calendar, color: 'text-green', bg: 'bg-green/10', path: '/dashboard/appointments' },
                    { label: 'Próximos 7 días', value: stats.upcomingWeekAppointments, icon: BarChart3, color: 'text-amber-500', bg: 'bg-amber-500/10', path: '/dashboard/appointments' },
                    { label: 'Clientes', value: stats.clientCount ?? '-', icon: Users, color: 'text-violet-500', bg: 'bg-violet-500/10', path: '/dashboard/clients' },
                ],
            };
        }

        return {
            sectionLabel: 'Panel operativo',
            title: `Hola, ${profile?.full_name || profile?.name || 'Equipo'}`,
            description: 'Este es tu resumen operativo de proyectos y agenda del equipo.',
            primaryLink: { label: 'Ver proyectos', path: '/dashboard/projects' },
            secondaryLink: { label: 'Abrir bandeja', path: '/dashboard/inbox' },
            cards: [
                { label: 'Proyectos', value: stats.projectCount, icon: Briefcase, color: 'text-skyblue', bg: 'bg-skyblue/10', path: '/dashboard/projects' },
                { label: 'Citas Programadas', value: stats.appointmentCount, icon: Calendar, color: 'text-green', bg: 'bg-green/10', path: '/dashboard/projects' },
                { label: 'Próximos 7 días', value: stats.upcomingWeekAppointments, icon: BarChart3, color: 'text-amber-500', bg: 'bg-amber-500/10', path: '/dashboard/projects' },
            ],
        };
    }, [profile?.full_name, profile?.name, role, stats]);

    if (role === 'client') {
        return <div className="font-product pb-16" />;
    }

    return (
        <div className="space-y-8 font-product pb-16">
            <header className="relative rounded-[10px] md:rounded-[16px] overflow-hidden shadow-[0_20px_60px_-35px_rgba(0,0,0,0.45)]">
                <div className="absolute inset-0" aria-hidden="true">
                    <picture>
                        <source media="(min-width: 768px)" srcSet={heroBgDesktop} />
                        <img src={heroBgMobile} alt="" className="h-full w-full object-cover" />
                    </picture>
                    <div className="absolute inset-0 bg-white/35" />
                </div>

                <div className="relative z-10 px-6 py-10 md:px-10 md:py-14">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex justify-center mb-4"
                    >
                        <img src={dteLogo} alt="Grupo DTE" className="w-[150px] md:w-[220px]" />
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-center gap-2 text-skyblue text-[11px] md:text-sm font-bold uppercase tracking-[0.24em] mb-2"
                    >
                        <Sparkles size={14} />
                        {dashboardContent.sectionLabel}
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl md:text-5xl font-black text-black tracking-tight text-center"
                    >
                        {dashboardContent.title}
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-neutral-700 mt-4 text-base md:text-lg max-w-2xl mx-auto text-center leading-relaxed"
                    >
                        {dashboardContent.description}
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="mt-6 md:mt-8 flex flex-wrap justify-center gap-3"
                    >
                        <Link
                            to={dashboardContent.primaryLink.path}
                            className="inline-flex items-center justify-center px-5 py-2.5 bg-skyblue text-white text-sm md:text-base rounded-full font-semibold hover:bg-skyblue/95 transition"
                        >
                            {dashboardContent.primaryLink.label}
                        </Link>
                        {dashboardContent.secondaryLink && (
                            <Link
                                to={dashboardContent.secondaryLink.path}
                                className="inline-flex items-center justify-center px-5 py-2.5 bg-white text-skyblue text-sm md:text-base rounded-full font-semibold border border-white/80 hover:bg-white/90 transition"
                            >
                                {dashboardContent.secondaryLink.label}
                            </Link>
                        )}
                    </motion.div>
                </div>
            </header>

            <div className={`grid grid-cols-1 ${dashboardContent.cards.length > 3 ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-3'} gap-6`}>
                {dashboardContent.cards.map((stat, i) => (
                    <motion.div
                        key={`${stat.label}-${i}`}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 + (i * 0.1) }}
                    >
                        <Link
                            to={stat.path}
                            className="block group p-8 bg-white/90 backdrop-blur-sm rounded-[32px] border border-white shadow-[0_12px_40px_-30px_rgba(0,0,0,0.45)] hover:shadow-[0_20px_40px_-30px_rgba(0,0,0,0.55)] hover:-translate-y-1 transition-all duration-300"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
                                    <stat.icon size={24} />
                                </div>
                                <ArrowRight className="text-neutral-400 group-hover:text-black group-hover:translate-x-1 transition-all" size={20} />
                            </div>
                            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 mb-1">{stat.label}</div>
                            <div className="text-3xl font-black text-neutral-900">{stat.value}</div>
                        </Link>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default DashboardHome;
