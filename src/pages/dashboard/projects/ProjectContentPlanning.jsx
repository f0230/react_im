import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, CalendarDays } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import LoadingFallback from '@/components/ui/LoadingFallback';
import { SocialCalendar } from '@/components/projects/SocialCalendar';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';

const PANEL_SPRING = { type: 'spring', stiffness: 230, damping: 28, mass: 0.9 };

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

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.99 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={PANEL_SPRING}
      className="h-[calc(100dvh-70px)] md:h-[calc(100dvh-96px)] overflow-hidden w-full"
    >
      <SocialCalendar projectId={queryProjectId} canManage={canManage} />
    </motion.div>
  );
};

export default ProjectContentPlanning;
