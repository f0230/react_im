import { useCallback, useRef, useState } from 'react';
import { Node, Edge } from '@xyflow/react';

// Approximate node sizes used when React Flow hasn't measured the node yet.
// These match the visual footprint of each node type.
const NODE_SIZES: Record<string, { width: number; height: number }> = {
  prompt: { width: 280, height: 180 },
  model: { width: 340, height: 360 },
  output: { width: 260, height: 220 },
  image: { width: 200, height: 200 },
  enhancer: { width: 280, height: 180 },
  multiPrompt: { width: 280, height: 240 },
  element: { width: 260, height: 160 },
};
const DEFAULT_SIZE = { width: 300, height: 200 };

interface PositionResult {
  id: string;
  x: number;
  y: number;
}

interface WorkerResponse {
  id: string;
  positions: PositionResult[] | null;
  error: string | null;
}

export function useElkLayout() {
  const workerRef = useRef<Worker | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const getWorker = useCallback((): Worker => {
    if (!workerRef.current) {
      workerRef.current = new Worker(
        new URL('./elk.worker.ts', import.meta.url),
        { type: 'module' },
      );
    }
    return workerRef.current;
  }, []);

  /**
   * Runs ELK layout on non-pinned nodes.
   * Returns the full nodes array with updated positions, or null if nothing changed.
   */
  const runLayout = useCallback(
    (nodes: Node[], edges: Edge[]): Promise<Node[] | null> => {
      return new Promise((resolve) => {
        const freeNodes = nodes.filter((n) => !n.data?.pinned);

        if (freeNodes.length === 0) {
          resolve(null);
          return;
        }

        setIsRunning(true);

        const requestId = `layout-${Date.now()}`;
        const worker = getWorker();

        // Build ELK input — only free nodes participate in layout
        const elkNodes = freeNodes.map((n) => {
          const sizes = NODE_SIZES[n.type ?? ''] ?? DEFAULT_SIZE;
          const measured = (n as Node & { measured?: { width?: number; height?: number } }).measured;
          return {
            id: n.id,
            width: measured?.width ?? sizes.width,
            height: measured?.height ?? sizes.height,
          };
        });

        // Only include edges where both endpoints are free (not pinned)
        const freeIds = new Set(freeNodes.map((n) => n.id));
        const elkEdges = edges
          .filter((e) => freeIds.has(e.source) && freeIds.has(e.target))
          .map((e) => ({ id: e.id, source: e.source, target: e.target }));

        const handleMessage = (event: MessageEvent<WorkerResponse>) => {
          if (event.data.id !== requestId) return;
          worker.removeEventListener('message', handleMessage);
          setIsRunning(false);

          if (event.data.error || !event.data.positions) {
            console.error('[ELK] layout error:', event.data.error);
            resolve(null);
            return;
          }

          const posMap = new Map(event.data.positions.map((p) => [p.id, p]));

          const updatedNodes = nodes.map((n) => {
            if (n.data?.pinned) return n;
            const pos = posMap.get(n.id);
            if (!pos) return n;
            return { ...n, position: { x: pos.x, y: pos.y } };
          });

          resolve(updatedNodes);
        };

        worker.addEventListener('message', handleMessage);
        worker.postMessage({ id: requestId, nodes: elkNodes, edges: elkEdges });
      });
    },
    [getWorker],
  );

  return { runLayout, isRunning };
}
