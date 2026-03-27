import { ReactNode } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { X } from 'lucide-react';
import { useReactFlow } from '@xyflow/react';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface BaseNodeProps {
  id: string;
  children: ReactNode;
  className?: string;
  title?: string;
}

export default function BaseNode({ id, children, className, title }: BaseNodeProps) {
  const { setNodes, setEdges } = useReactFlow();

  const handleClose = () => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
  };

  return (
    <div className={cn(
      "bg-[#1a1a1e]/80 backdrop-blur-2xl border border-white/10 rounded-[24px] shadow-xl shadow-black/30 relative group transition-all duration-300 hover:border-white/20 hover:shadow-2xl hover:shadow-black/40",
      className
    )}>
      {title && (
        <div className="absolute -top-7 left-4 text-[11px] text-white/40 uppercase tracking-widest font-semibold flex items-center justify-between w-[calc(100%-2rem)]">
          <span>{title}</span>
        </div>
      )}
      <button
        onClick={handleClose}
        className="absolute -top-3 -right-3 w-7 h-7 bg-[#2a2a2e] hover:bg-[#FF3B30] text-white/40 hover:text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 border border-white/10 hover:border-transparent shadow-md z-50"
      >
        <X size={14} />
      </button>
      {children}
    </div>
  );
}
