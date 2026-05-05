/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Copy,
  Trash2,
  Undo2,
  Redo2,
  Download,
  Upload,
  RotateCcw,
} from 'lucide-react';
import {
  ReactFlow,
  Background,
  Node,
  NodeTypes,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import toast, { Toaster } from 'react-hot-toast';

import PromptNode from './components/nodes/PromptNode';
import ModelNode from './components/nodes/ModelNode';
import ImageNode from './components/nodes/ImageNode';
import OutputNode from './components/nodes/OutputNode';
import EnhancerNode from './components/nodes/EnhancerNode';
import WorkflowEdge from './components/edges/WorkflowEdge';
import { useWorkflowStore, getDefaultData } from './lib/store';

const nodeTypes: NodeTypes = {
  prompt: PromptNode,
  model: ModelNode,
  image: ImageNode,
  output: OutputNode,
  enhancer: EnhancerNode,
};

const edgeTypes = {
  default: WorkflowEdge,
};

export default function App() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    setNodes,
    setEdges,
    addNode,
    undo,
    redo,
    canUndo,
    canRedo,
    pushSnapshot,
    exportWorkflow,
    importWorkflow,
    resetWorkflow,
  } = useWorkflowStore();

  const [menu, setMenu] = useState<{
    id: string;
    top: number;
    left: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      const pane = document.querySelector('.react-flow') as HTMLElement;
      const bounds = pane.getBoundingClientRect();
      setMenu({
        id: node.id,
        top: event.clientY - bounds.top,
        left: event.clientX - bounds.left,
      });
    },
    [setMenu],
  );

  const onPaneClick = useCallback(() => setMenu(null), [setMenu]);

  const duplicateNode = useCallback(() => {
    if (!menu) return;
    const nodeToDuplicate = nodes.find((n) => n.id === menu.id);
    if (nodeToDuplicate) {
      pushSnapshot();
      const newNodeId = `${nodeToDuplicate.type}-${Date.now()}`;
      const newNode = {
        ...nodeToDuplicate,
        id: newNodeId,
        position: {
          x: nodeToDuplicate.position.x + 50,
          y: nodeToDuplicate.position.y + 50,
        },
        data: { ...nodeToDuplicate.data },
        selected: false,
      };
      setNodes((nds) => [...nds, newNode]);
    }
    setMenu(null);
  }, [menu, nodes, setNodes, pushSnapshot]);

  const deleteNode = useCallback(() => {
    if (!menu) return;
    pushSnapshot();
    setNodes((nds) => nds.filter((n) => n.id !== menu.id));
    setEdges((eds) =>
      eds.filter((e) => e.source !== menu.id && e.target !== menu.id),
    );
    setMenu(null);
  }, [menu, setNodes, setEdges, pushSnapshot]);

  // Paste image → new Image node
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (!file) continue;

          const reader = new FileReader();
          reader.onload = (event) => {
            const imageUrl = event.target?.result as string;
            const newNodeId = `image-${Date.now()}`;
            const newNode = {
              id: newNodeId,
              type: 'image',
              position: {
                x: Math.random() * 200 + 300,
                y: Math.random() * 200 + 300,
              },
              data: { imageUrl },
            };
            pushSnapshot();
            setNodes((nds) => [...nds, newNode]);
          };
          reader.readAsDataURL(file);
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [setNodes, pushSnapshot]);

  // Keyboard shortcuts: Ctrl+Z / Ctrl+Shift+Z
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

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

  // Export workflow
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

  // Import workflow
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
      // Reset input so the same file can be re-imported
      e.target.value = '';
    },
    [importWorkflow],
  );

  // Export all media from output nodes
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
      {/* Toast */}
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
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeContextMenu={onNodeContextMenu}
          onPaneClick={onPaneClick}
          onNodeDragStart={onPaneClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          colorMode="dark"
        >
          <Background
            gap={24}
            size={2}
            color="rgba(255,255,255,0.04)"
          />

          <Panel position="bottom-center" className="mb-6">
            <div className="bg-white/8 backdrop-blur-2xl rounded-full border border-white/10 p-2 flex items-center gap-2 shadow-xl shadow-black/20">
              <button
                onClick={() => addNode('prompt')}
                className="px-4 py-2 text-[13px] font-medium text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-all"
              >
                Prompt
              </button>
              <div className="w-px h-4 bg-white/10" />
              <button
                onClick={() => addNode('image')}
                className="px-4 py-2 text-[13px] font-medium text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-all"
              >
                Image Ref
              </button>
              <div className="w-px h-4 bg-white/10" />
              <button
                onClick={() => addNode('model')}
                className="px-4 py-2 text-[13px] font-medium text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-all"
              >
                AI Model
              </button>
              <div className="w-px h-4 bg-white/10" />
              <button
                onClick={() => addNode('output')}
                className="px-4 py-2 text-[13px] font-medium text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-all"
              >
                Output
              </button>
            </div>
          </Panel>

          {menu && (
            <div
              className="absolute z-50 bg-[#1a1a1e]/90 backdrop-blur-xl border border-white/10 shadow-xl rounded-xl py-1 min-w-[160px] overflow-hidden"
              style={{ top: menu.top, left: menu.left }}
            >
              <button
                onClick={duplicateNode}
                className="w-full text-left px-4 py-2 text-[13px] font-medium text-white/70 hover:bg-white/10 hover:text-white flex items-center gap-2 transition-colors"
              >
                <Copy size={14} />
                Duplicar
              </button>
              <button
                onClick={deleteNode}
                className="w-full text-left px-4 py-2 text-[13px] font-medium text-[#FF3B30]/80 hover:bg-[#FF3B30]/10 hover:text-[#FF3B30] flex items-center gap-2 transition-colors"
              >
                <Trash2 size={14} />
                Eliminar
              </button>
            </div>
          )}
        </ReactFlow>
      </div>
    </div>
  );
}
