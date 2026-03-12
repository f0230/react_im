import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, AlertCircle, Download, Copy, RefreshCw, X, ImageOff } from 'lucide-react';
import { cn, copyImageToClipboard, downloadImage } from '@/lib/utils';

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

    return (
        <div className="h-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1 p-1 pb-20" style={{ gridAutoRows: '1fr' }}>
            <AnimatePresence mode="popLayout">
                {tasks.map((task, index) => {
                    return (
                        <motion.div
                            key={task.id}
                            layout
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className={cn(
                                "image-card group relative overflow-hidden min-h-[180px]",
                            )}
                        >
                            {task.status === 'generating' ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/5 backdrop-blur-sm">
                                    <Loader2 className="w-8 h-8 text-banana animate-spin mb-2" />
                                    <span className="text-xs font-medium text-white/40 uppercase tracking-widest">Generando</span>
                                </div>
                            ) : task.status === 'failed' ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-950/60 p-4 text-center">
                                    <AlertCircle className="w-8 h-8 text-red-400 mb-2" />
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
                            ) : (
                                <ImageCard
                                    task={task}
                                    shouldPrioritize={index < 6}
                                    onSelect={onSelect}
                                    onUseAsReference={onUseAsReference}
                                    onDismiss={onDismiss}
                                />
                            )}

                            <div className="absolute top-3 left-3 px-2 py-1 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-bold text-white/80 uppercase tracking-wider">
                                {getModelBadge(task.model)}
                            </div>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
}

function SparklesIcon({ className }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
            <path d="M5 3v4" />
            <path d="M19 17v4" />
            <path d="M3 5h4" />
            <path d="M17 19h4" />
        </svg>
    );
}

function ImageCard({ task, shouldPrioritize, onSelect, onUseAsReference, onDismiss }) {
    const [imgError, setImgError] = useState(false);
    const promptLabel = task.prompt || 'Imagen compartida sin prompt guardado';

    useEffect(() => {
        setImgError(false);
    }, [task.imageUrl]);

    if (imgError) {
        return (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/3 p-4 text-center gap-2">
                <ImageOff className="w-8 h-8 text-white/20 mb-1" />
                <span className="text-[11px] text-white/30 font-medium">URL expirada</span>
                <p className="text-[10px] text-white/20 line-clamp-2">{promptLabel}</p>
                {onDismiss && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onDismiss(task.id); }}
                        className="mt-2 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/50 text-[11px] transition-colors"
                    >
                        <X size={11} /> Cerrar
                    </button>
                )}
            </div>
        );
    }

    return (
        <>
            <img
                src={task.imageUrl}
                alt={promptLabel}
                className={cn("w-full h-full object-cover", task.imageUrl && "cursor-pointer")}
                onClick={() => task.imageUrl && onSelect(task)}
                referrerPolicy="no-referrer"
                loading={shouldPrioritize ? 'eager' : 'lazy'}
                fetchPriority={shouldPrioritize ? 'high' : 'auto'}
                decoding="async"
                onError={() => setImgError(true)}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 p-4 flex flex-col justify-end">
                <p className="text-xs text-white/90 line-clamp-3 mb-4 font-medium leading-relaxed drop-shadow-lg">{promptLabel}</p>
                <div className="flex items-center gap-2 translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                    <button
                        onClick={(e) => { e.stopPropagation(); task.imageUrl && downloadImage(task.imageUrl, `banana-${task.id}.png`); }}
                        className="p-2.5 rounded-xl bg-white/10 hover:bg-banana hover:text-black transition-all"
                        title="Descargar"
                    >
                        <Download size={16} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); task.imageUrl && copyImageToClipboard(task.imageUrl); }}
                        className="p-2.5 rounded-xl bg-white/10 hover:bg-banana hover:text-black transition-all"
                        title="Copiar al portapapeles"
                    >
                        <Copy size={16} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); task.imageUrl && onUseAsReference(task.imageUrl); }}
                        className="p-2.5 rounded-xl bg-white/10 hover:bg-banana hover:text-black transition-all"
                        title="Usar como referencia"
                    >
                        <RefreshCw size={16} />
                    </button>
                </div>
            </div>
        </>
    );
}

function getModelBadge(model) {
    if (model === 'nano-banana-2') return 'BANANA 2';
    if (model === 'nano-banana-pro') return 'PRO';
    if (model === 'nano-banana') return 'STD';
    return 'ARCHIVE';
}
