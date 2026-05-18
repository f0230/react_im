import { useState } from 'react';
import { Loader2, Check, AlertCircle, ChevronDown, X, Layers } from 'lucide-react';
import { useGenerationQueue } from '../lib/queueStore';

export function QueuePanel() {
  const jobs = useGenerationQueue((s) => s.jobs);
  const clearFinished = useGenerationQueue((s) => s.clearFinished);
  const [collapsed, setCollapsed] = useState(false);

  if (jobs.length === 0) return null;

  const running = jobs.filter((j) => j.status === 'running').length;
  const done = jobs.filter((j) => j.status === 'done').length;
  const failed = jobs.filter((j) => j.status === 'error').length;

  return (
    <div className="absolute bottom-4 left-4 z-40 w-64 bg-[#141417]/95 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between px-3 h-9 border-b border-white/10">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="flex items-center gap-1.5 text-white/70 hover:text-white transition-colors"
        >
          <Layers size={13} />
          <span className="text-[12px] font-medium">
            Cola{running > 0 ? ` · ${running} activa${running > 1 ? 's' : ''}` : ''}
          </span>
          <ChevronDown
            size={12}
            className={`transition-transform ${collapsed ? '-rotate-90' : ''}`}
          />
        </button>
        {running === 0 && (
          <button
            onClick={clearFinished}
            title="Limpiar terminadas"
            className="p-1 text-white/40 hover:text-white transition-colors"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {!collapsed && (
        <div className="max-h-56 overflow-y-auto py-1">
          {jobs.map((job) => (
            <div key={job.id} className="flex items-center gap-2 px-3 py-1.5">
              {job.status === 'running' && (
                <Loader2 size={12} className="text-[#0A84FF] animate-spin shrink-0" />
              )}
              {job.status === 'done' && (
                <Check size={12} className="text-[#32D74B] shrink-0" />
              )}
              {job.status === 'error' && (
                <AlertCircle size={12} className="text-[#FF3B30] shrink-0" />
              )}
              <span
                className="text-[11px] text-white/70 truncate flex-1"
                title={job.status === 'error' ? job.error : job.label}
              >
                {job.label}
              </span>
            </div>
          ))}
        </div>
      )}

      {!collapsed && (done > 0 || failed > 0) && (
        <div className="px-3 py-1.5 border-t border-white/10 text-[10px] text-white/35">
          {done} completada{done !== 1 ? 's' : ''}
          {failed > 0 ? ` · ${failed} con error` : ''}
        </div>
      )}
    </div>
  );
}
