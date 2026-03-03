import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BarChart3, Briefcase, FileText, Folder, Pencil, Plus, Users, X } from 'lucide-react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import LoadingFallback from '@/components/ui/LoadingFallback';
import CreateProjectModal from '@/components/CreateProjectModal';
import EditProjectModal from '@/components/EditProjectModal';

const getProjectTitle = (project, fallback) => {
    return project?.title || project?.name || project?.project_name || fallback;
};

const getInitials = (value) => {
    if (!value) return 'DTE';
    const words = value.trim().split(/\s+/).filter(Boolean);
    if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
    return words
        .slice(0, 2)
        .map((word) => word[0])
        .join('')
        .toUpperCase();
};

const gradientClasses = [
    'from-lime-400 to-emerald-600',
    'from-sky-400 to-indigo-600',
    'from-amber-400 to-orange-600',
    'from-rose-400 to-red-600',
    'from-teal-400 to-cyan-600',
];

const formatDate = (value) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleDateString();
};

const glassGradientMapping = {
    blue: 'linear-gradient(hsl(223, 90%, 50%), hsl(208, 90%, 50%))',
    indigo: 'linear-gradient(hsl(3, 90%, 50%), hsl(348, 90%, 50%))',
    green: 'linear-gradient(hsl(123, 90%, 40%), hsl(108, 90%, 40%))',
};

const GlassActionIcon = ({ icon: Icon, color }) => {
    const background = glassGradientMapping[color] || color;

    return (
        <div className="relative h-[4.5em] w-[4.5em] [perspective:24em] [transform-style:preserve-3d]">
            <span
                className="absolute left-0 top-0 block h-full w-full origin-[100%_100%] rounded-[1.25em] rotate-[9deg] transition-transform duration-300 ease-[cubic-bezier(0.83,0,0.17,1)] group-hover:[transform:rotate(2deg)_translate3d(0em,0em,0em)]"
                style={{
                    background,
                    boxShadow: '0.5em -0.5em 0.75em hsla(223, 10%, 10%, 0.15)',
                }}
            />
            <span
                className="absolute left-0 top-0 flex h-full w-full items-center justify-center rounded-[1.25em] bg-[hsla(0,0%,100%,0.15)] backdrop-blur-[0.75em] transition-transform duration-300 ease-[cubic-bezier(0.83,0,0.17,1)] group-hover:[transform:translate3d(0,0,2em)]"
                style={{
                    boxShadow: '0 0 0 0.1em hsla(0, 0%, 100%, 0.3) inset',
                }}
                aria-hidden="true"
            >
                <Icon size={24} className="text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.28)]" />
            </span>
        </div>
    );
};

