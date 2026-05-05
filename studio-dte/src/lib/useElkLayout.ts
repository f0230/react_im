import { useCallback, useState } from 'react';
import { Node, Edge } from '@xyflow/react';
import dagre from '@dagrejs/dagre';

// Approximate node sizes used when React Flow hasn't measured the node yet.
// Dagre uses these to avoid overlapping nodes.
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
 * Auto-layout for non-pinned nodes using dagre (left-to-right directed graph).
 *
 * Replaced elkjs which caused a "web-worker" bare module specifier runtime error
 * in the browser — elkjs's main entry imports the `web-worker` npm package
 * (Node.js only), which Rollup marks as external and the browser can't resolve.
 *
 * Dagre runs synchronously on the main thread with zero browser-compat issues.
 * For typical workflow graphs (< 100 nodes) it completes in < 5ms.
 */
export function useElkLayout() {
  const [isRunning, setIsRunning] = useState(false);

  const runLayout = useCallback(
    (nodes: Node[], edges: Edge[]): Promise<Node[] | null> => {
      const freeNodes = nodes.filter((n) => !n.data?.pinned);
      if (freeNodes.length === 0) return Promise.resolve(null);

      setIsRunning(true);

      try {
        const graph = new dagre.graphlib.Graph();
        graph.setDefaultEdgeLabel(() => ({}));
        graph.setGraph({ rankdir: 'LR', nodesep: 80, ranksep: 120 });

        const freeIds = new Set(freeNodes.map((n) => n.id));

        freeNodes.forEach((n) => {
          const measured = (
            n as Node & { measured?: { width?: number; height?: number } }
          ).measured;
          const sizes = NODE_SIZES[n.type ?? ''] ?? DEFAULT_SIZE;
          graph.setNode(n.id, {
            width: measured?.width ?? sizes.width,
            height: measured?.height ?? sizes.height,
          });
        });

        edges
          .filter((e) => freeIds.has(e.source) && freeIds.has(e.target))
          .forEach((e) => graph.setEdge(e.source, e.target));

        dagre.layout(graph);

        const updatedNodes = nodes.map((n) => {
          if (n.data?.pinned) return n;
          const pos = graph.node(n.id);
          if (!pos) return n;
          const sizes = NODE_SIZES[n.type ?? ''] ?? DEFAULT_SIZE;
          const measured = (
            n as Node & { measured?: { width?: number; height?: number } }
          ).measured;
          const w = measured?.width ?? sizes.width;
          const h = measured?.height ?? sizes.height;
          // Dagre positions by center — React Flow uses top-left
          return { ...n, position: { x: pos.x - w / 2, y: pos.y - h / 2 } };
        });

        return Promise.resolve(updatedNodes);
      } catch (err) {
        console.error('[layout] dagre error:', err);
        return Promise.resolve(null);
      } finally {
        setIsRunning(false);
      }
    },
    [],
  );

  return { runLayout, isRunning };
}
