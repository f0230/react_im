/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Undo2,
  Redo2,
  Download,
  Upload,
  RotateCcw,
  LayoutDashboard,
  ChevronDown,
  Cloud,
  CloudOff,
  Loader2,
} from 'lucide-react';
import { ContextMenu } from './components/ui/context-menu';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  Node,
  NodeTypes,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import toast, { Toaster } from 'react-hot-toast';

import PromptNode from './components/nodes/PromptNode';
import ModelNode from './components/nodes/ModelNode';
import ImageNode from './components/nodes/ImageNode';
import OutputNode from './components/nodes/OutputNode';
import EnhancerNode from './components/nodes/EnhancerNode';
import MultiPromptNode from './components/nodes/MultiPromptNode';
import ElementNode from './components/nodes/ElementNode';
import WorkflowEdge from './components/edges/WorkflowEdge';
import { createInitialWorkflow, useWorkflowStore } from './lib/store';
import { useElkLayout } from './lib/useElkLayout';
import { useWorkflowSync } from './lib/useWorkflowSync';
import { supabase } from './lib/supabaseClient';
import { persistMediaUrl } from './lib/mediaStorage';

const nodeTypes: NodeTypes = {
  prompt: PromptNode,
  model: ModelNode,
  image: ImageNode,
  output: OutputNode,
  enhancer: EnhancerNode,
  multiPrompt: MultiPromptNode,
  element: ElementNode,
};

const edgeTypes = {
  default: WorkflowEdge,
};

// ---------------------------------------------------------------------------
// ProjectSelector — fetches accessible projects and drives the ?projectId= param
// ---------------------------------------------------------------------------
interface Project { id: string; name: string }

