import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Briefcase } from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import LoadingFallback from '@/components/ui/LoadingFallback';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import NotionPageView from '@/components/projects/NotionPageView';

const PANEL_SPRING = {
  type: 'spring',
  stiffness: 230,
  damping: 28,
  mass: 0.9,
};

const getProjectTitle = (project, fallback = 'Proyecto') => {
  return project?.title || project?.name || project?.project_name || fallback;
};

const ProjectTasks = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { projectId: routeProjectId } = useParams();
  const [searchParams] = useSearchParams();

  const queryProjectId = searchParams.get('projectId');
  const activeProjectId = routeProjectId || queryProjectId;

  const [selectedProject, setSelectedProject] = useState(null);
  const [loading, setLoading] = useState(() => !selectedProject);

  const fetchProject = useCallback(async () => {
    if (!activeProjectId || !user?.id) {
      setSelectedProject(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data: hasAccess, error: accessError } = await supabase.rpc('fn_has_project_access', {
      p_id: activeProjectId,
      u_id: user.id,
    });

    if (accessError || !hasAccess) {
      setSelectedProject(null);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', activeProjectId)
      .maybeSingle();

    if (error) {
      setSelectedProject(null);
      setLoading(false);
      return;
    }

    setSelectedProject(data || null);
    setLoading(false);
  }, [activeProjectId, user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    void fetchProject();
  }, [fetchProject, user?.id]);

  if (loading) return <LoadingFallback type="spinner" />;

  if (!activeProjectId) {
    return (
      <div className="font-product min-h-[60vh] flex flex-col items-center justify-center text-center px-6 py-10">
        <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-neutral-100 text-neutral-300">
          <Briefcase size={28} />
        </div>
        <h2 className="mt-5 text-xl font-semibold text-neutral-700">
          {t('dashboard.projects.servicesHub.selectProjectTitle')}
        </h2>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-neutral-400">
          {t('dashboard.projects.servicesHub.selectProjectDescription')}
        </p>
        <button
          type="button"
          onClick={() => navigate('/dashboard/projects')}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
        >
          <ArrowLeft size={14} />
          {t('dashboard.projects.servicesHub.backToProjects')}
        </button>
      </div>
    );
  }

  if (!selectedProject) {
    return (
      <div className="font-product min-h-[60vh] flex flex-col items-center justify-center text-center px-6 py-10">
        <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-neutral-100 text-neutral-300">
          <Briefcase size={28} />
        </div>
        <h2 className="mt-5 text-xl font-semibold text-neutral-700">
          {t('dashboard.projects.servicesHub.notFoundTitle')}
        </h2>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-neutral-400">
          {t('dashboard.projects.servicesHub.notFoundDescription')}
        </p>
        <button
          type="button"
          onClick={() => navigate('/dashboard/projects')}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
        >
          <ArrowLeft size={14} />
          {t('dashboard.projects.servicesHub.backToProjects')}
        </button>
      </div>
    );
  }

  const projectTitle = getProjectTitle(selectedProject, t('dashboard.projects.untitled'));
  const hasNotionPage = Boolean(selectedProject?.notion_page_id);

  return (
    <div className="min-h-screen bg-[#f2f2f2] px-6 py-8 font-product md:px-10 md:py-10">
      <div className="mx-auto max-w-[1280px]">
        <motion.div
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={PANEL_SPRING}
          className="mb-12 flex flex-col gap-6 md:flex-row md:items-start md:justify-between"
        >
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={() => navigate('/dashboard/projects')}
              className="mt-1 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/70 bg-white/70 text-neutral-500 shadow-sm backdrop-blur transition hover:text-black"
              title={t('dashboard.projects.servicesHub.backToProjects')}
            >
              <ArrowLeft size={18} />
            </button>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-neutral-400">
                {projectTitle}
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-700 md:text-4xl">
                {t('dashboard.projects.detail.tabs.services')}
              </h1>
            </div>
          </div>

          <p className="max-w-lg text-left text-xl font-medium tracking-tight text-neutral-400 md:pt-4 md:text-right">
            {t('dashboard.projects.servicesHub.subtitle')}
          </p>
        </motion.div>

        {/* Contenido principal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={PANEL_SPRING}
        >
          {hasNotionPage ? (
            <NotionPageView projectId={activeProjectId} />
          ) : (
            <div className="rounded-[28px] border border-neutral-200 bg-[#fafafa] p-6 md:p-8">
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Briefcase size={32} className="mb-3 text-neutral-200" />
                <h3 className="text-lg font-semibold tracking-tight text-neutral-700">
                  No hay Notion configurado
                </h3>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-neutral-400">
                  Este proyecto aún no tiene una página de Notion vinculada. Contacta al administrador para configurar el acceso.
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ProjectTasks;
