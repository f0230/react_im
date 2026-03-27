import { Cpu, Play, Type, Image as ImageIcon, Video as VideoIcon } from 'lucide-react';
import { useReactFlow } from '@xyflow/react';
import BaseNode from './BaseNode';
import { Port } from './Port';

export default function ModelNode({ id, data }: { id: string, data: any }) {
  const { updateNodeData, getNodes, getEdges, setNodes, setEdges } = useReactFlow();
  const isVideo = data.modelType === 'video';

  const handleGenerate = async () => {
    const nodes = getNodes();
    const edges = getEdges();
    
    const connectedEdges = edges.filter(e => e.source === id);
    const targetNodeIds = connectedEdges.map(e => e.target);

    const inputEdges = edges.filter(e => e.target === id);
    
    const promptEdge = inputEdges.find(e => e.targetHandle === 'prompt');
    const promptNode = promptEdge ? nodes.find(n => n.id === promptEdge.source) : null;
    const promptText = promptNode?.data?.enhancedText || promptNode?.data?.text || '';

    const refImageEdge = inputEdges.find(e => e.targetHandle === 'ref-image');
    const refImageNode = refImageEdge ? nodes.find(n => n.id === refImageEdge.source) : null;
    let refImageUrl = refImageNode?.data?.imageUrl || refImageNode?.data?.resultUrl || null;

    if (refImageUrl && refImageUrl.startsWith('http')) {
      try {
        const response = await fetch(refImageUrl);
        const blob = await response.blob();
        const reader = new FileReader();
        refImageUrl = await new Promise((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      } catch (e) {
        console.error("Error fetching reference image:", e);
      }
    }

    if (!promptText) {
      alert("Por favor, conecta un nodo de Prompt con texto antes de generar.");
      return;
    }

    setNodes(nds => nds.map(n => {
      if (targetNodeIds.includes(n.id) && n.type === 'output') {
        return { ...n, data: { ...n.data, status: 'loading', error: null } };
      }
      return n;
    }));
    
    setEdges(eds => eds.map(e => {
      if (e.source === id && targetNodeIds.includes(e.target)) {
        return { ...e, data: { ...e.data, status: 'processing' } };
      }
      return e;
    }));

    try {
      // @ts-ignore
      if ((data.model === 'gemini-3.1-flash-image-preview' || data.model.startsWith('veo-')) && window.aistudio) {
        // @ts-ignore
        if (!(await window.aistudio.hasSelectedApiKey())) {
          // @ts-ignore
          await window.aistudio.openSelectKey();
        }
      }

      const { GoogleGenAI } = await import('@google/genai');
      // @ts-ignore
      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
      const ai = new GoogleGenAI({ apiKey });

      let resultUrl = '';

      if (data.modelType === 'image') {
        const contents: any[] = [{ text: promptText }];
        
        if (refImageUrl) {
          const base64Data = refImageUrl.split(',')[1];
          const mimeType = refImageUrl.split(';')[0].split(':')[1];
          contents.push({
            inlineData: {
              data: base64Data,
              mimeType: mimeType
            }
          });
        }

        const response = await ai.models.generateContent({
          model: data.model,
          contents: contents,
          config: {
            imageConfig: {
              aspectRatio: data.aspectRatio || "1:1",
              imageSize: data.resolution || "1K"
            }
          }
        });

        const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (part?.inlineData) {
          resultUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        } else {
          throw new Error("No se generó ninguna imagen");
        }
      } else if (data.modelType === 'video') {
        const videoConfig: any = {
          model: data.model,
          prompt: promptText,
          config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: (data.aspectRatio === '1:1' ? '16:9' : data.aspectRatio) as any
          }
        };

        if (refImageUrl) {
          const base64Data = refImageUrl.split(',')[1];
          const mimeType = refImageUrl.split(';')[0].split(':')[1];
          videoConfig.image = {
            imageBytes: base64Data,
            mimeType: mimeType
          };
        }

        let operation = await ai.models.generateVideos(videoConfig);

        while (!operation.done) {
          await new Promise(resolve => setTimeout(resolve, 10000));
          operation = await ai.operations.getVideosOperation({operation: operation});
        }

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (!downloadLink) throw new Error("No se generó ningún video");
        
        const videoResponse = await fetch(downloadLink, {
          method: 'GET',
          headers: {
            'x-goog-api-key': apiKey as string,
          },
        });
        
        const blob = await videoResponse.blob();
        resultUrl = URL.createObjectURL(blob);
      }

      const actualAspectRatio = data.modelType === 'video' && data.aspectRatio === '1:1' ? '16:9' : (data.aspectRatio || '1:1');

      setNodes(nds => nds.map(n => {
        if (targetNodeIds.includes(n.id) && n.type === 'output') {
          return { 
            ...n, 
            data: { 
              ...n.data, 
              status: 'success', 
              resultUrl, 
              resultType: data.modelType,
              resultAspectRatio: actualAspectRatio
            } 
          };
        }
        return n;
      }));

    } catch (error) {
      console.error("Error de generación:", error);
      setNodes(nds => nds.map(n => {
        if (targetNodeIds.includes(n.id) && n.type === 'output') {
          return { ...n, data: { ...n.data, status: 'error', error: String(error) } };
        }
        return n;
      }));
    } finally {
      setEdges(eds => eds.map(e => {
        if (e.source === id && targetNodeIds.includes(e.target)) {
          return { ...e, data: { ...e.data, status: 'idle' } };
        }
        return e;
      }));
    }
  };

  return (
    <BaseNode id={id} title="AI Model" className="w-80 p-4">
      <div className="flex flex-col gap-4">
        {/* Input Ports */}
        <div className="flex flex-col gap-2 relative -ml-4">
          <Port type="target" id="prompt" color="pink" icon={<Type size={14} />} />
          <Port type="target" id="ref-image" color="green" icon={<ImageIcon size={14} />} />
          {isVideo && (
            <Port type="target" id="ref-video" color="green" icon={<VideoIcon size={14} />} />
          )}
        </div>

        <div className="w-full h-px bg-white/10" />

        <div className="flex flex-col gap-2">
          <label className="text-[11px] text-white/50 uppercase tracking-widest font-semibold">Model</label>
          <select
            className="nodrag w-full bg-white/5 border border-white/10 rounded-[12px] p-3 text-[14px] text-white focus:outline-none focus:bg-white/10 focus:border-[#0A84FF] focus:ring-1 focus:ring-[#0A84FF] appearance-none transition-all duration-300"
            value={data.model}
            onChange={(e) => {
              const val = e.target.value;
              const type = val.includes('veo') ? 'video' : 'image';
              updateNodeData(id, { model: val, modelType: type });
            }}
          >
            <optgroup label="Image Models">
              <option value="gemini-3.1-flash-image-preview">Nano Banana Pro</option>
              <option value="gemini-2.5-flash-image">Nano Banana</option>
            </optgroup>
            <optgroup label="Video Models">
              <option value="veo-3.1-fast-generate-preview">Veo Fast</option>
              <option value="veo-3.1-generate-preview">Veo Pro</option>
            </optgroup>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-1">
          {!isVideo ? (
            <>
              <div className="flex flex-col gap-2">
                <label className="text-[11px] text-white/50 uppercase tracking-widest font-semibold">Calidad</label>
                <select
                  className="nodrag w-full bg-white/5 border border-white/10 rounded-[12px] p-3 text-[14px] text-white focus:outline-none focus:bg-white/10 focus:border-[#0A84FF] appearance-none transition-all duration-300"
                  value={data.resolution || '1K'}
                  onChange={(e) => updateNodeData(id, { resolution: e.target.value })}
                >
                  <option value="512px">512px</option>
                  <option value="1K">1K</option>
                  <option value="2K">2K</option>
                  <option value="4K">4K</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[11px] text-white/50 uppercase tracking-widest font-semibold">Proporción</label>
                <select
                  className="nodrag w-full bg-white/5 border border-white/10 rounded-[12px] p-3 text-[14px] text-white focus:outline-none focus:bg-white/10 focus:border-[#0A84FF] appearance-none transition-all duration-300"
                  value={data.aspectRatio || '1:1'}
                  onChange={(e) => updateNodeData(id, { aspectRatio: e.target.value })}
                >
                  <option value="1:1">1:1</option>
                  <option value="16:9">16:9</option>
                  <option value="9:16">9:16</option>
                </select>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                <label className="text-[11px] text-white/50 uppercase tracking-widest font-semibold">Proporción</label>
                <select
                  className="nodrag w-full bg-white/5 border border-white/10 rounded-[12px] p-3 text-[14px] text-white focus:outline-none focus:bg-white/10 focus:border-[#0A84FF] appearance-none transition-all duration-300"
                  value={data.aspectRatio === '16:9' || data.aspectRatio === '9:16' ? data.aspectRatio : '16:9'}
                  onChange={(e) => updateNodeData(id, { aspectRatio: e.target.value })}
                >
                  <option value="16:9">16:9</option>
                  <option value="9:16">9:16</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[11px] text-white/50 uppercase tracking-widest font-semibold">Cámara</label>
                <select
                  className="nodrag w-full bg-white/5 border border-white/10 rounded-[12px] p-3 text-[14px] text-white focus:outline-none focus:bg-white/10 focus:border-[#0A84FF] appearance-none transition-all duration-300"
                  value={data.camera || 'static'}
                  onChange={(e) => updateNodeData(id, { camera: e.target.value })}
                >
                  <option value="pan">Pan</option>
                  <option value="zoom">Zoom</option>
                  <option value="static">Static</option>
                </select>
              </div>
            </>
          )}
        </div>

        <button
          onClick={handleGenerate}
          className="w-full mt-2 py-3.5 bg-[#0A84FF] hover:bg-[#007AFF] text-white text-[15px] font-semibold rounded-[14px] shadow-[0_0_20px_rgba(10,132,255,0.3)] hover:shadow-[0_0_25px_rgba(10,132,255,0.5)] transition-all duration-300 flex items-center justify-center gap-2 active:scale-[0.98]"
        >
          <Play size={16} className="fill-white" /> Generate
        </button>
      </div>

      <div className="absolute right-0 top-1/2 -translate-y-1/2">
        <Port type="source" id="out" color="green" icon={isVideo ? <VideoIcon size={14} /> : <ImageIcon size={14} />} />
      </div>
    </BaseNode>
  );
}
