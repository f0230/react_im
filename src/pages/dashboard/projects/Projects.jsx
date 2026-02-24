import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Briefcase, Plus, Users, X, Pencil, Folder } from 'lucide-react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import LoadingFallback from '@/components/ui/LoadingFallback';
import CreateProjectModal from '@/components/CreateProjectModal';
import EditProjectModal from '@/components/EditProjectModal';
import facImage from '@/assets/Dahsboardx/fac.webp';
import informImage from '@/assets/Dahsboardx/inform.webp';
import servicesImage from '@/assets/Dahsboardx/ser.webp';

// Figma logo inline SVG component
function FigmaLogo({ size = 14, className = '' }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size * (38 / 57)} height={size} viewBox="0 0 38 57" fill="none" className={className}>
            <path d="M19 28.5C19 25.9861 20.0009 23.5752 21.7825 21.7936C23.5641 20.0121 25.975 19.0112 28.4889 19.0112H38V28.5H28.4889C25.975 28.5 23.5641 29.5009 21.7825 31.2825C20.0009 33.0641 19 35.475 19 37.9889V47.5C19 50.0139 17.9991 52.4248 16.2175 54.2064C14.4359 55.9879 12.025 56.9888 9.51111 56.9888C6.99725 56.9888 4.58636 55.9879 2.80481 54.2064C1.02326 52.4248 0.022421 50.0139 0.022421 47.5C0.022421 44.9861 1.02326 42.5752 2.80481 40.7936C4.56408 39.0121 6.99725 38.0112 9.51111 38.0112H19V28.5Z" fill="#1ABCFE" />
            <path d="M0 9.5C0 6.98614 1.00089 4.57522 2.78249 2.79363C4.56408 1.01205 6.975 0.0112247 9.48889 0.0112247H19V19H9.48889C6.975 19 4.56408 17.9991 2.78249 16.2175C1.00089 14.4359 0 12.025 0 9.5Z" fill="#F24E1E" />
            <path d="M19 0.0112247H28.5111C31.025 0.0112247 33.4359 1.01205 35.2175 2.79363C36.9991 4.57522 38 6.98614 38 9.5C38 12.0139 36.9991 14.4248 35.2175 16.2064C33.4359 17.9879 31.025 18.9888 28.5111 18.9888H19V0.0112247Z" fill="#FF7262" />
            <path d="M0 28.5C0 25.9861 1.00089 23.5752 2.78249 21.7936C4.56408 20.0121 6.975 19.0112 9.48889 19.0112H19V38H9.48889C6.975 38 4.56408 36.9991 2.78249 35.2175C1.00089 33.4359 0 31.025 0 28.5V28.5Z" fill="#A259FF" />
            <path d="M19 19H28.5111C31.025 19 33.4359 20.0009 35.2175 21.7825C36.9991 23.5641 38 25.975 38 28.4889C38 31.0028 36.9991 33.4137 35.2175 35.1952C33.4359 36.9768 31.025 37.9777 28.5111 37.9777H19V19Z" fill="#1ABCFE" />
        </svg>
    );
}

// Figma Jam logo inline SVG
function JamLogo({ size = 14, className = '' }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
            <rect width="32" height="32" rx="8" fill="#A259FF" />
            <rect x="10" y="10" width="12" height="12" rx="1" fill="white" />
        </svg>
    );
}

