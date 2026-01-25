import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Briefcase, Plus, Users } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import LoadingFallback from '@/components/ui/LoadingFallback';
import CreateProjectModal from '@/components/CreateProjectModal';
import facImage from '@/assets/Dahsboardx/fac.webp';
import informImage from '@/assets/Dahsboardx/inform.webp';
import servicesImage from '@/assets/Dahsboardx/ser.webp';

const getProjectTitle = (project, fallback) => {
    return project?.title || project?.name || project?.project_name || fallback;
};

const getProjectDescription = (project) => {
    return project?.description || project?.summary || project?.details || '';
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
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [shouldPromptCreate, setShouldPromptCreate] = useState(
        Boolean(location.state?.showCreateProject)
    );
    const [teamMembers, setTeamMembers] = useState([]);
    const [clients, setClients] = useState([]);
    const [assignments, setAssignments] = useState({});
    const [assignmentSaving, setAssignmentSaving] = useState({});
    const [assignmentError, setAssignmentError] = useState(null);
    const [teamModalProject, setTeamModalProject] = useState(null);
    const [teamSelection, setTeamSelection] = useState([]);

    const clientId = client?.id;
    const userId = user?.id;
    const role = profile?.role;
    const isAdmin = role === 'admin';
    const isWorker = role === 'worker';
    const isClient = role === 'client';

    const fetchProjects = useCallback(async () => {
        if (!userId) {
            setProjects([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        const fetchByColumn = async (column, value) => {
            return await supabase
                .from('projects')
                .select('*, project_assignments (worker_id)')
                .eq(column, value)
                .order('created_at', { ascending: false });
        };

        let response;
        if (role === 'admin') {
            response = await supabase
                .from('projects')
                .select('*, clients (id, full_name, company_name, email), project_assignments (worker_id)')
                .order('created_at', { ascending: false });
        } else if (role === 'worker') {
            response = await supabase
                .from('project_assignments')
                .select('project:projects(*, project_assignments (worker_id))')
                .eq('worker_id', userId)
                .order('created_at', { ascending: false });
        } else if (clientId) {
            response = await fetchByColumn('client_id', clientId);
            if (response.error) {
                response = await fetchByColumn('user_id', userId);
            }
        } else {
            response = await fetchByColumn('user_id', userId);
        }

        if (response.error) {
            console.error('Error loading projects:', response.error);
            setError(response.error.message || 'Error loading projects');
            setProjects([]);
        } else {
            if (role === 'worker') {
                const rows = response.data || [];
                const workerProjects = rows
                    .map((row) => row.project)
                    .filter(Boolean);
                setProjects(workerProjects);
            } else {
                setProjects(response.data || []);
            }
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
        if (!isAdmin) return;
        const { data, error: fetchError } = await supabase
            .from('clients')
            .select('id, user_id, full_name, company_name, email')
            .order('created_at', { ascending: false });
        if (fetchError) {
            console.error('Error loading clients:', fetchError);
            return;
        }
        setClients(data || []);
    }, [isAdmin]);

    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);

    useEffect(() => {
        fetchClients();
    }, [fetchClients]);

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

    useEffect(() => {
        if (location.state?.showCreateProject) {
            setShouldPromptCreate(true);
        }
    }, [location.state]);

    useEffect(() => {
        if (!loading && projects.length === 0 && shouldPromptCreate) {
            setIsCreateModalOpen(true);
            setShouldPromptCreate(false);
        }
    }, [loading, projects.length, shouldPromptCreate]);

    const handleProjectCreated = useCallback(
        (project) => {
            setIsCreateModalOpen(false);
            if (project) {
                setProjects((prev) => {
                    if (!project?.id) return [project, ...prev];
                    const exists = prev.some((item) => item?.id === project.id);
                    if (exists) return prev;
                    return [project, ...prev];
                });
                return;
            }
            fetchProjects();
        },
        [fetchProjects]
    );

    useEffect(() => {
        const map = {};
        projects.forEach((project) => {
            const ids = (project?.project_assignments || [])
                .map((assignment) => assignment.worker_id)
                .filter(Boolean);
            if (project?.id) map[project.id] = ids;
        });
        setAssignments(map);
    }, [projects]);

    const handleAssignmentsChange = async (projectId, nextIds) => {
        if (!projectId) return;
        setAssignmentError(null);
        setAssignmentSaving((prev) => ({ ...prev, [projectId]: true }));
        const currentIds = assignments[projectId] || [];
        const toAdd = nextIds.filter((id) => !currentIds.includes(id));
        const toRemove = currentIds.filter((id) => !nextIds.includes(id));

        try {
            if (toRemove.length) {
                const { error: deleteError } = await supabase
                    .from('project_assignments')
                    .delete()
                    .eq('project_id', projectId)
                    .in('worker_id', toRemove);
                if (deleteError) throw deleteError;
            }
            if (toAdd.length) {
                const { error: insertError } = await supabase
                    .from('project_assignments')
                    .insert(
                        toAdd.map((workerId) => ({
                            project_id: projectId,
                            worker_id: workerId,
                        }))
                    );
                if (insertError) throw insertError;
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
        setAssignmentError(null);
        setTeamSelection(assignments[project.id] || []);
        setTeamModalProject(project);
    };

    const closeTeamModal = async () => {
        if (!teamModalProject?.id) {
            setTeamModalProject(null);
            return;
        }
        await handleAssignmentsChange(teamModalProject.id, teamSelection);
        setTeamModalProject(null);
    };

    const subtitle = useMemo(() => {
        if (isAdmin) return t('dashboard.projects.subtitles.admin');
        if (isWorker) return t('dashboard.projects.subtitles.worker');
        if (isClient) return t('dashboard.projects.subtitles.client');
        return t('dashboard.projects.subtitle');
    }, [isAdmin, isWorker, isClient, t]);

    const actionCards = useMemo(
        () => [
            {
                key: 'services',
                label: t('dashboard.projects.detail.tabs.services'),
                description: t('dashboard.projects.cards.services'),
                image: servicesImage,
                suffix: 'services',
            },
            {
                key: 'reports',
                label: t('dashboard.projects.detail.tabs.reports'),
                description: t('dashboard.projects.cards.reports'),
                image: informImage,
                suffix: 'reports',
            },
            {
                key: 'invoices',
                label: t('dashboard.projects.detail.tabs.invoices'),
                description: t('dashboard.projects.cards.invoices'),
                image: facImage,
                suffix: 'invoices',
            },
        ],
        [t]
    );

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
                {!isWorker && (
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
                    <h3 className="mt-4 text-lg font-semibold text-neutral-900">
                        {t('dashboard.projects.emptyTitle')}
                    </h3>
                    <p className="mt-2 text-sm text-neutral-500">
                        {t('dashboard.projects.emptyDescription')}
                    </p>
                    {!isWorker && (
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
                <>
                    {projects.map((project, index) => {
                        const projectId = project?.id ?? project?.uuid ?? project?.project_id;
                        const projectKey = projectId ?? index;
                        const createdAt = formatDate(project?.created_at);
                        const status = project?.status || project?.stage || project?.state;
                        const title = getProjectTitle(project, t('dashboard.projects.untitled'));
                        const clientLabel = project?.clients
                            ? project.clients.company_name || project.clients.full_name || project.clients.email
                            : null;
                        const assignedIds = assignments[project?.id] || [];
                        const assignedCount = assignedIds.length;
                        const colorClass = gradientClasses[index % gradientClasses.length];
                        const projectAvatar =
                            project?.profile_image_url || project?.avatar_url || project?.logo_url;
                        const projectTeam = assignedIds
                            .map((id) => teamMembers.find((member) => member.id === id))
                            .filter(Boolean);

                        return (
                            <div
                                key={projectKey}
                                className="mb-6 w-full rounded-[10px] bg-[#D9D9D9] overflow-hidden grid grid-cols-2 gap-[5px] p-2 md:flex md:flex-row min-h-[220px] md:gap-0 transition-shadow hover:shadow-lg"
                            >
                                {/* LEFT SECTION: Project Info */}
                                <div className="col-span-1 h-[208px] md:h-auto p-6 flex flex-col items-center justify-center text-center md:flex-1 md:items-stretch md:justify-center md:text-left md:p-8 relative md:border-r border-white/20">
                                    <div className="flex flex-col items-center gap-4 md:flex-row md:gap-6">
                                        {/* Avatar */}
                                        <div
                                            role="button"
                                            tabIndex={projectId ? 0 : -1}
                                            onClick={() => projectId && navigate(`/dashboard/projects/${projectId}`)}
                                            className={`relative shrink-0 ${projectId ? 'cursor-pointer' : ''}`}
                                        >
                                            {projectAvatar ? (
                                                <img
                                                    src={projectAvatar}
                                                    alt={title}
                                                    className="h-24 w-24 md:h-28 md:w-28 rounded-full object-cover shadow-sm bg-white"
                                                />
                                            ) : (
                                                <div
                                                    className={`flex h-24 w-24 md:h-28 md:w-28 items-center justify-center rounded-full bg-gradient-to-br ${colorClass} text-2xl font-bold text-black shadow-sm`}
                                                >
                                                    {getInitials(title)}
                                                </div>
                                            )}
                                        </div>

                                        {/* Title & Team */}
                                        <div className="flex flex-col gap-3 items-center md:items-start md:gap-4">
                                            <h3
                                                onClick={() => projectId && navigate(`/dashboard/projects/${projectId}`)}
                                                className={`text-xl md:text-3xl font-bold text-neutral-800 leading-tight ${projectId ? 'cursor-pointer hover:text-neutral-600 transition-colors' : ''}`}
                                            >
                                                {title}
                                            </h3>

                                            <div className="flex flex-col items-center md:items-start gap-1">
                                                <span className="text-[13px] font-medium text-neutral-500 uppercase tracking-wide">
                                                    {t('dashboard.projects.teamLabel') || 'Equipo'}
                                                </span>
                                                <div className="flex items-center -space-x-2">
                                                    {projectTeam.slice(0, 4).map((member) => {
                                                        const label = member.full_name || member.email || member.id;
                                                        return (
                                                            <div
                                                                key={member.id}
                                                                className="flex h-8 w-8 items-center justify-center rounded-full border border-white bg-white text-[10px] font-bold text-neutral-700 shadow-sm"
                                                                title={label}
                                                            >
                                                                {getInitials(label)}
                                                            </div>
                                                        );
                                                    })}
                                                    {assignedCount > 4 && (
                                                        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white bg-neutral-100 text-[10px] font-bold text-neutral-500 shadow-sm">
                                                            +{assignedCount - 4}
                                                        </div>
                                                    )}
                                                    {isAdmin && (
                                                        <button
                                                            type="button"
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                openTeamModal(project);
                                                            }}
                                                            className="ml-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#f0f0f0] text-neutral-600 hover:bg-[#e4e4e4] hover:text-black transition shadow-sm"
                                                            aria-label={t('dashboard.projects.assignButton')}
                                                        >
                                                            <Plus size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* RIGHT SECTION: Action Cards */}
                                <div className="contents md:flex md:w-auto md:min-w-[450px] gap-2 ">
                                    {actionCards.map(({ key, label, description, image, suffix }) => (
                                        <div
                                            key={key}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (projectId) {
                                                    navigate(`/dashboard/projects/${projectId}/${suffix}`);
                                                }
                                            }}
                                            className="h-[208px] md:h-auto rounded-[10px] group relative flex flex-col items-center justify-center bg-[#EBEBEB] p-4 md:flex-1 md:min-w-[140px] text-center "
                                        >
                                            <div className="mb-3 transition-transform duration-300 group-hover:scale-105">
                                                <img
                                                    src={image}
                                                    alt={label}
                                                    className="h-16 w-auto md:h-20 object-contain opacity-80 group-hover:opacity-100 transition-opacity"
                                                />
                                            </div>
                                            <div className="flex flex-col items-center">
                                                <h4 className="text-sm md:text-base font-medium text-neutral-800">
                                                    {label}
                                                </h4>
                                                <p className="mt-1 hidden md:block text-[10px] text-neutral-500 leading-tight max-w-[120px]">
                                                    {description}
                                                </p>
                                                {/* Mobile Description Check */}
                                                <p className="mt-1 md:hidden text-[10px] text-neutral-500 leading-tight max-w-[100px]">
                                                    {description}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </>
            )}

            <CreateProjectModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onCreated={handleProjectCreated}
                isFirstProject={projects.length === 0}
                role={role}
                clients={clients}
            />

            <AnimatePresence>
                {isAdmin && teamModalProject && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 font-product">
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
                            className="relative w-full max-w-[460px] bg-white rounded-3xl shadow-2xl overflow-hidden"
                        >
                            <div className="p-6 sm:p-7 max-h-[80vh] overflow-y-auto">
                                <div className="text-center">
                                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-600">
                                        <Users size={20} />
                                    </div>
                                    <h3 className="text-xl font-bold text-neutral-900 mt-4">
                                        {t('dashboard.projects.teamModal.title')}
                                    </h3>
                                    <p className="text-sm text-neutral-500 mt-2">
                                        {t('dashboard.projects.teamModal.description')}
                                    </p>
                                </div>

                                <div className="mt-5 space-y-2">
                                    {teamMembers.map((member) => {
                                        const label = member.full_name || member.email || member.id;
                                        const isSelected = teamSelection.includes(member.id);
                                        const roleLabel =
                                            member.role === 'admin'
                                                ? t('dashboard.projects.teamModal.roleAdmin')
                                                : t('dashboard.projects.teamModal.roleWorker');
                                        return (
                                            <button
                                                key={member.id}
                                                type="button"
                                                onClick={() => {
                                                    setTeamSelection((prev) =>
                                                        prev.includes(member.id)
                                                            ? prev.filter((id) => id !== member.id)
                                                            : [...prev, member.id]
                                                    );
                                                }}
                                                className={`w-full flex items-center justify-between rounded-2xl border px-4 py-3 text-sm transition ${isSelected
                                                    ? 'border-black bg-black text-white'
                                                    : 'border-neutral-200 bg-neutral-50 text-neutral-700 hover:bg-neutral-100'
                                                    }`}
                                            >
                                                <span className="font-medium">
                                                    {label}
                                                    <span className="ml-2 text-[10px] uppercase tracking-[0.2em] text-current/70">
                                                        {roleLabel}
                                                    </span>
                                                </span>
                                                <span className="text-xs uppercase tracking-[0.2em]">
                                                    {isSelected
                                                        ? t('dashboard.projects.teamModal.selected')
                                                        : t('dashboard.projects.teamModal.select')}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {assignmentError && (
                                    <p className="mt-4 text-xs text-red-500 text-center">
                                        {assignmentError}
                                    </p>
                                )}

                                <button
                                    type="button"
                                    onClick={closeTeamModal}
                                    disabled={assignmentSaving[teamModalProject.id]}
                                    className="mt-6 w-full rounded-2xl bg-black py-3 text-sm font-semibold text-white shadow-lg shadow-black/10 hover:bg-neutral-800 transition disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {assignmentSaving[teamModalProject.id]
                                        ? t('dashboard.projects.assignSaving')
                                        : t('dashboard.projects.teamModal.close')}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Projects;
