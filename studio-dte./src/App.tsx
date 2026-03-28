/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useEffect } from 'react';
import { Copy, Trash2 } from 'lucide-react';
import {
  ReactFlow,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  NodeTypes,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import PromptNode from './components/nodes/PromptNode';
import ModelNode from './components/nodes/ModelNode';
import ImageNode from './components/nodes/ImageNode';
import OutputNode from './components/nodes/OutputNode';
import EnhancerNode from './components/nodes/EnhancerNode';
import WorkflowEdge from './components/edges/WorkflowEdge';

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

const initialEdges: Edge[] = [
  { id: 'e1-2', source: 'prompt-1', sourceHandle: 'out', target: 'model-1', targetHandle: 'prompt', type: 'default', animated: true, data: { color: 'pink' } },
  { id: 'e3-4', source: 'model-1', sourceHandle: 'out', target: 'output-1', targetHandle: 'in', type: 'default', animated: true, data: { color: 'green' } },
];

export default function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState([
    {
      id: 'prompt-1',
      type: 'prompt',
      position: { x: 250, y: 300 },
      data: { text: '', mediaContextUrl: null, mediaContextType: null, mediaContextSourceNodeId: null },
    },
    {
      id: 'model-1',
      type: 'model',
      position: { x: 700, y: 250 },
      data: {
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
        uploadMethod: 'url',
        enableTranslation: false,
        enableFallback: true,
        generationType: 'auto',
        seeds: '',
        nFrames: '',
        characterIdList: '',
        characterOrientation: '',
        backgroundSource: '',
        multiPrompt: '',
        multiShots: '',
        klingElements: '',
        callBackUrl: '',
        progressCallBackUrl: '',
      },
    },
    {
      id: 'output-1',
      type: 'output',
      position: { x: 1100, y: 250 },
      data: { status: 'idle', resultUrl: null, resultType: null, taskId: null, provider: null },
    },
  ] as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [menu, setMenu] = useState<{ id: string, top: number, left: number } | null>(null);

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
    [setMenu]
  );

  const onPaneClick = useCallback(() => setMenu(null), [setMenu]);

  const duplicateNode = useCallback(() => {
    if (!menu) return;
    const nodeToDuplicate = nodes.find((n) => n.id === menu.id);
    if (nodeToDuplicate) {
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
  }, [menu, nodes, setNodes]);

  const deleteNode = useCallback(() => {
    if (!menu) return;
    setNodes((nds) => nds.filter((n) => n.id !== menu.id));
    setEdges((eds) => eds.filter((e) => e.source !== menu.id && e.target !== menu.id));
    setMenu(null);
  }, [menu, setNodes, setEdges]);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      // Ignore paste if user is typing in an input or textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
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
              position: { x: Math.random() * 200 + 300, y: Math.random() * 200 + 300 },
              data: { imageUrl },
            };
            setNodes((nds) => [...nds, newNode]);
          };
          reader.readAsDataURL(file);
          break; // Only handle the first image
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [setNodes]);

  const onConnect = useCallback(
    (params: Connection) => {
      const sourceNode = nodes.find(n => n.id === params.source);
      const th = params.targetHandle || '';

      let color = 'green';
      let warning = false;

      // Text sources → pink edges
      if (sourceNode?.type === 'prompt' || sourceNode?.type === 'enhancer') {
        color = 'pink';
        // Text to media port = type mismatch
        if (th === 'ref-image' || th === 'ref-video' || th === 'media-in') {
          warning = true;
        }
      }

      // Image source to text-only port = mismatch
      if (sourceNode?.type === 'image') {
        if (th === 'prompt') warning = true;
        if (th === 'ref-video') warning = true;
      }

      // Output → prompt text port = mismatch (media→text)
      if (sourceNode?.type === 'output') {
        if (th === 'prompt') warning = true;
        // output→media-in, output→ref-image, output→ref-video are all valid
      }

      setEdges((eds) => addEdge({
        ...params,
        type: 'default',
        animated: true,
        data: { color, warning }
      }, eds));
    },
    [setEdges, nodes],
  );

  const addNode = (type: string) => {
    const newNodeId = `${type}-${Date.now()}`;
    const newNode = {
      id: newNodeId,
      type,
      position: { x: Math.random() * 200 + 300, y: Math.random() * 200 + 300 },
      data: { 
        ...(type === 'prompt' ? { text: '', mediaContextUrl: null, mediaContextType: null, mediaContextSourceNodeId: null } : {}),
        ...(type === 'model' ? {
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
          uploadMethod: 'url',
          enableTranslation: false,
          enableFallback: true,
          generationType: 'auto',
          seeds: '',
          nFrames: '',
          characterIdList: '',
          characterOrientation: '',
          backgroundSource: '',
          multiPrompt: '',
          multiShots: '',
          klingElements: '',
          callBackUrl: '',
          progressCallBackUrl: '',
        } : {}),
        ...(type === 'image' ? { imageUrl: null } : {}),
        ...(type === 'output' ? { status: 'idle', resultUrl: null, resultType: null, taskId: null, provider: null } : {}),
        ...(type === 'enhancer' ? { enhancedText: '', isEnhancing: false } : {}),
      },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  return (
    <div className="w-full h-full bg-[#0a0a0c] text-white font-sans flex flex-col relative overflow-hidden">
      {/* Ambient Background Blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[30%] left-[40%] w-[40%] h-[40%] bg-pink-500/8 rounded-full blur-[100px] pointer-events-none" />

      {/* Top Bar - Glassmorphism */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 h-10 bg-white/8 backdrop-blur-2xl border border-white/10 rounded-full flex items-center px-8 z-50 shadow-xl shadow-black/20">
        <span className="text-sm font-semibold text-white/80 tracking-widest">STUDIO DTE.</span>
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
          <Background gap={24} size={2} color="rgba(255,255,255,0.04)" />

          <Panel position="bottom-center" className="mb-6">
            <div className="bg-white/8 backdrop-blur-2xl rounded-full border border-white/10 p-2 flex items-center gap-2 shadow-xl shadow-black/20">
              <button onClick={() => addNode('prompt')} className="px-4 py-2 text-[13px] font-medium text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-all">Prompt</button>
              <div className="w-px h-4 bg-white/10" />
              <button onClick={() => addNode('image')} className="px-4 py-2 text-[13px] font-medium text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-all">Image Ref</button>
              <div className="w-px h-4 bg-white/10" />
              <button onClick={() => addNode('model')} className="px-4 py-2 text-[13px] font-medium text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-all">AI Model</button>
              <div className="w-px h-4 bg-white/10" />
              <button onClick={() => addNode('output')} className="px-4 py-2 text-[13px] font-medium text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-all">Output</button>
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
