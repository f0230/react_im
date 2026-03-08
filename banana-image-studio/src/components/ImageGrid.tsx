import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, AlertCircle, Download, Copy, RefreshCw } from 'lucide-react';
import { GenerationTask } from '../types';
import { cn, copyImageToClipboard, downloadImage } from '../lib/utils';

interface ImageGridProps {
  tasks: GenerationTask[];
  onSelect: (task: GenerationTask) => void;
  onUseAsReference: (imageUrl: string) => void;
}

export default function ImageGrid({ tasks, onSelect, onUseAsReference }: ImageGridProps) {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-white/20">
        <SparklesIcon className="w-16 h-16 mb-4 opacity-10" />
        <p className="text-lg font-medium">Your creations will appear here</p>
        <p className="text-sm">Start by typing a prompt below</p>
      </div>
    );
  }

  return (
    <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 p-8 pb-48 space-y-4">
      <AnimatePresence mode="popLayout">
        {tasks.map((task) => {
          const ratio = task.aspectRatio === 'auto' ? (task.status === 'completed' ? 'auto' : '1/1') : task.aspectRatio.replace(':', '/');

          return (
            <motion.div
              key={task.id}
              layout
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={cn(
                "image-card group break-inside-avoid mb-4",
              )}
              style={{ aspectRatio: ratio }}
            >
              {task.status === 'generating' ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/5 backdrop-blur-sm">
                  <Loader2 className="w-8 h-8 text-banana animate-spin mb-2" />
                  <span className="text-xs font-medium text-white/40 uppercase tracking-widest">Generating</span>
                </div>
              ) : task.status === 'failed' ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-500/10 p-4 text-center">
                  <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
                  <span className="text-xs font-medium text-red-500/60 uppercase tracking-widest mb-1">Failed</span>
                  <p className="text-[10px] text-red-400/80 line-clamp-2">{task.error}</p>
                </div>
              ) : (
                <>
                  <img
                    src={task.imageUrl}
                    alt={task.prompt}
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={() => onSelect(task)}
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 p-4 flex flex-col justify-end">
                    <p className="text-xs text-white/90 line-clamp-3 mb-4 font-medium leading-relaxed drop-shadow-lg">{task.prompt}</p>
                    <div className="flex items-center gap-2 translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                      <button
                        onClick={() => task.imageUrl && downloadImage(task.imageUrl, `banana-${task.id}.png`)}
                        className="p-2.5 rounded-xl bg-white/10 hover:bg-banana hover:text-black transition-all"
                        title="Download"
                      >
                        <Download size={16} />
                      </button>
                      <button
                        onClick={() => task.imageUrl && copyImageToClipboard(task.imageUrl)}
                        className="p-2.5 rounded-xl bg-white/10 hover:bg-banana hover:text-black transition-all"
                        title="Copy to clipboard"
                      >
                        <Copy size={16} />
                      </button>
                      <button
                        onClick={() => task.imageUrl && onUseAsReference(task.imageUrl)}
                        className="p-2.5 rounded-xl bg-white/10 hover:bg-banana hover:text-black transition-all"
                        title="Use as reference"
                      >
                        <RefreshCw size={16} />
                      </button>
                    </div>
                  </div>
                </>
              )}

              <div className="absolute top-3 left-3 px-2 py-1 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-bold text-white/80 uppercase tracking-wider">
                {task.model === 'nano-banana-2' ? 'BANANA 2' : task.model === 'nano-banana-pro' ? 'PRO' : 'STD'}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

function SparklesIcon({ className }: { className?: string }) {
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
