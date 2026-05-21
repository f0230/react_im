import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check,
  ChevronDown,
  Download,
  Loader2,
  Search,
  X,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

function extractFileKeyFromUrl(url) {
  if (!url) return null;
  const match = url.match(/figma\.com\/(?:design|file)\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

function extractNodeIdFromUrl(url) {
  if (!url) return null;
  const match = url.match(/[?&]node-id=([0-9A-Za-z-]+)/);
  return match ? match[1] : null;
}

function FrameSkeletonLoader() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="aspect-square rounded-lg bg-white/5 animate-pulse border border-white/10"
        />
      ))}
    </div>
  );
}

function FrameCard({ frame, selected, onSelect, loading, imageUrl }) {
  const imageError = !imageUrl;

  return (
    <button
      onClick={() => onSelect(frame)}
      disabled={loading}
      className={`group relative aspect-square rounded-lg border-2 transition-all overflow-hidden ${
        selected
          ? 'border-emerald-400 bg-emerald-500/20 ring-2 ring-emerald-400'
          : 'border-white/10 bg-white/5 hover:border-white/20'
      } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      {imageUrl ? (
        <>
          <img
            src={imageUrl}
            alt={frame.name}
            className="w-full h-full object-cover"
          />
          {selected && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <div className="w-6 h-6 rounded-full border-2 border-emerald-400 bg-emerald-500 flex items-center justify-center">
                <Check size={14} className="text-white" strokeWidth={3} />
              </div>
            </div>
          )}
        </>
      ) : imageError ? (
        <div className="w-full h-full bg-white/5 flex items-center justify-center">
          <div className="text-center text-xs text-white/40">
            <p>Error</p>
          </div>
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Loader2 size={16} className="text-white/40 animate-spin" />
        </div>
      )}

      {/* Frame name overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="text-white text-xs font-medium truncate">
          {frame.name}
        </p>
      </div>
    </button>
  );
}

export function FigmaFramePicker({
  open,
  onClose,
  onImport,
  figmaUrl,
  projectId,
}) {
  const [figmaInput, setFigmaInput] = useState(figmaUrl || '');
  const [pages, setPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState(null);
  const [selectedFrames, setSelectedFrames] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pageDropdownOpen, setPageDropdownOpen] = useState(false);
  const [frameImages, setFrameImages] = useState({}); // { [nodeId]: imageUrl }
  const dropdownRef = useRef(null);

  const fileKey = useMemo(() => extractFileKeyFromUrl(figmaInput), [figmaInput]);
  const nodeIdFromUrl = useMemo(() => extractNodeIdFromUrl(figmaInput), [figmaInput]);

  // When opening the modal: load project's figma_url if available
  useEffect(() => {
    if (!open || !projectId || figmaInput) return;

    const loadProjectFigmaUrl = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('projects')
          .select('figma_url')
          .eq('id', projectId)
          .single();

        if (fetchError) {
          console.warn('Could not load project figma_url:', fetchError.message);
          return;
        }

        if (data?.figma_url) {
          setFigmaInput(data.figma_url);
        }
      } catch (err) {
        console.warn('Error loading project figma_url:', err);
      }
    };

    loadProjectFigmaUrl();
  }, [open, projectId, figmaInput]);

  // Load images for the selected page (in batches to avoid huge URLs)
  useEffect(() => {
    if (!selectedPage || !fileKey) return;

    const loadPageImages = async () => {
      if (selectedPage.frames.length === 0) {
        setFrameImages({});
        return;
      }

      setFrameImages({});

      try {
        // Batch in groups of 20 to avoid URL too long
        const BATCH_SIZE = 20;
        const allFrames = selectedPage.frames;

        for (let i = 0; i < allFrames.length; i += BATCH_SIZE) {
          const batch = allFrames.slice(i, i + BATCH_SIZE);
          const nodeIds = batch.map(f => f.nodeId).join(',');

          const response = await fetch(
            `/api/integrations?service=figma&action=export-images&fileKey=${encodeURIComponent(fileKey)}&nodeIds=${encodeURIComponent(nodeIds)}`
          );

          if (!response.ok) {
            console.warn('Failed to load image batch', i);
            continue;
          }

          const data = await response.json();
          setFrameImages(prev => ({ ...prev, ...(data.images || {}) }));
        }
      } catch (err) {
        console.error('Failed to load page images:', err);
      }
    };

    loadPageImages();
  }, [selectedPage, fileKey]);

  const handleLoadFrames = useCallback(async () => {
    if (!fileKey) {
      setError('URL de Figma inválida. Debe ser tipo: https://figma.com/design/...');
      return;
    }

    setLoading(true);
    setError(null);
    setPages([]);
    setSelectedFrames(new Set());
    setFrameImages({});

    try {
      const nodeParam = nodeIdFromUrl ? `&nodeId=${encodeURIComponent(nodeIdFromUrl)}` : '';
      const response = await fetch(
        `/api/integrations?service=figma&action=get-frames&fileKey=${encodeURIComponent(fileKey)}${nodeParam}`
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || `Error ${response.status}: No se pudieron cargar los frames`);
      }

      const pagesWithFileKey = (data.pages || []).map(page => ({
        ...page,
        frames: (page.frames || []).map(frame => ({ ...frame, fileKey })),
      }));

      setPages(pagesWithFileKey);
      if (pagesWithFileKey.length > 0) {
        // Pick first page that has frames
        const firstWithFrames = pagesWithFileKey.find(p => p.frames.length > 0) || pagesWithFileKey[0];
        setSelectedPage(firstWithFrames);
      } else {
        setError('No se encontraron páginas en este archivo de Figma');
      }
    } catch (err) {
      console.error('Error loading frames:', err);
      setError(err.message || 'Error al cargar los frames');
    } finally {
      setLoading(false);
    }
  }, [fileKey, nodeIdFromUrl]);

  const handleSelectFrame = useCallback(
    frame => {
      const frameKey = `${frame.nodeId}`;
      const newSelected = new Set(selectedFrames);
      if (newSelected.has(frameKey)) {
        newSelected.delete(frameKey);
      } else {
        newSelected.add(frameKey);
      }
      setSelectedFrames(newSelected);
    },
    [selectedFrames]
  );

  const handleImport = useCallback(async () => {
    if (selectedFrames.size === 0 || !fileKey) return;

    const nodeIds = Array.from(selectedFrames).join(',');

    try {
      const response = await fetch(
        `/api/integrations?service=figma&action=export-images&fileKey=${encodeURIComponent(fileKey)}&nodeIds=${encodeURIComponent(nodeIds)}`
      );

      if (!response.ok) {
        throw new Error('Failed to export images');
      }

      const data = await response.json();
      const urls = Object.values(data.images || {}).filter(Boolean);

      if (urls.length > 0) {
        onImport(urls);
        setFigmaInput('');
        setPages([]);
        setSelectedFrames(new Set());
        onClose();
      }
    } catch (err) {
      console.error('Error exporting images:', err);
      setError(err.message || 'Failed to export images');
    }
  }, [selectedFrames, fileKey, onImport, onClose]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setPageDropdownOpen(false);
      }
    }

    if (pageDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [pageDropdownOpen]);

  if (!open) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[300] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={e => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-4xl max-h-[90vh] rounded-2xl bg-[#0f0f0f] border border-white/10 shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              Importar frames de Figma
            </h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X size={20} className="text-white/70" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {/* URL Input */}
            <div className="px-6 py-4 border-b border-white/10">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="https://figma.com/design/abc123/...?node-id=1-23"
                  value={figmaInput}
                  onChange={e => setFigmaInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !loading) {
                      handleLoadFrames();
                    }
                  }}
                  className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-white/30 transition-colors"
                />
                <button
                  onClick={handleLoadFrames}
                  disabled={!fileKey || loading}
                  className="px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {loading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Search size={16} />
                  )}
                  Cargar
                </button>
              </div>
              <p className="mt-2 text-[11px] text-white/40 leading-relaxed">
                💡 Tip: en Figma, click derecho en un frame o sección → <span className="text-white/60">Copy link to selection</span>. Así solo cargás los frames de esa parte, no todo el archivo.
                {nodeIdFromUrl && (
                  <span className="block mt-1 text-emerald-400">
                    ✓ Frame específico detectado: {nodeIdFromUrl}
                  </span>
                )}
              </p>
              {error && (
                <p className="mt-2 text-xs text-red-400">{error}</p>
              )}
            </div>

            {/* Pages & Frames */}
            {pages.length > 0 ? (
              <div className="px-6 py-4">
                {/* Page Selector */}
                <div className="mb-4">
                  <label className="block text-xs font-medium text-white/60 mb-2">
                    Página
                  </label>
                  <div className="relative" ref={dropdownRef}>
                    <button
                      onClick={() => setPageDropdownOpen(!pageDropdownOpen)}
                      className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm hover:border-white/20 transition-colors flex items-center justify-between"
                    >
                      <span>{selectedPage?.name || 'Selecciona una página'}</span>
                      <ChevronDown
                        size={16}
                        className={`transition-transform ${
                          pageDropdownOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {pageDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 rounded-lg bg-[#1c1c1e] border border-white/10 shadow-xl z-10">
                        {pages.map(page => (
                          <button
                            key={page.id}
                            onClick={() => {
                              setSelectedPage(page);
                              setPageDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-sm transition-colors first:rounded-t-lg last:rounded-b-lg ${
                              selectedPage?.id === page.id
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'text-white/70 hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            {page.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Frames Grid */}
                {selectedPage && selectedPage.frames.length > 0 ? (
                  <div>
                    <label className="block text-xs font-medium text-white/60 mb-3">
                      Frames ({selectedPage.frames.length})
                    </label>
                    {Object.keys(frameImages).length === 0 && (
                      <FrameSkeletonLoader />
                    )}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                      {selectedPage.frames.map(frame => (
                        <FrameCard
                          key={frame.nodeId}
                          frame={frame}
                          selected={selectedFrames.has(frame.nodeId)}
                          onSelect={handleSelectFrame}
                          loading={loading}
                          imageUrl={frameImages[frame.nodeId]}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-white/40 text-sm">
                      No hay frames en esta página
                    </p>
                  </div>
                )}
              </div>
            ) : !loading && !error && pages.length === 0 && figmaInput ? (
              <div className="flex items-center justify-center h-64">
                <p className="text-white/40 text-sm">
                  Haz click en "Cargar" para ver los frames
                </p>
              </div>
            ) : null}
          </div>

          {/* Footer */}
          {pages.length > 0 && (
            <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between bg-white/[0.02]">
              <p className="text-xs text-white/50">
                {selectedFrames.size} frame{selectedFrames.size !== 1 ? 's' : ''}{' '}
                seleccionado{selectedFrames.size !== 1 ? 's' : ''}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg border border-white/20 text-white text-sm font-medium hover:bg-white/10 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleImport}
                  disabled={selectedFrames.size === 0 || loading}
                  className="px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {loading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Download size={16} />
                  )}
                  Importar {selectedFrames.size > 0 ? `(${selectedFrames.size})` : ''}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
