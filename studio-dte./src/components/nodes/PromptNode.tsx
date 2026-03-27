import { X, Sparkles, Loader2, Type } from 'lucide-react';
import { useReactFlow } from '@xyflow/react';
import BaseNode from './BaseNode';
import { Port } from './Port';
import { useState } from 'react';
import { GoogleGenAI } from '@google/genai';

export default function PromptNode({ id, data }: { id: string, data: any }) {
  const { updateNodeData } = useReactFlow();
  const [isEnhancing, setIsEnhancing] = useState(false);

  const handleEnhance = async () => {
    const currentText = data.text as string;
    if (!currentText) return;

    setIsEnhancing(true);
    try {
      // @ts-ignore
      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Enhance this prompt for an AI image/video generator. Make it highly detailed, cinematic, and descriptive. Return ONLY the enhanced prompt text, nothing else.\n\nOriginal prompt: ${currentText}`
      });

      if (response.text) {
        updateNodeData(id, { text: response.text });
      }
    } catch (error) {
      console.error("Failed to enhance prompt:", error);
    } finally {
      setIsEnhancing(false);
    }
  };

  return (
    <BaseNode id={id} title="Prompt" className="w-80 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[13px] text-white/70 font-medium">Prompt</span>
        <button
          onClick={handleEnhance}
          disabled={isEnhancing || !data.text}
          className="text-[12px] font-medium text-[#FF2D55] hover:text-[#FF375F] transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isEnhancing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
          {isEnhancing ? 'Mejorando...' : 'Mejorar pront IA'}
        </button>
      </div>

      <div className="relative">
        <textarea
          className="nodrag w-full bg-white/5 border border-white/10 rounded-[16px] p-4 text-[15px] leading-relaxed text-white placeholder:text-white/30 focus:outline-none focus:bg-white/10 focus:border-[#0A84FF] focus:ring-4 focus:ring-[#0A84FF]/20 resize-none h-32 transition-all duration-300"
          placeholder="Tu pront"
          value={data.text || ''}
          onChange={(e) => updateNodeData(id, { text: e.target.value })}
        />
      </div>

      <div className="absolute right-0 top-1/2 -translate-y-1/2">
        <Port type="source" id="out" color="pink" icon={<Type size={14} />} />
      </div>
    </BaseNode>
  );
}
