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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (value) => typeof value === 'string' && UUID_RE.test(value);

const ProjectTasks = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const canEditNotion = profile?.role === 'admin';
  const { projectId: routeProjectId, pageId: routePageId } = useParams();
  const [searchParams] = useSearchParams();

  const queryProjectId = searchParams.get('projectId');
  const activeProjectId = routeProjectId || queryProjectId;
  const notionBasePath = activeProjectId
    ? `/dashboard/projects/${activeProjectId}/services`
    : null;

  const [selectedProject, setSelectedProject] = useState(null);
  const [loading, setLoading] = useState(() => !selectedProject);

  const fetchProject = useCallback(async () => {
    if (!activeProjectId || !user?.id) {
      setSelectedProject(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    // El identificador de la URL puede ser el UUID o el slug del proyecto.
    // La RLS de `projects` ya filtra por acceso, así que un row encontrado = acceso concedido.
    const lookupColumn = isUuid(activeProjectId) ? 'id' : 'slug';
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq(lookupColumn, activeProjectId)
      .maybeSingle();

    if (error || !data) {
      setSelectedProject(null);
      setLoading(false);
      return;
    }

    setSelectedProject(data);
    setLoading(false);
  }, [activeProjectId, user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    void fetchProject();
  }, [fetchProject, user?.id]);

  // URL canónica: si entramos por UUID y el proyecto tiene slug, redirigir a la versión legible.
  useEffect(() => {
    const slug = selectedProject?.slug;
    if (!slug || !routeProjectId || routeProjectId === slug) return;
    const tail = routePageId ? `/${routePageId}` : '';
    navigate(`/dashboard/projects/${slug}/services${tail}`, { replace: true });
  }, [selectedProject?.slug, routeProjectId, routePageId, navigate]);

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
        {/* Contenido principal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={PANEL_SPRING}
        >
          {hasNotionPage ? (
            <NotionPageView
              projectId={selectedProject.id}
              pageId={routePageId || null}
              basePath={notionBasePath}
              projectTitle={projectTitle}
              onBackToProjects={() => navigate('/dashboard/projects')}
              canEdit={canEditNotion}
            />
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
