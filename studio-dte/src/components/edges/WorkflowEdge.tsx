import { BaseEdge, EdgeProps, getBezierPath, EdgeLabelRenderer, useReactFlow } from '@xyflow/react';
import { AlertTriangle, X } from 'lucide-react';
import React from 'react';

export default function WorkflowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}: EdgeProps) {
  const { setEdges } = useReactFlow();
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const isWarning = data?.warning;
  const isProcessing = data?.status === 'processing';
  const colorName = data?.color as string || 'default';
  
  const colors: Record<string, string> = {
    green: '#22c55e',
    pink: '#ec4899',
    default: '#64748b'
  };
  
  const color = colors[colorName] || colors.default;

  const onEdgeClick = (evt: React.MouseEvent) => {
    evt.stopPropagation();
    setEdges((edges) => edges.filter((e) => e.id !== id));
  };

  return (
    <>
      <BaseEdge 
        path={edgePath} 
        markerEnd={markerEnd} 
        style={{
          ...style,
          stroke: isWarning ? '#eab308' : (isProcessing ? '#3b82f6' : color),
          strokeWidth: isProcessing ? 3 : 2,
          strokeDasharray: isWarning ? '5,5' : '5,5',
        }} 
        className={isProcessing ? 'react-flow__edge-path animate-pulse' : 'react-flow__edge-path'}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="flex items-center gap-1"
        >
          {isWarning && (
            <div
              className="bg-yellow-500/10 border border-yellow-500/50 rounded-full p-1 backdrop-blur-md"
              title="Type mismatch"
            >
              <AlertTriangle size={12} className="text-yellow-500" />
            </div>
          )}
          <button
            className="bg-white border border-black/10 rounded-full p-1 text-black/40 hover:text-white hover:bg-red-500 hover:border-red-500 transition-colors cursor-pointer nodrag nopan shadow-sm"
            onClick={onEdgeClick}
            title="Remove connection"
          >
            <X size={10} />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
