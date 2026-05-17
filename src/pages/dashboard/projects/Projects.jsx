import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BarChart3, BookOpen, Briefcase, CalendarDays, ChevronRight, FileText, Folder, Pencil, FolderOpen } from 'lucide-react';
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
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.2, ease: 'easeOut' } },
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
                    className="flex flex-wrap gap-8"
                    initial="hidden"
                    animate="visible"
                    variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
                >
                    {projects.map((project, index) => {
                        const title = getProjectTitle(project, t('dashboard.projects.untitled'));
                        const projectAvatar = project?.profile_image_url || project?.avatar_url;
                        const colorClass = gradientClasses[index % gradientClasses.length];
                        return (
                            <motion.div
                                key={project?.id ?? index}
                                variants={logoVariants}
                                className="flex flex-col items-center gap-2.5 cursor-pointer group select-none"
                                onClick={(e) => {
                                    e.preventDefault();
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    setCtxMenu({
                                        project,
                                        index,
                                        top: Math.min(rect.bottom + 8, window.innerHeight - 340),
                                        left: Math.min(rect.left, window.innerWidth - 300),
                                    });
                                }}
                            >
                                {projectAvatar ? (
                                    <img
                                        src={projectAvatar}
                                        alt={title}
                                        className="h-24 w-24 rounded-full object-cover shadow-lg border-[3px] border-white group-hover:scale-105 transition-transform duration-200"
                                    />
                                ) : (
                                    <div className={`h-24 w-24 rounded-full bg-gradient-to-br ${colorClass} flex items-center justify-center text-2xl font-bold text-black shadow-lg border-[3px] border-white group-hover:scale-105 transition-transform duration-200`}>
                                        {getInitials(title)}
                                    </div>
                                )}
                                <span className="text-sm font-semibold text-neutral-700 text-center max-w-[96px] truncate">{title}</span>
                            </motion.div>
                        );
                    })}
                </motion.div>
            )}

            <AnimatePresence>
                {ctxMenu && (
                    <>
                        <div className="fixed inset-0 z-[190]" onClick={() => setCtxMenu(null)} />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -4 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.93, y: -4 }}
                            transition={{ duration: 0.12 }}
                            className="fixed z-[200] w-72 bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden"
                            style={{ top: ctxMenu.top, left: ctxMenu.left }}
                        >
                            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    {ctxAvatar ? (
                                        <img src={ctxAvatar} alt={ctxTitle} className="h-8 w-8 rounded-full object-cover shrink-0" />
                                    ) : (
                                        <div className={`h-8 w-8 rounded-full bg-gradient-to-br ${ctxColorClass} flex items-center justify-center text-xs font-bold text-black shrink-0`}>
                                            {getInitials(ctxTitle)}
                                        </div>
                                    )}
                                    <span className="font-bold text-sm text-neutral-900 truncate">{ctxTitle}</span>
                                </div>
                                {(isAdmin || isClientLeader) && (
                                    <button
                                        onClick={() => { setCtxMenu(null); setProjectToEdit(ctxProject); }}
                                        className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors shrink-0"
                                        title="Editar proyecto"
                                    >
                                        <Pencil size={13} />
                                    </button>
                                )}
                            </div>

                            {(ctxTeam.length > 0 || (ctxProject?.project_clients || []).length > 0) && (
                                <div className="flex gap-5 px-4 py-2.5 border-b border-neutral-100">
                                    {ctxTeam.length > 0 && (
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Equipo</span>
                                            <div className="flex items-center">
                                                {ctxTeam.slice(0, 6).map((m, i) => (
                                                    <div
                                                        key={m.id}
                                                        title={m.full_name || m.email}
                                                        className="h-6 w-6 rounded-full bg-neutral-200 border-2 border-white flex items-center justify-center text-[8px] font-bold text-neutral-600 overflow-hidden"
                                                        style={{ marginLeft: i > 0 ? '-6px' : '0' }}
                                                    >
                                                        {m.avatar_url
                                                            ? <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
                                                            : getInitials(m.full_name || m.email)
                                                        }
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {(ctxProject?.project_clients || []).length > 0 && (
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Clientes</span>
                                            <div className="flex items-center">
                                                {(ctxProject.project_clients || []).slice(0, 6).map((pc, i) => {
                                                    const c = pc.clients || pc.client;
                                                    if (!c) return null;
                                                    return (
                                                        <div
                                                            key={pc.client_id}
                                                            title={c.company_name || c.full_name}
                                                            className="h-6 w-6 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center text-[8px] font-bold text-blue-700"
                                                            style={{ marginLeft: i > 0 ? '-6px' : '0' }}
                                                        >
                                                            {getInitials(c.company_name || c.full_name)}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {(ctxProject?.figma_url || ctxProject?.jam_url || ctxProject?.drive_url) && (
                                <div className="flex gap-2 px-4 py-2.5 border-b border-neutral-100">
                                    {ctxProject?.figma_url && (
                                        <a
                                            href={ctxProject.figma_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 rounded-lg hover:bg-neutral-100 opacity-60 hover:opacity-100 transition-opacity"
                                            title="Abrir Figma Design"
                                        >
                                            <img src={figmaIcon} alt="Figma" className="w-5 h-5" />
                                        </a>
                                    )}
                                    {ctxProject?.jam_url && (
                                        <a
                                            href={ctxProject.jam_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 rounded-lg hover:bg-neutral-100 opacity-60 hover:opacity-100 transition-opacity"
                                            title="Abrir Figma JAM"
                                        >
                                            <img src={figmaIcon} alt="Figma JAM" className="w-5 h-5" />
                                        </a>
                                    )}
                                    {ctxProject?.drive_url && (
                                        <a
                                            href={ctxProject.drive_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 rounded-lg hover:bg-neutral-100 opacity-60 hover:opacity-100 transition-opacity"
                                            title="Abrir Google Drive"
                                        >
                                            <img src={driveLogo} alt="Google Drive" className="w-5 h-5" />
                                        </a>
                                    )}
                                </div>
                            )}

                            <div className="py-1">
                                {actionCards.map(({ key, label, icon: Icon, suffix }) => {
                                    const href = suffix === 'tasks'
                                        ? getProjectServicesHref(ctxProject?.id)
                                        : getProjectSectionHref(ctxProject?.id, suffix);
                                    return (
                                        <button
                                            key={key}
                                            onClick={() => { if (href) navigate(href); setCtxMenu(null); }}
                                            className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <Icon size={15} className="text-neutral-400 shrink-0" />
                                                {label}
                                            </div>
                                            <ChevronRight size={13} className="text-neutral-300" />
                                        </button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

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
