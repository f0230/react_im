import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MessageSquare,
    ExternalLink,
    Loader2,
    AlertCircle,
    RefreshCw,
    Edit3,
    Check,
    X,
    Clock,
    User,
    ChevronDown,
    ChevronUp,
    Layers,
    Link2,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */

function timeAgo(dateStr) {
    if (!dateStr) return null;
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'Ahora mismo';
    if (m < 60) return `Hace ${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `Hace ${h}h`;
    const d = Math.floor(h / 24);
    if (d < 30) return `Hace ${d}d`;
    return new Date(dateStr).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}

function getTypeLabel(type) {
    if (!type) return 'Diseño';
    if (type === 'whiteboard') return 'FigJam';
    if (type === 'figma') return 'Diseño';
    return type.charAt(0).toUpperCase() + type.slice(1);
}

function getTypeBadge(type) {
    if (type === 'whiteboard') return 'bg-amber-100 text-amber-700';
    return 'bg-violet-100 text-violet-700';
}

function FigmaLogo({ size = 20 }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 38 57" fill="none">
            <path d="M19 28.5A9.5 9.5 0 0 1 28.5 19H19a9.5 9.5 0 0 0 0 19h9.5A9.5 9.5 0 0 1 19 28.5Z" fill="#1ABCFE" />
            <path d="M9.5 47.5A9.5 9.5 0 0 1 19 38h9.5a9.5 9.5 0 1 1-19 0Z" fill="#0ACF83" />
            <path d="M9.5 9.5A9.5 9.5 0 0 0 19 19h9.5A9.5 9.5 0 1 0 9.5 9.5Z" fill="#FF7262" />
            <path d="M9.5 28.5A9.5 9.5 0 0 0 19 38V19a9.5 9.5 0 0 0-9.5 9.5Z" fill="#F24E1E" />
            <path d="M28.5 19a9.5 9.5 0 1 1 0 19 9.5 9.5 0 0 1 0-19Z" fill="#A259FF" />
        </svg>
    );
}

/* ─────────────────────────────────────────────
   Comment thread for a single file
───────────────────────────────────────────── */
function FileComments({ fileKey, apiBase }) {
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [open, setOpen] = useState(false);

    const fetch = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await window.fetch(
                `${apiBase}/api/figma-proxy?action=file-comments&fileKey=${fileKey}`
            );
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error cargando comentarios');
            setComments(data.comments || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [fileKey, apiBase]);

    const handleToggle = () => {
        if (!open) fetch();
        setOpen((v) => !v);
    };

    return (
        <div className="border-t border-neutral-100">
            <button
                onClick={handleToggle}
                className="w-full flex items-center justify-between px-3 py-2 text-xs text-neutral-500 hover:bg-neutral-50 transition-colors"
            >
                <span className="flex items-center gap-1.5">
                    <MessageSquare size={12} className="text-violet-400" />
                    Comentarios
                </span>
                {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="overflow-hidden"
                    >
                        <div className="px-3 pb-3 max-h-48 overflow-y-auto space-y-2">
                            {loading && (
                                <div className="flex justify-center py-4">
                                    <Loader2 size={16} className="animate-spin text-neutral-300" />
                                </div>
                            )}
                            {error && (
                                <p className="text-[10px] text-red-400 flex items-center gap-1">
                                    <AlertCircle size={10} /> {error}
                                </p>
                            )}
                            {!loading && !error && comments.length === 0 && (
                                <p className="text-[10px] text-neutral-400 text-center py-3">
                                    Sin comentarios en este archivo.
                                </p>
                            )}
                            {comments.map((c) => (
                                <div key={c.id} className="flex items-start gap-2">
                                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center text-white text-[8px] font-bold shrink-0 mt-0.5">
                                        {c.user?.handle?.charAt(0)?.toUpperCase() || <User size={8} />}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                            <span className="text-[10px] font-semibold text-neutral-700">
                                                {c.user?.handle || 'Usuario'}
                                            </span>
                                            <span className="text-[9px] text-neutral-400">{timeAgo(c.created_at)}</span>
                                        </div>
                                        <p className="text-[11px] text-neutral-600 leading-snug">{c.message}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

/* ─────────────────────────────────────────────
   Single File Card
───────────────────────────────────────────── */
function FileCard({ file, apiBase, index }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 }}
            className="bg-white rounded-2xl border border-neutral-200 overflow-hidden hover:shadow-md transition-shadow group"
        >
            {/* Thumbnail */}
            <div
                className="relative overflow-hidden bg-neutral-100"
                style={{ aspectRatio: '16/9' }}
            >
                {file.thumbnailUrl ? (
                    <img
                        src={file.thumbnailUrl}
                        alt={file.name}
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center opacity-20">
                        <FigmaLogo size={28} />
                    </div>
                )}

                {/* Type badge */}
                <div className="absolute top-2 left-2">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm ${getTypeBadge(file.type)}`}>
                        {getTypeLabel(file.type)}
                    </span>
                </div>

                {/* Open button on hover */}
                <a
                    href={file.figmaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-all duration-200"
                >
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 bg-white text-neutral-900 text-[11px] font-bold px-3 py-1.5 rounded-full shadow-lg">
                        <ExternalLink size={11} />
                        Abrir en Figma
                    </span>
                </a>
            </div>

            {/* Info */}
            <div className="px-3 py-2.5">
                <p className="text-xs font-semibold text-neutral-800 truncate" title={file.name}>
                    {file.name}
                </p>
                {file.lastModified && (
                    <p className="text-[10px] text-neutral-400 mt-0.5 flex items-center gap-1">
                        <Clock size={9} />
                        {timeAgo(file.lastModified)}
                    </p>
                )}
            </div>

            {/* Comments toggle */}
            <FileComments fileKey={file.key} apiBase={apiBase} />
        </motion.div>
    );
}

