import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { BarChart3, BookOpen, Briefcase, CalendarDays, ChevronRight, FileText, Folder, Pencil, FolderOpen, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import LoadingFallback from '@/components/ui/LoadingFallback';
import CreateProjectModal from '@/components/CreateProjectModal';
import EditProjectModal from '@/components/EditProjectModal';
import figmaIcon from '@/assets/figma-icon.svg';
import driveLogo from '@/assets/google-drive.svg';

const getProjectTitle = (project, fallback) =>
    project?.title || project?.name || project?.project_name || fallback;

const getInitials = (value) => {
    if (!value) return 'DTE';
    const words = value.trim().split(/\s+/).filter(Boolean);
    if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
    return words.slice(0, 2).map(w => w[0]).join('').toUpperCase();
};

const getProjectServicesHref = (projectId) => `/dashboard/projects/${projectId}/services`;

const getProjectSectionHref = (projectId, suffix) => {
    if (!projectId) return null;
    if (suffix === 'tasks') return getProjectServicesHref(projectId);
    if (suffix === 'brand-docs') return `/dashboard/projects/${projectId}/brand-docs`;
    return `/dashboard/${suffix}?projectId=${projectId}`;
};

const gradientClasses = [
    'from-lime-400 to-emerald-600',
    'from-sky-400 to-indigo-600',
    'from-amber-400 to-orange-600',
    'from-rose-400 to-red-600',
    'from-teal-400 to-cyan-600',
];

const logoVariants = {
    hidden: { opacity: 0, scale: 0.75, y: 14 },
    visible: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: { type: 'spring', stiffness: 420, damping: 22, mass: 0.75 },
    },
};

