/// <reference lib="webworker" />

// elkjs/lib/elk.bundled.js is the self-contained version designed for web workers.
// It avoids dynamic imports that break in worker contexts.
// @ts-ignore — no type declarations for the bundled entry point
import ELK from 'elkjs/lib/elk.bundled.js';

const elk = new ELK();

interface WorkerNode {
  id: string;
  width: number;
  height: number;
}

interface WorkerEdge {
  id: string;
  source: string;
  target: string;
}

interface WorkerRequest {
  id: string;
  nodes: WorkerNode[];
  edges: WorkerEdge[];
}

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const { id, nodes, edges } = e.data;

  try {
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
      children: nodes.map((n) => ({
        id: n.id,
        width: n.width,
        height: n.height,
      })),
      edges: edges.map((edge) => ({
        id: edge.id,
        sources: [edge.source],
        targets: [edge.target],
      })),
    };

    const result = await elk.layout(elkGraph);

    const positions = (result.children ?? []).map(
      (child: { id: string; x?: number; y?: number }) => ({
        id: child.id,
        x: child.x ?? 0,
        y: child.y ?? 0,
      }),
    );

    self.postMessage({ id, positions, error: null });
  } catch (err) {
    self.postMessage({ id, positions: null, error: String(err) });
  }
};
