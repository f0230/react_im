import React, { useCallback, useEffect, useState } from 'react';
import { Briefcase } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import LoadingFallback from '@/components/ui/LoadingFallback';

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
    const { user, client } = useAuth();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const clientId = client?.id;
    const userId = user?.id;

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
        if (clientId) {
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
            setProjects(response.data || []);
        }

        setLoading(false);
    }, [clientId, userId]);

    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);

    return (
        <div className="font-product text-neutral-900 pb-16">
            <div className="mb-8">
                <h1 className="text-2xl md:text-3xl font-bold text-neutral-900">
                    {t('dashboard.projects.title')}
                </h1>
                <p className="text-sm text-neutral-500 mt-1">
                    {t('dashboard.projects.subtitle')}
                </p>
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
                </div>
            ) : (
                <div className="grid gap-4 md:gap-6">
                    {projects.map((project, index) => {
                        const projectKey = project?.id ?? project?.uuid ?? project?.project_id ?? index;
                        const createdAt = formatDate(project?.created_at);
                        const status = project?.status || project?.stage || project?.state;

                        return (
                            <div
                                key={projectKey}
                                className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-sm"
                            >
                                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                                    <div>
                                        <p className="text-xs uppercase tracking-[0.2em] text-neutral-400">
                                            {t('dashboard.projects.projectLabel', { id: project?.id || projectKey })}
                                        </p>
                                        <h3 className="text-xl font-semibold text-neutral-900 mt-2">
                                            {getProjectTitle(project, t('dashboard.projects.untitled'))}
                                        </h3>
                                        {getProjectDescription(project) && (
                                            <p className="text-sm text-neutral-500 mt-2">
                                                {getProjectDescription(project)}
                                            </p>
                                        )}
                                    </div>
                                    {status && (
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-600">
                                            {status}
                                        </span>
                                    )}
                                </div>
                                {createdAt && (
                                    <p className="mt-4 text-xs text-neutral-400">
                                        {t('dashboard.projects.createdAt', { date: createdAt })}
                                    </p>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default Projects;
