import { Image as ImageIcon, AtSign } from 'lucide-react';
import { useReactFlow } from '@xyflow/react';
import BaseNode from './BaseNode';
import { Port } from './Port';

export default function ElementNode({ id, data }: { id: string; data: any }) {
  const { updateNodeData, getEdges, getNodes } = useReactFlow();

  const connectedImages = (() => {
    const edges = getEdges();
    const nodes = getNodes();
    return edges
      .filter((e) => e.target === id && e.targetHandle === 'ref-images')
      .map((e) => {
        const src = nodes.find((n) => n.id === e.source);
        return (src?.data?.imageUrl || src?.data?.resultUrl) as string | undefined;
      })
      .filter(Boolean) as string[];
  })();

  return (
    <BaseNode id={id} title="Element" className="w-72 p-4">
      <div className="absolute left-0 top-1/2 -translate-y-1/2">
        <Port type="target" id="ref-images" color="green" icon={<ImageIcon size={14} />} />
      </div>

      <div className="flex flex-col gap-3">
        <span className="text-[13px] font-medium text-white/70 flex items-center gap-1.5">
          <AtSign size={14} className="text-[#FF9F0A]" /> Element
        </span>

        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">
              Name
            </label>
            <input
              type="text"
              className="nodrag w-full bg-white/5 border border-white/10 rounded-[10px] px-3 py-2 text-[13px] text-white placeholder:text-white/25 focus:outline-none focus:border-[#FF9F0A] transition-all"
              placeholder="hero"
              value={data.name || ''}
              onChange={(e) => updateNodeData(id, { name: e.target.value })}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">
              Description
            </label>
            <textarea
              className="nodrag w-full bg-white/5 border border-white/10 rounded-[10px] p-2.5 text-[13px] leading-relaxed text-white placeholder:text-white/25 focus:outline-none focus:border-[#FF9F0A] resize-none h-16 transition-all"
              placeholder="A young woman with red hair..."
              value={data.description || ''}
              onChange={(e) => updateNodeData(id, { description: e.target.value })}
            />
          </div>
        </div>

        {/* Connected images preview */}
        {connectedImages.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {connectedImages.map((url, i) => (
              <div
                key={i}
                className="w-12 h-12 rounded-[8px] overflow-hidden border border-white/10 bg-white/5"
              >
                <img
                  src={url}
                  alt={`ref-${i}`}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            ))}
          </div>
        )}

        <div className="text-[10px] text-white/30 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5">
          Use <span className="text-[#FF9F0A] font-medium">@{data.name || 'name'}</span> in your prompt
        </div>
      </div>

      <div className="absolute right-0 top-1/2 -translate-y-1/2">
        <Port type="source" id="out" color="green" icon={<AtSign size={14} />} />
      </div>
    </BaseNode>
  );
}
