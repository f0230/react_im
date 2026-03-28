import { Type, Plus, Trash2 } from 'lucide-react';
import { useReactFlow } from '@xyflow/react';
import BaseNode from './BaseNode';
import { Port } from './Port';

interface Segment {
  prompt: string;
  duration: number;
}

export default function MultiPromptNode({ id, data }: { id: string; data: any }) {
  const { updateNodeData } = useReactFlow();
  const segments: Segment[] = data.segments || [{ prompt: '', duration: 3 }];

  const update = (newSegments: Segment[]) =>
    updateNodeData(id, { segments: newSegments });

  const addSegment = () =>
    update([...segments, { prompt: '', duration: 3 }]);

  const removeSegment = (idx: number) => {
    if (segments.length <= 1) return;
    update(segments.filter((_, i) => i !== idx));
  };

  const updateSegment = (idx: number, patch: Partial<Segment>) =>
    update(segments.map((s, i) => (i === idx ? { ...s, ...patch } : s)));

  return (
    <BaseNode id={id} title="Multi Prompt" className="w-80 p-4">
      <div className="flex flex-col gap-3">
        <span className="text-[13px] font-medium text-white/70 flex items-center gap-1.5">
          <Type size={14} className="text-[#FF2D55]" /> Segments
        </span>

        <div className="flex flex-col gap-2 max-h-[320px] overflow-y-auto pr-1">
          {segments.map((seg, idx) => (
            <div
              key={idx}
              className="flex flex-col gap-1.5 bg-white/5 border border-white/10 rounded-[12px] p-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">
                  Shot {idx + 1}
                </span>
                {segments.length > 1 && (
                  <button
                    onClick={() => removeSegment(idx)}
                    className="nodrag text-white/20 hover:text-[#FF3B30] transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
              <textarea
                className="nodrag w-full bg-white/5 border border-white/10 rounded-[10px] p-2.5 text-[13px] leading-relaxed text-white placeholder:text-white/25 focus:outline-none focus:border-[#0A84FF] resize-none h-16 transition-all"
                placeholder="Prompt for this segment..."
                value={seg.prompt}
                onChange={(e) => updateSegment(idx, { prompt: e.target.value })}
              />
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-white/40 font-medium shrink-0">Duration</span>
                <input
                  type="number"
                  min={1}
                  max={12}
                  className="nodrag w-16 bg-white/5 border border-white/10 rounded-[8px] px-2 py-1 text-[13px] text-white text-center focus:outline-none focus:border-[#0A84FF] transition-all"
                  value={seg.duration}
                  onChange={(e) =>
                    updateSegment(idx, { duration: Math.max(1, Math.min(12, Number(e.target.value) || 1)) })
                  }
                />
                <span className="text-[10px] text-white/30">sec</span>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={addSegment}
          className="nodrag w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 border-dashed text-white/40 hover:text-white/70 text-[12px] font-medium rounded-[10px] transition-all flex items-center justify-center gap-1.5"
        >
          <Plus size={12} /> Add Segment
        </button>
      </div>

      <div className="absolute right-0 top-1/2 -translate-y-1/2">
        <Port type="source" id="out" color="pink" icon={<Type size={14} />} />
      </div>
    </BaseNode>
  );
}
