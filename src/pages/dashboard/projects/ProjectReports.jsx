import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  UploadCloud,
  Download,
  Expand,
  AlertCircle,
  CheckCircle2,
  Plus,
  X,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import LoadingFallback from '@/components/ui/LoadingFallback';

const getProjectTitle = (project) => (
  project?.title || project?.name || project?.project_name || 'Proyecto sin nombre'
);

const sanitizeFileName = (value) => (
  String(value || 'informe.pdf')
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9._-]/g, '')
);

const toProjectFolderName = (project) => {
  const raw = getProjectTitle(project);
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'proyecto';
};

const toNumberOrNull = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeMetrics = (value) => {
  const source = value && typeof value === 'object' ? value : {};
  return {
    reach: toNumberOrNull(source.reach),
    impressions: toNumberOrNull(source.impressions),
    clicks: toNumberOrNull(source.clicks),
    spend: toNumberOrNull(source.spend),
    leads: toNumberOrNull(source.leads),
  };
};

const formatMetricValue = (key, value) => {
  if (value === null || value === undefined) return 'N/D';
  if (key === 'spend') {
    return `$${Number(value).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return Number(value).toLocaleString('es-AR');
};

const reportMonthLabel = (report) => {
  const value = report?.period_start || report?.created_at;
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  return date.toLocaleDateString('es-AR', { year: 'numeric', month: 'long' });
};

const currentMonthValue = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${now.getFullYear()}-${month}`;
};

const safeJson = async (response) => {
  try {
    return await response.json();
  } catch {
    return {};
  }
};

const ProjectReports = () => {
  const [searchParams] = useSearchParams();
  const queryProjectId = searchParams.get('projectId');
  const { user, profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [reportMonth, setReportMonth] = useState(currentMonthValue());
  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [previewReport, setPreviewReport] = useState(null);

  const isAdmin = profile?.role === 'admin';
  const isWorker = profile?.role === 'worker';
  const canUploadReports = isAdmin || isWorker;

  const getApiToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  }, []);

  const fetchProject = useCallback(async () => {
    setLoading(true);
    setError('');

    if (!queryProjectId) {
      setProject(null);
      setLoading(false);
      return;
    }

    const { data, error: fetchError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', queryProjectId)
      .maybeSingle();

    if (fetchError) {
      setError(fetchError.message || 'No se pudo cargar el proyecto.');
      setProject(null);
      setLoading(false);
      return;
    }

    if (!data) {
      setError('No se encontró el proyecto solicitado.');
      setProject(null);
      setLoading(false);
      return;
    }

    const { data: hasAccess, error: accessError } = await supabase
      .rpc('fn_has_project_access', { p_id: queryProjectId, u_id: user?.id });

    if (accessError || !hasAccess) {
      setError('No tenés acceso a este proyecto.');
      setProject(null);
      setLoading(false);
      return;
    }

    setProject(data);
    setLoading(false);
  }, [queryProjectId, user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    fetchProject();
  }, [fetchProject, user?.id]);

  const fetchReports = useCallback(async (projectId) => {
    if (!projectId) {
      setReports([]);
      return;
    }
    setReportsLoading(true);
    const { data, error: fetchError } = await supabase
      .from('project_reports')
      .select('*')
      .eq('project_id', projectId)
      .order('period_start', { ascending: false })
      .order('created_at', { ascending: false });

    if (fetchError) {
      setError(fetchError.message || 'No se pudieron cargar los informes.');
      setReports([]);
      setReportsLoading(false);
      return;
    }

    setReports(data || []);
    setReportsLoading(false);
  }, []);

  useEffect(() => {
    if (!project?.id) return;
    fetchReports(project.id);
  }, [fetchReports, project?.id]);

  const canOpenModal = useMemo(
    () => canUploadReports && Boolean(project?.id),
    [canUploadReports, project?.id]
  );

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedFile(null);
    setReportMonth(currentMonthValue());
    const input = document.getElementById('report-pdf-input');
    if (input) input.value = '';
  };

  const openModal = () => {
    if (!canOpenModal) return;
    setError('');
    setNotice('');
    setIsModalOpen(true);
  };

  const openPreview = (report) => {
    setPreviewReport(report);
  };

  const closePreview = () => {
    setPreviewReport(null);
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!project?.id || !user?.id) return;

    if (!canUploadReports) {
      setError('Solo administradores y workers pueden cargar informes.');
      return;
    }

    setNotice('');
    setError('');

    if (!reportMonth || !/^\d{4}-\d{2}$/.test(reportMonth)) {
      setError('Seleccioná un mes válido para el informe.');
      return;
    }

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
    const projectFolder = toProjectFolderName(project);
    const primaryPath = `${projectFolder}/${project.id}/${reportMonth}/${uniqueName}`;
    const fallbackPath = `reports/${projectFolder}/${project.id}/${reportMonth}/${uniqueName}`;

    try {
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
          throw new Error(
            `No se pudo subir el PDF. project-reports: ${primaryUploadError.message || 'error'} | service-attachments: ${fallbackUploadError.message || 'error'}`
          );
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
          projectId: project.id,
          reportMonth,
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

      setNotice('Informe procesado con OCR y resumen IA. Se guardó correctamente.');
      closeModal();
      await fetchReports(project.id);
    } catch (submitError) {
      setError(submitError?.message || 'No se pudo guardar el informe.');
    } finally {
      setSubmitting(false);
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
    <div className="font-product text-neutral-900 pb-16 space-y-6">
      <div className="bg-white rounded-[32px] border border-neutral-100 shadow-sm p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-black">Informes</p>
            <h1 className="text-2xl md:text-3xl font-black mt-2">
              {project ? getProjectTitle(project) : 'Proyecto no disponible'}
            </h1>
            <p className="text-sm text-neutral-500 mt-2">
              Subí un informe PDF mensual. El sistema usa OCR y genera resumen con puntos clave.
            </p>
          </div>

          {canUploadReports ? (
            <button
              type="button"
              onClick={openModal}
              disabled={!canOpenModal}
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

      {!queryProjectId && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Abrí esta sección desde un proyecto para cargar el informe en contexto.
        </div>
      )}

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
        <h2 className="text-lg font-black mb-5">Informes cargados</h2>

        {reportsLoading ? (
          <div className="py-12 flex justify-center">
            <LoadingFallback type="spinner" />
          </div>
        ) : reports.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center text-neutral-500 text-sm">
            Todavía no hay informes cargados para este proyecto.
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => {
              const metrics = normalizeMetrics(report.metrics_jsonb);
              const summary = String(report.operational_comment || report.ai_context_text || '').split('\n')[0] || 'Sin resumen disponible.';
              const metricList = [
                { key: 'reach', label: 'Reach', value: metrics.reach },
                { key: 'impressions', label: 'Impresiones', value: metrics.impressions },
                { key: 'leads', label: 'Leads', value: metrics.leads },
              ];

              return (
                <article key={report.id} className="rounded-2xl border border-neutral-200 p-4 md:p-5">
                  <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4">
                    <div className="rounded-xl border border-neutral-200 bg-neutral-50 overflow-hidden">
                      <div
                        className="relative h-[240px] md:h-[300px] overflow-auto [&::-webkit-scrollbar]:hidden"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                      >
                      <iframe
                        title={`preview-${report.id}`}
                        src={`${report.pdf_url}#page=1&toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                        className="w-full h-full"
                      />
                        <div className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-white/70 to-transparent" />
                      </div>
                      <div className="border-t border-neutral-200 p-2">
                        <button
                          type="button"
                          onClick={() => openPreview(report)}
                          className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-bold text-neutral-700 hover:bg-neutral-50"
                        >
                          <Expand size={14} />
                          Ampliar vista
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-black">Informe</p>
                          <h3 className="text-base font-black">{reportMonthLabel(report)}</h3>
                          <p className="text-xs text-neutral-500 mt-1">
                            Cargado: {new Date(report.created_at).toLocaleDateString('es-AR')}
                          </p>
                        </div>
                        <a
                          href={report.pdf_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-200 px-3 py-2 text-xs font-bold text-neutral-700 hover:bg-neutral-50"
                        >
                          <Download size={14} />
                          Descargar informe
                        </a>
                      </div>

                      <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                        <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-black">Resumen</p>
                        <p className="text-sm text-neutral-700 mt-1">{summary}</p>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        {metricList.map((item) => (
                          <div key={item.key} className="rounded-lg border border-neutral-200 bg-white px-2 py-2">
                            <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-black">{item.label}</p>
                            <p className="text-xs font-bold text-neutral-800 mt-1">{formatMetricValue(item.key, item.value)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
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
              className="relative w-full max-w-xl rounded-[32px] bg-white border border-neutral-100 shadow-2xl p-6 md:p-8"
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

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-black">Mes del informe</label>
                  <input
                    type="month"
                    value={reportMonth}
                    onChange={(event) => setReportMonth(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-black"
                    required
                  />
                </div>

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

                <div className="mt-4 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="inline-flex items-center gap-2 rounded-2xl border border-neutral-200 px-5 py-3 text-sm font-bold text-neutral-700 hover:bg-neutral-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !project?.id}
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

      <AnimatePresence>
        {previewReport && (
          <div className="fixed inset-0 z-[140] flex items-center justify-center p-3 md:p-4 font-product">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closePreview}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.98, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.98, opacity: 0, y: 10 }}
              className="relative w-full max-w-6xl rounded-[24px] bg-white border border-neutral-100 shadow-2xl p-3 md:p-4"
            >
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-black">Previsualizacion</p>
                  <h3 className="text-sm md:text-base font-black">{reportMonthLabel(previewReport)}</h3>
                </div>
                <button
                  type="button"
                  onClick={closePreview}
                  className="p-2 rounded-full hover:bg-neutral-100 transition-colors"
                  aria-label="Cerrar previsualizacion"
                >
                  <X size={18} />
                </button>
              </div>

              <div
                className="h-[82vh] overflow-auto rounded-xl border border-neutral-200 bg-neutral-50 [&::-webkit-scrollbar]:hidden"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                <iframe
                  title={`preview-large-${previewReport.id}`}
                  src={`${previewReport.pdf_url}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                  className="w-full h-full min-h-[1000px]"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProjectReports;