// Google Drive logo inline SVG
function DriveLogo({ size = 14, className = '' }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size * (443 / 512)} viewBox="0 0 512 443" fill="none" className={className}>
            <path d="M165 0h182l165 282H347z" fill="#FFBA00" />
            <path d="M0 282L83 443h330L330 282z" fill="#2196F3" />
            <path d="M165 0L0 282l83 161 165-281z" fill="#00AC47" />
        </svg>
    );
}



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
            setProjects(fetchedProjects);
        }
        setLoading(false);
    }, [clientId, userId, role]);

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
                image: servicesImage,
                suffix: 'tasks',
            },
            {
                key: 'reports',
                label: t('dashboard.projects.detail.tabs.reports'),
                description: t('dashboard.projects.cards.reports'),
                image: informImage,
                suffix: 'reports',
            },
        ];

        // Only add invoices if not a regular (non-leader) client
        if (!(isClient && !isClientLeader)) {
            baseCards.push({
                key: 'invoices',
                label: t('dashboard.projects.detail.tabs.invoices'),
                description: t('dashboard.projects.cards.invoices'),
                image: facImage,
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
                        const assignedCount = assignedIds.length;
                        const colorClass = gradientClasses[index % gradientClasses.length];
                        const projectAvatar = project?.profile_image_url || project?.avatar_url;
                        const projectTeam = assignedIds
                            .map((id) => teamMembers.find((member) => member.id === id))
                            .filter(Boolean);

                        return (
                            <div
                                key={projectKey}
                                className="w-full rounded-[10px] bg-[#D9D9D9] overflow-hidden grid grid-cols-2 gap-[5px] p-2 md:flex md:flex-row min-h-[220px] md:gap-0 transition-shadow hover:shadow-lg"
                            >
                                <div className="col-span-1 h-[208px] md:h-auto p-6 flex flex-col items-center justify-center text-center md:flex-1 md:items-stretch md:justify-center md:text-left md:p-8 relative md:border-r border-white/20">
                                    <div className="flex flex-col items-center gap-4 md:flex-row md:gap-6">
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

                                        <div className="flex flex-col gap-3 items-center md:items-start md:gap-4 flex-1">
                                            <div className="flex items-center gap-2 group/title">
                                                <h3
                                                    onClick={() => projectId && navigate(`/dashboard/tasks?projectId=${projectId}`)}
                                                    className={`text-xl md:text-3xl font-bold text-neutral-800 leading-tight ${projectId ? 'cursor-pointer hover:text-neutral-600 transition-colors' : ''}`}
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

                                            <div className="flex flex-wrap items-center gap-3">
                                                <div className="flex flex-col items-center md:items-start gap-1">
                                                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                                                        {t('dashboard.projects.teamLabel') || 'Equipo DTE'}
                                                    </span>
                                                    <div className="flex items-center -space-x-2">
                                                        {projectTeam.slice(0, 4).map((member) => (
                                                            <div
                                                                key={member.id}
                                                                className="flex h-8 w-8 items-center justify-center rounded-full border border-white bg-white text-[10px] font-bold text-neutral-700 shadow-sm"
                                                                title={member.full_name || member.email}
                                                            >
                                                                {getInitials(member.full_name || member.email)}
                                                            </div>
                                                        ))}
                                                        {assignedCount > 4 && (
                                                            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white bg-neutral-100 text-[10px] font-bold text-neutral-500 shadow-sm">
                                                                +{assignedCount - 4}
                                                            </div>
                                                        )}
                                                        {isAdmin && (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openTeamModal(project);
                                                                }}
                                                                className="ml-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#f0f0f0] text-neutral-600 hover:bg-[#e4e4e4] hover:text-black transition shadow-sm"
                                                            >
                                                                <Plus size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Client & Client Team Section */}
                                                <div className="flex flex-col items-center md:items-start gap-1 pl-3 md:border-l border-white/30">
                                                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                                                        {t('dashboard.projects.clientLabel') || 'Cliente & Team'}
                                                    </span>
                                                    <div className="flex items-center -space-x-2">
                                                        {/* Show Assigned Clients (Entities) */}
                                                        {(project.project_clients || []).map((pc) => {
                                                            const c = pc.clients || pc.client;
                                                            if (!c) return null;
                                                            return (
                                                                <div
                                                                    key={pc.client_id}
                                                                    className="flex h-8 w-8 items-center justify-center rounded-full border border-white bg-blue-50 text-[10px] font-bold text-blue-700 shadow-sm"
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
                                                            // Avoid duplicate if leader is already in project_client_users
                                                            if ((project.project_client_users || []).some(pcu => pcu.user_id === c.user_id)) return null;

                                                            // Avoid duplicate if client entity name is same as leader name (individual client)
                                                            const companyName = c.company_name || c.full_name;
                                                            if (companyName === c.full_name) return null;

                                                            return (
                                                                <div
                                                                    key={`leader-${c.user_id}`}
                                                                    className="flex h-8 w-8 items-center justify-center rounded-full border border-white bg-green-50 text-[10px] font-bold text-green-700 shadow-sm"
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

                                                            // Avoid duplicate if already shown as a Client Entity (with same name)
                                                            const isSameAsEntity = (project.project_clients || []).some(pc => {
                                                                const c = pc.clients || pc.client;
                                                                const companyName = c?.company_name || c?.full_name;
                                                                return companyName === u.full_name;
                                                            });
                                                            if (isSameAsEntity) return null;
                                                            return (
                                                                <div
                                                                    key={pcu.user_id}
                                                                    className="flex h-8 w-8 items-center justify-center rounded-full border border-white bg-green-50 text-[10px] font-bold text-green-700 shadow-sm"
                                                                    title={u.full_name || u.email}
                                                                >
                                                                    {getInitials(u.full_name || u.email)}
                                                                </div>
                                                            );
                                                        })}
                                                        {(isAdmin || isClientLeader) && (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openClientTeamModal(project);
                                                                }}
                                                                className="ml-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#f0f0f0] text-neutral-600 hover:bg-[#e4e4e4] hover:text-black transition shadow-sm"
                                                            >
                                                                <Plus size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Links Section */}
                                                {(project.figma_url || project.jam_url || project.drive_url) && (
                                                    <div className="flex flex-wrap items-center gap-2 pl-3 md:border-l border-white/30 self-stretch">
                                                        {project.figma_url && (
                                                            <a
                                                                href={project.figma_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/50 hover:bg-white rounded-full transition-all text-neutral-600 hover:text-black border border-white/20 shadow-sm"
                                                                title="Figma Design"
                                                            >
                                                                <FigmaLogo size={14} />
                                                                <span className="text-[10px] font-bold uppercase tracking-wide">Diseño</span>
                                                            </a>
                                                        )}
                                                        {project.jam_url && (
                                                            <a
                                                                href={project.jam_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/50 hover:bg-white rounded-full transition-all text-neutral-600 hover:text-black border border-white/20 shadow-sm"
                                                                title="Figma Jam"
                                                            >
                                                                <JamLogo size={14} />
                                                                <span className="text-[10px] font-bold uppercase tracking-wide">FigJam</span>
                                                            </a>
                                                        )}
                                                        {project.drive_url && (
                                                            <a
                                                                href={project.drive_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/50 hover:bg-white rounded-full transition-all text-neutral-600 hover:text-black border border-white/20 shadow-sm"
                                                                title="Google Drive"
                                                            >
                                                                <DriveLogo size={14} />
                                                                <span className="text-[10px] font-bold uppercase tracking-wide">Drive</span>
                                                            </a>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="contents md:flex md:w-auto md:min-w-[450px] gap-2 ">
                                    {actionCards.map(({ key, label, description, image, suffix }) => (
                                        <div
                                            key={key}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (projectId) {
                                                    navigate(`/dashboard/${suffix}?projectId=${projectId}`);
                                                }
                                            }}
                                            className="h-[208px] md:h-auto rounded-[10px] group relative flex flex-col items-center justify-center bg-[#EBEBEB] p-4 md:flex-1 md:min-w-[140px] text-center cursor-pointer"
                                        >
                                            <div className="mb-3 transition-transform duration-300 group-hover:scale-105">
                                                <img
                                                    src={image}
                                                    alt={label}
                                                    className="h-16 w-auto md:h-20 object-contain opacity-80 group-hover:opacity-100 transition-opacity"
                                                />
                                            </div>
                                            <h4 className="text-sm md:text-base font-medium text-neutral-800">{label}</h4>
                                            <p className="mt-1 hidden md:block text-[10px] text-neutral-500 leading-tight max-w-[120px]">
                                                {description}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

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

        </div>
    );
};

export default Projects;
