import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RefreshCw, Type, ChevronLeft, ChevronRight } from 'lucide-react';

export default function ImageViewer({ task, tasks, onClose, onSelect, onUseAsReference }) {
    if (!task) return null;

    const currentIndex = tasks.findIndex(t => t.id === task.id);
    const prevTask = currentIndex > 0 ? tasks[currentIndex - 1] : null;
    const nextTask = currentIndex < tasks.length - 1 ? tasks[currentIndex + 1] : null;
    const promptLabel = task.prompt || 'Imagen compartida sin prompt guardado';

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                animate={{ opacity: 1, backdropFilter: 'blur(0px)' }}
                exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4 md:p-8"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.92, opacity: 0, y: 34, filter: 'blur(10px)' }}
                    animate={{ scale: 1, opacity: 1, y: 0, filter: 'blur(0px)' }}
                    exit={{ scale: 0.965, opacity: 0, y: 20, filter: 'blur(8px)' }}
                    transition={{
                        type: 'spring',
                        stiffness: 260,
                        damping: 26,
                        mass: 0.9,
                    }}
                    className="relative flex h-[min(88vh,920px)] w-full max-w-6xl flex-col overflow-hidden rounded-[10px] bg-black shadow-[0_40px_140px_rgba(0,0,0,0.55)] lg:flex-row"
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/30 text-white/75 transition-all hover:bg-white/10 hover:text-white"
                    >
                        <X size={18} />
                    </button>

                    <motion.div
                        initial={{ opacity: 0, scale: 1.03 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.02 }}
                        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1], delay: 0.03 }}
                        className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-black p-4 md:p-6"
                    >
                        <div className="absolute left-4 top-4 z-20 flex items-center gap-2">
                            <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/50">
                                Preview
                            </span>
                            <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/50">
                                {task.imageSize || 'N/A'}
                            </span>
                        </div>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.985, y: 8 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.99, y: 6 }}
                            transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1], delay: 0.06 }}
                            className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-[10px] border border-white/10 bg-black"
                        >
                            <motion.img
                                src={task.imageUrl}
                                alt={promptLabel}
                                className="max-h-full max-w-full object-contain drop-shadow-[0_24px_80px_rgba(0,0,0,0.65)]"
                                referrerPolicy="no-referrer"
                                loading="eager"
                                fetchPriority="high"
                                decoding="async"
                                initial={{ opacity: 0.7, scale: 1.015 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0.72, scale: 1.01 }}
                                transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
                            />
                        </motion.div>

                        <img
                            src={task.imageUrl}
                            alt=""
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-0 -z-10 h-full w-full scale-110 object-cover opacity-[0.12] blur-3xl"
                        />

                        <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 flex justify-between pointer-events-none">
                            {prevTask && (
                                <motion.button
                                    onClick={() => onSelect(prevTask)}
                                    className="pointer-events-auto rounded-full border border-white/10 bg-black/35 p-3 text-white backdrop-blur-md transition-all hover:bg-white/10"
                                    whileTap={{ scale: 0.94 }}
                                >
                                    <ChevronLeft size={24} />
                                </motion.button>
                            )}
                            {nextTask && (
                                <motion.button
                                    onClick={() => onSelect(nextTask)}
                                    className="pointer-events-auto rounded-full border border-white/10 bg-black/35 p-3 text-white backdrop-blur-md transition-all hover:bg-white/10"
                                    whileTap={{ scale: 0.94 }}
                                >
                                    <ChevronRight size={24} />
                                </motion.button>
                            )}
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 18 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 12 }}
                        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1], delay: 0.04 }}
                        className="flex w-full flex-col gap-5 overflow-y-auto border-t border-white/10 bg-black p-5 lg:w-[360px] lg:border-l lg:border-t-0 lg:p-6"
                    >
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/30">
                                    ID: {task.id}
                                </span>
                            </div>
                            <div>
                                <h2 className="text-2xl font-semibold tracking-tight text-white">Preview</h2>
                            </div>
                        </div>

                        <div className="rounded-[10px] border border-white/10 bg-black p-5">
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-white/30">
                                    <Type size={12} /> Prompt
                                </label>
                                <p className="text-sm leading-relaxed text-white/85">
                                    {promptLabel}
                                </p>
                            </div>

                            <div className="mt-5 grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/30">Aspect Ratio</label>
                                    <p className="text-sm font-semibold text-white">{task.aspectRatio || 'N/A'}</p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/30">Resolution</label>
                                    <p className="text-sm font-semibold text-white">{task.imageSize || 'N/A'}</p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/30">Created At</label>
                                    <p className="text-sm font-semibold text-white">{new Date(task.createdAt).toLocaleTimeString()}</p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/30">Status</label>
                                    <p className="text-sm font-semibold capitalize text-emerald-400">{task.status}</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-auto grid grid-cols-1 gap-3">
                            <motion.button
                                onClick={() => {
                                    if (task.imageUrl) {
                                        onUseAsReference(task.imageUrl);
                                        onClose();
                                    }
                                }}
                                    className="flex w-full items-center justify-center gap-3 rounded-[10px] bg-banana px-6 py-4 font-black uppercase tracking-[0.12em] text-black transition-all hover:bg-banana-dark"
                                whileTap={{ scale: 0.985 }}
                            >
                                <RefreshCw size={18} />
                                Usar Como Referencia
                            </motion.button>
                        </div>
                    </motion.div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

