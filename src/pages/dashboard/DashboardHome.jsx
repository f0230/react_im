import React, { useMemo, useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
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
import { useTranslation } from "react-i18next";
import heroBgMobile from '../../assets/PORTADA_1_MOVIL.webp';
import heroBgDesktop from '../../assets/PORTADA_1.webp';
import dteLogo from '../../assets/LOGODTE.svg';

const DashboardHome = () => {
    const { t } = useTranslation();
    const { profile, user } = useAuth();
    const navigate = useNavigate();
    const role = profile?.role || 'client';
    const [stats, setStats] = useState({
        nextAppointmentAt: null,
    });

    useEffect(() => {
        const run = async () => {
            if (!user?.id) return;

            const getCount = async (countQuery) => {
                const { count, error } = await countQuery;
                if (error) return null;
                return count ?? 0;
            };
            const nowIso = new Date().toISOString();
            const weekEnd = new Date();
            weekEnd.setDate(weekEnd.getDate() + 7);
            const weekEndIso = weekEnd.toISOString();

            if (role === 'client') {
                const [projectCount, appointmentCount, nextAppointment] = await Promise.all([
                    getCount(
                        supabase
                            .from('projects')
                            .select('id', { count: 'exact', head: true })
                            .eq('user_id', user.id)
                    ),
                    getCount(
                        supabase
                            .from('appointments')
                            .select('id', { count: 'exact', head: true })
                            .eq('user_id', user.id)
                            .eq('status', 'scheduled')
                    ),
                    supabase
                        .from('appointments')
                        .select('scheduled_at')
                        .eq('user_id', user.id)
                        .eq('status', 'scheduled')
                        .gte('scheduled_at', nowIso)
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

            if (role === 'worker') {
                const { data: assignmentRows } = await supabase
                    .from('project_assignments')
                    .select('project_id')
                    .eq('worker_id', user.id);

                const assignedProjectIds = Array.from(
                    new Set((assignmentRows || []).map((row) => row.project_id).filter(Boolean))
                );

                if (!assignedProjectIds.length) {
                    setStats({
                        projectCount: 0,
                        appointmentCount: 0,
                        upcomingWeekAppointments: 0,
                        clientCount: null,
                        nextAppointmentAt: null,
                    });
                    return;
                }

                const [appointmentCount, upcomingWeekAppointments] = await Promise.all([
                    getCount(
                        supabase
                            .from('appointments')
                            .select('id', { count: 'exact', head: true })
                            .eq('status', 'scheduled')
                            .in('project_id', assignedProjectIds)
                    ),
                    getCount(
                        supabase
                            .from('appointments')
                            .select('id', { count: 'exact', head: true })
                            .eq('status', 'scheduled')
                            .in('project_id', assignedProjectIds)
                            .gte('scheduled_at', nowIso)
                            .lte('scheduled_at', weekEndIso)
                    ),
                ]);

                setStats({
                    projectCount: assignedProjectIds.length,
                    appointmentCount: appointmentCount ?? 0,
                    upcomingWeekAppointments: upcomingWeekAppointments ?? 0,
                    clientCount: null,
                    nextAppointmentAt: null,
                });
                return;
            }

            const [projectCount, appointmentCount, upcomingWeekAppointments, clientCount] = await Promise.all([
                getCount(supabase.from('projects').select('id', { count: 'exact', head: true })),
                getCount(
                    supabase
                        .from('appointments')
                        .select('id', { count: 'exact', head: true })
                        .eq('status', 'scheduled')
                ),
                getCount(
                    supabase
                        .from('appointments')
                        .select('id', { count: 'exact', head: true })
                        .eq('status', 'scheduled')
                        .gte('scheduled_at', nowIso)
                        .lte('scheduled_at', weekEndIso)
                ),
                getCount(supabase.from('clients').select('id', { count: 'exact', head: true })),
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
        const name = profile?.full_name || profile?.name || (role === 'admin' ? 'Admin' : role === 'worker' ? 'Equipo' : 'Cliente');

        if (role === 'client') {
            const descriptionKey = stats.projectCount === 1 ? 'dashboardHome.client.description' : 'dashboardHome.client.descriptionPlural';
            return {
                sectionLabel: t("dashboardHome.client.welcome"),
                title: t("dashboardHome.client.title", { name }),
                description: t(descriptionKey, { count: stats.projectCount }),
                primaryLink: { label: t("dashboardHome.client.ctaProjects"), path: '/dashboard/projects' },
                secondaryLink: { label: t("dashboardHome.client.ctaAppointments"), path: '/dashboard/my-appointments' },
                cards: [
                    { label: t("dashboardHome.client.cards.projects"), value: stats.projectCount, icon: Briefcase, color: 'text-skyblue', bg: 'bg-skyblue/10', path: '/dashboard/projects' },
                    { label: t("dashboardHome.client.cards.appointments"), value: stats.appointmentCount, icon: Calendar, color: 'text-green', bg: 'bg-green/10', path: '/dashboard/my-appointments' },
                    {
                        label: t("dashboardHome.client.cards.next"),
                        value: stats.nextAppointmentAt
                            ? new Date(stats.nextAppointmentAt).toLocaleDateString(navigator.language || 'es-ES')
                            : t("dashboardHome.client.cards.noAppointment"),
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
                sectionLabel: t("dashboardHome.admin.welcome"),
                title: t("dashboardHome.admin.title", { name }),
                description: t("dashboardHome.admin.description"),
                primaryLink: { label: t("dashboardHome.admin.ctaCrm"), path: '/dashboard/clients' },
                secondaryLink: { label: t("dashboardHome.admin.ctaMessaging"), path: '/dashboard/messages' },
                cards: [
                    { label: t("dashboardHome.admin.cards.projects"), value: stats.projectCount, icon: Briefcase, color: 'text-skyblue', bg: 'bg-skyblue/10', path: '/dashboard/projects' },
                    { label: t("dashboardHome.admin.cards.appointments"), value: stats.appointmentCount, icon: Calendar, color: 'text-green', bg: 'bg-green/10', path: '/dashboard/appointments' },
                    { label: t("dashboardHome.admin.cards.upcoming"), value: stats.upcomingWeekAppointments, icon: BarChart3, color: 'text-amber-500', bg: 'bg-amber-500/10', path: '/dashboard/appointments' },
                    { label: t("dashboardHome.admin.cards.clients"), value: stats.clientCount ?? '-', icon: Users, color: 'text-violet-500', bg: 'bg-violet-500/10', path: '/dashboard/clients' },
                ],
            };
        }

        return {
            sectionLabel: t("dashboardHome.worker.welcome"),
            title: t("dashboardHome.worker.title", { name }),
            description: t("dashboardHome.worker.description"),
            primaryLink: { label: t("dashboardHome.worker.ctaProjects"), path: '/dashboard/projects' },
            secondaryLink: { label: t("dashboardHome.worker.ctaMessaging"), path: '/dashboard/messages' },
            cards: [
                { label: t("dashboardHome.admin.cards.projects"), value: stats.projectCount, icon: Briefcase, color: 'text-skyblue', bg: 'bg-skyblue/10', path: '/dashboard/projects' },
                { label: t("dashboardHome.admin.cards.appointments"), value: stats.appointmentCount, icon: Calendar, color: 'text-green', bg: 'bg-green/10', path: '/dashboard/projects' },
                { label: t("dashboardHome.admin.cards.upcoming"), value: stats.upcomingWeekAppointments, icon: BarChart3, color: 'text-amber-500', bg: 'bg-amber-500/10', path: '/dashboard/projects' },
            ],
        };
    }, [profile?.full_name, profile?.name, role, stats, t]);


    const mobileRowsClass = dashboardContent.cards.length > 3 ? 'grid-rows-4' : 'grid-rows-3';

    return (
        <div className="space-y-1 font-product pb-16 pt-1">
            <header className="relative rounded-[10px] md:rounded-[10px] overflow-hidden shadow-[0_20px_60px_-35px_rgba(0,0,0,0.45)]">
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

            <div className={`grid grid-cols-1 ${mobileRowsClass} md:grid-rows-none ${dashboardContent.cards.length > 3 ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-3'} gap-1`}>
                {dashboardContent.cards.map((stat, i) => (
                    <motion.div
                        key={`${stat.label}-${i}`}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 + (i * 0.1) }}
                    >
                        <Link
                            to={stat.path}
                            className="block group p-8 bg-white/90 backdrop-blur-sm rounded-[10px] hover:shadow-[0_20px_40px_-30px_rgba(0,0,0,0.55)] hover:-translate-y-1 transition-all duration-300"
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
