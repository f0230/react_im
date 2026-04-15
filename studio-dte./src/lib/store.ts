import { create } from 'zustand';
import {
  Node,
  Edge,
  Connection,
  XYPosition,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
} from '@xyflow/react';

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------
const DEFAULT_PROMPT_DATA = {
  text: '',
  mediaContextUrl: null,
  mediaContextType: null,
  mediaContextSourceNodeId: null,
};

const DEFAULT_MODEL_DATA = {
  model: 'nano-banana-pro',
  modelType: 'image',
  aspectRatio: '1:1',
  resolution: '1K',
  duration: '5',
  outputFormat: 'png',
  googleSearch: false,
  mode: 'std',
  sound: false,
  removeWatermark: false,
  uploadMethod: 's3',
  enableTranslation: false,
  enableFallback: true,
  generationType: 'auto',
  seeds: '',
  nFrames: '',
  characterIdList: '',
  characterOrientation: 'video',
  backgroundSource: 'input_video',
  negativePrompt: '',
};

const DEFAULT_OUTPUT_DATA = {
  status: 'idle',
  resultUrl: null,
  resultType: null,
  taskId: null,
  provider: null,
};

const DEFAULT_ENHANCER_DATA = {
  enhancedText: '',
  isEnhancing: false,
};

const DEFAULT_MULTI_PROMPT_DATA = {
  segments: [{ prompt: '', duration: 3 }],
};

const DEFAULT_ELEMENT_DATA = {
  name: '',
  description: '',
};

export function getDefaultData(type: string): Record<string, any> {
  switch (type) {
    case 'prompt':
      return { ...DEFAULT_PROMPT_DATA };
    case 'model':
      return { ...DEFAULT_MODEL_DATA };
    case 'output':
      return { ...DEFAULT_OUTPUT_DATA };
    case 'enhancer':
      return { ...DEFAULT_ENHANCER_DATA };
    case 'image':
      return { imageUrl: null };
    case 'multiPrompt':
      return { segments: DEFAULT_MULTI_PROMPT_DATA.segments.map((s) => ({ ...s })) };
    case 'element':
      return { ...DEFAULT_ELEMENT_DATA };
    default:
      return {};
  }
}

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------
export function createInitialNodes(): Node[] {
  return [
    {
      id: 'prompt-1',
      type: 'prompt',
      position: { x: 250, y: 300 },
      data: { ...DEFAULT_PROMPT_DATA },
    },
    {
      id: 'model-1',
      type: 'model',
      position: { x: 700, y: 250 },
      data: { ...DEFAULT_MODEL_DATA },
    },
    {
      id: 'output-1',
      type: 'output',
      position: { x: 1100, y: 250 },
      data: { ...DEFAULT_OUTPUT_DATA },
    },
  ];
}

export function createInitialEdges(): Edge[] {
  return [
    {
      id: 'e1-2',
      source: 'prompt-1',
      sourceHandle: 'out',
      target: 'model-1',
      targetHandle: 'prompt',
      type: 'default',
      animated: true,
      data: { color: 'pink' },
    },
    {
      id: 'e3-4',
      source: 'model-1',
      sourceHandle: 'out',
      target: 'output-1',
      targetHandle: 'in',
      type: 'default',
      animated: true,
      data: { color: 'green' },
    },
  ];
}

export function createInitialWorkflow(): { nodes: Node[]; edges: Edge[] } {
  return {
    nodes: createInitialNodes(),
    edges: createInitialEdges(),
  };
}

const { nodes: initialNodes, edges: initialEdges } = createInitialWorkflow();

// ---------------------------------------------------------------------------
// Undo / Redo history
// ---------------------------------------------------------------------------
interface Snapshot {
  nodes: Node[];
  edges: Edge[];
}

const MAX_HISTORY = 50;

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------
interface WorkflowState {
  nodes: Node[];
  edges: Edge[];
  // history
  past: Snapshot[];
  future: Snapshot[];
  // actions
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  setNodes: (updater: Node[] | ((nodes: Node[]) => Node[])) => void;
  setEdges: (updater: Edge[] | ((edges: Edge[]) => Edge[])) => void;
  addNode: (type: string, opts?: { position?: XYPosition; pinned?: boolean }) => string;
  setPinned: (nodeId: string, pinned: boolean) => void;
  // undo/redo
  pushSnapshot: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  // workflow management
  exportWorkflow: () => string;
  importWorkflow: (json: string) => void;
  resetWorkflow: () => void;
  loadWorkflow: (nodes: Node[], edges: Edge[]) => void;
}

