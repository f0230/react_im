import { useCallback, useEffect, useState } from 'react';
import { X, Loader2, Trash2, Copy, ImagePlus, History } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  fetchGenerations,
  deleteGeneration,
  fetchAssets,
  deleteAsset,
} from '../lib/studioHistory';

type Tab = 'generations' | 'assets';

interface GalleryItem {
  id: string;
  result_url: string | null;
  result_type: string | null;
  model?: string | null;
  created_at: string;
}

interface HistoryPanelProps {
  projectId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onUseImage?: (url: string) => void;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es-UY', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function HistoryPanel({ projectId, isOpen, onClose, onUseImage }: HistoryPanelProps) {
  const [tab, setTab] = useState<Tab>('generations');
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!projectId) {
      setItems([]);
      return;
    }
    setLoading(true);
    const rows =
      tab === 'generations'
        ? await fetchGenerations(projectId)
        : await fetchAssets(projectId);
    setItems(rows as GalleryItem[]);
    setLoading(false);
  }, [projectId, tab]);

  useEffect(() => {
    if (isOpen) void load();
  }, [isOpen, load]);

  const handleDelete = async (id: string) => {
    const ok =
      tab === 'generations' ? await deleteGeneration(id) : await deleteAsset(id);
    if (ok) {
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast.success('Eliminado');
    } else {
      toast.error('No se pudo eliminar');
    }
  };

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('URL copiada');
  };

  if (!isOpen) return null;

  const emptyMsg =
    tab === 'generations'
      ? 'Todavía no hay generaciones en este proyecto.'
      : 'Todavía no hay imágenes de referencia subidas.';

  return (
    <div className="absolute top-0 right-0 bottom-0 w-[340px] z-40 bg-[#141417]/95 backdrop-blur-2xl border-l border-white/10 flex flex-col shadow-2xl">
      <div className="flex items-center justify-between px-4 h-14 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <History size={15} className="text-white/60" />
          <span className="text-[13px] font-medium text-white/80">Biblioteca</span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        >
          <X size={15} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-2 border-b border-white/10 shrink-0">
        {(['generations', 'assets'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
              tab === t
                ? 'bg-white/10 text-white'
                : 'text-white/45 hover:text-white/70'
            }`}
          >
            {t === 'generations' ? 'Generaciones' : 'Referencias'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={20} className="animate-spin text-white/30" />
          </div>
        ) : !projectId ? (
          <p className="text-[12px] text-white/30 text-center py-12">
            Seleccioná un proyecto para ver su biblioteca.
          </p>
        ) : items.length === 0 ? (
          <p className="text-[12px] text-white/30 text-center py-12">{emptyMsg}</p>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {items.map((item) => (
              <div
                key={item.id}
                className="group relative rounded-xl overflow-hidden border border-white/10 bg-white/5"
              >
                <div className="aspect-square bg-black/30 flex items-center justify-center overflow-hidden">
                  {item.result_type === 'video' ? (
                    <video
                      src={item.result_url ?? undefined}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                      preload="metadata"
                    />
                  ) : (
                    <img
                      src={item.result_url ?? undefined}
                      alt={item.model ?? 'asset'}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  )}
                </div>

                <div className="px-2 py-1.5">
                  <p className="text-[10px] text-white/50 truncate">
                    {item.model ?? (tab === 'assets' ? 'Referencia' : '—')}
                  </p>
                  <p className="text-[9px] text-white/25">{formatDate(item.created_at)}</p>
                </div>

                <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {onUseImage && item.result_type !== 'video' && item.result_url && (
                    <button
                      onClick={() => onUseImage(item.result_url as string)}
                      title="Usar en el canvas"
                      className="h-6 w-6 flex items-center justify-center rounded-md bg-black/60 backdrop-blur-sm text-white/70 hover:text-white"
                    >
                      <ImagePlus size={12} />
                    </button>
                  )}
                  {item.result_url && (
                    <button
                      onClick={() => handleCopy(item.result_url as string)}
                      title="Copiar URL"
                      className="h-6 w-6 flex items-center justify-center rounded-md bg-black/60 backdrop-blur-sm text-white/70 hover:text-white"
                    >
                      <Copy size={12} />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(item.id)}
                    title="Eliminar"
                    className="h-6 w-6 flex items-center justify-center rounded-md bg-black/60 backdrop-blur-sm text-red-400/80 hover:text-red-400"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
