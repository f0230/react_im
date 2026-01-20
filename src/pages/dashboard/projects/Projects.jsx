import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Briefcase, Users } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import LoadingFallback from '@/components/ui/LoadingFallback';
import CreateProjectModal from '@/components/CreateProjectModal';

const getProjectTitle = (project, fallback) => {
    return project?.title || project?.name || project?.project_name || fallback;
};

const getProjectDescription = (project) => {
    return project?.description || project?.summary || project?.details || '';
};

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
    const [workers, setWorkers] = useState([]);
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
                .select('*')
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
                .select('project:projects(*)')
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

    const fetchWorkers = useCallback(async () => {
        if (!isAdmin) return;
        const { data, error: fetchError } = await supabase
            .from('profiles')
            .select('id, full_name, email, role')
            .eq('role', 'worker')
            .order('created_at', { ascending: false });

        if (fetchError) {
            console.error('Error loading workers:', fetchError);
            return;
        }
        setWorkers(data || []);
    }, [isAdmin]);

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
        fetchWorkers();
        fetchClients();
    }, [fetchWorkers, fetchClients]);

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
        if (!isAdmin) return;
        const map = {};
        projects.forEach((project) => {
            const ids = (project?.project_assignments || [])
                .map((assignment) => assignment.worker_id)
                .filter(Boolean);
            if (project?.id) map[project.id] = ids;
        });
        setAssignments(map);
    }, [isAdmin, projects]);

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
                <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
                    {projects.map((project, index) => {
                        const projectId = project?.id ?? project?.uuid ?? project?.project_id;
                        const projectKey = projectId ?? index;
                        const createdAt = formatDate(project?.created_at);
                        const status = project?.status || project?.stage || project?.state;
                        const clientLabel = project?.clients
                            ? project.clients.company_name || project.clients.full_name || project.clients.email
                            : null;
                        const assignedIds = assignments[project?.id] || [];
                        const assignedCount = assignedIds.length;
                        const isLast = index === projects.length - 1;

                        return (
                            <div
                                key={projectKey}
                                role="button"
                                tabIndex={projectId ? 0 : -1}
                                onClick={() => {
                                    if (projectId) {
                                        navigate(`/dashboard/projects/${projectId}`);
                                    }
                                }}
                                onKeyDown={(event) => {
                                    if (!projectId) return;
                                    if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault();
                                        navigate(`/dashboard/projects/${projectId}`);
                                    }
                                }}
                                className={`flex flex-col gap-3 px-4 py-3 sm:px-5 sm:py-4 ${
                                    isLast ? '' : 'border-b border-neutral-200'
                                } ${projectId ? 'cursor-pointer hover:bg-neutral-50' : ''}`}
                            >
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-xs uppercase tracking-[0.2em] text-neutral-400">
                                                {t('dashboard.projects.projectLabel', { id: project?.id || projectKey })}
                                            </span>
                                            {status && (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-neutral-100 text-neutral-600">
                                                    {status}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-sm font-semibold text-neutral-900">
                                                {getProjectTitle(project, t('dashboard.projects.untitled'))}
                                            </span>
                                            {createdAt && (
                                                <span className="text-xs text-neutral-400">
                                                    {t('dashboard.projects.createdAt', { date: createdAt })}
                                                </span>
                                            )}
                                        </div>
                                        {getProjectDescription(project) && (
                                            <p className="text-sm text-neutral-500 leading-snug">
                                                {getProjectDescription(project)}
                                            </p>
                                        )}
                                        {isAdmin && clientLabel && (
                                            <p className="text-xs text-neutral-500">
                                                {t('dashboard.projects.clientLabel')}: {clientLabel}
                                            </p>
                                        )}
                                    </div>
                                    {isAdmin && (
                                        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-neutral-100 text-neutral-600">
                                                {t('dashboard.projects.assignedSummary', { count: assignedCount })}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    openTeamModal(project);
                                                }}
                                                onKeyDown={(event) => event.stopPropagation()}
                                                className="inline-flex items-center justify-center gap-2 rounded-full border border-neutral-200 px-3 py-1.5 text-[11px] font-semibold text-neutral-700 hover:bg-neutral-50 transition"
                                            >
                                                <Users size={13} />
                                                {t('dashboard.projects.assignButton')}
                                            </button>
                                        </div>
                                    )}
                                </div>
                                {!isAdmin && (
                                    <div className="flex flex-wrap items-center gap-2">
                                        {status && (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-neutral-100 text-neutral-600">
                                                {status}
                                            </span>
                                        )}
                                        {createdAt && (
                                            <span className="text-xs text-neutral-400">
                                                {t('dashboard.projects.createdAt', { date: createdAt })}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
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
                                    {workers.map((worker) => {
                                        const label = worker.full_name || worker.email || worker.id;
                                        const isSelected = teamSelection.includes(worker.id);
                                        return (
                                            <button
                                                key={worker.id}
                                                type="button"
                                                onClick={() => {
                                                    setTeamSelection((prev) =>
                                                        prev.includes(worker.id)
                                                            ? prev.filter((id) => id !== worker.id)
                                                            : [...prev, worker.id]
                                                    );
                                                }}
                                                className={`w-full flex items-center justify-between rounded-2xl border px-4 py-3 text-sm transition ${
                                                    isSelected
                                                        ? 'border-black bg-black text-white'
                                                        : 'border-neutral-200 bg-neutral-50 text-neutral-700 hover:bg-neutral-100'
                                                }`}
                                            >
                                                <span className="font-medium">{label}</span>
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
