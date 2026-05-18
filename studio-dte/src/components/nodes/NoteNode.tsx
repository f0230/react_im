import { useReactFlow, NodeResizer } from '@xyflow/react';
import { X } from 'lucide-react';

// Sticky-note / group-box node. Resizable: small for an annotation, large to
// act as a visual group container behind other nodes.
const NOTE_COLORS: Record<string, { bg: string; border: string; dot: string }> = {
  yellow: { bg: 'rgba(255, 214, 10, 0.10)', border: 'rgba(255, 214, 10, 0.35)', dot: '#FFD60A' },
  blue:   { bg: 'rgba(10, 132, 255, 0.10)', border: 'rgba(10, 132, 255, 0.35)', dot: '#0A84FF' },
  green:  { bg: 'rgba(50, 215, 75, 0.10)',  border: 'rgba(50, 215, 75, 0.35)',  dot: '#32D74B' },
  pink:   { bg: 'rgba(255, 55, 95, 0.10)',  border: 'rgba(255, 55, 95, 0.35)',  dot: '#FF375F' },
  neutral:{ bg: 'rgba(255, 255, 255, 0.05)',border: 'rgba(255, 255, 255, 0.18)', dot: '#8E8E93' },
};

export default function NoteNode({ id, data }: { id: string; data: any }) {
  const { updateNodeData, setNodes } = useReactFlow();
  const colorKey = (data.color as string) in NOTE_COLORS ? data.color : 'yellow';
  const color = NOTE_COLORS[colorKey];

  return (
    <div
      className="w-full h-full rounded-[18px] relative group flex flex-col"
      style={{
        background: color.bg,
        border: `1px solid ${color.border}`,
        backdropFilter: 'blur(8px)',
        minWidth: 160,
        minHeight: 100,
      }}
    >
      <NodeResizer
        minWidth={160}
        minHeight={100}
        lineClassName="!border-white/20"
        handleClassName="!bg-white/40 !border-white/60 !rounded-sm"
      />

      {/* Toolbar — color swatches + delete */}
      <div className="flex items-center justify-between px-2.5 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex gap-1">
          {Object.entries(NOTE_COLORS).map(([key, c]) => (
            <button
              key={key}
              onClick={() => updateNodeData(id, { color: key })}
              className="nodrag h-3 w-3 rounded-full border border-black/20 transition-transform hover:scale-125"
              style={{ background: c.dot }}
              title={key}
            />
          ))}
        </div>
        <button
          onClick={() => setNodes((nds) => nds.filter((n) => n.id !== id))}
          className="nodrag text-white/40 hover:text-[#FF3B30] transition-colors"
          title="Eliminar nota"
        >
          <X size={13} />
        </button>
      </div>

      <textarea
        value={(data.text as string) || ''}
        onChange={(e) => updateNodeData(id, { text: e.target.value })}
        placeholder="Escribí una nota…"
        className="nodrag nowheel flex-1 w-full bg-transparent resize-none px-3 py-2 text-[13px] text-white/85 placeholder:text-white/30 focus:outline-none leading-snug"
      />
    </div>
  );
}
