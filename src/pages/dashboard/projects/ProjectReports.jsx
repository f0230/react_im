import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  UploadCloud,
  FileText,
  TrendingUp,
  Download,
  Sparkles,
  Copy,
  CheckCircle2,
  AlertCircle,
  Plus,
  X,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import LoadingFallback from '@/components/ui/LoadingFallback';

const METRIC_FIELDS = [
  { key: 'reach', label: 'Reach' },
  { key: 'impressions', label: 'Impresiones' },
  { key: 'clicks', label: 'Clicks' },
  { key: 'spend', label: 'Spend' },
  { key: 'leads', label: 'Leads' },
];

const getProjectTitle = (project) => (
  project?.title || project?.name || project?.project_name || 'Proyecto sin nombre'
);

const toNumeric = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const normalized = String(value).replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatDate = (value) => {
  if (!value) return 'N/D';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'N/D';
  return parsed.toLocaleDateString('es-AR');
};

const formatMetricValue = (key, value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return 'N/D';
  const numberValue = Number(value);
  if (key === 'spend') {
    return `$${numberValue.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return numberValue.toLocaleString('es-AR');
};

const percentChange = (current, previous) => {
  const c = Number(current);
  const p = Number(previous);
  if (!Number.isFinite(c) || !Number.isFinite(p) || p === 0) return null;
  return ((c - p) / Math.abs(p)) * 100;
};

const sanitizeFileName = (value) => (
  String(value || 'informe.pdf')
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9._-]/g, '')
);

const normalizeMetrics = (value) => {
  if (!value || typeof value !== 'object') return {};
  return METRIC_FIELDS.reduce((acc, item) => {
    acc[item.key] = toNumeric(value[item.key]);
    return acc;
  }, {});
};

const safeJson = async (response) => {
  try {
    return await response.json();
  } catch {
    return {};
  }
};

const ProjectReports = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryProjectId = searchParams.get('projectId');
  const { user, profile, client } = useAuth();

  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(queryProjectId || '');
  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [copyNotice, setCopyNotice] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isAdmin = profile?.role === 'admin';
  const isWorker = profile?.role === 'worker';
  const isClient = profile?.role === 'client';
  const isClientLeader = isClient && (profile?.is_client_leader || client?.user_id === user?.id);
  const canUploadReports = isAdmin || isWorker;

  const getApiToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  }, []);

  const fetchProjects = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    setError('');
    let response;

    if (isAdmin) {
      response = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });
    } else if (isWorker) {
      const { data: assignments } = await supabase
        .from('project_assignments')
        .select('project_id')
        .eq('worker_id', user.id);
      const projectIds = assignments?.map((item) => item.project_id) || [];

      if (projectIds.length === 0) {
        response = { data: [] };
      } else {
        response = await supabase
          .from('projects')
          .select('*')
          .in('id', projectIds)
          .order('created_at', { ascending: false });
      }
    } else if (isClient) {
      const { data: clientUserAssignmentsData } = await supabase
        .from('project_client_users')
        .select('project_id')
        .eq('user_id', user.id);

      const assignedByUserId = clientUserAssignmentsData?.map((item) => item.project_id) || [];

      let assignedByClientId = [];
      const effectiveClientId = client?.id || profile?.client_id;

      if (isClientLeader && effectiveClientId) {
        const { data: companyAssignmentsData } = await supabase
          .from('project_clients')
          .select('project_id')
          .eq('client_id', effectiveClientId);
        assignedByClientId = companyAssignmentsData?.map((item) => item.project_id) || [];
      }

      const allAssignedProjectIds = Array.from(new Set([...assignedByUserId, ...assignedByClientId]));
      let query = supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      const filters = [];
      filters.push(`user_id.eq.${user.id}`);

      if (isClientLeader && effectiveClientId) {
        filters.push(`client_id.eq.${effectiveClientId}`);
      }
      if (allAssignedProjectIds.length > 0) {
        filters.push(`id.in.(${allAssignedProjectIds.join(',')})`);
      }

      query = query.or(filters.join(','));
      response = await query;
    } else {
      response = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
    }

    const { data, error: fetchError } = response || {};

    if (fetchError) {
      setError(fetchError.message || 'No se pudieron cargar los proyectos.');
      setProjects([]);
      setLoading(false);
      return;
    }

    const rows = data || [];
    setProjects(rows);

    if (rows.length === 0) {
      setSelectedProjectId('');
      setLoading(false);
      return;
    }

    const requested = queryProjectId && rows.some((p) => p.id === queryProjectId) ? queryProjectId : null;
    const nextId = requested || rows[0].id;
    setSelectedProjectId(nextId);
    setLoading(false);
  }, [client?.id, client?.user_id, isAdmin, isClient, isClientLeader, isWorker, profile?.client_id, queryProjectId, user?.id]);

  const fetchReports = useCallback(async (projectId) => {
    if (!projectId) {
      setReports([]);
      return;
    }
    setReportsLoading(true);
    setError('');

    const { data, error: fetchError } = await supabase
      .from('project_reports')
      .select('*')
      .eq('project_id', projectId)
      .order('period_end', { ascending: false })
      .order('created_at', { ascending: false });

    if (fetchError) {
      if (String(fetchError.message || '').toLowerCase().includes('project_reports')) {
        setError('Falta la tabla project_reports. Aplicá la migración de reportes para habilitar este módulo.');
      } else {
        setError(fetchError.message || 'No se pudieron cargar los informes.');
      }
      setReports([]);
      setReportsLoading(false);
      return;
    }

    setReports(data || []);
    setReportsLoading(false);
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    fetchProjects();
  }, [fetchProjects, user?.id]);

  useEffect(() => {
    if (!selectedProjectId) return;
    if (queryProjectId === selectedProjectId) return;
    const next = new URLSearchParams(searchParams);
    next.set('projectId', selectedProjectId);
    setSearchParams(next, { replace: true });
  }, [queryProjectId, searchParams, selectedProjectId, setSearchParams]);

  useEffect(() => {
    if (!queryProjectId) return;
    if (queryProjectId === selectedProjectId) return;
    if (!projects.some((item) => item.id === queryProjectId)) return;
    setSelectedProjectId(queryProjectId);
  }, [projects, queryProjectId, selectedProjectId]);

  useEffect(() => {
    if (!selectedProjectId) return;
    fetchReports(selectedProjectId);
  }, [fetchReports, selectedProjectId]);

  const aiContextHistory = useMemo(() => {
    const recent = reports
      .filter((item) => typeof item.ai_context_text === 'string' && item.ai_context_text.trim().length > 0)
      .slice(0, 6);
    if (!recent.length) return '';

    return recent
      .map((item, index) => `Informe ${index + 1}\n${item.ai_context_text}`)
      .join('\n\n---\n\n');
  }, [reports]);

  const handleProjectChange = (projectId) => {
    setSelectedProjectId(projectId);
    setNotice('');
    setError('');
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedFile(null);
    const input = document.getElementById('report-pdf-input');
    if (input) input.value = '';
  };

  const openModal = () => {
    if (!canUploadReports) return;
    setError('');
    setNotice('');
    setIsModalOpen(true);
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedProjectId || !user?.id) return;
    if (!canUploadReports) {
      setError('Solo administradores y workers pueden cargar informes.');
      return;
    }

    setNotice('');
    setError('');

    if (!selectedFile) {
      setError('Adjuntá un PDF para guardar el informe.');
      return;
    }

    if (!String(selectedFile.type || '').includes('pdf')) {
      setError('El archivo debe ser un PDF.');
      return;
    }

    setSubmitting(true);
    const safeName = sanitizeFileName(selectedFile.name || 'informe.pdf');
    const uniqueName = `${Date.now()}_${Math.random().toString(36).slice(2)}_${safeName}`;
    const primaryPath = `${selectedProjectId}/${uniqueName}`;
    const fallbackPath = `reports/${selectedProjectId}/${uniqueName}`;

    try {
      const { data: hasAccess, error: accessError } = await supabase
        .rpc('fn_has_project_access', { p_id: selectedProjectId, u_id: user.id });
      if (accessError || !hasAccess) {
        throw new Error('No tenés acceso al proyecto seleccionado para cargar informes.');
      }

      let usedBucket = 'project-reports';
      let usedPath = primaryPath;

      const { error: primaryUploadError } = await supabase.storage
        .from('project-reports')
        .upload(primaryPath, selectedFile, { upsert: false });

      if (primaryUploadError) {
        usedBucket = 'service-attachments';
        usedPath = fallbackPath;
        const { error: fallbackUploadError } = await supabase.storage
          .from('service-attachments')
          .upload(fallbackPath, selectedFile, { upsert: false });

        if (fallbackUploadError) {
          const primaryMsg = primaryUploadError.message || 'error desconocido';
          const fallbackMsg = fallbackUploadError.message || 'error desconocido';
          throw new Error(`No se pudo subir el PDF. project-reports: ${primaryMsg} | service-attachments: ${fallbackMsg}`);
        }
      }

      const { data: publicData } = supabase.storage
        .from(usedBucket)
        .getPublicUrl(usedPath);

      const pdfUrl = publicData?.publicUrl || '';
      if (!pdfUrl) {
        throw new Error('No se pudo obtener la URL pública del PDF.');
      }

      const token = await getApiToken();
      if (!token) {
        throw new Error('Sesión inválida. Volvé a iniciar sesión.');
      }

      const response = await fetch('/api/reports-ocr-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          projectId: selectedProjectId,
          pdfUrl,
          pdfPath: `${usedBucket}/${usedPath}`,
          pdfName: selectedFile.name,
          fileSize: selectedFile.size,
        }),
      });

      const payload = await safeJson(response);
      if (!response.ok) {
        await supabase.storage.from(usedBucket).remove([usedPath]);
        throw new Error(payload?.error || payload?.detail || 'No se pudo procesar el PDF con OCR.');
      }

      setSelectedFile(null);
      const input = document.getElementById('report-pdf-input');
      if (input) input.value = '';
      setNotice('Informe procesado con OCR + IA y guardado correctamente.');
      closeModal();
      await fetchReports(selectedProjectId);
    } catch (submitError) {
      setError(submitError?.message || 'No se pudo guardar el informe.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyContext = async () => {
    if (!aiContextHistory) return;
    try {
      await navigator.clipboard.writeText(aiContextHistory);
      setCopyNotice('Contexto copiado al portapapeles.');
      setTimeout(() => setCopyNotice(''), 2000);
    } catch {
      setCopyNotice('No se pudo copiar el contexto.');
      setTimeout(() => setCopyNotice(''), 2000);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <LoadingFallback type="spinner" />
      </div>
    );
  }

  return (
    <div className="font-product text-neutral-900 pb-16 space-y-8">
      <div className="bg-white rounded-[32px] border border-neutral-100 shadow-sm p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-end gap-4 md:gap-6">
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-black">Informes</p>
            <h1 className="text-2xl md:text-3xl font-black mt-2">PDF + OCR + resumen IA</h1>
            <p className="text-sm text-neutral-500 mt-2">
              Subí el PDF y el sistema extrae métricas automáticamente con Mistral + OpenAI.
            </p>
          </div>
          <div className="w-full md:w-[320px]">
            <label htmlFor="report-project" className="text-[10px] uppercase tracking-widest text-neutral-400 font-black">
              Proyecto
            </label>
            <select
              id="report-project"
              value={selectedProjectId}
              onChange={(event) => handleProjectChange(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-800 focus:outline-none focus:border-black"
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {getProjectTitle(project)}
                </option>
              ))}
            </select>
          </div>
          {canUploadReports ? (
            <button
              type="button"
              onClick={openModal}
              disabled={!selectedProjectId}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-black px-5 py-3 text-sm font-bold text-white hover:bg-neutral-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={16} />
              Nuevo informe
            </button>
          ) : (
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-xs text-neutral-600">
              Solo administradores y workers pueden cargar informes.
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {notice && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 flex items-start gap-2">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      <div className="bg-white rounded-[32px] border border-neutral-100 shadow-sm p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-amber-500" />
            <h2 className="text-lg font-black">Contexto para IA (últimos 6)</h2>
          </div>
          <button
            type="button"
            onClick={handleCopyContext}
            disabled={!aiContextHistory}
            className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2 text-xs font-bold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Copy size={14} />
            Copiar contexto
          </button>
        </div>
        <pre className="mt-4 max-h-[260px] overflow-auto rounded-2xl bg-neutral-50 border border-neutral-200 p-4 text-xs leading-relaxed text-neutral-700 whitespace-pre-wrap">
          {aiContextHistory || 'Todavía no hay contexto generado. Cargá el primer informe para iniciar el historial.'}
        </pre>
        {copyNotice && (
          <p className="mt-3 text-xs font-semibold text-neutral-500">{copyNotice}</p>
        )}
      </div>

      <div className="bg-white rounded-[32px] border border-neutral-100 shadow-sm p-6 md:p-8">
        <div className="flex items-center gap-2 mb-5">
          <TrendingUp size={18} className="text-skyblue" />
          <h2 className="text-lg font-black">Timeline de informes</h2>
        </div>

        {reportsLoading ? (
          <div className="py-12 flex justify-center">
            <LoadingFallback type="spinner" />
          </div>
        ) : reports.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center">
            <FileText size={34} className="mx-auto text-neutral-300 mb-2" />
            <p className="text-xs uppercase tracking-widest text-neutral-400 font-bold">
              Todavía no hay informes para este proyecto
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report, index) => {
              const currentMetrics = normalizeMetrics(report.metrics_jsonb);
              const previousReport = reports[index + 1] || null;
              const previousMetrics = normalizeMetrics(previousReport?.metrics_jsonb);

              return (
                <article key={report.id} className="rounded-2xl border border-neutral-200 bg-white p-5">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-black">Periodo</p>
                      <h3 className="text-base font-black mt-1">
                        {formatDate(report.period_start)} - {formatDate(report.period_end)}
                      </h3>
                      <p className="text-xs text-neutral-500 mt-1">
                        Subido el {formatDate(report.created_at)} · {report.source || 'manual'}
                      </p>
                    </div>

                    <a
                      href={report.pdf_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-200 px-3 py-2 text-xs font-bold text-neutral-700 hover:bg-neutral-50"
                    >
                      <Download size={14} />
                      Descargar PDF
                    </a>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-5">
                    {METRIC_FIELDS.map((metric) => {
                      const current = currentMetrics[metric.key];
                      const previous = previousMetrics[metric.key];
                      const delta = percentChange(current, previous);
                      const deltaText = delta === null
                        ? 'Sin base'
                        : `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%`;

                      return (
                        <div key={metric.key} className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                          <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-black">{metric.label}</p>
                          <p className="text-sm font-black text-neutral-900 mt-1">
                            {formatMetricValue(metric.key, current)}
                          </p>
                          <p className={`text-[10px] font-bold mt-1 ${delta === null ? 'text-neutral-400' : delta >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {deltaText}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {report.operational_comment && (
                    <div className="mt-4 rounded-xl border border-neutral-200 p-3">
                      <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-black">Resumen operativo</p>
                      <p className="text-sm text-neutral-700 mt-1">{report.operational_comment}</p>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && canUploadReports && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 font-product">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 16 }}
              className="relative w-full max-w-2xl rounded-[32px] bg-white border border-neutral-100 shadow-2xl p-6 md:p-8"
            >
              <div className="flex items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <UploadCloud size={18} className="text-skyblue" />
                  <h2 className="text-xl font-black">Nuevo informe</h2>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  className="p-2 rounded-full hover:bg-neutral-100 transition-colors"
                  aria-label="Cerrar"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="text-sm text-neutral-600 mb-5">
                Subí un PDF. El sistema ejecuta OCR con Mistral, resume con OpenAI y completa automáticamente métricas + contexto.
              </p>

              <form onSubmit={handleSubmit}>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black">Archivo PDF</label>
                  <input
                    id="report-pdf-input"
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileChange}
                    className="mt-2 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm file:mr-2 file:rounded-lg file:border-0 file:bg-neutral-100 file:px-2 file:py-1 file:text-xs file:font-bold"
                    required
                  />
                </div>

                <div className="mt-6 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="inline-flex items-center gap-2 rounded-2xl border border-neutral-200 px-5 py-3 text-sm font-bold text-neutral-700 hover:bg-neutral-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !selectedProjectId}
                    className="inline-flex items-center gap-2 rounded-2xl bg-black px-5 py-3 text-sm font-bold text-white hover:bg-neutral-800 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <UploadCloud size={16} />
                    {submitting ? 'Procesando OCR...' : 'Subir y procesar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProjectReports;
