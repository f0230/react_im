import { Handle, Position } from '@xyflow/react';
import { cn } from './BaseNode';
import { ReactNode } from 'react';

const portColors = {
  green: 'bg-[#32D74B] shadow-[0_0_10px_rgba(50,215,75,0.5)]',
  pink: 'bg-[#FF2D55] shadow-[0_0_10px_rgba(255,45,85,0.5)]',
};

export function Port({ type, id, color, icon, label, className }: { type: 'source' | 'target', id: string, color: 'green' | 'pink', icon?: ReactNode, label?: string, className?: string }) {
  const isInput = type === 'target';

  return (
    <div className={cn("relative flex items-center", isInput ? "justify-start" : "justify-end", className)}>
      {icon && !isInput && (
        <div className="text-white/40 mr-3 flex items-center justify-center">{icon}</div>
      )}

      {/* Invisible hit area for easier clicking */}
      <div className={cn(
        "absolute w-10 h-10 z-[5]",
        isInput ? "-left-5" : "-right-5"
      )} />

      <Handle
        type={type}
        position={isInput ? Position.Left : Position.Right}
        id={id}
        className={cn(
          "!w-[18px] !h-[18px] !border-[3px] !border-[#1a1a1e] !bg-opacity-100 z-10 cursor-crosshair hover:!scale-[1.4] transition-all duration-300",
          portColors[color],
          isInput ? "!left-[-9px]" : "!right-[-9px]"
        )}
      />

      {icon && isInput && !label && (
        <div className="text-white/40 ml-3 flex items-center justify-center">{icon}</div>
      )}

      {label && isInput && (
        <span className="ml-3 text-[10px] text-white/40 font-medium uppercase tracking-wider whitespace-nowrap">{label}</span>
      )}
    </div>
  );
}
