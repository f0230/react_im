import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckSquare, ExternalLink, Loader2, RefreshCw, AlertCircle, ChevronDown } from 'lucide-react';
import { fetchTasks } from '@/services/notionService';

const SPRING = { type: 'spring', stiffness: 260, damping: 26, mass: 0.8 };

const STATUS_COLORS = {
    done: 'bg-emerald-100 text-emerald-700',
    complete: 'bg-emerald-100 text-emerald-700',
    completado: 'bg-emerald-100 text-emerald-700',
    'in progress': 'bg-blue-100 text-blue-700',
    'en progreso': 'bg-blue-100 text-blue-700',
    'in-progress': 'bg-blue-100 text-blue-700',
    todo: 'bg-neutral-100 text-neutral-600',
    'to do': 'bg-neutral-100 text-neutral-600',
    pendiente: 'bg-neutral-100 text-neutral-600',
    blocked: 'bg-red-100 text-red-600',
    bloqueado: 'bg-red-100 text-red-600',
};

function statusColor(status) {
    if (!status) return 'bg-neutral-100 text-neutral-500';
    return STATUS_COLORS[status.toLowerCase()] ?? 'bg-amber-100 text-amber-700';
}

function formatDate(str) {
    if (!str) return null;
    try {
        return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
            .format(new Date(str + 'T12:00:00'));
    } catch {
        return str;
    }
}

function TaskItem({ task }) {
    return (
        <div className="flex items-start gap-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] md:p-5">
            <CheckSquare size={18} className="mt-0.5 shrink-0 text-neutral-300" />

            <div className="flex flex-1 flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-neutral-800 leading-snug">
                        {task.title || 'Sin título'}
                    </span>
                    {task.status && (
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${statusColor(task.status)}`}>
                            {task.status}
                        </span>
                    )}
                    {task.priority && (
                        <span className="inline-flex items-center rounded-full border border-neutral-200 px-2.5 py-0.5 text-[11px] font-medium text-neutral-500">
                            {task.priority}
                        </span>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400">
                    {task.dueDate && (
                        <span>Vence: {formatDate(task.dueDate)}</span>
                    )}
                    {task.assignees?.length > 0 && (
                        <span>Asignado: {task.assignees.join(', ')}</span>
                    )}
                </div>
            </div>

            <a
                href={task.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-neutral-50 text-neutral-400 transition hover:border-neutral-300 hover:text-neutral-700"
                title="Ver en Notion"
            >
                <ExternalLink size={13} />
            </a>
        </div>
    );
}

const NotionTasksView = ({ projectId, onClose }) => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [nextCursor, setNextCursor] = useState(null);
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);

    const load = useCallback(async (cursor = null) => {
        try {
            const data = await fetchTasks(projectId, cursor);
            if (cursor) {
                setTasks((prev) => [...prev, ...data.tasks]);
            } else {
                setTasks(data.tasks);
            }
            setNextCursor(data.nextCursor);
            setHasMore(data.hasMore);
            setError(null);
        } catch (err) {
            setError(err.message);
        }
    }, [projectId]);

    useEffect(() => {
        setLoading(true);
        load(null).finally(() => setLoading(false));
    }, [load]);

    const handleLoadMore = async () => {
        if (!nextCursor || loadingMore) return;
        setLoadingMore(true);
        await load(nextCursor);
        setLoadingMore(false);
    };

    const handleRefresh = async () => {
        setLoading(true);
        setTasks([]);
        setNextCursor(null);
        await load(null);
        setLoading(false);
    };

    return (
        <div className="rounded-[28px] border border-neutral-200 bg-[#fafafa] p-6 md:p-8">
            <div className="mb-6 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-neutral-900">
                        <CheckSquare size={18} className="text-white" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold tracking-tight text-neutral-900">Tareas</h3>
                        <p className="text-xs text-neutral-400">Desde Notion</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleRefresh}
                        disabled={loading}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-400 transition hover:border-neutral-300 hover:text-neutral-700 disabled:opacity-40"
                        title="Actualizar"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-500 transition hover:bg-neutral-100"
                        >
                            Cerrar
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 size={24} className="animate-spin text-neutral-400" />
                </div>
            ) : error ? (
                <div className="flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">
                    <AlertCircle size={16} className="shrink-0" />
                    {error}
                </div>
            ) : tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <CheckSquare size={32} className="mb-3 text-neutral-200" />
                    <p className="text-sm text-neutral-400">No hay tareas registradas.</p>
                </div>
            ) : (
                <AnimatePresence>
                    <div className="flex flex-col gap-3">
                        {tasks.map((task, i) => (
                            <motion.div
                                key={task.id}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ ...SPRING, delay: i * 0.03 }}
                            >
                                <TaskItem task={task} />
                            </motion.div>
                        ))}
                    </div>
                </AnimatePresence>
            )}

            {hasMore && !loading && (
                <div className="mt-4 flex justify-center">
                    <button
                        type="button"
                        onClick={handleLoadMore}
                        disabled={loadingMore}
                        className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-xs font-medium text-neutral-600 transition hover:bg-neutral-50 disabled:opacity-50"
                    >
                        {loadingMore ? <Loader2 size={13} className="animate-spin" /> : <ChevronDown size={13} />}
                        {loadingMore ? 'Cargando...' : 'Cargar más'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default NotionTasksView;