const Projects = () => {
    const { t } = useTranslation();
    const { user, client, profile } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [shouldPromptCreate, setShouldPromptCreate] = useState(Boolean(location.state?.showCreateProject));
    const [isOnboarding, setIsOnboarding] = useState(Boolean(location.state?.isOnboarding));
    const [projectToEdit, setProjectToEdit] = useState(null);
    const [ctxMenu, setCtxMenu] = useState(null);

    const [teamMembers, setTeamMembers] = useState([]);
    const [clients, setClients] = useState([]);
    const [assignments, setAssignments] = useState({});
    const [assignmentSaving, setAssignmentSaving] = useState({});
    const [clientAssignments, setClientAssignments] = useState({});
    const [clientUserAssignments, setClientUserAssignments] = useState({});
    const [allClientUsers, setAllClientUsers] = useState([]);

    const userId = user?.id;
    const role = profile?.role;
    const isAdmin = role === 'admin';
    const isWorker = role === 'worker';
    const isClient = role === 'client';
    const isClientLeader = isClient && profile?.is_client_leader;

    useEffect(() => {
        if (shouldPromptCreate) {
            setIsCreateModalOpen(true);
            setShouldPromptCreate(false);
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [shouldPromptCreate, navigate, location.pathname]);

    const fetchProjects = useCallback(async () => {
        if (!userId) { setProjects([]); setLoading(false); return; }
        setLoading(true);
        setError(null);

        const selectStr = '*, project_assignments(worker_id), project_clients(client_id, clients(*)), project_client_users(user_id, profiles(*))';
        let response;

        if (role === 'admin') {
            response = await supabase.from('projects').select(selectStr).order('created_at', { ascending: false });
        } else if (role === 'worker') {
            const { data: aData } = await supabase.from('project_assignments').select('project_id').eq('worker_id', userId);
            const ids = aData?.map(a => a.project_id) || [];
            response = ids.length === 0
                ? { data: [] }
                : await supabase.from('projects').select(selectStr).in('id', ids).order('created_at', { ascending: false });
        } else if (role === 'client') {
            response = await supabase.from('projects').select(selectStr).order('created_at', { ascending: false });
        } else {
            response = await supabase.from('projects').select(selectStr).eq('user_id', userId).order('created_at', { ascending: false });
        }

        if (response.error) {
            setError(response.error.message || 'Error loading projects');
            setProjects([]);
        } else {
            let data = response.data || [];
            const isClientOwner = role === 'client' && client?.user_id === userId;
            const isLeader = role === 'client' && (profile?.is_client_leader || isClientOwner);
            if (role === 'client' && !isLeader) {
                data = data.filter(p =>
                    (p?.project_client_users || []).some(a => a?.user_id === userId) || p?.user_id === userId
                );
            }
            setProjects(data);
        }
        setLoading(false);
    }, [client?.user_id, profile?.is_client_leader, userId, role]);

    const fetchTeamMembers = useCallback(async (memberIds = []) => {
        let query = supabase.from('profiles').select('id, full_name, email, role, avatar_url').in('role', ['worker', 'admin']);
        if (memberIds.length) query = query.in('id', memberIds);
        const { data } = await query.order('created_at', { ascending: false }).limit(200);
        setTeamMembers(data || []);
    }, []);

    const fetchClients = useCallback(async () => {
        if (!isAdmin && !isClientLeader) return;
        let query = supabase.from('clients').select('id, user_id, full_name, company_name, email').order('created_at', { ascending: false });
        if (isClientLeader && profile?.client_id) query = query.eq('id', profile.client_id);
        const { data } = await query.limit(500);
        setClients(data || []);
    }, [isAdmin, isClientLeader, profile?.client_id]);

    const fetchAllClientUsers = useCallback(async () => {
        if (!isAdmin && !isClientLeader) return;
        let query = supabase.from('profiles').select('id, full_name, email, role, client_id').eq('role', 'client').order('full_name', { ascending: true });
        if (isClientLeader && profile?.client_id) query = query.eq('client_id', profile.client_id);
        const { data } = await query.limit(500);
        setAllClientUsers(data || []);
    }, [isAdmin, isClientLeader, profile?.client_id]);

    useEffect(() => { fetchProjects(); }, [fetchProjects]);
    useEffect(() => { fetchClients(); fetchAllClientUsers(); }, [fetchClients, fetchAllClientUsers]);
    useEffect(() => {
        if (isAdmin) { fetchTeamMembers(); return; }
        const memberIds = Array.from(new Set(Object.values(assignments).flat()));
        memberIds.length ? fetchTeamMembers(memberIds) : setTeamMembers([]);
    }, [assignments, fetchTeamMembers, isAdmin]);

    const handleProjectCreated = useCallback((project) => {
        setIsCreateModalOpen(false);
        if (project) {
            setProjects(prev => prev.some(p => p?.id === project.id) ? prev : [project, ...prev]);
            if (isOnboarding) navigate(`/meet/${project.id}`);
            return;
        }
        fetchProjects();
        if (isOnboarding) navigate('/meet');
    }, [fetchProjects, isOnboarding, navigate]);

    const handleProjectUpdated = (updatedProject) => {
        setProjects(prev => prev.map(p => p.id === updatedProject.id ? { ...p, ...updatedProject } : p));
    };

    useEffect(() => {
        const workerMap = {}, clientMap = {}, clientUserMap = {};
        projects.forEach(p => {
            if (!p?.id) return;
            workerMap[p.id] = (p.project_assignments || []).map(a => a.worker_id).filter(Boolean);
            clientMap[p.id] = (p.project_clients || []).map(c => c.client_id).filter(Boolean);
            clientUserMap[p.id] = (p.project_client_users || []).map(cu => cu.user_id).filter(Boolean);
        });
        setAssignments(workerMap);
        setClientAssignments(clientMap);
        setClientUserAssignments(clientUserMap);
    }, [projects]);

    const handleAssignmentsChange = async (projectId, nextIds) => {
        if (!projectId) return false;
        setAssignmentSaving(prev => ({ ...prev, [projectId]: true }));
        const currentIds = assignments[projectId] || [];
        const toAdd = nextIds.filter(id => !currentIds.includes(id));
        const toRemove = currentIds.filter(id => !nextIds.includes(id));
        try {
            if (toRemove.length) await supabase.from('project_assignments').delete().eq('project_id', projectId).in('worker_id', toRemove);
            if (toAdd.length) await supabase.from('project_assignments').insert(toAdd.map(wId => ({ project_id: projectId, worker_id: wId })));
            setAssignments(prev => ({ ...prev, [projectId]: nextIds }));
            return true;
        } catch { return false; } finally {
            setAssignmentSaving(prev => ({ ...prev, [projectId]: false }));
        }
    };

    const handleClientAssignmentsChange = async (projectId, nextIds) => {
        if (!projectId) return false;
        const currentIds = clientAssignments[projectId] || [];
        const toAdd = nextIds.filter(id => !currentIds.includes(id));
        const toRemove = currentIds.filter(id => !nextIds.includes(id));
        try {
            if (toRemove.length) await supabase.from('project_clients').delete().eq('project_id', projectId).in('client_id', toRemove);
            if (toAdd.length) await supabase.from('project_clients').insert(toAdd.map(cId => ({ project_id: projectId, client_id: cId })));
            setClientAssignments(prev => ({ ...prev, [projectId]: nextIds }));
            return true;
        } catch { return false; }
    };

    const handleClientUserAssignmentsChange = async (projectId, nextIds) => {
        if (!projectId) return false;
        const currentIds = clientUserAssignments[projectId] || [];
        const toAdd = nextIds.filter(id => !currentIds.includes(id));
        const toRemove = currentIds.filter(id => !nextIds.includes(id));
        try {
            if (toRemove.length) await supabase.from('project_client_users').delete().eq('project_id', projectId).in('user_id', toRemove);
            if (toAdd.length) await supabase.from('project_client_users').insert(toAdd.map(uid => ({ project_id: projectId, user_id: uid })));
            setClientUserAssignments(prev => ({ ...prev, [projectId]: nextIds }));
            return true;
        } catch { return false; }
    };

    const teamMemberOptions = useMemo(() => teamMembers.map(m => ({
        id: m.id,
        name: m.full_name || m.email || 'Miembro DTE',
        email: m.email || null,
        subtitle: m.role === 'admin' ? 'Admin DTE' : 'Worker DTE',
    })), [teamMembers]);

    const actionCards = useMemo(() => {
        const cards = [
            { key: 'tasks', label: t('dashboard.projects.detail.tabs.services'), icon: Folder, suffix: 'tasks' },
            { key: 'reports', label: t('dashboard.projects.detail.tabs.reports'), icon: BarChart3, suffix: 'reports' },
            { key: 'content-planning', label: t('dashboard.projects.detail.tabs.contentPlanning'), icon: CalendarDays, suffix: 'content-planning' },
        ];
        if (!(isClient && !isClientLeader)) {
            cards.push({ key: 'invoices', label: t('dashboard.projects.detail.tabs.invoices'), icon: FileText, suffix: 'invoices' });
        }
        if (isAdmin || isWorker) {
            cards.push({ key: 'brand-docs', label: 'Brand Docs', icon: BookOpen, suffix: 'brand-docs' });
        }
        return cards;
    }, [t, isClient, isClientLeader, isAdmin, isWorker]);


    const ctxProject = ctxMenu?.project;
    const ctxTitle = ctxProject ? getProjectTitle(ctxProject, t('dashboard.projects.untitled')) : '';
    const ctxAvatar = ctxProject?.profile_image_url || ctxProject?.avatar_url;
    const ctxColorClass = ctxMenu ? gradientClasses[ctxMenu.index % gradientClasses.length] : '';
    const ctxAssignedIds = assignments[ctxProject?.id] || [];
    const ctxTeam = ctxAssignedIds.map(id => teamMembers.find(m => m.id === id)).filter(Boolean);

    return (
        <div className="mx-auto max-w-[1350px] px-4 sm:px-6 md:px-10 font-product text-neutral-900 pb-16 pt-6">
            <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 whitespace-nowrap">
                    {t('dashboard.projects.title')}
                </h1>
                {(isAdmin || isClientLeader) && (
                    <button
                        type="button"
                        onClick={() => setIsCreateModalOpen(true)}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-black px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-black/10 hover:bg-neutral-800 transition-all"
                    >
                        <Briefcase size={18} />
                        {t('dashboard.projects.newButton')}
                    </button>
                )}
            </div>

            {loading ? (
                <LoadingFallback type="spinner" />
            ) : error ? (
                <div className="bg-white border border-red-100 rounded-3xl p-6 text-sm text-red-500">
                    {t('dashboard.projects.error')}
                </div>
            ) : projects.length === 0 ? (
                <div className="bg-white border border-dashed border-neutral-300 rounded-3xl p-8 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-500">
                        <Briefcase size={22} />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-neutral-900">{t('dashboard.projects.emptyTitle')}</h3>
                    <p className="mt-2 text-sm text-neutral-500">{t('dashboard.projects.emptyDescription')}</p>
                    {(isAdmin || isClientLeader) && (
                        <button
                            type="button"
                            onClick={() => setIsCreateModalOpen(true)}
                            className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-black px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-black/10 hover:bg-neutral-800 transition-all"
                        >
                            <Briefcase size={18} />
                            {t('dashboard.projects.create.cta')}
                        </button>
                    )}
                </div>
            ) : (
                <motion.div
                    className="flex flex-wrap items-start justify-center gap-x-10 gap-y-9 px-3 py-4 md:gap-x-12 md:px-8"
                    initial="hidden"
                    animate="visible"
                    variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.075 } } }}
                >
                    {projects.map((project, index) => {
                        const title = getProjectTitle(project, t('dashboard.projects.untitled'));
                        const projectAvatar = project?.profile_image_url || project?.avatar_url;
                        const colorClass = gradientClasses[index % gradientClasses.length];
                        return (
                            <motion.div
                                key={project?.id ?? index}
                                variants={logoVariants}
                                whileHover={{ scale: 1.08, y: -7 }}
                                whileTap={{ scale: 0.97 }}
                                transition={{ type: 'spring', stiffness: 420, damping: 20 }}
                                className="flex flex-col items-center gap-3 cursor-pointer group select-none"
                                onClick={(e) => {
                                    e.preventDefault();
                                    setCtxMenu({
                                        project,
                                        index,
                                    });
                                }}
                            >
                                {projectAvatar ? (
                                    <img
                                        data-project-avatar
                                        src={projectAvatar}
                                        alt={title}
                                        className="h-28 w-28 rounded-full object-cover shadow-xl border-[3px] border-white transition-shadow duration-200 group-hover:shadow-2xl md:h-32 md:w-32"
                                    />
                                ) : (
                                    <div data-project-avatar className={`h-28 w-28 rounded-full bg-gradient-to-br ${colorClass} flex items-center justify-center text-3xl font-bold text-black shadow-xl border-[3px] border-white transition-shadow duration-200 group-hover:shadow-2xl md:h-32 md:w-32`}>
                                        {getInitials(title)}
                                    </div>
                                )}
                                <span data-project-label className="max-w-[120px] truncate text-center text-sm font-semibold text-neutral-800 md:max-w-[138px]">{title}</span>
                            </motion.div>
                        );
                    })}
                </motion.div>
            )}

            {typeof document !== 'undefined' && createPortal((
            <AnimatePresence>
                {ctxMenu && (
                    <div className="fixed inset-x-0 bottom-0 top-[44px] z-30 flex items-stretch justify-center bg-[#EDEDED] px-0 py-0 sm:items-center sm:px-5 sm:py-6 lg:inset-y-0 lg:left-[80px] lg:z-40 lg:px-8">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.18 }}
                            className="absolute inset-0 hidden bg-[#EDEDED]/86 backdrop-blur-3xl sm:block"
                            onClick={() => setCtxMenu(null)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96, y: 18 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.97, y: 14 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            className="relative z-[200] flex h-[100dvh] w-full max-w-none flex-col overflow-hidden rounded-none border-0 bg-[#EDEDED] shadow-none sm:h-[calc(100dvh-3rem)] sm:max-h-[920px] sm:max-w-[1500px] sm:rounded-[34px] sm:border sm:border-white/70 sm:shadow-[0_34px_110px_rgba(28,28,30,0.18)]"
                        >
                            <div className="flex min-h-0 flex-col overflow-y-auto bg-[#EDEDED]">
                                <div className="sticky top-0 z-20 m-0 overflow-visible border-b border-black/[0.04] bg-[#EDEDED]/95 px-3 pb-2.5 pt-[calc(env(safe-area-inset-top)+8px)] text-neutral-950 backdrop-blur-xl sm:relative sm:m-4 sm:flex sm:min-h-[180px] sm:items-center sm:rounded-[28px] sm:border sm:border-white/80 sm:bg-[#f8f8f6] sm:px-8 sm:py-7 sm:shadow-[0_18px_45px_rgba(28,28,30,0.06)] md:px-10 md:py-8 lg:px-12">
                                    <div className="relative flex w-full items-center justify-between gap-2 text-left sm:gap-6">
                                        <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-6">
                                            {ctxAvatar ? (
                                                <img src={ctxAvatar} alt={ctxTitle} className="h-12 w-12 shrink-0 rounded-full border-2 border-white object-cover shadow-[0_10px_20px_rgba(28,28,30,0.12)] sm:h-28 sm:w-28 sm:border-4 md:h-32 md:w-32" />
                                            ) : (
                                                <div className={`h-12 w-12 shrink-0 rounded-full border-2 border-white bg-gradient-to-br ${ctxColorClass} flex items-center justify-center text-sm font-semibold text-black shadow-[0_10px_20px_rgba(28,28,30,0.12)] sm:h-28 sm:w-28 sm:border-4 sm:text-3xl md:h-32 md:w-32 md:text-4xl`}>
                                                    {getInitials(ctxTitle)}
                                                </div>
                                            )}
                                            <div className="min-w-0 max-w-full">
                                                <p className="mb-0 text-[8px] font-semibold uppercase tracking-[0.2em] text-neutral-400 sm:mb-2 sm:text-xs">Proyecto</p>
                                                <h2 className="max-w-full truncate text-base font-semibold leading-tight text-neutral-950 sm:break-words sm:text-4xl md:text-5xl">{ctxTitle}</h2>
                                                <div className="mt-1 flex flex-wrap items-center gap-1.5 sm:mt-4 sm:gap-2 md:hidden">
                                                    {(isAdmin || isClientLeader) && (
                                                        <button
                                                            onClick={() => { setCtxMenu(null); setProjectToEdit(ctxProject); }}
                                                            className="inline-flex items-center gap-1 rounded-full bg-neutral-950 px-2.5 py-1 text-[11px] font-semibold text-white shadow-[0_8px_18px_rgba(28,28,30,0.14)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-neutral-800 hover:shadow-[0_16px_34px_rgba(28,28,30,0.20)] active:scale-[0.98] sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm"
                                                        >
                                                            <Pencil size={11} className="sm:h-[15px] sm:w-[15px]" />
                                                            <span className="truncate">Editar</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-3">
                                            {(isAdmin || isClientLeader) && (
                                                <button
                                                    onClick={() => { setCtxMenu(null); setProjectToEdit(ctxProject); }}
                                                    className="hidden items-center gap-2 rounded-full bg-neutral-950 px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(28,28,30,0.16)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-neutral-800 hover:shadow-[0_16px_34px_rgba(28,28,30,0.20)] active:scale-[0.98] md:inline-flex"
                                                >
                                                    <Pencil size={15} />
                                                    <span>Editar</span>
                                                </button>
                                            )}
                                            <button
                                                onClick={() => setCtxMenu(null)}
                                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/78 text-neutral-700 shadow-[0_8px_18px_rgba(28,28,30,0.08)] ring-1 ring-black/[0.04] transition-all duration-300 hover:rotate-90 hover:bg-white hover:text-neutral-950 hover:shadow-[0_12px_26px_rgba(28,28,30,0.12)] active:scale-95 sm:h-11 sm:w-11 md:h-12 md:w-12"
                                                title="Cerrar"
                                            >
                                                <X size={20} />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid gap-2.5 px-2.5 py-2.5 sm:gap-5 sm:px-8 sm:py-4 md:grid-cols-[1fr_1fr] md:px-12 lg:px-16">
                                    {(ctxTeam.length > 0 || (ctxProject?.project_clients || []).length > 0) && (
                                        <div className="rounded-[22px] border border-white/80 bg-[#f8f8f6] p-3 shadow-[0_12px_28px_rgba(28,28,30,0.06)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(28,28,30,0.09)] sm:rounded-[28px] sm:p-6 lg:p-7">
                                            <h3 className="mb-2 text-base font-semibold text-neutral-950 sm:mb-5 sm:text-lg">Personas</h3>
                                            <div className="grid grid-cols-2 gap-2 sm:gap-5">
                                                {ctxTeam.length > 0 && (
                                                    <div className="min-w-0 rounded-[18px] bg-white/70 p-2 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.9)] sm:rounded-3xl sm:p-4">
                                                        <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-neutral-400 sm:text-[11px] sm:tracking-[0.2em]">Equipo</span>
                                                        <div className="mt-2 flex flex-wrap gap-1.5 sm:mt-4 sm:gap-2.5">
                                                            {ctxTeam.slice(0, 8).map((m) => (
                                                                <div
                                                                    key={m.id}
                                                                    title={m.full_name || m.email}
                                                                    className="h-9 w-9 rounded-full border border-white bg-neutral-200 flex items-center justify-center overflow-hidden text-[10px] font-semibold text-neutral-700 shadow-[0_6px_14px_rgba(28,28,30,0.09)] ring-1 ring-black/5 sm:h-12 sm:w-12 sm:text-xs"
                                                                >
                                                                    {m.avatar_url
                                                                        ? <img src={m.avatar_url} alt="" className="h-full w-full object-cover" />
                                                                        : getInitials(m.full_name || m.email)
                                                                    }
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                {(ctxProject?.project_clients || []).length > 0 && (
                                                    <div className="min-w-0 rounded-[18px] bg-white/70 p-2 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.9)] sm:rounded-3xl sm:p-4">
                                                        <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-neutral-400 sm:text-[11px] sm:tracking-[0.2em]">Clientes</span>
                                                        <div className="mt-2 flex flex-wrap gap-1.5 sm:mt-4 sm:gap-2.5">
                                                            {(ctxProject.project_clients || []).slice(0, 8).map((pc) => {
                                                                const c = pc.clients || pc.client;
                                                                if (!c) return null;
                                                                return (
                                                                    <div
                                                                        key={pc.client_id}
                                                                        title={c.company_name || c.full_name}
                                                                        className="h-9 w-9 rounded-full border border-white bg-neutral-950 flex items-center justify-center text-[10px] font-semibold text-white shadow-[0_6px_14px_rgba(28,28,30,0.10)] ring-1 ring-black/5 sm:h-12 sm:w-12 sm:text-xs"
                                                                    >
                                                                        {getInitials(c.company_name || c.full_name)}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {(ctxProject?.figma_url || ctxProject?.jam_url || ctxProject?.drive_url) && (
                                        <div className="rounded-[26px] border border-white/80 bg-[#f8f8f6] p-4 shadow-[0_16px_36px_rgba(28,28,30,0.06)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(28,28,30,0.09)] sm:rounded-[28px] sm:p-6 lg:p-7">
                                            <h3 className="mb-4 text-lg font-semibold text-neutral-950 sm:mb-5">Archivos</h3>
                                            <div className="grid gap-3">
                                                {ctxProject?.figma_url && (
                                                    <a
                                                        href={ctxProject.figma_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-3 rounded-[20px] border border-black/[0.04] bg-white/82 px-4 py-3.5 text-sm font-semibold text-neutral-900 shadow-[0_8px_22px_rgba(28,28,30,0.05)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_14px_30px_rgba(28,28,30,0.09)] active:scale-[0.98] sm:gap-4 sm:rounded-2xl sm:py-4 sm:text-base"
                                                    >
                                                        <img src={figmaIcon} alt="Figma" className="h-6 w-6" />
                                                        <span className="truncate">Figma Design</span>
                                                    </a>
                                                )}
                                                {ctxProject?.jam_url && (
                                                    <a
                                                        href={ctxProject.jam_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-3 rounded-[20px] border border-black/[0.04] bg-white/82 px-4 py-3.5 text-sm font-semibold text-neutral-900 shadow-[0_8px_22px_rgba(28,28,30,0.05)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_14px_30px_rgba(28,28,30,0.09)] active:scale-[0.98] sm:gap-4 sm:rounded-2xl sm:py-4 sm:text-base"
                                                    >
                                                        <img src={figmaIcon} alt="Figma JAM" className="h-6 w-6" />
                                                        <span className="truncate">Figma JAM</span>
                                                    </a>
                                                )}
                                                {ctxProject?.drive_url && (
                                                    <a
                                                        href={ctxProject.drive_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-3 rounded-[20px] border border-black/[0.04] bg-white/82 px-4 py-3.5 text-sm font-semibold text-neutral-900 shadow-[0_8px_22px_rgba(28,28,30,0.05)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_14px_30px_rgba(28,28,30,0.09)] active:scale-[0.98] sm:gap-4 sm:rounded-2xl sm:py-4 sm:text-base"
                                                    >
                                                        <img src={driveLogo} alt="Google Drive" className="h-6 w-6" />
                                                        <span className="truncate">Google Drive</span>
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="px-3 pb-[calc(env(safe-area-inset-bottom)+18px)] sm:px-8 sm:pb-10 md:px-12 lg:px-16">
                                    <h3 className="mb-3 px-1 text-xl font-semibold text-neutral-950 sm:mb-4 sm:px-0 sm:text-2xl">Secciones</h3>
                                    <div className="grid gap-2.5 grid-cols-1 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
                                        {actionCards.map(({ key, label, icon: Icon, suffix }) => {
                                            const href = suffix === 'tasks'
                                                ? getProjectServicesHref(ctxProject?.id)
                                                : getProjectSectionHref(ctxProject?.id, suffix);
                                            return (
                                                <button
                                                    key={key}
                                                    onClick={() => { if (href) navigate(href); setCtxMenu(null); }}
                                                    className="group flex min-h-[66px] items-center justify-between gap-3 rounded-[24px] border border-white/80 bg-[#f8f8f6] px-4 py-3 text-left text-neutral-950 shadow-[0_12px_28px_rgba(28,28,30,0.06)] transition-all duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-[0_24px_50px_rgba(28,28,30,0.11)] active:scale-[0.985] sm:min-h-[98px] sm:px-5 sm:py-4 lg:min-h-[112px] lg:px-6"
                                                >
                                                    <div className="flex min-w-0 items-center gap-3 lg:gap-4">
                                                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] bg-white text-neutral-950 shadow-[0_8px_18px_rgba(28,28,30,0.07)] ring-1 ring-black/[0.04] transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_12px_26px_rgba(28,28,30,0.10)] sm:h-12 sm:w-12 sm:rounded-2xl lg:h-14 lg:w-14">
                                                            <Icon size={20} className="sm:h-[22px] sm:w-[22px]" />
                                                        </span>
                                                        <span className="truncate text-[15px] font-semibold sm:text-lg">{label}</span>
                                                    </div>
                                                    <ChevronRight size={20} className="shrink-0 text-neutral-400 transition-all duration-300 group-hover:translate-x-1 group-hover:text-neutral-700" />
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            ), document.body)}

            <EditProjectModal
                isOpen={!!projectToEdit}
                project={projectToEdit}
                onClose={() => setProjectToEdit(null)}
                onUpdated={handleProjectUpdated}
                isAdmin={isAdmin}
                isClientLeader={isClientLeader}
                teamMemberOptions={teamMemberOptions}
                initialTeamIds={projectToEdit ? (assignments[projectToEdit.id] || []) : []}
                onTeamAssignmentChange={handleAssignmentsChange}
                clients={clients}
                allClientUsers={allClientUsers}
                initialClientIds={projectToEdit ? (clientAssignments[projectToEdit.id] || []) : []}
                initialClientUserIds={projectToEdit ? (clientUserAssignments[projectToEdit.id] || []) : []}
                onClientAssignmentChange={handleClientAssignmentsChange}
                onClientUserAssignmentChange={handleClientUserAssignmentsChange}
            />

            <CreateProjectModal
                isOpen={isCreateModalOpen}
                onClose={() => {
                    setIsCreateModalOpen(false);
                    if (isOnboarding) navigate('/meet');
                }}
                onCreated={handleProjectCreated}
                isFirstProject={projects.length === 0}
                role={role}
                clients={clients}
            />
        </div>
    );
};

export default Projects;
