import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, CalendarDays } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import LoadingFallback from '@/components/ui/LoadingFallback';
import { SocialCalendar } from '@/components/projects/SocialCalendar';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';

const PANEL_SPRING = {
  type: 'spring',
  stiffness: 230,
  damping: 28,
  mass: 0.9,
};

const getProjectInitials = (project) => {
  const title = project?.title || project?.name || project?.project_name || 'DTE';
  const words = title.trim().split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words.slice(0, 2).map((word) => word[0]).join('').toUpperCase();
};

const ProjectContentPlanning = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryProjectId = searchParams.get('projectId');
  const { user, profile } = useAuth();

  const [selectedProject, setSelectedProject] = useState(null);
  const [loading, setLoading] = useState(true);

  const canManage = profile?.role === 'admin' || profile?.role === 'worker';

  const fetchProject = useCallback(async () => {
    if (!queryProjectId) {
      setSelectedProject(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from('projects')
      .select('id, title, name, project_name, avatar_url, profile_image_url')
      .eq('id', queryProjectId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching content planning project:', error);
      setSelectedProject(null);
      setLoading(false);
      return;
    }

    if (!data) {
      setSelectedProject(null);
      setLoading(false);
      return;
    }

    const { data: hasAccess, error: accessError } = await supabase
      .rpc('fn_has_project_access', { p_id: queryProjectId, u_id: user?.id });

    if (accessError || !hasAccess) {
      console.error('Error validating content planning access:', accessError);
      setSelectedProject(null);
    } else {
      setSelectedProject(data || null);
    }

    setLoading(false);
  }, [queryProjectId, user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    fetchProject();
  }, [fetchProject, user?.id]);

  if (loading) {
    return <LoadingFallback type="spinner" />;
  }

  if (!queryProjectId) {
    return (
      <div className="font-product min-h-[60vh] flex flex-col items-center justify-center text-center p-8">
        <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center mb-4">
          <CalendarDays size={28} className="text-neutral-300" />
        </div>
        <h2 className="text-xl font-black text-neutral-700 mb-2">Seleccioná un proyecto</h2>
        <p className="text-sm text-neutral-400 mb-6 max-w-xs leading-relaxed">
          La planificación de contenido se abre desde la tarjeta de cada proyecto.
        </p>
        <button
          onClick={() => navigate('/dashboard/projects')}
          className="flex items-center gap-2 px-5 py-2.5 bg-black text-white text-sm font-bold rounded-full hover:bg-neutral-800 transition-all shadow-md"
        >
          <ArrowLeft size={14} /> Ir a Proyectos
        </button>
      </div>
    );
  }

  const title = selectedProject?.title || selectedProject?.name || selectedProject?.project_name || 'Planificación de contenido';
  const projectAvatar = selectedProject?.profile_image_url || selectedProject?.avatar_url;

  return (
    <div className="font-product min-h-screen md:min-h-[calc(100vh-140px)] w-full px-0 flex flex-col justify-start py-0 overflow-hidden">
      <div className="flex flex-col gap-2 md:gap-3 lg:gap-4 h-[calc(100dvh-70px)] md:h-[calc(100dvh-96px)] overflow-hidden w-full relative">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={PANEL_SPRING}
          className="flex items-center gap-4 bg-white rounded-[24px] md:rounded-[32px] border border-neutral-100 shadow-sm px-5 py-4 md:px-6 md:py-5"
        >
          <button
            onClick={() => navigate('/dashboard/projects')}
            className="shrink-0 p-2.5 bg-neutral-50 rounded-full shadow-sm hover:shadow-md transition-all text-neutral-500 hover:text-black"
            title="Volver a proyectos"
          >
            <ArrowLeft size={16} />
          </button>

          <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-sky-300 via-cyan-300 to-teal-400 shadow-md flex items-center justify-center text-sm font-black text-black overflow-hidden shrink-0">
            {projectAvatar ? (
              <img src={projectAvatar} alt={title} className="w-full h-full object-cover" />
            ) : (
              getProjectInitials(selectedProject || { title: 'Contenido' })
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[0.22em] text-neutral-400 font-black">
              Planificación de contenido
            </p>
            <h1 className="text-lg md:text-2xl font-black text-neutral-800 truncate">
              {title}
            </h1>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={PANEL_SPRING}
          className="flex-1 flex flex-col bg-[#EBEBEB] rounded-[24px] md:rounded-[32px] overflow-hidden transition-all h-full"
        >
          <SocialCalendar projectId={queryProjectId} canManage={canManage} />
        </motion.div>
      </div>
    </div>
  );
};

export default ProjectContentPlanning;
