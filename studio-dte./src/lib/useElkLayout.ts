import { useCallback, useState } from 'react';
import { Node, Edge } from '@xyflow/react';
import ELK from 'elkjs';

// Singleton — one ELK instance per session, reused across calls.
const elk = new ELK();

// Approximate node sizes used when React Flow hasn't measured the node yet.
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

/**
 * Runs ELK auto-layout on non-pinned nodes.
 * Returns the full nodes array with updated positions, or null if nothing changed.
 *
 * Runs on the main thread — for typical workflow graphs (< 100 nodes) ELK
 * completes in < 30ms, which is imperceptible. A web worker approach was removed
 * because elkjs/lib/elk.bundled.js is not compatible with Vite's ES module workers
 * in production builds.
 */
export function useElkLayout() {
  const [isRunning, setIsRunning] = useState(false);

  const runLayout = useCallback(
    async (nodes: Node[], edges: Edge[]): Promise<Node[] | null> => {
      const freeNodes = nodes.filter((n) => !n.data?.pinned);
      if (freeNodes.length === 0) return null;

      setIsRunning(true);

      try {
        const freeIds = new Set(freeNodes.map((n) => n.id));

        const elkGraph = {
          id: 'root',
          layoutOptions: {
            'elk.algorithm': 'layered',
            'elk.direction': 'RIGHT',
            'elk.spacing.nodeNode': '80',
            'elk.layered.spacing.nodeNodeBetweenLayers': '120',
            'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
            'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
          },
          children: freeNodes.map((n) => {
            const sizes = NODE_SIZES[n.type ?? ''] ?? DEFAULT_SIZE;
            const measured = (
              n as Node & { measured?: { width?: number; height?: number } }
            ).measured;
            return {
              id: n.id,
              width: measured?.width ?? sizes.width,
              height: measured?.height ?? sizes.height,
            };
          }),
          edges: edges
            .filter((e) => freeIds.has(e.source) && freeIds.has(e.target))
            .map((e) => ({ id: e.id, sources: [e.source], targets: [e.target] })),
        };

        const result = await elk.layout(elkGraph);
        const posMap = new Map(
          (result.children ?? []).map((c) => [c.id, { x: c.x ?? 0, y: c.y ?? 0 }]),
        );

        return nodes.map((n) => {
          if (n.data?.pinned) return n;
          const pos = posMap.get(n.id);
          if (!pos) return n;
          return { ...n, position: pos };
        });
      } catch (err) {
        console.error('[ELK] layout error:', err);
        return null;
      } finally {
        setIsRunning(false);
      }
    },
    [],
  );

  return { runLayout, isRunning };
}