const Projects = () => {
    const { t } = useTranslation();
    const { user, client, profile } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const queryProjectId = searchParams.get('projectId');
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [shouldPromptCreate, setShouldPromptCreate] = useState(
        Boolean(location.state?.showCreateProject)
    );
    const [isOnboarding, setIsOnboarding] = useState(
        Boolean(location.state?.isOnboarding)
    );
    const [projectToEdit, setProjectToEdit] = useState(null);

    useEffect(() => {
        if (shouldPromptCreate) {
            setIsCreateModalOpen(true);
            setShouldPromptCreate(false);
            // We keep isOnboarding in state so it persists after clearing the location state
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [shouldPromptCreate, navigate, location.pathname]);
    const [teamMembers, setTeamMembers] = useState([]);
    const [clients, setClients] = useState([]);
    const [assignments, setAssignments] = useState({});
    const [assignmentSaving, setAssignmentSaving] = useState({});
    const [assignmentError, setAssignmentError] = useState(null);
    const [teamModalProject, setTeamModalProject] = useState(null);
    const [teamSelection, setTeamSelection] = useState([]);

    const [clientAssignments, setClientAssignments] = useState({});
    const [clientUserAssignments, setClientUserAssignments] = useState({});
    const [clientModalProject, setClientModalProject] = useState(null);
    const [clientSelection, setClientSelection] = useState([]);
    const [clientUserSelection, setClientUserSelection] = useState([]);
    const [allClientUsers, setAllClientUsers] = useState([]);

    const clientId = client?.id;
    const userId = user?.id;
    const role = profile?.role;
    const isAdmin = role === 'admin';
    const isWorker = role === 'worker';
    const isClient = role === 'client';
    const isClientLeader = isClient && profile?.is_client_leader;

    const fetchProjects = useCallback(async () => {
        if (!userId) {
            setProjects([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        console.log('[FetchProjects] Context:', {
            userId,
            role,
            profileClientId: profile?.client_id,
            isLeader: profile?.is_client_leader,
            contextClientId: client?.id
        });

        const fetchByColumn = async (column, value) => {
            const selectStr = '*, project_assignments(worker_id), project_clients(client_id, clients(*)), project_client_users(user_id, profiles(*))';
            return await supabase
                .from('projects')
                .select(selectStr)
                .eq(column, value)
                .order('created_at', { ascending: false });
        };

        const selectStr = '*, project_assignments(worker_id), project_clients(client_id, clients(*)), project_client_users(user_id, profiles(*))';

        let response;
        if (role === 'admin') {
            response = await supabase
                .from('projects')
                .select(selectStr)
                .order('created_at', { ascending: false });
        } else if (role === 'worker') {
            const { data: assignmentsData } = await supabase
                .from('project_assignments')
                .select('project_id')
                .eq('worker_id', userId);

            const projectIds = assignmentsData?.map((a) => a.project_id) || [];

            if (projectIds.length === 0) {
                response = { data: [] };
            } else {
                response = await supabase
                    .from('projects')
                    .select(selectStr)
                    .in('id', projectIds)
                    .order('created_at', { ascending: false });
            }
        } else if (role === 'client') {
            // Simplify: Let RLS handle visibility.
            // This ensures that all projects reachable via fn_has_project_access are returned.
            response = await supabase
                .from('projects')
                .select(selectStr)
                .order('created_at', { ascending: false });

            console.log(`[FetchProjects] Client role: found ${response.data?.length || 0} projects`);
            if (response.error) {
                console.error('[FetchProjects] Error fetching projects for client:', response.error);
            }
        } else {
            response = await fetchByColumn('user_id', userId);
        }

        if (response.error) {
            console.error('Error loading projects:', response.error);
            setError(response.error.message || 'Error loading projects');
            setProjects([]);
        } else {
            let fetchedProjects = [];
            fetchedProjects = response.data || [];

            // Defensive fallback:
            // if backend RLS is stale, non-leader client members should still only
            // see projects explicitly assigned to them (or created by them).
            const isClientOwner = role === 'client' && client?.user_id === userId;
            const isLeader = role === 'client' && (profile?.is_client_leader || isClientOwner);
            if (role === 'client' && !isLeader) {
                fetchedProjects = fetchedProjects.filter((project) => {
                    const explicitlyAssigned = (project?.project_client_users || []).some(
                        (assignment) => assignment?.user_id === userId
                    );
                    const isCreator = project?.user_id === userId;
                    return explicitlyAssigned || isCreator;
                });
            }
            setProjects(fetchedProjects);
        }
        setLoading(false);
    }, [client?.user_id, clientId, profile?.is_client_leader, userId, role]);

    const fetchTeamMembers = useCallback(async (memberIds = []) => {
        let query = supabase
            .from('profiles')
            .select('id, full_name, email, role')
            .in('role', ['worker', 'admin']);

        if (memberIds.length) {
            query = query.in('id', memberIds);
        }

        const { data, error: fetchError } = await query.order('created_at', { ascending: false });

        if (fetchError) {
            console.error('Error loading team members:', fetchError);
            return;
        }
        setTeamMembers(data || []);
    }, []);

    const fetchClients = useCallback(async () => {
        if (!isAdmin && !isClientLeader) return;

        let query = supabase
            .from('clients')
            .select('id, user_id, full_name, company_name, email')
            .order('created_at', { ascending: false });

        if (isClientLeader && profile?.client_id) {
            query = query.eq('id', profile.client_id);
        }

        const { data, error: fetchError } = await query;
        if (fetchError) {
            console.error('Error loading clients:', fetchError);
            return;
        }
        setClients(data || []);
    }, [isAdmin, isClientLeader, profile?.client_id]);

    const fetchAllClientUsers = useCallback(async () => {
        if (!isAdmin && !isClientLeader) return;

        let query = supabase
            .from('profiles')
            .select('id, full_name, email, role, client_id')
            .eq('role', 'client')
            .order('full_name', { ascending: true });

        if (isClientLeader && profile?.client_id) {
            query = query.eq('client_id', profile.client_id);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) {
            console.error('Error loading client users:', fetchError);
            return;
        }
        setAllClientUsers(data || []);
    }, [isAdmin, isClientLeader, profile?.client_id]);

    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);

    useEffect(() => {
        fetchClients();
        fetchAllClientUsers();
    }, [fetchClients, fetchAllClientUsers]);

    useEffect(() => {
        if (isAdmin) {
            fetchTeamMembers();
            return;
        }
        const memberIds = Array.from(new Set(Object.values(assignments).flat()));
        if (memberIds.length) {
            fetchTeamMembers(memberIds);
        } else {
            setTeamMembers([]);
        }
    }, [assignments, fetchTeamMembers, isAdmin]);

    const handleProjectCreated = useCallback(
        (project) => {
            setIsCreateModalOpen(false);
            if (project) {
                setProjects((prev) => {
                    const exists = prev.some((item) => item?.id === project.id);
                    if (exists) return prev;
                    return [project, ...prev];
                });
                if (isOnboarding) {
                    navigate(`/schedule-call/${project.id}`);
                }
                return;
            }
            fetchProjects();
            if (isOnboarding) {
                navigate('/schedule-call');
            }
        },
        [fetchProjects, isOnboarding, navigate]
    );

    const handleProjectUpdated = (updatedProject) => {
        setProjects(prev => prev.map(p => p.id === updatedProject.id ? { ...p, ...updatedProject } : p));
    };

    useEffect(() => {
        const workerMap = {};
        const clientMap = {};
        const clientUserMap = {};

        projects.forEach((project) => {
            if (!project?.id) return;

            const workerIds = (project?.project_assignments || [])
                .map((assignment) => assignment.worker_id)
                .filter(Boolean);
            workerMap[project.id] = workerIds;

            const clientIds = (project?.project_clients || [])
                .map((c) => c.client_id)
                .filter(Boolean);
            clientMap[project.id] = clientIds;

            const cUserIds = (project?.project_client_users || [])
                .map((cu) => cu.user_id)
                .filter(Boolean);
            clientUserMap[project.id] = cUserIds;
        });

        setAssignments(workerMap);
        setClientAssignments(clientMap);
        setClientUserAssignments(clientUserMap);
    }, [projects]);

    const handleAssignmentsChange = async (projectId, nextIds) => {
        if (!projectId) return;
        setAssignmentSaving((prev) => ({ ...prev, [projectId]: true }));
        const currentIds = assignments[projectId] || [];
        const toAdd = nextIds.filter((id) => !currentIds.includes(id));
        const toRemove = currentIds.filter((id) => !nextIds.includes(id));

        try {
            if (toRemove.length) {
                await supabase
                    .from('project_assignments')
                    .delete()
                    .eq('project_id', projectId)
                    .in('worker_id', toRemove);
            }
            if (toAdd.length) {
                await supabase
                    .from('project_assignments')
                    .insert(
                        toAdd.map((workerId) => ({
                            project_id: projectId,
                            worker_id: workerId,
                        }))
                    );
            }
            setAssignments((prev) => ({ ...prev, [projectId]: nextIds }));
        } catch (err) {
            console.error('Error updating assignments:', err);
            setAssignmentError(t('dashboard.projects.assignError'));
        } finally {
            setAssignmentSaving((prev) => ({ ...prev, [projectId]: false }));
        }
    };

    const openTeamModal = (project) => {
        if (!project?.id) return;
        setTeamSelection(assignments[project.id] || []);
        setTeamModalProject(project);
    };

    const handleClientAssignmentsChange = async (projectId, nextIds) => {
        if (!projectId) return;
        const currentIds = clientAssignments[projectId] || [];
        const toAdd = nextIds.filter((id) => !currentIds.includes(id));
        const toRemove = currentIds.filter((id) => !nextIds.includes(id));

        try {
            if (toRemove.length) {
                await supabase
                    .from('project_clients')
                    .delete()
                    .eq('project_id', projectId)
                    .in('client_id', toRemove);
            }
            if (toAdd.length) {
                await supabase
                    .from('project_clients')
                    .insert(
                        toAdd.map((clientId) => ({
                            project_id: projectId,
                            client_id: clientId,
                        }))
                    );
            }
            setClientAssignments((prev) => ({ ...prev, [projectId]: nextIds }));
        } catch (err) {
            console.error('Error updating client assignments:', err);
        }
    };

    const handleClientUserAssignmentsChange = async (projectId, nextIds) => {
        if (!projectId) return;
        const currentIds = clientUserAssignments[projectId] || [];
        const toAdd = nextIds.filter((id) => !currentIds.includes(id));
        const toRemove = currentIds.filter((id) => !nextIds.includes(id));

        try {
            if (toRemove.length) {
                await supabase
                    .from('project_client_users')
                    .delete()
                    .eq('project_id', projectId)
                    .in('user_id', toRemove);
            }
            if (toAdd.length) {
                await supabase
                    .from('project_client_users')
                    .insert(
                        toAdd.map((userId) => ({
                            project_id: projectId,
                            user_id: userId,
                        }))
                    );
            }
            setClientUserAssignments((prev) => ({ ...prev, [projectId]: nextIds }));
        } catch (err) {
            console.error('Error updating client user assignments:', err);
        }
    };

    const openClientTeamModal = (project) => {
        if (!project?.id) return;
        setClientSelection(clientAssignments[project.id] || []);
        setClientUserSelection(clientUserAssignments[project.id] || []);
        setClientModalProject(project);
    };

    const closeClientTeamModal = async () => {
        if (!clientModalProject?.id) {
            setClientModalProject(null);
            return;
        }
        await handleClientAssignmentsChange(clientModalProject.id, clientSelection);
        await handleClientUserAssignmentsChange(clientModalProject.id, clientUserSelection);
        setClientModalProject(null);
        await fetchProjects();
    };

    const closeTeamModal = async () => {
        if (!teamModalProject?.id) {
            setTeamModalProject(null);
            return;
        }
        await handleAssignmentsChange(teamModalProject.id, teamSelection);
        setTeamModalProject(null);
        await fetchProjects();
    };

    const subtitle = useMemo(() => {
        if (isAdmin) return t('dashboard.projects.subtitles.admin');
        if (isWorker) return t('dashboard.projects.subtitles.worker');
        if (isClient) return t('dashboard.projects.subtitles.client');
        return t('dashboard.projects.subtitle');
    }, [isAdmin, isWorker, isClient, t]);

    const actionCards = useMemo(() => {
        const baseCards = [
            {
                key: 'tasks',
                label: t('dashboard.projects.detail.tabs.services'),
                description: t('dashboard.projects.cards.services'),
                icon: Folder,
                color: 'blue',
                suffix: 'tasks',
            },
            {
                key: 'reports',
                label: t('dashboard.projects.detail.tabs.reports'),
                description: t('dashboard.projects.cards.reports'),
                icon: BarChart3,
                color: 'indigo',
                suffix: 'reports',
            },
        ];

        // Only add invoices if not a regular (non-leader) client
        if (!(isClient && !isClientLeader)) {
            baseCards.push({
                key: 'invoices',
                label: t('dashboard.projects.detail.tabs.invoices'),
                description: t('dashboard.projects.cards.invoices'),
                icon: FileText,
                color: 'green',
                suffix: 'invoices',
            });
        }

        return baseCards;
    }, [t, isClient, isClientLeader]);

    if (loading) return <LoadingFallback type="spinner" />;

    return (
        <div className="font-product text-neutral-900 pb-16">
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-neutral-900">
                        {t('dashboard.projects.title')}
                    </h1>
                    <p className="text-sm text-neutral-500 mt-1">
                        {subtitle}
                    </p>
                </div>
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

            {error ? (
                <div className="bg-white border border-red-100 rounded-3xl p-6 text-sm text-red-500">
                    {t('dashboard.projects.error')}
                </div>
            ) : projects.length === 0 ? (
                <div className="bg-white border border-dashed border-neutral-300 rounded-3xl p-8 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-500">
                        <Briefcase size={22} />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-neutral-900">
                        {t('dashboard.projects.emptyTitle')}
                    </h3>
                    <p className="mt-2 text-sm text-neutral-500">
                        {t('dashboard.projects.emptyDescription')}
                    </p>
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
                <div className="space-y-6">
                    {projects.map((project, index) => {
                        const projectId = project?.id;
                        const projectKey = projectId ?? index;
                        const title = getProjectTitle(project, t('dashboard.projects.untitled'));
                        const assignedIds = assignments[project?.id] || [];
                        const colorClass = gradientClasses[index % gradientClasses.length];
                        const projectAvatar = project?.profile_image_url || project?.avatar_url;
                        const projectTeam = assignedIds
                            .map((id) => teamMembers.find((member) => member.id === id))
                            .filter(Boolean);

                        return (
                            <div
                                key={projectKey}
                                className="grid min-h-[220px] w-full grid-cols-2 gap-[5px] overflow-hidden rounded-[10px] border border-white/60 bg-[#D9D9D9] p-2 transition-shadow hover:shadow-lg md:flex md:flex-row md:gap-0"
                            >
                                <div className="relative col-span-1 flex h-[208px] min-w-0 flex-col items-center justify-center overflow-hidden p-4 text-center md:h-auto md:flex-1 md:items-stretch md:justify-center md:border-r md:border-white/30 md:p-6 md:text-left">
                                    <div className="flex min-w-0 flex-col items-center gap-4 md:flex-row md:gap-5">
                                        <div
                                            role="button"
                                            onClick={() => projectId && navigate(`/dashboard/tasks?projectId=${projectId}`)}
                                            className={`relative shrink-0 ${projectId ? 'cursor-pointer' : ''}`}
                                        >
                                            {projectAvatar ? (
                                                <img
                                                    src={projectAvatar}
                                                    alt={title}
                                                    className="h-24 w-24 md:h-28 md:w-28 rounded-full object-cover shadow-sm bg-white"
                                                />
                                            ) : (
                                                <div className={`flex h-24 w-24 md:h-28 md:w-28 items-center justify-center rounded-full bg-gradient-to-br ${colorClass} text-2xl font-bold text-black shadow-sm`}>
                                                    {getInitials(title)}
                                                </div>
                                            )}
                                            {(isAdmin || isClientLeader) && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setProjectToEdit(project);
                                                    }}
                                                    className="absolute -bottom-1 -right-1 bg-white p-1.5 rounded-full shadow-md border border-neutral-100 text-neutral-400 hover:text-black hover:scale-110 active:scale-95 transition-all z-10"
                                                    title="Editar proyecto"
                                                >
                                                    <Pencil size={12} />
                                                </button>
                                            )}
                                        </div>

                                        <div className="flex w-full min-w-0 flex-1 flex-col items-center gap-3 md:items-start md:gap-4">
                                            <div className="group/title flex w-full min-w-0 items-center justify-center gap-2 md:justify-start">
                                                <h3
                                                    onClick={() => projectId && navigate(`/dashboard/tasks?projectId=${projectId}`)}
                                                    className={`max-w-full break-words text-xl font-bold leading-tight text-neutral-800 md:text-3xl ${projectId ? 'cursor-pointer transition-colors hover:text-neutral-600' : ''}`}
                                                >
                                                    {title}
                                                </h3>
                                                {isAdmin && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setProjectToEdit(project);
                                                        }}
                                                        className="p-1.5 rounded-lg hover:bg-black/5 text-neutral-300 hover:text-neutral-600 transition-all opacity-0 group-hover/toolbar:opacity-100 md:group-hover:opacity-100"
                                                    >
                                                        <Pencil size={16} />
                                                    </button>
                                                )}
                                            </div>

                                            <div className="flex w-full flex-wrap items-start justify-center gap-2 md:justify-start">
                                                <div className="flex min-w-0 flex-col items-center gap-1 md:items-start">
                                                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                                                        {t('dashboard.projects.teamLabel') || 'Equipo DTE'}
                                                    </span>
                                                    <div className="flex w-full max-w-[158px] items-center gap-1 md:max-w-[220px]">
                                                        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto pb-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                                                            {projectTeam.map((member) => (
                                                                <div
                                                                    key={member.id}
                                                                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white bg-white text-[8px] font-bold text-neutral-700 shadow-sm"
                                                                    title={member.full_name || member.email}
                                                                >
                                                                    {getInitials(member.full_name || member.email)}
                                                                </div>
                                                            ))}
                                                        </div>
                                                        {isAdmin && (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openTeamModal(project);
                                                                }}
                                                                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f0f0f0] text-neutral-600 shadow-sm transition hover:bg-[#e4e4e4] hover:text-black"
                                                            >
                                                                <Plus size={13} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Client & Client Team Section */}
                                                <div className="flex min-w-0 flex-col items-center gap-1 md:border-l md:border-white/30 md:pl-3 md:items-start">
                                                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                                                        {t('dashboard.projects.clientLabel') || 'Cliente & Team'}
                                                    </span>
                                                    <div className="flex w-full max-w-[158px] items-center gap-1 md:max-w-[220px]">
                                                        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto pb-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                                                            {/* Show Assigned Clients (Entities) */}
                                                            {(project.project_clients || []).map((pc) => {
                                                                const c = pc.clients || pc.client;
                                                                if (!c) return null;
                                                                return (
                                                                    <div
                                                                        key={pc.client_id}
                                                                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white bg-blue-50 text-[8px] font-bold text-blue-700 shadow-sm"
                                                                        title={c.company_name || c.full_name || 'Cliente'}
                                                                    >
                                                                        {getInitials(c.company_name || c.full_name)}
                                                                    </div>
                                                                );
                                                            })}
                                                            {/* Always show the Leader (owner) of each assigned client entity */}
                                                            {(project.project_clients || []).map((pc) => {
                                                                const c = pc.clients || pc.client;
                                                                if (!c || !c.user_id) return null;
                                                                if ((project.project_client_users || []).some(pcu => pcu.user_id === c.user_id)) return null;

                                                                const companyName = c.company_name || c.full_name;
                                                                if (companyName === c.full_name) return null;

                                                                return (
                                                                    <div
                                                                        key={`leader-${c.user_id}`}
                                                                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white bg-green-50 text-[8px] font-bold text-green-700 shadow-sm"
                                                                        title={`${c.full_name || 'Líder'} (Líder)`}
                                                                    >
                                                                        {getInitials(c.full_name)}
                                                                    </div>
                                                                );
                                                            })}
                                                            {/* Show Assigned Client Users */}
                                                            {(project.project_client_users || []).map((pcu) => {
                                                                const u = pcu.profiles || pcu.profile;
                                                                if (!u) return null;

                                                                const isSameAsEntity = (project.project_clients || []).some(pc => {
                                                                    const c = pc.clients || pc.client;
                                                                    const companyName = c?.company_name || c?.full_name;
                                                                    return companyName === u.full_name;
                                                                });
                                                                if (isSameAsEntity) return null;
                                                                return (
                                                                    <div
                                                                        key={pcu.user_id}
                                                                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white bg-green-50 text-[8px] font-bold text-green-700 shadow-sm"
                                                                        title={u.full_name || u.email}
                                                                    >
                                                                        {getInitials(u.full_name || u.email)}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                        {(isAdmin || isClientLeader) && (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openClientTeamModal(project);
                                                                }}
                                                                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f0f0f0] text-neutral-600 shadow-sm transition hover:bg-[#e4e4e4] hover:text-black"
                                                            >
                                                                <Plus size={13} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="contents md:flex md:w-auto md:min-w-[430px] md:gap-2">
                                    {actionCards.map(({ key, label, description, icon, color, suffix }) => (
                                        <div
                                            key={key}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (projectId) {
                                                    navigate(`/dashboard/${suffix}?projectId=${projectId}`);
                                                }
                                            }}
                                            className="group relative flex h-[208px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[10px] bg-[#EBEBEB] p-4 text-center md:h-auto md:min-w-[140px] md:flex-1"
                                        >
                                            <div className="mb-4 transition-transform duration-300 group-hover:scale-105">
                                                <GlassActionIcon icon={icon} color={color} />
                                            </div>
                                            <h4 className="text-sm md:text-base font-medium text-neutral-800">{label}</h4>
                                            <p className="mt-1 max-w-[120px] text-[10px] leading-tight text-neutral-500">
                                                {description}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )
            }

            <EditProjectModal
                isOpen={!!projectToEdit}
                project={projectToEdit}
                onClose={() => setProjectToEdit(null)}
                onUpdated={handleProjectUpdated}
            />

            <CreateProjectModal
                isOpen={isCreateModalOpen}
                onClose={() => {
                    setIsCreateModalOpen(false);
                    if (isOnboarding) {
                        navigate('/schedule-call');
                    }
                }}
                onCreated={handleProjectCreated}
                isFirstProject={projects.length === 0}
                role={role}
                clients={clients}
            />

            <AnimatePresence>
                {isAdmin && teamModalProject && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={closeTeamModal}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.96, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.96, opacity: 0, y: 20 }}
                            className="relative w-full max-w-[460px] bg-white rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-7"
                        >
                            <div className="text-center">
                                <Users size={40} className="mx-auto text-neutral-600 mb-4" />
                                <h3 className="text-xl font-bold text-neutral-900">
                                    {t('dashboard.projects.teamModal.title')}
                                </h3>
                            </div>
                            <div className="mt-5 space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                                {teamMembers.map((member) => {
                                    const isSelected = teamSelection.includes(member.id);
                                    return (
                                        <button
                                            key={member.id}
                                            onClick={() => setTeamSelection(prev =>
                                                isSelected ? prev.filter(id => id !== member.id) : [...prev, member.id]
                                            )}
                                            className={`w-full flex items-center justify-between rounded-xl border px-4 py-3 text-sm transition ${isSelected ? 'border-black bg-black text-white' : 'border-neutral-200 bg-neutral-50'
                                                }`}
                                        >
                                            <span>{member.full_name || member.email}</span>
                                            <span className="text-[10px] uppercase">{isSelected ? 'Seleccionado' : 'Seleccionar'}</span>
                                        </button>
                                    );
                                })}
                            </div>
                            <button
                                onClick={closeTeamModal}
                                className="mt-6 w-full rounded-xl bg-black py-3 text-sm font-semibold text-white hover:bg-neutral-800 transition"
                            >
                                Guardar cambios
                            </button>
                        </motion.div>
                    </div>
                )}

                {(isAdmin || isClientLeader) && clientModalProject && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={closeClientTeamModal}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.96, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.96, opacity: 0, y: 20 }}
                            className="relative w-full max-w-[500px] bg-white rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-7"
                        >
                            <div className="text-center">
                                <Users size={40} className="mx-auto text-blue-600 mb-4" />
                                <h3 className="text-xl font-bold text-neutral-900">
                                    Asignar Clientes y Team
                                </h3>
                                <p className="text-sm text-neutral-500 mt-1">Configura quiénes tienen acceso desde el lado del cliente</p>
                            </div>

                            <div className="mt-6 space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                                {/* Section 1: Client Entities */}
                                {isAdmin && (
                                    <div>
                                        <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-3">Empresas / Clientes Principales</h4>
                                        <div className="space-y-2">
                                            {clients.map((c) => {
                                                const isSelected = clientSelection.includes(c.id);
                                                return (
                                                    <button
                                                        key={c.id}
                                                        onClick={() => setClientSelection(prev =>
                                                            isSelected ? prev.filter(id => id !== c.id) : [...prev, c.id]
                                                        )}
                                                        className={`w-full flex items-center justify-between rounded-xl border px-4 py-3 text-sm transition ${isSelected ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-neutral-200 bg-neutral-50'
                                                            }`}
                                                    >
                                                        <span className="font-medium text-left">{c.company_name || c.full_name || c.email}</span>
                                                        <span className="text-[10px] uppercase font-bold">{isSelected ? 'Asignado' : 'Asignar'}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Section 2: Client Users (Team Cliente) */}
                                <div>
                                    <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-3">Team del Cliente (Usuarios específicos)</h4>
                                    <div className="space-y-2">
                                        {isAdmin && clientSelection.length === 0 ? (
                                            <div className="py-8 text-center border-2 border-dashed border-neutral-100 rounded-2xl">
                                                <p className="text-sm text-neutral-400">Selecciona un cliente principal para ver su equipo</p>
                                            </div>
                                        ) : (
                                            allClientUsers
                                                .filter(u => (isAdmin ? clientSelection.includes(u.client_id) : u.id !== userId))
                                                .map((u) => {
                                                    const isSelected = clientUserSelection.includes(u.id);
                                                    return (
                                                        <button
                                                            key={u.id}
                                                            onClick={() => setClientUserSelection(prev =>
                                                                isSelected ? prev.filter(id => id !== u.id) : [...prev, u.id]
                                                            )}
                                                            className={`w-full flex items-center justify-between rounded-xl border px-4 py-3 text-sm transition ${isSelected ? 'border-green-600 bg-green-50 text-green-700' : 'border-neutral-200 bg-neutral-50'
                                                                }`}
                                                        >
                                                            <div className="flex flex-col items-start">
                                                                <span className="font-medium">{u.full_name || u.email}</span>
                                                                {u.client_id && (
                                                                    <span className="text-[10px] text-neutral-400">
                                                                        {clients.find(c => c.id === u.client_id)?.company_name || 'Empresa'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span className="text-[10px] uppercase font-bold">{isSelected ? 'En el Team' : 'Agregar'}</span>
                                                        </button>
                                                    );
                                                })
                                        )}
                                        {isAdmin && clientSelection.length > 0 && allClientUsers.filter(u => clientSelection.includes(u.client_id)).length === 0 && (
                                            <div className="py-8 text-center border-2 border-dashed border-neutral-100 rounded-2xl">
                                                <p className="text-sm text-neutral-400">Este cliente aún no tiene un equipo asignado</p>
                                            </div>
                                        )}
                                        {isClientLeader && allClientUsers.length === 0 && (
                                            <div className="py-8 text-center border-2 border-dashed border-neutral-100 rounded-2xl">
                                                <p className="text-sm text-neutral-400">Aún no tienes equipo. Invita miembros desde Ajustes.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={closeClientTeamModal}
                                className="mt-8 w-full rounded-2xl bg-black py-4 text-sm font-bold text-white hover:bg-neutral-800 transition active:scale-[0.98]"
                            >
                                Guardar Configuración
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div >
    );
};

export default Projects;
