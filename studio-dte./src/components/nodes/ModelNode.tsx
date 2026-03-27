import { Play, Type, Image as ImageIcon, Video as VideoIcon } from 'lucide-react';
import { useReactFlow } from '@xyflow/react';
import BaseNode from './BaseNode';
import { Port } from './Port';
import MultiUseSelect from '../MultiUseSelect';

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
          <MultiUseSelect
            value={data.model}
            onChange={(val) => {
              const v = val as string;
              const type = v.includes('veo') ? 'video' : 'image';
              updateNodeData(id, { model: v, modelType: type });
            }}
            options={[
              { label: 'Image Models', options: [
                { label: 'Nano Banana Pro', value: 'gemini-3.1-flash-image-preview' },
                { label: 'Nano Banana', value: 'gemini-2.5-flash-image' },
              ]},
              { label: 'Video Models', options: [
                { label: 'Veo Fast', value: 'veo-3.1-fast-generate-preview' },
                { label: 'Veo Pro', value: 'veo-3.1-generate-preview' },
              ]},
            ]}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 mt-1">
          {!isVideo ? (
            <>
              <div className="flex flex-col gap-2">
                <label className="text-[11px] text-white/50 uppercase tracking-widest font-semibold">Calidad</label>
                <MultiUseSelect
                  value={data.resolution || '1K'}
                  onChange={(val) => updateNodeData(id, { resolution: val as string })}
                  options={[
                    { label: '512px', value: '512px' },
                    { label: '1K', value: '1K' },
                    { label: '2K', value: '2K' },
                    { label: '4K', value: '4K' },
                  ]}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[11px] text-white/50 uppercase tracking-widest font-semibold">Proporción</label>
                <MultiUseSelect
                  value={data.aspectRatio || '1:1'}
                  onChange={(val) => updateNodeData(id, { aspectRatio: val as string })}
                  options={[
                    { label: '1:1', value: '1:1' },
                    { label: '16:9', value: '16:9' },
                    { label: '9:16', value: '9:16' },
                  ]}
                />
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                <label className="text-[11px] text-white/50 uppercase tracking-widest font-semibold">Proporción</label>
                <MultiUseSelect
                  value={data.aspectRatio === '16:9' || data.aspectRatio === '9:16' ? data.aspectRatio : '16:9'}
                  onChange={(val) => updateNodeData(id, { aspectRatio: val as string })}
                  options={[
                    { label: '16:9', value: '16:9' },
                    { label: '9:16', value: '9:16' },
                  ]}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[11px] text-white/50 uppercase tracking-widest font-semibold">Cámara</label>
                <MultiUseSelect
                  value={data.camera || 'static'}
                  onChange={(val) => updateNodeData(id, { camera: val as string })}
                  options={[
                    { label: 'Pan', value: 'pan' },
                    { label: 'Zoom', value: 'zoom' },
                    { label: 'Static', value: 'static' },
                  ]}
                />
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
