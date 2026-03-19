import React, { useEffect, useRef, useState } from 'react';
import { useInView } from 'framer-motion';
import { Loader2, AlertCircle, Download, Copy, RefreshCw, X, ImageOff } from 'lucide-react';
import { cn, copyImageToClipboard, downloadImage } from '@/lib/utils';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import Noise from '@/components/ui/Noise';
import { getStudioCredits } from '@/utils/studioTypes';

const GRID_RATIO = 9 / 16;

export default function ImageGrid({ tasks, onSelect, onUseAsReference, onDismiss }) {
    if (tasks.length === 0) {
        return (
            <div className="flex min-h-full flex-col items-center justify-center px-6 py-16 text-white/20">
                <SparklesIcon className="mb-4 h-16 w-16 opacity-10" />
                <p className="text-lg font-medium text-[#c5e01b]">Tus creaciones apareceran aqui</p>
                <p className="text-sm">Comienza escribiendo un prompt abajo</p>
            </div>
        );
    }

    return (
        <div className="relative w-full px-4 py-6 pb-48 md:px-6">
            <div className="mx-auto grid w-full max-w-7xl grid-cols-3 gap-3 lg:grid-cols-5">
                {tasks.map((task, index) => (
                    <TaskCard
                        key={task.id}
                        task={task}
                        shouldPrioritize={index < 6}
                        onSelect={onSelect}
                        onUseAsReference={onUseAsReference}
                        onDismiss={onDismiss}
                    />
                ))}
            </div>
        </div>
    );
}

function TaskCard({ task, shouldPrioritize, onSelect, onUseAsReference, onDismiss }) {
    if (task.status === 'generating') {
        return (
            <AspectRatio ratio={GRID_RATIO} className="overflow-hidden rounded-xl border border-white/10 bg-[#0b0b0b]">
                <div className="relative flex h-full w-full flex-col items-center justify-center bg-gradient-to-b from-white/[0.04] via-transparent to-black/40">
                    <Noise patternSize={120} patternScaleX={1.2} patternScaleY={1.2} patternRefreshInterval={3} patternAlpha={24} />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(227,255,49,0.08),transparent_60%)]" />
                    <div className="absolute inset-0 animate-pulse bg-white/[0.03]" />
                    <div className="relative z-10 flex flex-col items-center justify-center">
                        <Loader2 className="mb-3 h-8 w-8 animate-spin text-banana" />
                        <span className="text-xs font-medium uppercase tracking-[0.22em] text-white/55">Generando</span>
                        <GenerationTimer task={task} />
                    </div>
                </div>
            </AspectRatio>
        );
    }

    if (task.status === 'failed') {
        return (
            <AspectRatio ratio={GRID_RATIO} className="overflow-hidden rounded-xl bg-red-950/60">
                <div className="flex h-full w-full flex-col items-center justify-center p-4 text-center">
                    <AlertCircle className="mb-2 h-7 w-7 text-red-400" />
                    <span className="mb-1 text-xs font-bold uppercase tracking-widest text-red-400">Fallo</span>
                    <p className="line-clamp-3 text-[10px] text-red-300/70">{task.error}</p>
                    {onDismiss && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onDismiss(task.id); }}
                            className="mt-3 flex items-center gap-1 rounded-lg bg-red-500/20 px-3 py-1.5 text-[11px] font-medium text-red-300 transition-colors hover:bg-red-500/40"
                        >
                            <X size={12} /> Cerrar
                        </button>
                    )}
                </div>
            </AspectRatio>
        );
    }

    return (
        <ImageCard
            task={task}
            shouldPrioritize={shouldPrioritize}
            onSelect={onSelect}
            onUseAsReference={onUseAsReference}
            onDismiss={onDismiss}
        />
    );
}

