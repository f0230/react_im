import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Copy, RefreshCw, Info, Type, ChevronLeft, ChevronRight } from 'lucide-react';
import { copyImageToClipboard, downloadImage } from '@/lib/utils';

export default function ImageViewer({ task, tasks, onClose, onSelect, onUseAsReference }) {
    if (!task) return null;

    const currentIndex = tasks.findIndex(t => t.id === task.id);
    const nextTask = currentIndex > 0 ? tasks[currentIndex - 1] : null;
    const prevTask = currentIndex < tasks.length - 1 ? tasks[currentIndex + 1] : null;
    const promptLabel = task.prompt || 'Imagen compartida sin prompt guardado';
    const modelLabel = getModelLabel(task.model);

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-12 bg-black/95 backdrop-blur-xl"
                onClick={onClose}
            >
                <div className="absolute top-6 right-6 flex items-center gap-4 z-50">
                    <button
                        onClick={onClose}
                        className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-white transition-all border border-white/10"
                    >
                        <X size={24} />
                    </button>
                </div>

                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    className="relative w-full h-full flex flex-col lg:flex-row gap-8 items-stretch"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Main Image Container */}
                    <div className="flex-1 relative flex items-center justify-center min-h-0 bg-[#050505] rounded-3xl border border-white/5 overflow-hidden group/img">
                        <img
                            src={task.imageUrl}
                            alt={promptLabel}
                            className="max-w-full max-h-full object-contain drop-shadow-2xl"
                            referrerPolicy="no-referrer"
                        />

                        {/* Navigation Arrows */}
                        <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 flex justify-between pointer-events-none">
                            {prevTask && (
                                <button
                                    onClick={() => onSelect(prevTask)}
                                    className="p-4 rounded-2xl bg-black/40 hover:bg-banana hover:text-black text-white backdrop-blur-md border border-white/10 transition-all pointer-events-auto"
                                >
                                    <ChevronLeft size={32} />
                                </button>
                            )}
                            {nextTask && (
                                <button
                                    onClick={() => onSelect(nextTask)}
                                    className="p-4 rounded-2xl bg-black/40 hover:bg-banana hover:text-black text-white backdrop-blur-md border border-white/10 transition-all pointer-events-auto"
                                >
                                    <ChevronRight size={32} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Info Sidebar */}
                    <div className="w-full lg:w-[400px] flex flex-col gap-6 overflow-y-auto pr-2">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded bg-banana/10 text-banana text-[10px] font-bold uppercase tracking-widest border border-banana/20">
                                    {modelLabel}
                                </span>
                                <span className="text-[10px] text-white/40 font-mono uppercase tracking-widest">
                                    ID: {task.id}
                                </span>
                            </div>
                            <h2 className="text-2xl font-bold tracking-tight text-white">Image Preview</h2>
                        </div>

                        <div className="glass-panel p-6 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest flex items-center gap-2">
                                    <Type size={12} /> Prompt
                                </label>
                                <p className="text-sm leading-relaxed text-white/90 font-medium italic">
                                    "{promptLabel}"
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-6 pt-4 border-t border-white/5">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Aspect Ratio</label>
                                    <p className="text-sm font-semibold text-banana">{task.aspectRatio || 'N/A'}</p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Resolution</label>
                                    <p className="text-sm font-semibold text-banana">{task.imageSize || 'N/A'}</p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Created At</label>
                                    <p className="text-sm font-semibold text-white">{new Date(task.createdAt).toLocaleTimeString()}</p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Status</label>
                                    <p className="text-sm font-semibold text-emerald-400 capitalize">{task.status}</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 mt-auto">
                            <div className="flex gap-3">
                                <button
                                    onClick={() => task.imageUrl && downloadImage(task.imageUrl, `banana-${task.id}.png`)}
                                    className="flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all font-bold text-white"
                                >
                                    <Download size={20} />
                                    Download
                                </button>
                                <button
                                    onClick={() => task.imageUrl && copyImageToClipboard(task.imageUrl)}
                                    className="flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all font-bold text-white"
                                >
                                    <Copy size={20} />
                                    Copy
                                </button>
                            </div>
                            <button
                                onClick={() => {
                                    if (task.imageUrl) {
                                        onUseAsReference(task.imageUrl);
                                        onClose();
                                    }
                                }}
                                className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-banana text-black hover:bg-banana-dark transition-all font-black uppercase tracking-tighter"
                            >
                                <RefreshCw size={20} />
                                Use as Reference
                            </button>
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-white/20 uppercase tracking-widest font-bold mt-4">
                            <Info size={12} />
                            Powered by Google Gemini Nano
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

function getModelLabel(model) {
    if (model === 'nano-banana-pro') return 'Pro Model';
    if (model === 'nano-banana-2') return 'Banana 2';
    if (model === 'nano-banana') return 'Standard';
    return 'Archivo';
}
