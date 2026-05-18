import { useEffect, useRef, useState } from 'react';
import { Node, Edge } from '@xyflow/react';
import { LayoutTemplate, Loader2, Trash2, Plus, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  listTemplates,
  saveTemplate,
  deleteTemplate,
  WorkflowTemplate,
} from '../lib/studioTemplates';

interface TemplatesMenuProps {
  nodes: Node[];
  edges: Edge[];
  onApply: (nodes: Node[], edges: Edge[]) => void;
}

export function TemplatesMenu({ nodes, edges, onApply }: TemplatesMenuProps) {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const refresh = async () => {
    setLoading(true);
    setTemplates(await listTemplates());
    setLoading(false);
  };

  useEffect(() => {
    if (open) void refresh();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as globalThis.Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleSave = async () => {
    const name = newName.trim();
    if (!name) {
      toast.error('Poné un nombre para la plantilla');
      return;
    }
    setSaving(true);
    const ok = await saveTemplate(name, nodes, edges);
    setSaving(false);
    if (ok) {
      toast.success('Plantilla guardada');
      setNewName('');
      void refresh();
    } else {
      toast.error('No se pudo guardar la plantilla');
    }
  };

  const handleApply = (t: WorkflowTemplate) => {
    onApply(t.nodes, t.edges);
    setOpen(false);
    toast.success(`Plantilla "${t.name}" aplicada`);
  };

  const handleDelete = async (id: string) => {
    const ok = await deleteTemplate(id);
    if (ok) {
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      toast.success('Plantilla eliminada');
    } else {
      toast.error('No se pudo eliminar');
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`p-1.5 rounded-lg transition-colors ${
          open ? 'text-white bg-white/10' : 'text-white/50 hover:text-white hover:bg-white/10'
        }`}
        title="Plantillas de workflow"
      >
        <LayoutTemplate size={14} />
      </button>

      {open && (
        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-64 bg-[#1a1a1e]/97 border border-white/10 rounded-xl shadow-2xl z-[9999] overflow-hidden">
          {/* Save current */}
          <div className="p-2 border-b border-white/10">
            <div className="flex gap-1.5">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                placeholder="Guardar workflow actual…"
                className="flex-1 rounded-md bg-white/5 border border-white/10 px-2 py-1.5 text-[12px] text-white placeholder:text-white/30 focus:outline-none focus:border-[#0A84FF]/60"
              />
              <button
                onClick={handleSave}
                disabled={saving}
                className="shrink-0 h-[30px] w-[30px] flex items-center justify-center rounded-md bg-[#0A84FF]/15 border border-[#0A84FF]/30 text-[#0A84FF] hover:bg-[#0A84FF]/25 disabled:opacity-50 transition-colors"
                title="Guardar"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={14} />}
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-64 overflow-y-auto py-1">
            {loading ? (
              <div className="flex justify-center py-6">
                <Loader2 size={16} className="animate-spin text-white/30" />
              </div>
            ) : templates.length === 0 ? (
              <p className="text-[12px] text-white/30 text-center py-6">
                Sin plantillas guardadas.
              </p>
            ) : (
              templates.map((t) => (
                <div
                  key={t.id}
                  className="group flex items-center gap-2 px-2.5 py-2 hover:bg-white/5 transition-colors"
                >
                  <button
                    onClick={() => handleApply(t)}
                    className="flex-1 flex items-center gap-2 text-left min-w-0"
                  >
                    <Check size={12} className="text-white/30 shrink-0" />
                    <span className="text-[13px] text-white/80 truncate">{t.name}</span>
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-red-400/70 hover:text-red-400 transition-all"
                    title="Eliminar plantilla"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
