import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { Loader2, AlertCircle, Download, Copy, RefreshCw, X, ImageOff } from 'lucide-react';
import { cn, copyImageToClipboard, downloadImage } from '@/lib/utils';
import { AspectRatio } from '@/components/ui/aspect-ratio';

/** Converts "16:9" → 16/9. Falls back to 1 (square). */
function parseRatio(aspectRatio) {
    if (!aspectRatio || aspectRatio === 'auto') return 1;
    const [w, h] = aspectRatio.split(':').map(Number);
    return w && h ? w / h : 1;
}

/** Distribute tasks across N columns in order (top-to-bottom, left-to-right). */
function splitIntoColumns(tasks, cols) {
    const columns = Array.from({ length: cols }, () => []);
    tasks.forEach((task, i) => columns[i % cols].push(task));
    return columns;
}

export default function ImageGrid({ tasks, onSelect, onUseAsReference, onDismiss }) {
    if (tasks.length === 0) {
        return (
            <div className="flex min-h-full flex-col items-center justify-center px-6 py-16 text-white/20">
                <SparklesIcon className="w-16 h-16 mb-4 opacity-10" />
                <p className="text-lg font-medium text-[#c5e01b]">Tus creaciones aparecerán aquí</p>
                <p className="text-sm">Comienza escribiendo un prompt abajo</p>
            </div>
        );
    }

    const columns = splitIntoColumns(tasks, 3);

    return (
        <div className="relative w-full px-4 py-6 pb-48 md:px-6">
            <div className="mx-auto grid w-full max-w-6xl gap-3 grid-cols-2 sm:grid-cols-3">
                {columns.map((col, colIdx) => (
                    <div key={colIdx} className="grid gap-3 content-start">
                        {col.map((task, rowIdx) => (
                            <TaskCard
                                key={task.id}
                                task={task}
                                shouldPrioritize={colIdx * 10 + rowIdx < 6}
                                onSelect={onSelect}
                                onUseAsReference={onUseAsReference}
                                onDismiss={onDismiss}
                            />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}

function TaskCard({ task, shouldPrioritize, onSelect, onUseAsReference, onDismiss }) {
    const ratio = parseRatio(task.aspectRatio);

    if (task.status === 'generating') {
        return (
            <AspectRatio ratio={ratio} className="rounded-xl overflow-hidden bg-white/5">
                <div className="flex flex-col items-center justify-center w-full h-full">
                    <Loader2 className="w-7 h-7 text-banana animate-spin mb-2" />
                    <span className="text-xs font-medium text-white/40 uppercase tracking-widest">Generando</span>
                </div>
            </AspectRatio>
        );
    }

    if (task.status === 'failed') {
        return (
            <AspectRatio ratio={ratio} className="rounded-xl overflow-hidden bg-red-950/60">
                <div className="flex flex-col items-center justify-center w-full h-full p-4 text-center">
                    <AlertCircle className="w-7 h-7 text-red-400 mb-2" />
                    <span className="text-xs font-bold text-red-400 uppercase tracking-widest mb-1">Falló</span>
                    <p className="text-[10px] text-red-300/70 line-clamp-3">{task.error}</p>
                    {onDismiss && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onDismiss(task.id); }}
                            className="mt-3 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-300 text-[11px] font-medium transition-colors"
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
            ratio={ratio}
            shouldPrioritize={shouldPrioritize}
            onSelect={onSelect}
            onUseAsReference={onUseAsReference}
            onDismiss={onDismiss}
        />
    );
}

function ImageCard({ task, ratio, shouldPrioritize, onSelect, onUseAsReference, onDismiss }) {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true });
    const [isLoading, setIsLoading] = useState(true);
    const [imgError, setImgError] = useState(false);
    const promptLabel = task.prompt || 'Imagen compartida sin prompt guardado';

    useEffect(() => {
        setIsLoading(true);
        setImgError(false);
    }, [task.imageUrl]);

    if (imgError) {
        return (
            <AspectRatio ratio={ratio} className="rounded-xl overflow-hidden bg-white/5">
                <div className="flex flex-col items-center justify-center w-full h-full p-4 text-center gap-2">
                    <ImageOff className="w-7 h-7 text-white/20" />
                    <span className="text-[11px] text-white/30 font-medium">URL expirada</span>
                    {onDismiss && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onDismiss(task.id); }}
                            className="mt-1 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/50 text-[11px] transition-colors"
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
            ratio={ratio}
            className="group relative rounded-xl overflow-hidden bg-white/5 border border-white/5"
        >
            {/* Skeleton */}
            {isLoading && (
                <div className="absolute inset-0 animate-pulse bg-white/5 rounded-xl" />
            )}

            <img
                src={task.imageUrl}
                alt={promptLabel}
                className={cn(
                    'absolute inset-0 w-full h-full object-cover transition-all duration-700 ease-in-out',
                    task.imageUrl && 'cursor-pointer',
                    isInView && !isLoading ? 'opacity-100' : 'opacity-0',
                )}
                onClick={() => task.imageUrl && onSelect(task)}
                referrerPolicy="no-referrer"
                loading={shouldPrioritize ? 'eager' : 'lazy'}
                fetchPriority={shouldPrioritize ? 'high' : 'auto'}
                decoding="async"
                onLoad={() => setIsLoading(false)}
                onError={() => setImgError(true)}
            />

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 p-3 flex flex-col justify-end pointer-events-none group-hover:pointer-events-auto">
                <p className="text-xs text-white/90 line-clamp-3 mb-3 font-medium leading-relaxed drop-shadow-lg">{promptLabel}</p>
                <div className="flex items-center gap-1.5 translate-y-3 group-hover:translate-y-0 transition-transform duration-300">
                    <button
                        onClick={(e) => { e.stopPropagation(); task.imageUrl && downloadImage(task.imageUrl, `banana-${task.id}.png`); }}
                        className="p-2 rounded-lg bg-white/10 hover:bg-banana hover:text-black transition-all"
                        title="Descargar"
                    >
                        <Download size={14} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); task.imageUrl && copyImageToClipboard(task.imageUrl); }}
                        className="p-2 rounded-lg bg-white/10 hover:bg-banana hover:text-black transition-all"
                        title="Copiar al portapapeles"
                    >
                        <Copy size={14} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); task.imageUrl && onUseAsReference(task.imageUrl); }}
                        className="p-2 rounded-lg bg-white/10 hover:bg-banana hover:text-black transition-all"
                        title="Usar como referencia"
                    >
                        <RefreshCw size={14} />
                    </button>
                </div>
            </div>

            {/* Model badge */}
            <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-[9px] font-bold text-white/70 uppercase tracking-wider">
                {getModelBadge(task.model)}
            </div>
        </AspectRatio>
    );
}

function SparklesIcon({ className }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
            <path d="M5 3v4" /><path d="M19 17v4" /><path d="M3 5h4" /><path d="M17 19h4" />
        </svg>
    );
}

function getModelBadge(model) {
    if (model === 'nano-banana-2') return 'BANANA 2';
    if (model === 'nano-banana-pro') return 'PRO';
    if (model === 'nano-banana') return 'STD';
    return 'ARCHIVE';
}