function ProjectSelector({
  projectId,
  onChange,
}: {
  projectId: string | null;
  onChange: (id: string) => void;
}) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    supabase
      .from('projects')
      .select('id, name')
      .order('name')
      .then(({ data }) => {
        if (data) setProjects(data as Project[]);
      });
  }, []);

  const current = projects.find((p) => p.id === projectId);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[12px] text-white/70 hover:text-white hover:bg-white/8 transition-colors max-w-[140px]"
        title="Seleccionar proyecto"
      >
        <span className="truncate">{current?.name ?? 'Sin proyecto'}</span>
        <ChevronDown size={11} className="shrink-0 text-white/40" />
      </button>

      {open && projects.length > 0 && (
        <div className="absolute top-full mt-2 left-0 w-52 bg-[#1a1a1e]/95 border border-white/10 rounded-xl shadow-2xl py-1 z-[9999]">
          {projects.map((p) => (
            <button
              key={p.id}
              onClick={() => { onChange(p.id); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-[13px] truncate transition-colors ${
                p.id === projectId
                  ? 'text-white bg-white/8'
                  : 'text-white/70 hover:bg-white/5 hover:text-white'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SyncIndicator — shows save status in the top bar
// ---------------------------------------------------------------------------
function SyncIndicator({ status }: { status: string }) {
  if (status === 'idle' || !status) return null;
  if (status === 'loading')
    return <Loader2 size={12} className="text-white/30 animate-spin" />;
  if (status === 'saving')
    return <Loader2 size={12} className="text-blue-400 animate-spin" />;
  if (status === 'saved')
    return <Cloud size={12} className="text-green-400" />;
  if (status === 'error')
    return (
      <span title="Error al guardar">
        <CloudOff size={12} className="text-red-400" />
      </span>
    );
  return null;
}

// ---------------------------------------------------------------------------
// WorkflowApp — lives inside ReactFlowProvider, can use useReactFlow()
// ---------------------------------------------------------------------------
function WorkflowApp() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    setNodes,
    setEdges,
    addNode,
    setPinned,
    undo,
    redo,
    canUndo,
    canRedo,
    pushSnapshot,
    exportWorkflow,
    importWorkflow,
    resetWorkflow,
    loadWorkflow,
  } = useWorkflowStore();

  const { screenToFlowPosition, getViewport, setViewport, fitView } = useReactFlow();
  const { runLayout, isRunning: isLayoutRunning } = useElkLayout();

  // ---- Project selector: ?projectId= drives the active room ----
  const [projectId, setProjectId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('projectId');
  });

  const handleProjectChange = useCallback((id: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('projectId', id);
    window.history.replaceState({}, '', url.toString());
    setProjectId(id);
  }, []);

  // ---- Supabase sync ----
  const { snapshot, status: syncStatus, hasLoaded, save } = useWorkflowSync({ projectId });

  // True while we're hydrating data from the DB — prevents the save effect
  // from firing a redundant write right after a fresh load.
  const isLoadingRef = useRef(false);

  // Load snapshot only after sync layer confirms the project has finished loading.
  useEffect(() => {
    if (!projectId || !hasLoaded) return;

    isLoadingRef.current = true;

    if (snapshot) {
      loadWorkflow(snapshot.nodes, snapshot.edges);
      if (snapshot.viewport) {
        requestAnimationFrame(() => { setViewport(snapshot.viewport); isLoadingRef.current = false; });
      } else {
        requestAnimationFrame(() => {
          void fitView({ padding: 0.2, duration: 200 });
          isLoadingRef.current = false;
        });
      }
      return;
    }

    const initial = createInitialWorkflow();
    loadWorkflow(initial.nodes, initial.edges);
    requestAnimationFrame(() => {
      void fitView({ padding: 0.2, duration: 200 });
      isLoadingRef.current = false;
    });
  }, [projectId, hasLoaded, snapshot, loadWorkflow, setViewport, fitView]);

  // Debounced save on every graph change (skip during initial load)
  useEffect(() => {
    if (!projectId || !hasLoaded || isLoadingRef.current) return;
    const viewport = getViewport();
    save(nodes, edges, viewport);
  }, [nodes, edges, projectId, hasLoaded, save, getViewport]);

  const [menu, setMenu] = useState<{
    id?: string;
    top: number;
    left: number;
    nodeType?: string;
    mode: 'node' | 'canvas';
  } | null>(null);
  const deleteNodeIdRef = useRef<string | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---- Context menus ----
  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      deleteNodeIdRef.current = node.id;
      setMenu({
        id: node.id,
        top: event.clientY,
        left: event.clientX,
        nodeType: node.type,
        mode: 'node',
      });
    },
    [],
  );

  const onPaneContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    setMenu({
      top: event.clientY,
      left: event.clientX,
      mode: 'canvas',
    });
  }, []);

  const onPaneClick = useCallback(() => setMenu(null), []);

  // ---- Add node at cursor (A2) ----
  const handleAddNode = useCallback(
    (type: Parameters<typeof addNode>[0]) => {
      const position = menu
        ? screenToFlowPosition({ x: menu.left, y: menu.top })
        : undefined;
      addNode(type, { position });
      setMenu(null);
    },
    [addNode, menu, screenToFlowPosition],
  );

  // ---- Mark node as pinned on manual drag (A3) ----
  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (!node.data?.pinned) {
        setPinned(node.id, true);
      }
    },
    [setPinned],
  );

  // ---- Reordenar (A3) ----
  const handleReorder = useCallback(async () => {
    const layouted = await runLayout(nodes, edges);
    if (layouted) {
      pushSnapshot();
      setNodes(layouted);
    }
  }, [runLayout, nodes, edges, pushSnapshot, setNodes]);

  // ---- Node actions ----
  const duplicateNode = useCallback(() => {
    const nodeId = deleteNodeIdRef.current;
    if (!nodeId) return;
    const nodeToDuplicate = nodes.find((n) => n.id === nodeId);
    if (nodeToDuplicate) {
      pushSnapshot();
      const newNode = {
        ...nodeToDuplicate,
        id: `${nodeToDuplicate.type}-${Date.now()}`,
        position: {
          x: nodeToDuplicate.position.x + 50,
          y: nodeToDuplicate.position.y + 50,
        },
        data: { ...nodeToDuplicate.data },
        selected: false,
      };
      setNodes((nds) => [...nds, newNode]);
    }
    deleteNodeIdRef.current = undefined;
    setMenu(null);
  }, [nodes, setNodes, pushSnapshot]);

  const deleteNode = useCallback(() => {
    const nodeId = deleteNodeIdRef.current;
    if (!nodeId) return;
    pushSnapshot();
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) =>
      eds.filter((e) => e.source !== nodeId && e.target !== nodeId),
    );
    deleteNodeIdRef.current = undefined;
    setMenu(null);
  }, [setNodes, setEdges, pushSnapshot]);

  // ---- Paste image → Image node ----
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (!file) continue;

          const reader = new FileReader();
          reader.onload = (event) => {
            const imageUrl = event.target?.result as string;
            const img = new Image();
            img.onload = () => {
              const aspectRatio = img.naturalWidth / img.naturalHeight;
              const center = screenToFlowPosition({
                x: window.innerWidth / 2,
                y: window.innerHeight / 2,
              });
              const nodeId = `image-${Date.now()}`;
              pushSnapshot();
              setNodes((nds) => [
                ...nds,
                {
                  id: nodeId,
                  type: 'image',
                  position: center,
                  data: { imageUrl, aspectRatio, storagePath: null },
                },
              ]);

              void (async () => {
                try {
                  const { storagePath, signedUrl } = await persistMediaUrl(
                    imageUrl,
                    `paste-${nodeId}`,
                  );
                  setNodes((nds) =>
                    nds.map((n) =>
                      n.id === nodeId
                        ? {
                            ...n,
                            data: {
                              ...n.data,
                              imageUrl: signedUrl,
                              storagePath,
                            },
                          }
                        : n,
                    ),
                  );
                } catch (error) {
                  console.warn('[app] Could not persist pasted image:', error);
                }
              })();

              toast.success('Image pasted as reference node');
            };
            img.src = imageUrl;
          };
          reader.readAsDataURL(file);
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [setNodes, pushSnapshot, screenToFlowPosition]);

  // ---- Keyboard shortcuts ----
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if (
        (e.metaKey || e.ctrlKey) &&
        ((e.key === 'z' && e.shiftKey) || e.key === 'y')
      ) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  // ---- Export / Import ----
  const handleExport = useCallback(() => {
    try {
      const json = exportWorkflow();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `studio-dte-workflow-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Workflow exported');
    } catch {
      toast.error('Failed to export workflow');
    }
  }, [exportWorkflow]);

  const handleImport = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          importWorkflow(event.target?.result as string);
          toast.success('Workflow imported');
        } catch {
          toast.error('Invalid workflow file');
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    },
    [importWorkflow],
  );

  const handleExportMedia = useCallback(async () => {
    const outputNodes = nodes.filter(
      (n) => n.type === 'output' && n.data?.resultUrl,
    );
    if (!outputNodes.length) {
      toast.error('No generated media to export');
      return;
    }
    let downloaded = 0;
    for (const n of outputNodes) {
      try {
        const response = await fetch(n.data.resultUrl as string);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const ext = n.data.resultType === 'video' ? 'mp4' : 'png';
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `studio-dte-${n.data.taskId || n.id}.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
        downloaded++;
      } catch {
        // skip failed downloads
      }
    }
    toast.success(`Downloaded ${downloaded} file(s)`);
  }, [nodes]);

  const handleReset = useCallback(() => {
    resetWorkflow();
    toast.success('Workflow reset');
  }, [resetWorkflow]);

  return (
    <div className="w-full h-full bg-[#0a0a0c] text-white font-sans flex flex-col relative overflow-hidden">
      {/* Ambient Background Blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[30%] left-[40%] w-[40%] h-[40%] bg-pink-500/8 rounded-full blur-[100px] pointer-events-none" />

      {/* Top Bar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 h-10 bg-white/8 backdrop-blur-2xl border border-white/10 rounded-full flex items-center px-6 gap-3 z-50 shadow-xl shadow-black/20">
        <span className="text-sm font-semibold text-white/80 tracking-widest">
          STUDIO DTE.
        </span>

        <div className="w-px h-5 bg-white/10" />

        {/* Project selector (A5) */}
        <ProjectSelector projectId={projectId} onChange={handleProjectChange} />

        {/* Sync status indicator (A4) */}
        <SyncIndicator status={syncStatus} />

        <div className="w-px h-5 bg-white/10" />

        {/* Undo / Redo */}
        <button
          onClick={undo}
          disabled={!canUndo()}
          className="p-1.5 text-white/50 hover:text-white disabled:text-white/15 transition-colors"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 size={14} />
        </button>
        <button
          onClick={redo}
          disabled={!canRedo()}
          className="p-1.5 text-white/50 hover:text-white disabled:text-white/15 transition-colors"
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo2 size={14} />
        </button>

        <div className="w-px h-5 bg-white/10" />

        {/* Reordenar (A3) */}
        <button
          onClick={handleReorder}
          disabled={isLayoutRunning}
          className="p-1.5 text-white/50 hover:text-white disabled:text-white/20 transition-colors"
          title="Auto-layout (reordenar nodos no fijados)"
        >
          <LayoutDashboard size={14} />
        </button>

        <div className="w-px h-5 bg-white/10" />

        {/* Export / Import */}
        <button
          onClick={handleExport}
          className="p-1.5 text-white/50 hover:text-white transition-colors"
          title="Export workflow"
        >
          <Download size={14} />
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-1.5 text-white/50 hover:text-white transition-colors"
          title="Import workflow"
        >
          <Upload size={14} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleImport}
        />
        <button
          onClick={handleExportMedia}
          className="p-1.5 text-[#32D74B]/70 hover:text-[#32D74B] transition-colors"
          title="Download all generated media"
        >
          <Download size={14} />
        </button>

        <div className="w-px h-5 bg-white/10" />

        <button
          onClick={handleReset}
          className="p-1.5 text-white/50 hover:text-[#FF3B30] transition-colors"
          title="Reset workflow"
        >
          <RotateCcw size={14} />
        </button>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 relative z-10">
        <ReactFlow
          proOptions={{ hideAttribution: true }}
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeContextMenu={onNodeContextMenu}
          onPaneContextMenu={onPaneContextMenu}
          onPaneClick={onPaneClick}
          onNodeDragStart={onPaneClick}
          onNodeDragStop={onNodeDragStop}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          colorMode="dark"
          minZoom={0.1}
          maxZoom={2}
        >
          <Background gap={24} size={2} color="rgba(255,255,255,0.04)" />

          <Controls
            showInteractive={false}
            className="!bg-white/5 !border-white/10 !rounded-xl !shadow-none [&>button]:!bg-transparent [&>button]:!border-white/10 [&>button]:!text-white/50 [&>button:hover]:!bg-white/10 [&>button:hover]:!text-white"
          />

          <MiniMap
            nodeStrokeWidth={3}
            zoomable
            pannable
            className="!bg-[#1a1a1e]/80 !border !border-white/10 !rounded-xl"
            nodeColor={() => 'rgba(255,255,255,0.15)'}
            maskColor="rgba(0,0,0,0.4)"
          />

          <ContextMenu
            x={menu?.left || 0}
            y={menu?.top || 0}
            isOpen={!!menu}
            onClose={() => setMenu(null)}
            mode={menu?.mode || 'canvas'}
            nodeType={menu?.nodeType}
            nodeLabel={menu?.id}
            onDuplicate={menu?.mode === 'node' ? duplicateNode : undefined}
            onDelete={menu?.mode === 'node' ? deleteNode : undefined}
            onAddNode={menu?.mode === 'canvas' ? handleAddNode : undefined}
          />
        </ReactFlow>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// App — provee el contexto de React Flow
// ---------------------------------------------------------------------------
export default function App() {
  return (
    <>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#1a1a1e',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            fontSize: '13px',
          },
          success: { iconTheme: { primary: '#32D74B', secondary: '#fff' } },
          error: { iconTheme: { primary: '#FF3B30', secondary: '#fff' } },
        }}
      />
      <ReactFlowProvider>
        <WorkflowApp />
      </ReactFlowProvider>
    </>
  );
}