function getConnectionColor(
  sourceNode: Node | undefined,
  targetHandle: string,
): { color: string; warning: boolean } {
  let color = 'green';
  let warning = false;

  if (sourceNode?.type === 'prompt' || sourceNode?.type === 'enhancer') {
    color = 'pink';
    if (
      targetHandle === 'ref-image' ||
      targetHandle === 'ref-image-2' ||
      targetHandle === 'ref-video' ||
      targetHandle === 'media-in' ||
      targetHandle === 'elements'
    )
      warning = true;
  }

  if (sourceNode?.type === 'multiPrompt') {
    color = 'pink';
    if (targetHandle !== 'multi-prompt')
      warning = true;
  }

  if (sourceNode?.type === 'element') {
    if (
      targetHandle !== 'elements'
    )
      warning = true;
  }

  if (sourceNode?.type === 'image') {
    if (targetHandle === 'prompt') warning = true;
    if (targetHandle === 'negative-prompt') warning = true;
    if (targetHandle === 'ref-video') warning = true;
    if (targetHandle === 'multi-prompt') warning = true;
  }

  if (sourceNode?.type === 'output') {
    if (targetHandle === 'prompt') warning = true;
    if (targetHandle === 'negative-prompt') warning = true;
  }

  return { color, warning };
}

export const useWorkflowStore = create<WorkflowState>()(
  (set, get) => ({
      nodes: initialNodes,
      edges: initialEdges,
      past: [],
      future: [],

      onNodesChange: (changes) => {
        set({ nodes: applyNodeChanges(changes, get().nodes) });
      },

      onEdgesChange: (changes) => {
        set({ edges: applyEdgeChanges(changes, get().edges) });
      },

      onConnect: (connection) => {
        const { nodes, edges } = get();
        const sourceNode = nodes.find((n) => n.id === connection.source);
        const th = connection.targetHandle || '';
        const { color, warning } = getConnectionColor(sourceNode, th);

        get().pushSnapshot();
        set({
          edges: addEdge(
            {
              ...connection,
              type: 'default',
              animated: true,
              data: { color, warning },
            },
            edges,
          ),
        });
      },

      setNodes: (updater) => {
        set({
          nodes:
            typeof updater === 'function' ? updater(get().nodes) : updater,
        });
      },

      setEdges: (updater) => {
        set({
          edges:
            typeof updater === 'function' ? updater(get().edges) : updater,
        });
      },

      addNode: (type, opts) => {
        get().pushSnapshot();
        const newNodeId = `${type}-${Date.now()}`;
        const newNode: Node = {
          id: newNodeId,
          type,
          position: opts?.position ?? { x: 300, y: 300 },
          data: {
            ...getDefaultData(type),
            ...(opts?.pinned !== undefined && { pinned: opts.pinned }),
          },
        };
        set({ nodes: [...get().nodes, newNode] });
        return newNodeId;
      },

      setPinned: (nodeId, pinned) => {
        set({
          nodes: get().nodes.map((n) =>
            n.id === nodeId ? { ...n, data: { ...n.data, pinned } } : n,
          ),
        });
      },

      // ---- Undo / Redo ----
      pushSnapshot: () => {
        const { nodes, edges, past } = get();
        const snap: Snapshot = {
          nodes: structuredClone(nodes),
          edges: structuredClone(edges),
        };
        set({
          past: [...past.slice(-MAX_HISTORY), snap],
          future: [],
        });
      },

      undo: () => {
        const { past, nodes, edges } = get();
        if (!past.length) return;
        const prev = past[past.length - 1];
        const current: Snapshot = {
          nodes: structuredClone(nodes),
          edges: structuredClone(edges),
        };
        set({
          nodes: prev.nodes,
          edges: prev.edges,
          past: past.slice(0, -1),
          future: [current, ...get().future],
        });
      },

      redo: () => {
        const { future, nodes, edges } = get();
        if (!future.length) return;
        const next = future[0];
        const current: Snapshot = {
          nodes: structuredClone(nodes),
          edges: structuredClone(edges),
        };
        set({
          nodes: next.nodes,
          edges: next.edges,
          past: [...get().past, current],
          future: future.slice(1),
        });
      },

      canUndo: () => get().past.length > 0,
      canRedo: () => get().future.length > 0,

      // ---- Workflow export / import ----
      exportWorkflow: () => {
        const { nodes, edges } = get();
        // Strip transient output data (resultUrl blobs, status, etc.)
        const cleanNodes = nodes.map((n) => {
          if (n.type === 'output') {
            return {
              ...n,
              data: {
                status: 'idle',
                resultUrl: null,
                resultType: null,
                taskId: null,
                provider: null,
              },
            };
          }
          return n;
        });
        return JSON.stringify({ nodes: cleanNodes, edges }, null, 2);
      },

      importWorkflow: (json) => {
        try {
          const data = JSON.parse(json);
          if (!data.nodes || !data.edges) throw new Error('Invalid workflow');
          get().pushSnapshot();
          set({ nodes: data.nodes, edges: data.edges });
        } catch (e) {
          throw new Error('Invalid workflow JSON');
        }
      },

      resetWorkflow: () => {
        get().pushSnapshot();
        const initial = createInitialWorkflow();
        set({ nodes: initial.nodes, edges: initial.edges });
      },

      loadWorkflow: (nodes, edges) => {
        set({ nodes, edges, past: [], future: [] });
      },
    }),
);
