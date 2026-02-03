import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  FileText,
  BarChart3,
  Download,
  TrendingUp,
  Calendar,
  Search,
  ArrowUpRight,
  Filter,
  MoreVertical,
  CheckCircle,
  Clock
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import LoadingFallback from '@/components/ui/LoadingFallback';

const ProjectReports = () => {
  const { t } = useTranslation();
  const { projectId: routeProjectId } = useParams();
  const { user } = useAuth();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchProject = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('projects').select('*');

    if (routeProjectId) {
      query = query.eq('id', routeProjectId).single();
    } else {
      query = query.eq('user_id', user?.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
    }

    const { data, error } = await query;
    if (!error && data) {
      setProject(data);
    }
    setLoading(false);
  }, [routeProjectId, user?.id]);

  useEffect(() => {
    if (user?.id) {
      fetchProject();
    }
  }, [fetchProject, user?.id]);

  if (loading) return <LoadingFallback type="spinner" />;

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-white/50 backdrop-blur-sm rounded-[30px] border border-white/20">
        <BarChart3 className="w-16 h-16 text-neutral-300 mb-4" />
        <h2 className="text-2xl font-bold text-neutral-800">No se encontraron informes</h2>
        <p className="text-neutral-500 mt-2 max-w-md">Aquí aparecerán los informes y métricas de rendimiento de tu proyecto.</p>
        <Link to="/dashboard" className="mt-6 px-6 py-3 bg-black text-white rounded-full font-bold hover:bg-neutral-800 transition-all">
          Volver al Inicio
        </Link>
      </div>
    );
  }

  // Mock reports
  const reports = [
    {
      id: 1,
      title: 'Auditoría de SEO Semanal',
      date: '2024-03-28',
      size: '2.4 MB',
      type: 'PDF',
      status: 'ready',
      category: 'Marketing'
    },
    {
      id: 2,
      title: 'Reporte de Performance Ads - Marzo',
      date: '2024-03-25',
      size: '1.1 MB',
      type: 'PDF',
      status: 'ready',
      category: 'Publicidad'
    },
    {
      id: 3,
      title: 'Diagnóstico de UX / UI',
      date: '2024-03-20',
      size: '4.8 MB',
      type: 'PDF',
      status: 'processing',
      category: 'Diseño'
    },
    {
      id: 4,
      title: 'Resumen de Conversiones Q1',
      date: '2024-03-15',
      size: '850 KB',
      type: 'XLSX',
      status: 'ready',
      category: 'Estrategia'
    }
  ];

  return (
    <div className="font-product text-neutral-900 pb-16">
      <div className="mb-10">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-skyblue font-bold mb-2">
          <TrendingUp size={14} />
          Portal de Reportes
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-neutral-900 tracking-tight">
          Informes & Métricas
        </h1>
        <p className="text-neutral-500 mt-3 max-w-2xl text-lg">
          Accede a los resultados detallados y el seguimiento de KPIs de tu proyecto.
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {[
          { label: 'Informes Totales', value: '12', icon: FileText, color: 'text-blue-500' },
          { label: 'Crecimiento Mes', value: '+14.5%', icon: TrendingUp, color: 'text-green' },
          { label: 'Próximo Reporte', value: 'En 3 días', icon: Calendar, color: 'text-amber-500' },
          { label: 'KPIs Activos', value: '4/5', icon: BarChart3, color: 'text-purple-500' }
        ].map((stat, i) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={i}
            className="bg-white p-6 rounded-[28px] border border-neutral-100 shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-4 mb-3">
              <div className={`p-3 rounded-2xl bg-neutral-50 ${stat.color} group-hover:scale-110 transition-transform`}>
                <stat.icon size={20} />
              </div>
              <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold">{stat.label}</span>
            </div>
            <div className="text-2xl font-black tracking-tight">{stat.value}</div>
          </motion.div>
        ))}
      </div>

      {/* Reports List */}
      <div className="bg-white rounded-[32px] border border-neutral-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-neutral-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
            <input
              type="text"
              placeholder="Buscar informes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-neutral-50 rounded-full py-3.5 pl-12 pr-6 text-sm border-transparent focus:bg-white focus:border-skyblue transition-all outline-none"
            />
          </div>
          <div className="flex items-center gap-3">
            <button className="p-3 rounded-full hover:bg-neutral-50 text-neutral-500 transition-colors border border-neutral-100">
              <Filter size={18} />
            </button>
            <button className="flex items-center gap-2 px-6 py-3.5 bg-black text-white rounded-full text-sm font-bold shadow-lg hover:bg-neutral-800 transition-all">
              Programar Informe
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-neutral-50/50">
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-neutral-400">Informe</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-neutral-400">Categoría</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-neutral-400">Fecha</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-neutral-400">Estado</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-neutral-400">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {reports.map((report, idx) => (
                <motion.tr
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 * idx }}
                  key={report.id}
                  className="hover:bg-neutral-50/30 transition-colors group"
                >
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-500 group-hover:bg-black group-hover:text-white transition-all">
                        <FileText size={20} />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-neutral-800">{report.title}</div>
                        <div className="text-[10px] text-neutral-400 mt-0.5">{report.size} • {report.type}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-xs font-medium px-3 py-1 rounded-full bg-neutral-100 text-neutral-600">
                      {report.category}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="text-xs font-bold text-neutral-800">{report.date}</div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      {report.status === 'ready' ? (
                        <>
                          <CheckCircle size={14} className="text-green" />
                          <span className="text-[10px] font-black uppercase tracking-tighter text-green">Listo</span>
                        </>
                      ) : (
                        <>
                          <Clock size={14} className="text-amber-500" />
                          <span className="text-[10px] font-black uppercase tracking-tighter text-amber-500">Procesando</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    {report.status === 'ready' ? (
                      <button className="p-2 rounded-xl hover:bg-black hover:text-white text-neutral-400 transition-all border border-transparent hover:border-black shadow-sm group-hover:shadow-md">
                        <Download size={18} />
                      </button>
                    ) : (
                      <button disabled className="p-2 rounded-xl text-neutral-200 border border-transparent cursor-not-allowed">
                        <MoreVertical size={18} />
                      </button>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-8 border-t border-neutral-100 bg-neutral-50/20 text-center">
          <p className="text-xs text-neutral-400 font-medium italic">
            Mostrando {reports.length} informes recientes. Para ver el histórico completo, contacta a tu gestor.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProjectReports;
