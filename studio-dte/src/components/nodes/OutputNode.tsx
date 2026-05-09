import { useState } from 'react';
import {
  Image as ImageIcon,
  Download,
  ArrowUpFromLine,
  Loader2,
  ChevronDown,
  Copy,
  Check,
} from 'lucide-react';
import BaseNode from './BaseNode';
import { Port } from './Port';
import { createUpscaleTask, pollMarketTask } from '../../lib/kie';
import toast from 'react-hot-toast';

const UPSCALE_FACTORS_IMAGE = ['2', '4', '8'];
const UPSCALE_FACTORS_VIDEO = ['2', '4'];

export default function OutputNode({ id, data }: { id: string; data: any }) {
  const [downloading, setDownloading] = useState(false);
  const [upscaling, setUpscaling] = useState(false);
  const [showFactors, setShowFactors] = useState(false);

  const isVideo = data.resultType === 'video';
  const factors = isVideo ? UPSCALE_FACTORS_VIDEO : UPSCALE_FACTORS_IMAGE;

  const getAspectRatioStyle = () => {
    if (!data.resultAspectRatio) return { aspectRatio: '16 / 9' };
    const ratio = data.resultAspectRatio.replace(':', ' / ');
    return { aspectRatio: ratio };
  };

  const downloadBlob = async (url: string, suffix = '') => {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const ext = isVideo ? 'mp4' : 'png';
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `studio-dte-${data.taskId || Date.now()}${suffix}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  };

  const handleDownload = async () => {
    if (!data.resultUrl || downloading) return;
    setDownloading(true);
    try {
      await downloadBlob(data.resultUrl as string);
    } catch (e) {
      console.error('Download failed:', e);
      window.open(data.resultUrl, '_blank');
    } finally {
      setDownloading(false);
    }
  };

  const handleUpscale = async (factor: string) => {
    if (!data.resultUrl || upscaling) return;
    setShowFactors(false);
    setUpscaling(true);
    const type = isVideo ? 'video' : 'image';
    try {
      toast(`Upscaling ${type} ${factor}x...`, { icon: '⬆️' });
      const taskId = await createUpscaleTask(data.resultUrl as string, type, factor);
      const result = await pollMarketTask(taskId);
      const upscaledUrl = result.urls[0];
      if (!upscaledUrl) throw new Error('No upscaled URL returned');
      await downloadBlob(upscaledUrl, `-${factor}x`);
      toast.success(`${factor}x upscale complete!`);
    } catch (e) {
      console.error('Upscale failed:', e);
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg.length > 80 ? msg.slice(0, 80) + '...' : msg);
    } finally {
      setUpscaling(false);
    }
  };

  const [copying, setCopying] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyImage = async () => {
    if (!data.resultUrl || copying) return;
    setCopying(true);
    try {
      const response = await fetch(data.resultUrl as string);
      const sourceBlob = await response.blob();

      // Convert to PNG via canvas for maximum compatibility and quality
      const bitmap = await createImageBitmap(sourceBlob);
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(bitmap, 0, 0);

      const pngBlob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png'),
      );

      await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
      setCopied(true);
      toast.success('Imagen copiada');
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Copy image failed:', e);
      toast.error('No se pudo copiar la imagen');
    } finally {
      setCopying(false);
    }
  };

  const hasResult = data.status === 'success' && data.resultUrl;

  return (
    <BaseNode id={id} className="w-80 p-4">
      <div className="absolute left-0 top-1/2 -translate-y-1/2">
        <Port type="target" id="in" color="green" icon={<ImageIcon size={14} />} />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-medium text-white/70">Output</span>
          <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
            <span className="relative flex h-2 w-2">
              {data.status === 'loading' && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0A84FF] opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                data.status === 'success' ? 'bg-[#32D74B]' :
                data.status === 'loading' ? 'bg-[#0A84FF]' :
                data.status === 'error' ? 'bg-[#FF3B30]' : 'bg-white/30'
              }`}></span>
            </span>
            <span className="text-[11px] font-medium text-white/70 capitalize tracking-wide">{data.status}</span>
          </div>
        </div>

        {/* Preview */}
        <div
          className="w-full bg-white/5 border border-white/10 rounded-[16px] flex flex-col items-center justify-center text-white/50 overflow-hidden relative transition-all duration-500 group/preview"
          style={getAspectRatioStyle()}
        >
          {data.status === 'loading' ? (
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-[3px] border-white/10 border-t-[#0A84FF] rounded-full animate-spin shadow-[0_0_15px_rgba(10,132,255,0.2)]" />
              <span className="text-[13px] font-medium animate-pulse text-white/70">Generating...</span>
            </div>
          ) : hasResult ? (
            <>
              {data.resultType === 'video' ? (
                <video src={data.resultUrl} controls autoPlay loop className="w-full h-full object-cover" />
              ) : (
                <img src={data.resultUrl} alt="Generated Output" className="w-full h-full object-cover" referrerPolicy="no-referrer" crossOrigin="anonymous" />
              )}
              {/* Copy image button — appears on hover */}
              {!isVideo && (
                <div className="absolute top-2 right-2 opacity-0 group-hover/preview:opacity-100 transition-opacity duration-200">
                  <button
                    onClick={handleCopyImage}
                    disabled={copying}
                    className="bg-black/50 backdrop-blur-sm border border-white/10 rounded-lg h-7 w-7 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/70 transition-all disabled:opacity-50"
                    title="Copiar imagen"
                  >
                    {copying ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : copied ? (
                      <Check size={13} className="text-[#32D74B]" />
                    ) : (
                      <Copy size={13} />
                    )}
                  </button>
                </div>
              )}
            </>
          ) : data.status === 'error' ? (
            <div className="flex flex-col items-center justify-center p-6 text-center">
              <div className="text-[#FF3B30] text-[13px] font-semibold mb-2">Generation failed</div>
              <div className="text-[#FF3B30]/70 text-[11px] break-words w-full bg-[#FF3B30]/10 p-3 rounded-lg border border-[#FF3B30]/20">{data.error || 'Unknown error'}</div>
            </div>
          ) : (
            <>
              <ImageIcon size={28} className="mb-3 opacity-30" />
              <span className="text-[13px] font-medium text-white/40">Waiting for input...</span>
            </>
          )}
        </div>

        {/* Metadata + Actions */}
        {hasResult && (
          <>
            {/* Metadata row */}
            <div className="flex items-center gap-2 flex-wrap">
              {data.resultType && (
                <span className="text-[10px] font-medium text-white/40 bg-white/5 border border-white/10 rounded-full px-2 py-0.5 uppercase tracking-wider">
                  {data.resultType}
                </span>
              )}
              {data.provider && (
                <span className="text-[10px] font-medium text-white/40 bg-white/5 border border-white/10 rounded-full px-2 py-0.5 uppercase tracking-wider">
                  {data.provider}
                </span>
              )}
              {data.taskId && (
                <span className="text-[10px] font-mono text-white/30 truncate max-w-[120px]" title={data.taskId}>
                  {data.taskId}
                </span>
              )}
            </div>

            {/* Download buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleDownload}
                disabled={downloading || upscaling}
                className="flex-1 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-[12px] font-medium rounded-[10px] transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {downloading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                Download
              </button>
              <div className="relative flex-1">
                <button
                  onClick={() => !upscaling && setShowFactors(!showFactors)}
                  disabled={upscaling}
                  className="w-full py-2 bg-[#BF5AF2]/10 hover:bg-[#BF5AF2]/20 border border-[#BF5AF2]/30 text-[#BF5AF2] hover:text-white text-[12px] font-medium rounded-[10px] transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {upscaling ? <Loader2 size={12} className="animate-spin" /> : <ArrowUpFromLine size={12} />}
                  {upscaling ? 'Upscaling...' : 'Upscale'}
                  {!upscaling && <ChevronDown size={10} />}
                </button>
                {showFactors && (
                  <div className="absolute bottom-full left-0 right-0 mb-1 bg-[#1C1C1E] border border-white/10 rounded-[10px] overflow-hidden shadow-xl z-50">
                    {factors.map((f) => (
                      <button
                        key={f}
                        onClick={() => handleUpscale(f)}
                        className="nodrag w-full px-3 py-2 text-[12px] text-white/70 hover:text-white hover:bg-[#BF5AF2]/20 transition-colors text-center font-medium"
                      >
                        {f}x
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Source port for chaining — always visible when there's a result */}
      {hasResult && (
        <div className="absolute right-0 top-1/2 -translate-y-1/2">
          <Port type="source" id="out" color="green" icon={<Download size={14} />} />
        </div>
      )}
    </BaseNode>
  );
}