/* ─────────────────────────────────────────────
   Main FigmaPanel Component
───────────────────────────────────────────── */

const API_BASE = import.meta.env.DEV ? 'http://localhost:3001' : '';

export default function FigmaPanel({ project, isAdmin, onFigmaProjectUpdate }) {
    const [projectId, setProjectId] = useState(project?.figma_project_id || '');
    const [editValue, setEditValue] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState(null);

    const [files, setFiles] = useState([]);
    const [projectName, setProjectName] = useState(null);
    const [loadingFiles, setLoadingFiles] = useState(false);
    const [filesError, setFilesError] = useState(null);

    const inputRef = useRef(null);

    /* ── Sync from parent ── */
    useEffect(() => {
        setProjectId(project?.figma_project_id || '');
    }, [project?.figma_project_id]);

    /* ── Fetch files when projectId changes ── */
    const fetchFiles = useCallback(async (id) => {
        if (!id) return;
        setLoadingFiles(true);
        setFilesError(null);
        setFiles([]);
        setProjectName(null);
        try {
            const res = await fetch(
                `${API_BASE}/api/figma-proxy?action=project-files&projectId=${encodeURIComponent(id)}`
            );
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error al cargar los archivos de Figma');
            setFiles(data.files || []);
            setProjectName(data.projectName || null);
        } catch (err) {
            setFilesError(err.message);
        } finally {
            setLoadingFiles(false);
        }
    }, []);

    useEffect(() => {
        if (projectId) fetchFiles(projectId);
    }, [projectId, fetchFiles]);

    /* ── Save to Supabase ── */
    const handleSave = async () => {
        if (!project?.id) return;
        setSaving(true);
        setSaveError(null);

        // Extract project ID from URL if needed
        const raw = editValue.trim();
        const extracted = raw.match(/\/project\/(\d+)/)
            ? raw.match(/\/project\/(\d+)/)[1]
            : /^\d+$/.test(raw) ? raw : null;

        if (raw && !extracted) {
            setSaveError('No se reconoce esa URL. Asegurate de pegar la URL del proyecto de Figma.');
            setSaving(false);
            return;
        }

        try {
            const { error } = await supabase
                .from('projects')
                .update({ figma_project_id: extracted || null })
                .eq('id', project.id);
            if (error) throw error;
            setProjectId(extracted || '');
            setIsEditing(false);
            onFigmaProjectUpdate?.(extracted || null);
            if (extracted) fetchFiles(extracted);
        } catch (err) {
            setSaveError(err.message || 'Error al guardar');
        } finally {
            setSaving(false);
        }
    };

    const startEditing = () => {
        setEditValue(projectId);
        setSaveError(null);
        setIsEditing(true);
        setTimeout(() => inputRef.current?.focus(), 80);
    };

    /* ─── No project linked yet ─── */
    if (!projectId && !isEditing) {
        return (
            <div className="rounded-2xl border border-dashed border-neutral-200 bg-white/60 p-8 flex flex-col items-center text-center gap-4">
                <FigmaLogo size={36} />
                <div>
                    <p className="text-sm font-bold text-neutral-700">Sin proyecto de Figma vinculado</p>
                    <p className="text-xs text-neutral-400 mt-1 max-w-[260px] mx-auto">
                        Vinculá un proyecto de Figma para ver todos sus archivos desde aquí.
                    </p>
                </div>
                {isAdmin && (
                    <button
                        onClick={startEditing}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-neutral-900 text-white text-xs font-semibold hover:bg-violet-600 transition-all"
                    >
                        <Link2 size={14} />
                        Vincular proyecto de Figma
                    </button>
                )}
            </div>
        );
    }

    /* ─── Edit mode ─── */
    if (isEditing) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-violet-200 bg-violet-50/40 p-5 space-y-4"
            >
                <div className="flex items-center gap-2.5">
                    <FigmaLogo size={18} />
                    <div>
                        <p className="text-sm font-bold text-neutral-800">Vincular proyecto de Figma</p>
                        <p className="text-xs text-neutral-400 mt-0.5">
                            Pegá la URL del proyecto o el ID numérico.
                        </p>
                    </div>
                </div>

                {/* Example URL hint */}
                <div className="bg-white rounded-xl border border-violet-100 px-3 py-2.5 text-[10px] text-neutral-500 font-mono break-all">
                    Ej: https://www.figma.com/files/project/<span className="text-violet-600 font-bold">546654917</span>
                </div>

                <input
                    ref={inputRef}
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSave();
                        if (e.key === 'Escape') { setIsEditing(false); setSaveError(null); }
                    }}
                    placeholder="URL del proyecto de Figma o ID numérico..."
                    className="w-full rounded-xl border border-violet-200 bg-white px-4 py-2.5 text-sm text-neutral-800 placeholder-neutral-300 focus:outline-none focus:ring-2 focus:ring-violet-400 transition"
                />

                {saveError && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle size={12} /> {saveError}
                    </p>
                )}

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleSave}
                        disabled={saving || !editValue.trim()}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                        {saving ? 'Guardando...' : 'Guardar'}
                    </button>
                    <button
                        onClick={() => { setIsEditing(false); setSaveError(null); }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-100 text-neutral-600 text-xs font-semibold hover:bg-neutral-200 transition-all"
                    >
                        <X size={13} /> Cancelar
                    </button>
                </div>
            </motion.div>
        );
    }

    /* ─── Project files view ─── */
    return (
        <div className="space-y-4">
            {/* Header bar */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <FigmaLogo size={16} />
                    <div>
                        <p className="text-xs font-bold text-neutral-800">
                            {projectName || 'Proyecto de Figma'}
                        </p>
                        {files.length > 0 && (
                            <p className="text-[10px] text-neutral-400">
                                {files.length} {files.length === 1 ? 'archivo' : 'archivos'}
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={() => fetchFiles(projectId)}
                        disabled={loadingFiles}
                        title="Actualizar"
                        className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition"
                    >
                        <RefreshCw size={13} className={loadingFiles ? 'animate-spin' : ''} />
                    </button>
                    {isAdmin && (
                        <button
                            onClick={startEditing}
                            title="Cambiar proyecto de Figma"
                            className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition"
                        >
                            <Edit3 size={13} />
                        </button>
                    )}
                </div>
            </div>

            {/* Loading state */}
            {loadingFiles && (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Loader2 size={24} className="animate-spin text-violet-400" />
                    <p className="text-xs text-neutral-400">Cargando archivos de Figma...</p>
                </div>
            )}

            {/* Error state */}
            {!loadingFiles && filesError && (
                <div className="rounded-2xl border border-red-100 bg-red-50 p-5 flex flex-col items-center gap-3 text-center">
                    <AlertCircle size={20} className="text-red-400" />
                    <p className="text-xs text-red-600">{filesError}</p>
                    <button
                        onClick={() => fetchFiles(projectId)}
                        className="text-xs text-violet-600 flex items-center gap-1 hover:underline"
                    >
                        <RefreshCw size={11} /> Reintentar
                    </button>
                    {filesError.includes('FIGMA_ACCESS_TOKEN') && (
                        <p className="text-[10px] text-neutral-500 max-w-[260px]">
                            Necesitás agregar tu <strong>Personal Access Token de Figma</strong> en el archivo <code className="bg-neutral-100 px-1 rounded">.env</code> como <code className="bg-neutral-100 px-1 rounded">FIGMA_ACCESS_TOKEN</code>.
                        </p>
                    )}
                </div>
            )}

            {/* Empty state */}
            {!loadingFiles && !filesError && files.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                    <Layers size={28} className="text-neutral-200" />
                    <p className="text-xs text-neutral-400">Este proyecto no tiene archivos todavía.</p>
                </div>
            )}

            {/* Files grid */}
            {!loadingFiles && !filesError && files.length > 0 && (
                <div className="grid grid-cols-1 gap-3">
                    {files.map((file, i) => (
                        <FileCard key={file.key} file={file} apiBase={API_BASE} index={i} />
                    ))}
                </div>
            )}
        </div>
    );
}
