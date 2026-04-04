import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Briefcase } from 'lucide-react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import LoadingFallback from '@/components/ui/LoadingFallback';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';

const PANEL_SPRING = {
  type: 'spring',
  stiffness: 230,
  damping: 28,
  mass: 0.9,
};

const getProjectTitle = (project, fallback = 'Proyecto') => {
  return project?.title || project?.name || project?.project_name || fallback;
};

const getProjectLogo = (project) => {
  return project?.profile_image_url || project?.avatar_url || '';
};

const getProjectInitials = (project, fallback = 'DTE') => {
  const title = getProjectTitle(project, fallback);
  const words = title.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return fallback;
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
};

const ProjectTasks = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { projectId: routeProjectId } = useParams();
  const [searchParams] = useSearchParams();

  const queryProjectId = searchParams.get('projectId');
  const activeProjectId = routeProjectId || queryProjectId;

  const locationProjectPreview = location.state?.projectPreview;
  const previewProject =
    locationProjectPreview?.id && locationProjectPreview.id === activeProjectId
      ? locationProjectPreview
      : null;

  const [selectedProject, setSelectedProject] = useState(() => previewProject || null);
  const [loading, setLoading] = useState(() => !previewProject);

  const serviceCards = useMemo(
    () => [
      { key: 'adsCampaign', title: t('dashboard.projects.servicesHub.cards.adsCampaign') },
      { key: 'mailing', title: t('dashboard.projects.servicesHub.cards.mailing') },
      { key: 'meetingsPrimary', title: t('dashboard.projects.servicesHub.cards.meetings') },
      { key: 'meetingsSecondary', title: t('dashboard.projects.servicesHub.cards.meetings') },
      { key: 'meetingsTertiary', title: t('dashboard.projects.servicesHub.cards.meetings') },
    ],
    [t]
  );

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
      console.error('Error validating services hub access:', accessError);
      setSelectedProject(null);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('projects')
      .select('id, title, name, project_name, avatar_url, profile_image_url')
      .eq('id', activeProjectId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching services hub project:', error);
      setSelectedProject(null);
      setLoading(false);
      return;
    }

    setSelectedProject(data || null);
    setLoading(false);
  }, [activeProjectId, user?.id]);

  useEffect(() => {
    if (previewProject) {
      setSelectedProject(previewProject);
      setLoading(false);
      return;
    }
    if (!user?.id) return;
    void fetchProject();
  }, [fetchProject, previewProject, user?.id]);

  if (loading) {
    return <LoadingFallback type="spinner" />;
  }

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
  const projectLogo = getProjectLogo(selectedProject);
  const projectInitials = getProjectInitials(selectedProject);

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

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {serviceCards.map((card, index) => (
            <motion.div
              key={card.key}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...PANEL_SPRING, delay: index * 0.04 }}
              className="min-h-[190px] rounded-[30px] border border-white/70 bg-[#e7e7e7] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] md:min-h-[210px] md:p-8"
            >
              <div className="flex h-full items-center gap-5 md:gap-7">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[12px] bg-[#f7cfcf] p-2 shadow-sm md:h-14 md:w-14 md:rounded-[14px]">
                  {projectLogo ? (
                    <img
                      src={projectLogo}
                      alt={projectTitle}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-700">
                      {projectInitials}
                    </span>
                  )}
                </div>

                <h2 className="max-w-[12ch] text-[2rem] font-medium leading-[0.95] tracking-tight text-neutral-700 md:text-[2.25rem]">
                  {card.title}
                </h2>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProjectTasks;
