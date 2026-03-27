import { Sparkles, Loader2, Type } from 'lucide-react';
import { useReactFlow } from '@xyflow/react';
import BaseNode from './BaseNode';
import { Port } from './Port';

export default function EnhancerNode({ id, data }: { id: string, data: any }) {
  const { getNodes, getEdges, updateNodeData } = useReactFlow();

  const handleEnhance = async () => {
    const nodes = getNodes();
    const edges = getEdges();
    
    const inputEdges = edges.filter(e => e.target === id);
    const promptEdge = inputEdges.find(e => e.targetHandle === 'in');
    const promptNode = promptEdge ? nodes.find(n => n.id === promptEdge.source) : null;
    const promptText = promptNode?.data?.text || '';

    if (!promptText) {
      alert("Por favor, conecta un nodo de Prompt con texto antes de mejorar.");
      return;
    }

    updateNodeData(id, { isEnhancing: true });

    try {
      const { GoogleGenAI } = await import('@google/genai');
      // @ts-ignore
      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
      const ai = new GoogleGenAI({ apiKey });

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Enhance the following prompt for an image/video generation AI. Make it highly detailed, cinematic, and descriptive. Return ONLY the enhanced prompt text, nothing else.\n\nOriginal prompt: ${promptText}`
      });

      updateNodeData(id, { 
        isEnhancing: false, 
        enhancedText: response.text?.trim() || promptText 
      });
    } catch (error) {
      console.error("Error enhancing prompt:", error);
      updateNodeData(id, { 
        isEnhancing: false, 
        enhancedText: `${promptText}, masterpiece, high quality, highly detailed, 8k resolution, cinematic lighting` 
      });
    }
  };

  return (
    <BaseNode id={id} title="Enhancer" className="w-80 p-4">
      <div className="absolute left-0 top-1/2 -translate-y-1/2">
        <Port type="target" id="in" color="pink" icon={<Type size={14} />} />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-medium text-white/70 flex items-center gap-1.5">
            <Sparkles size={14} className="text-[#FF2D55]" /> Prompt Enhancer
          </span>
          <button 
            onClick={handleEnhance}
            disabled={data.isEnhancing}
            className="px-4 py-1.5 bg-[#FF2D55]/10 hover:bg-[#FF2D55]/20 text-[#FF2D55] text-[12px] font-semibold rounded-full transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
          >
            {data.isEnhancing ? 'Enhancing...' : 'Enhance'}
          </button>
        </div>
        
        <div className="flex flex-col gap-1.5 relative">
          {data.isEnhancing && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm rounded-[16px] z-10 flex items-center justify-center">
              <div className="w-6 h-6 border-[3px] border-white/10 border-t-[#FF2D55] rounded-full animate-spin shadow-[0_0_15px_rgba(255,45,85,0.3)]" />
            </div>
          )}
          <textarea
            className="nodrag w-full bg-white/5 border border-white/10 rounded-[16px] p-4 text-[14px] leading-relaxed text-white placeholder:text-white/30 focus:outline-none resize-none h-28 transition-all duration-300"
            placeholder="Enhanced prompt will appear here..."
            value={data.enhancedText || ''}
            readOnly
          />
        </div>
      </div>
      
      <div className="absolute right-0 top-1/2 -translate-y-1/2">
        <Port type="source" id="out" color="pink" icon={<Type size={14} />} />
      </div>
    </BaseNode>
  );
}
