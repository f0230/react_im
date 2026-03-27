import { Image as ImageIcon, CheckCircle2, Loader2, Download } from 'lucide-react';
import BaseNode from './BaseNode';
import { Port } from './Port';

export default function OutputNode({ id, data }: { id: string, data: any }) {
  // Determine aspect ratio style based on resultAspectRatio
  const getAspectRatioStyle = () => {
    if (!data.resultAspectRatio) return { aspectRatio: '16 / 9' };
    
    // Convert "16:9" to "16 / 9" for CSS
    const ratio = data.resultAspectRatio.replace(':', ' / ');
    return { aspectRatio: ratio };
  };

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

        <div
          className="w-full bg-white/5 border border-white/10 rounded-[16px] flex flex-col items-center justify-center text-white/50 overflow-hidden relative transition-all duration-500"
          style={getAspectRatioStyle()}
        >
          {data.status === 'loading' ? (
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-[3px] border-white/10 border-t-[#0A84FF] rounded-full animate-spin shadow-[0_0_15px_rgba(10,132,255,0.2)]" />
              <span className="text-[13px] font-medium animate-pulse text-white/70">Generating...</span>
            </div>
          ) : data.status === 'success' && data.resultUrl ? (
            data.resultType === 'video' ? (
              <video src={data.resultUrl} controls autoPlay loop className="w-full h-full object-cover" />
            ) : (
              <img src={data.resultUrl} alt="Generated Output" className="w-full h-full object-cover" />
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
      </div>

      {data.status === 'success' && data.resultUrl && (
        <div className="absolute right-0 top-1/2 -translate-y-1/2">
          <Port type="source" id="out" color="green" icon={<Download size={14} />} />
        </div>
      )}
    </BaseNode>
  );
}
