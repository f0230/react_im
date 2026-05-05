import { useRef } from 'react';
import { Image as ImageIcon, Upload } from 'lucide-react';
import { useReactFlow } from '@xyflow/react';
import BaseNode from './BaseNode';
import { Port } from './Port';
import toast from 'react-hot-toast';
import { persistMediaUrl } from '../../lib/mediaStorage';

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.readAsDataURL(file);
  });
}

function getAspectRatio(src: string): Promise<number> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.width / img.height || 1);
    img.onerror = () => resolve(1);
    img.src = src;
  });
}

export default function ImageNode({ id, data }: { id: string; data: any }) {
  const { updateNodeData } = useReactFlow();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    const MAX_MB = 15;
    if (file.size > MAX_MB * 1024 * 1024) {
      alert(`La imagen es demasiado grande (máx ${MAX_MB} MB)`);
      return;
    }

    const dataUrl = await fileToDataUrl(file);
    const aspectRatio = await getAspectRatio(dataUrl);

    updateNodeData(id, {
      imageUrl: dataUrl,
      aspectRatio,
      storagePath: null,
    });

    try {
      const { storagePath, signedUrl } = await persistMediaUrl(
        dataUrl,
        `ref-${id}-${Date.now()}`,
      );
      updateNodeData(id, { imageUrl: signedUrl, aspectRatio, storagePath });
    } catch (error) {
      console.warn('[image-node] Persisting reference image failed:', error);
      // Keep the data URL fallback to avoid losing the image on refresh.
      toast.error('No se pudo guardar la referencia en storage, usando fallback local.');
    }
  };

  const handleClick = () => inputRef.current?.click();

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith('image/')) void handleFile(file);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    // 1. Image blob from clipboard (e.g. screenshot, browser copy-image)
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) { handleFile(file); return; }
      }
    }

    // 2. Text URL (e.g. copied with the Studio copy-URL button)
    for (const item of Array.from(items)) {
      if (item.type === 'text/plain') {
        item.getAsString((text) => {
          const trimmed = text.trim();
          if (/^https?:\/\/.+\.(png|jpg|jpeg|webp|gif|avif)(\?.*)?$/i.test(trimmed) || trimmed.startsWith('http')) {
            // Load image to get aspect ratio
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = async () => {
              const ratio = img.width / img.height || 1;
              updateNodeData(id, { imageUrl: trimmed, aspectRatio: ratio, storagePath: null });

              try {
                const { storagePath, signedUrl } = await persistMediaUrl(
                  trimmed,
                  `ref-url-${id}-${Date.now()}`,
                );
                updateNodeData(id, { imageUrl: signedUrl, aspectRatio: ratio, storagePath });
              } catch (error) {
                console.warn('[image-node] Persisting pasted URL failed:', error);
              }
            };
            img.onerror = async () => {
              // Accept URL even if CORS blocks load
              updateNodeData(id, { imageUrl: trimmed, aspectRatio: 1, storagePath: null });
              try {
                const { storagePath, signedUrl } = await persistMediaUrl(
                  trimmed,
                  `ref-url-${id}-${Date.now()}`,
                );
                updateNodeData(id, { imageUrl: signedUrl, aspectRatio: 1, storagePath });
              } catch (error) {
                console.warn('[image-node] Persisting pasted URL failed:', error);
              }
            };
            img.src = trimmed;
          }
        });
        return;
      }
    }
  };

  return (
    <BaseNode id={id} title="Image" className="w-48 p-3 rounded-[24px]">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = '';
        }}
      />

      <div
        className="nodrag w-full bg-white/5 rounded-[16px] overflow-hidden relative border border-white/10 cursor-pointer hover:bg-white/10 hover:border-white/20 transition-all"
        style={{ aspectRatio: data.aspectRatio || 9 / 16 }}
        onClick={handleClick}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onPaste={handlePaste}
        tabIndex={0}
      >
        {data.imageUrl ? (
          <img src={data.imageUrl} alt="Reference" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-white/40 gap-2">
            <Upload size={20} className="opacity-50" />
            <span className="text-[11px] font-medium">Click or drop</span>
          </div>
        )}
      </div>

      <div className="absolute right-0 bottom-12">
        <Port type="source" id="out" color="green" icon={<ImageIcon size={14} />} />
      </div>
    </BaseNode>
  );
}