function ImageCard({ task, shouldPrioritize, onSelect, onUseAsReference, onDismiss }) {
    const ref = useRef(null);
    const isDraggingRef = useRef(false);
    const isInView = useInView(ref, { once: true });
    const [isLoading, setIsLoading] = useState(true);
    const [imgError, setImgError] = useState(false);
    const promptLabel = task.prompt || 'Imagen compartida sin prompt guardado';
    const generationDurationLabel = getGenerationDurationLabel(task);
    const creditsLabel = getTaskCredits(task);

    useEffect(() => {
        setIsLoading(true);
        setImgError(false);
    }, [task.imageUrl]);

    if (imgError) {
        return (
            <AspectRatio ratio={GRID_RATIO} className="overflow-hidden rounded-xl bg-white/5">
                <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-center">
                    <ImageOff className="h-7 w-7 text-white/20" />
                    <span className="text-[11px] font-medium text-white/30">URL expirada</span>
                    {onDismiss && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onDismiss(task.id); }}
                            className="mt-1 flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 text-[11px] text-white/50 transition-colors hover:bg-white/20"
                        >
                            <X size={11} /> Cerrar
                        </button>
                    )}
                </div>
            </AspectRatio>
        );
    }

    return (
        <AspectRatio
            ref={ref}
            ratio={GRID_RATIO}
            className="group relative overflow-hidden rounded-xl border border-white/5 bg-white/5"
            role="button"
            tabIndex={0}
            draggable={Boolean(task.imageUrl)}
            onDragStart={(e) => {
                if (!task.imageUrl) return;
                isDraggingRef.current = true;
                e.dataTransfer.effectAllowed = 'copy';
                e.dataTransfer.setData('text/plain', task.imageUrl);
                e.dataTransfer.setData('text/uri-list', task.imageUrl);
                e.dataTransfer.setData('application/x-studio-reference', task.imageUrl);
            }}
            onDragEnd={() => {
                window.setTimeout(() => {
                    isDraggingRef.current = false;
                }, 0);
            }}
            onClick={() => {
                if (!task.imageUrl || isDraggingRef.current) return;
                onSelect(task);
            }}
            onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && task.imageUrl) {
                    e.preventDefault();
                    onSelect(task);
                }
            }}
        >
            {isLoading && (
                <div className="absolute inset-0 animate-pulse rounded-xl bg-white/5" />
            )}

            <div
                className={cn(
                    'absolute inset-0 rounded-xl bg-black/30 transition-opacity duration-700 ease-out',
                    isLoading ? 'opacity-100' : 'opacity-0',
                )}
            />

            <img
                src={task.imageUrl}
                alt={promptLabel}
                draggable={false}
                className={cn(
                    'absolute inset-0 h-full w-full object-cover transition-all duration-700 ease-out',
                    task.imageUrl && 'cursor-pointer',
                    isInView && !isLoading ? 'scale-100 opacity-100' : 'scale-[1.02] opacity-0',
                )}
                referrerPolicy="no-referrer"
                loading={shouldPrioritize ? 'eager' : 'lazy'}
                fetchPriority={shouldPrioritize ? 'high' : 'auto'}
                decoding="async"
                onLoad={() => setIsLoading(false)}
                onError={() => setImgError(true)}
            />

            {onDismiss && (
                <button
                    onClick={(e) => { e.stopPropagation(); onDismiss(task.id); }}
                    className="absolute right-2 top-2 z-10 rounded-lg bg-black/60 p-1.5 text-white/70 opacity-0 transition-all duration-200 backdrop-blur-sm group-hover:opacity-100 hover:bg-red-500 hover:text-white"
                    title="Eliminar"
                >
                    <X size={13} />
                </button>
            )}

            <div className="pointer-events-none absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/90 via-black/20 to-transparent p-3 opacity-0 transition-all duration-300 group-hover:pointer-events-auto group-hover:opacity-100">
                {creditsLabel && (
                    <div className="mb-2">
                        <span className="rounded-full border border-white/10 bg-black/45 px-2.5 py-1 text-[11px] font-medium text-white/80">
                            Creditos: {creditsLabel}
                        </span>
                    </div>
                )}
                {generationDurationLabel && (
                    <div className="mb-3">
                        <span className="rounded-full border border-white/10 bg-black/45 px-2.5 py-1 text-[11px] font-medium text-white/80">
                            Tiempo: {generationDurationLabel}
                        </span>
                    </div>
                )}
                <div className="flex translate-y-3 items-center gap-1.5 transition-transform duration-300 group-hover:translate-y-0">
                    <button
                        onClick={(e) => { e.stopPropagation(); task.imageUrl && downloadImage(task.imageUrl, `banana-${task.id}.png`); }}
                        className="rounded-lg bg-white/10 p-2 transition-all hover:bg-banana hover:text-black"
                        title="Descargar"
                    >
                        <Download size={14} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); task.imageUrl && copyImageToClipboard(task.imageUrl); }}
                        className="rounded-lg bg-white/10 p-2 transition-all hover:bg-banana hover:text-black"
                        title="Copiar al portapapeles"
                    >
                        <Copy size={14} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); task.imageUrl && onUseAsReference(task.imageUrl); }}
                        className="rounded-lg bg-white/10 p-2 transition-all hover:bg-banana hover:text-black"
                        title="Usar como referencia"
                    >
                        <RefreshCw size={14} />
                    </button>
                </div>
            </div>

            <div className="absolute left-2 top-2 rounded-md border border-white/10 bg-black/60 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/70 backdrop-blur-md">
                {getResolutionBadge(task)}
            </div>
        </AspectRatio>
    );
}

function SparklesIcon({ className }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
            <path d="M5 3v4" />
            <path d="M19 17v4" />
            <path d="M3 5h4" />
            <path d="M17 19h4" />
        </svg>
    );
}

function getResolutionBadge(task) {
    if (task.imageSize && task.imageSize !== 'N/A') return task.imageSize;
    if (task.aspectRatio && task.aspectRatio !== 'auto') return task.aspectRatio;
    return 'AUTO';
}

function getTaskCredits(task) {
    if (!task?.model) return null;
    return task.creditsCost ?? getStudioCredits(task.model, task.imageSize);
}

function GenerationTimer({ task }) {
    const startedAt = getTaskStartTime(task);
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const intervalId = window.setInterval(() => {
            setNow(Date.now());
        }, 1000);

        return () => window.clearInterval(intervalId);
    }, []);

    return (
        <span className="mt-2 rounded-full border border-white/10 bg-black/35 px-2.5 py-1 text-[11px] font-medium text-white/70">
            {startedAt ? formatDuration(now - startedAt.getTime()) : 'Calculando...'}
        </span>
    );
}

function getGenerationDurationLabel(task) {
    const startedAt = getTaskStartTime(task);
    const finishedAt = getTaskEndTime(task);

    if (!startedAt || !finishedAt) return null;
    return formatDuration(finishedAt.getTime() - startedAt.getTime());
}

function getTaskStartTime(task) {
    const value = task.processingStartedAt || task.createdAt;
    return value ? new Date(value) : null;
}

function getTaskEndTime(task) {
    const value = task.updatedAt || task.createdAt;
    return value ? new Date(value) : null;
}

function formatDuration(durationMs) {
    const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (minutes >= 60) {
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return `${hours}:${String(remainingMinutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
