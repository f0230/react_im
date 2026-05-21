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
        <div className="mx-auto max-w-[1350px] px-6 md:px-10 font-product text-neutral-900 pb-16 pt-6" style={{ zoom: '0.65' }}>
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
                    <div className="fixed inset-0 z-[190] flex items-stretch justify-center bg-white px-0 py-0 sm:items-center sm:bg-transparent sm:px-5 sm:py-8">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.18 }}
                            className="absolute inset-0 hidden bg-black/0 backdrop-blur-[50px] sm:block"
                            onClick={() => setCtxMenu(null)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 18 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.92, y: 14 }}
                            transition={{ type: 'spring', stiffness: 360, damping: 28 }}
                            className="relative z-[200] flex h-[100dvh] w-full max-w-none flex-col overflow-hidden rounded-none border-0 bg-white shadow-none sm:h-auto sm:max-h-[86vh] sm:max-w-5xl sm:rounded-[34px] sm:border sm:border-white/[0.14] sm:shadow-[0_40px_120px_rgba(0,0,0,0.35)]"
                        >
                            <div className="flex min-h-0 flex-col overflow-y-auto bg-[#f5f5f7] sm:bg-white">
                                <div className="relative overflow-visible bg-neutral-950 px-5 pb-8 pt-[calc(env(safe-area-inset-top)+22px)] text-white sm:overflow-hidden sm:px-8 sm:py-8 md:px-12 md:py-10">
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_10%,rgba(255,255,255,0.18),transparent_30%),radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.10),transparent_28%)]" />
                                    <div className="relative flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:justify-between sm:gap-5 sm:text-left">
                                        <div className="flex min-w-0 flex-1 flex-col items-center gap-4 sm:items-start sm:gap-6 md:flex-row md:items-center">
                                            {ctxAvatar ? (
                                                <img src={ctxAvatar} alt={ctxTitle} className="h-28 w-28 shrink-0 rounded-full border-4 border-white/[0.14] object-cover shadow-2xl sm:h-32 sm:w-32 md:h-40 md:w-40" />
                                            ) : (
                                                <div className={`h-28 w-28 shrink-0 rounded-full border-4 border-white/[0.14] bg-gradient-to-br ${ctxColorClass} flex items-center justify-center text-3xl font-black text-black shadow-2xl sm:h-32 sm:w-32 sm:text-4xl md:h-40 md:w-40 md:text-5xl`}>
                                                    {getInitials(ctxTitle)}
                                                </div>
                                            )}
                                            <div className="min-w-0 max-w-full">
                                                <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.22em] text-white/45 sm:mb-2 sm:text-xs sm:tracking-[0.28em]">Proyecto</p>
                                                <h2 className="max-w-full break-words text-3xl font-black leading-[0.95] tracking-tight text-white sm:text-4xl md:text-6xl">{ctxTitle}</h2>
                                                <div className="mt-4 flex flex-wrap items-center justify-center gap-3 sm:mt-5 sm:justify-start">
                                                    {(isAdmin || isClientLeader) && (
                                                        <button
                                                            onClick={() => { setCtxMenu(null); setProjectToEdit(ctxProject); }}
                                                            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-bold text-black shadow-lg transition-transform hover:scale-105 sm:px-5 sm:py-3 sm:text-base"
                                                        >
                                                            <Pencil size={16} />
                                                            Editar proyecto
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setCtxMenu(null)}
                                            className="absolute right-0 top-[calc(env(safe-area-inset-top)+2px)] flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors active:scale-95 hover:bg-white hover:text-black sm:static sm:h-12 sm:w-12"
                                            title="Cerrar"
                                        >
                                            <X size={22} />
                                        </button>
                                    </div>
                                </div>

                                <div className="grid gap-4 px-4 py-4 sm:gap-6 sm:px-8 sm:py-8 md:grid-cols-[1fr_1fr] md:px-12">
                                    {(ctxTeam.length > 0 || (ctxProject?.project_clients || []).length > 0) && (
                                        <div className="rounded-[26px] bg-white p-4 shadow-[0_10px_30px_rgba(0,0,0,0.06)] sm:rounded-3xl sm:bg-neutral-50 sm:p-6 sm:shadow-none">
                                            <h3 className="mb-4 text-lg font-black text-neutral-950 sm:mb-5 sm:text-xl">Personas</h3>
                                            <div className="grid gap-6 sm:grid-cols-2">
                                                {ctxTeam.length > 0 && (
                                                    <div>
                                                        <span className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-400">Equipo</span>
                                                        <div className="mt-3 flex flex-wrap gap-2">
                                                            {ctxTeam.slice(0, 8).map((m) => (
                                                                <div
                                                                    key={m.id}
                                                                    title={m.full_name || m.email}
                                                                    className="h-10 w-10 rounded-full border-2 border-white bg-neutral-200 flex items-center justify-center overflow-hidden text-xs font-bold text-neutral-700 shadow-sm sm:h-12 sm:w-12 sm:text-sm"
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
                                                    <div>
                                                        <span className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-400">Clientes</span>
                                                        <div className="mt-3 flex flex-wrap gap-2">
                                                            {(ctxProject.project_clients || []).slice(0, 8).map((pc) => {
                                                                const c = pc.clients || pc.client;
                                                                if (!c) return null;
                                                                return (
                                                                    <div
                                                                        key={pc.client_id}
                                                                        title={c.company_name || c.full_name}
                                                                        className="h-10 w-10 rounded-full border-2 border-white bg-neutral-900 flex items-center justify-center text-xs font-bold text-white shadow-sm sm:h-12 sm:w-12 sm:text-sm"
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
                                        <div className="rounded-[26px] bg-white p-4 shadow-[0_10px_30px_rgba(0,0,0,0.06)] sm:rounded-3xl sm:bg-neutral-50 sm:p-6 sm:shadow-none">
                                            <h3 className="mb-4 text-lg font-black text-neutral-950 sm:mb-5 sm:text-xl">Archivos</h3>
                                            <div className="grid gap-3">
                                                {ctxProject?.figma_url && (
                                                    <a
                                                        href={ctxProject.figma_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-3 rounded-[20px] bg-[#f5f5f7] px-4 py-3.5 text-base font-bold text-neutral-900 transition-transform active:scale-[0.98] hover:scale-[1.02] sm:gap-4 sm:bg-white sm:py-4 sm:text-lg sm:shadow-sm"
                                                    >
                                                        <img src={figmaIcon} alt="Figma" className="h-7 w-7 sm:h-8 sm:w-8" />
                                                        Figma Design
                                                    </a>
                                                )}
                                                {ctxProject?.jam_url && (
                                                    <a
                                                        href={ctxProject.jam_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-3 rounded-[20px] bg-[#f5f5f7] px-4 py-3.5 text-base font-bold text-neutral-900 transition-transform active:scale-[0.98] hover:scale-[1.02] sm:gap-4 sm:bg-white sm:py-4 sm:text-lg sm:shadow-sm"
                                                    >
                                                        <img src={figmaIcon} alt="Figma JAM" className="h-7 w-7 sm:h-8 sm:w-8" />
                                                        Figma JAM
                                                    </a>
                                                )}
                                                {ctxProject?.drive_url && (
                                                    <a
                                                        href={ctxProject.drive_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-3 rounded-[20px] bg-[#f5f5f7] px-4 py-3.5 text-base font-bold text-neutral-900 transition-transform active:scale-[0.98] hover:scale-[1.02] sm:gap-4 sm:bg-white sm:py-4 sm:text-lg sm:shadow-sm"
                                                    >
                                                        <img src={driveLogo} alt="Google Drive" className="h-7 w-7 sm:h-8 sm:w-8" />
                                                        Google Drive
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="px-4 pb-[calc(env(safe-area-inset-bottom)+24px)] sm:px-8 sm:pb-10 md:px-12">
                                    <h3 className="mb-4 text-lg font-black text-neutral-950 sm:text-xl">Secciones</h3>
                                    <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
                                        {actionCards.map(({ key, label, icon: Icon, suffix }) => {
                                            const href = suffix === 'tasks'
                                                ? getProjectServicesHref(ctxProject?.id)
                                                : getProjectSectionHref(ctxProject?.id, suffix);
                                            return (
                                                <button
                                                    key={key}
                                                    onClick={() => { if (href) navigate(href); setCtxMenu(null); }}
                                                    className="group flex min-h-[74px] items-center justify-between gap-3 rounded-[24px] bg-neutral-950 px-4 py-4 text-left text-white shadow-[0_12px_30px_rgba(0,0,0,0.16)] transition-transform active:scale-[0.98] hover:-translate-y-1 hover:scale-[1.02] sm:min-h-[120px] sm:gap-4 sm:rounded-3xl sm:px-6 sm:py-5"
                                                >
                                                    <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                                                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-black sm:h-14 sm:w-14">
                                                            <Icon size={22} />
                                                        </span>
                                                        <span className="truncate text-base font-black sm:text-xl">{label}</span>
                                                    </div>
                                                    <ChevronRight size={22} className="shrink-0 text-white/45 transition-transform group-hover:translate-x-1 sm:h-6 sm:w-6" />
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
