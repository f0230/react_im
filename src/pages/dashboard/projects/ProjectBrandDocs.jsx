import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  FileText,
  Loader2,
  Pencil,
  Plus,
  ToggleLeft,
  ToggleRight,
  Trash2,
  X,
} from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import LoadingFallback from '@/components/ui/LoadingFallback';

// ─── constants ──────────────────────────────────────────────────────────────

const DOC_TYPES = [
  { value: 'brand_voice',    label: 'Voz de marca',      color: 'bg-violet-100 text-violet-700 border-violet-200' },
  { value: 'copy_examples',  label: 'Ejemplos de copy',  color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'audience',       label: 'Audiencia',         color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { value: 'guidelines',     label: 'Lineamientos',      color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'general',        label: 'General',           color: 'bg-neutral-100 text-neutral-600 border-neutral-200' },
];

const DOC_TYPE_MAP = Object.fromEntries(DOC_TYPES.map((t) => [t.value, t]));

const CONTENT_MAX = 8000;
const TITLE_MAX   = 120;

const EMPTY_FORM = { title: '', doc_type: 'brand_voice', content: '' };

// ─── helpers ────────────────────────────────────────────────────────────────

const getProjectTitle = (project) =>
  project?.title || project?.name || project?.project_name || 'Proyecto';

// ─── sub-components ─────────────────────────────────────────────────────────

function TypeBadge({ type, className = '' }) {
  const meta = DOC_TYPE_MAP[type] || DOC_TYPE_MAP.general;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${meta.color} ${className}`}
    >
      {meta.label}
    </span>
  );
}

function CharCounter({ value, max }) {
  const ratio = value / max;
  const color = ratio > 0.9 ? 'text-red-500' : ratio > 0.75 ? 'text-amber-500' : 'text-neutral-400';
  return (
    <span className={`text-xs tabular-nums ${color}`}>
      {value}/{max}
    </span>
  );
}

// Inline doc form — used for both create and edit
function DocForm({ initial = EMPTY_FORM, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState(initial);
  const textareaRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [form.content]);

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return;
    onSubmit(form);
  };

  const isValid = form.title.trim().length > 0 && form.content.trim().length > 0;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Title + Type row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-semibold text-neutral-500 uppercase tracking-wide">
            Título
          </label>
          <input
            type="text"
            value={form.title}
            onChange={set('title')}
            maxLength={TITLE_MAX}
            placeholder="Ej: Tono de comunicación de la marca"
            className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100 transition"
            required
            autoFocus
          />
        </div>
        <div className="w-full sm:w-48">
          <label className="mb-1 block text-xs font-semibold text-neutral-500 uppercase tracking-wide">
            Tipo
          </label>
          <select
            value={form.doc_type}
            onChange={set('doc_type')}
            className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100 transition appearance-none cursor-pointer"
          >
            {DOC_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
            Contenido
          </label>
          <CharCounter value={form.content.length} max={CONTENT_MAX} />
        </div>
        <textarea
          ref={textareaRef}
          value={form.content}
          onChange={set('content')}
          maxLength={CONTENT_MAX}
          placeholder="Escribí acá el contenido del documento. Podés usar markdown: **negrita**, listas con -, etc."
          rows={8}
          className="w-full resize-none overflow-hidden rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100 transition font-mono leading-relaxed"
          required
        />
        <p className="mt-1 text-xs text-neutral-400">
          Soporta markdown básico. Este contenido se inyecta directamente en el prompt del generador de copies.
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="rounded-full border border-neutral-200 px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 transition disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading || !isValid}
          className="flex items-center gap-2 rounded-full bg-black px-5 py-2 text-xs font-semibold text-white hover:bg-neutral-800 transition disabled:opacity-40"
        >
          {loading && <Loader2 size={13} className="animate-spin" />}
          Guardar documento
        </button>
      </div>
    </form>
  );
}

// Single doc card
function DocCard({ doc, canEdit, onEdit, onToggle, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.18 }}
      className={`rounded-2xl border bg-white transition ${
        doc.is_active ? 'border-neutral-200' : 'border-dashed border-neutral-200 opacity-60'
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <FileText size={16} className="shrink-0 text-neutral-400" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-semibold text-neutral-900">{doc.title}</span>
            <TypeBadge type={doc.doc_type} />
            {!doc.is_active && (
              <span className="rounded-full border border-neutral-200 px-2 py-0.5 text-xs text-neutral-400">
                Desactivado
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-neutral-400 tabular-nums">
            {doc.content.length.toLocaleString()} caracteres
          </p>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition"
            title={expanded ? 'Colapsar' : 'Ver contenido'}
          >
            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>

          {canEdit && (
            <>
              <button
                onClick={() => onToggle(doc)}
                className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition"
                title={doc.is_active ? 'Desactivar' : 'Activar'}
              >
                {doc.is_active
                  ? <ToggleRight size={15} className="text-emerald-500" />
                  : <ToggleLeft size={15} />}
              </button>
              <button
                onClick={() => onEdit(doc)}
                className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition"
                title="Editar"
              >
                <Pencil size={13} />
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                className="rounded-full p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-500 transition"
                title="Eliminar"
              >
                <Trash2 size={13} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Expanded content preview */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-neutral-100 px-4 py-3">
              <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-neutral-600 max-h-64 overflow-y-auto">
                {doc.content}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete confirm */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="border-t border-red-100 bg-red-50 px-4 py-3 rounded-b-2xl"
          >
            <p className="mb-2 text-sm font-medium text-red-700">
              ¿Eliminar "{doc.title}"? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(false)}
                className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={() => { onDelete(doc); setConfirmDelete(false); }}
                className="rounded-full bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition"
              >
                Eliminar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── main page ───────────────────────────────────────────────────────────────

const ProjectBrandDocs = () => {
  const { projectId: routeProjectId } = useParams();
  const [searchParams] = useSearchParams();
  const queryProjectId = searchParams.get('projectId');
  const activeProjectId = routeProjectId || queryProjectId || null;

  const { profile } = useAuth();
  const canEdit =
    profile?.role === 'admin' ||
    profile?.role === 'worker';

  const [project,  setProject]  = useState(null);
  const [docs,     setDocs]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  // form state: null = closed | 'new' | doc object (edit mode)
  const [formMode,   setFormMode]   = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError,  setFormError]  = useState('');

  // ── data fetching ────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    if (!activeProjectId) return;
    setLoading(true);
    setError('');

    try {
      const [projectRes, docsRes] = await Promise.all([
        supabase
          .from('projects')
          .select('id, title, name, project_name')
          .eq('id', activeProjectId)
          .maybeSingle(),
        supabase
          .from('project_brand_docs')
          .select('*')
          .eq('project_id', activeProjectId)
          .order('doc_type')
          .order('created_at'),
      ]);

      if (projectRes.error) throw projectRes.error;
      if (docsRes.error)    throw docsRes.error;

      setProject(projectRes.data || null);
      setDocs(docsRes.data || []);
    } catch (err) {
      setError(err?.message || 'No se pudo cargar el contenido.');
    } finally {
      setLoading(false);
    }
  }, [activeProjectId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── CRUD handlers ────────────────────────────────────────────────────────

  const handleCreate = useCallback(async (form) => {
    setFormLoading(true);
    setFormError('');
    try {
      const { data, error: err } = await supabase
        .from('project_brand_docs')
        .insert({
          project_id: activeProjectId,
          title:      form.title.trim(),
          doc_type:   form.doc_type,
          content:    form.content.trim(),
        })
        .select()
        .single();

      if (err) throw err;
      setDocs((prev) => [...prev, data]);
      setFormMode(null);
    } catch (err) {
      setFormError(err?.message || 'No se pudo crear el documento.');
    } finally {
      setFormLoading(false);
    }
  }, [activeProjectId]);

  const handleUpdate = useCallback(async (form) => {
    if (!formMode || formMode === 'new') return;
    setFormLoading(true);
    setFormError('');
    try {
      const { data, error: err } = await supabase
        .from('project_brand_docs')
        .update({
          title:    form.title.trim(),
          doc_type: form.doc_type,
          content:  form.content.trim(),
        })
        .eq('id', formMode.id)
        .select()
        .single();

      if (err) throw err;
      setDocs((prev) => prev.map((d) => (d.id === data.id ? data : d)));
      setFormMode(null);
    } catch (err) {
      setFormError(err?.message || 'No se pudo actualizar el documento.');
    } finally {
      setFormLoading(false);
    }
  }, [formMode]);

  const handleToggle = useCallback(async (doc) => {
    const next = !doc.is_active;
    // Optimistic update
    setDocs((prev) => prev.map((d) => (d.id === doc.id ? { ...d, is_active: next } : d)));
    const { error: err } = await supabase
      .from('project_brand_docs')
      .update({ is_active: next })
      .eq('id', doc.id);

    if (err) {
      // Revert on failure
      setDocs((prev) => prev.map((d) => (d.id === doc.id ? { ...d, is_active: !next } : d)));
    }
  }, []);

  const handleDelete = useCallback(async (doc) => {
    setDocs((prev) => prev.filter((d) => d.id !== doc.id));
    const { error: err } = await supabase
      .from('project_brand_docs')
      .delete()
      .eq('id', doc.id);

    if (err) {
      // Revert
      setDocs((prev) => [...prev, doc].sort((a, b) => a.doc_type.localeCompare(b.doc_type)));
    }
  }, []);

  // ── derived ──────────────────────────────────────────────────────────────

  const activeDocs = docs.filter((d) => d.is_active);
  const isEditMode = formMode && formMode !== 'new';

  // ── render ───────────────────────────────────────────────────────────────

  if (loading) return <LoadingFallback type="spinner" />;

  return (
    <div className="font-product mx-auto max-w-3xl pb-20">
      {/* Page header */}
      <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold text-neutral-900">
            <BookOpen size={18} className="text-neutral-500" />
            Brand Docs
            {project && (
              <span className="text-neutral-400 font-normal">— {getProjectTitle(project)}</span>
            )}
          </h2>
          <p className="mt-0.5 text-sm text-neutral-500">
            Documentos de marca que la IA usa como contexto al generar copies.
            {activeDocs.length > 0 && (
              <span className="ml-1 font-medium text-emerald-600">
                {activeDocs.length} activo{activeDocs.length !== 1 ? 's' : ''}
              </span>
            )}
          </p>
        </div>

        {canEdit && !formMode && (
          <button
            onClick={() => { setFormMode('new'); setFormError(''); }}
            className="mt-2 flex shrink-0 items-center gap-2 self-start rounded-full bg-black px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800 transition sm:mt-0"
          >
            <Plus size={13} />
            Nuevo documento
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Inline form (create or edit) */}
      <AnimatePresence>
        {formMode && (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="mb-6 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-neutral-900">
                {isEditMode ? `Editar: ${formMode.title}` : 'Nuevo documento de marca'}
              </h3>
              <button
                onClick={() => setFormMode(null)}
                className="rounded-full p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition"
              >
                <X size={16} />
              </button>
            </div>

            {formError && (
              <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{formError}</p>
            )}

            <DocForm
              key={isEditMode ? formMode.id : 'new'}
              initial={
                isEditMode
                  ? { title: formMode.title, doc_type: formMode.doc_type, content: formMode.content }
                  : EMPTY_FORM
              }
              onSubmit={isEditMode ? handleUpdate : handleCreate}
              onCancel={() => setFormMode(null)}
              loading={formLoading}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Doc list */}
      {docs.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-neutral-200 py-16 text-center"
        >
          <BookOpen size={32} className="text-neutral-300" />
          <div>
            <p className="text-sm font-medium text-neutral-500">Sin documentos de marca</p>
            <p className="mt-1 text-xs text-neutral-400 max-w-xs">
              Agregá documentos para que la IA conozca la voz, audiencia y lineamientos del proyecto.
            </p>
          </div>
          {canEdit && (
            <button
              onClick={() => { setFormMode('new'); setFormError(''); }}
              className="mt-1 flex items-center gap-1.5 rounded-full bg-black px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800 transition"
            >
              <Plus size={13} />
              Crear primer documento
            </button>
          )}
        </motion.div>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Type guide */}
          <div className="mb-1 flex flex-wrap gap-2">
            {DOC_TYPES.map((t) => {
              const count = docs.filter((d) => d.doc_type === t.value).length;
              if (count === 0) return null;
              return (
                <span key={t.value} className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs ${t.color}`}>
                  {t.label}
                  <span className="font-bold">{count}</span>
                </span>
              );
            })}
          </div>

          <AnimatePresence initial={false}>
            {docs.map((doc) => (
              <DocCard
                key={doc.id}
                doc={doc}
                canEdit={canEdit}
                onEdit={(d) => { setFormMode(d); setFormError(''); }}
                onToggle={handleToggle}
                onDelete={handleDelete}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Context tip */}
      {docs.length > 0 && (
        <p className="mt-6 rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-3 text-xs text-neutral-500 leading-relaxed">
          <span className="font-semibold text-neutral-700">Cómo funciona:</span> Cada vez que generás un copy,
          el generador inyecta los documentos activos en el prompt. Documentos desactivados se ignoran.
          El total de caracteres activos se limita a ~4 000 para no afectar la velocidad ni el costo.
          Activos ahora:{' '}
          <span className="font-semibold text-neutral-900">
            {activeDocs.reduce((acc, d) => acc + d.content.length, 0).toLocaleString()} / 4 000 chars
          </span>
        </p>
      )}
    </div>
  );
};

export default ProjectBrandDocs;
