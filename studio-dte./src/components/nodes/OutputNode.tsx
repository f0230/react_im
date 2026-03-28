import { useState } from 'react';
import {
  Image as ImageIcon,
  Download,
  ArrowDownToLine,
  Loader2,
} from 'lucide-react';
import BaseNode from './BaseNode';
import { Port } from './Port';
import { getDownloadUrl } from '../../lib/kie';

export default function OutputNode({ id, data }: { id: string; data: any }) {
  const [downloading, setDownloading] = useState(false);

  const getAspectRatioStyle = () => {
    if (!data.resultAspectRatio) return { aspectRatio: '16 / 9' };
    const ratio = data.resultAspectRatio.replace(':', ' / ');
    return { aspectRatio: ratio };
  };

  const handleDownload = async (hq = false) => {
    if (!data.resultUrl || downloading) return;
    setDownloading(true);
    try {
      let url = data.resultUrl as string;
      if (hq) {
        url = await getDownloadUrl(url);
      }
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const ext = data.resultType === 'video' ? 'mp4' : 'png';
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `studio-dte-${data.taskId || Date.now()}.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      console.error('Download failed:', e);
      window.open(data.resultUrl, '_blank');
    } finally {
      setDownloading(false);
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
          className="w-full bg-white/5 border border-white/10 rounded-[16px] flex flex-col items-center justify-center text-white/50 overflow-hidden relative transition-all duration-500"
          style={getAspectRatioStyle()}
        >
          {data.status === 'loading' ? (
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-[3px] border-white/10 border-t-[#0A84FF] rounded-full animate-spin shadow-[0_0_15px_rgba(10,132,255,0.2)]" />
              <span className="text-[13px] font-medium animate-pulse text-white/70">Generating...</span>
            </div>
          ) : hasResult ? (
            data.resultType === 'video' ? (
              <video src={data.resultUrl} controls autoPlay loop className="w-full h-full object-cover" />
            ) : (
              <img src={data.resultUrl} alt="Generated Output" className="w-full h-full object-cover" referrerPolicy="no-referrer" crossOrigin="anonymous" />
            )
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
                onClick={() => handleDownload(false)}
                disabled={downloading}
                className="flex-1 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-[12px] font-medium rounded-[10px] transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {downloading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                Download
              </button>
              <button
                onClick={() => handleDownload(true)}
                disabled={downloading}
                className="flex-1 py-2 bg-[#0A84FF]/10 hover:bg-[#0A84FF]/20 border border-[#0A84FF]/30 text-[#0A84FF] hover:text-white text-[12px] font-medium rounded-[10px] transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {downloading ? <Loader2 size={12} className="animate-spin" /> : <ArrowDownToLine size={12} />}
                HQ
              </button>
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
