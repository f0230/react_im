import { Sparkles, Loader2, Type, Image as ImageIcon } from 'lucide-react';
import { useReactFlow } from '@xyflow/react';
import BaseNode from './BaseNode';
import { Port } from './Port';
import { useState } from 'react';
import { GoogleGenAI } from '@google/genai';

export default function PromptNode({ id, data }: { id: string; data: any }) {
  const { updateNodeData, getEdges, getNodes } = useReactFlow();
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isDescribing, setIsDescribing] = useState(false);

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

  const handleDescribeMedia = async () => {
    const edges = getEdges();
    const nodes = getNodes();

    const mediaEdge = edges.find(
      (e) => e.target === id && e.targetHandle === 'media-in',
    );
    if (!mediaEdge) {
      alert('Conecta un Output o Image al puerto media-in primero.');
      return;
    }

    const sourceNode = nodes.find((n) => n.id === mediaEdge.source);
    if (!sourceNode) return;

    const mediaUrl =
      (sourceNode.data?.resultUrl as string) ||
      (sourceNode.data?.imageUrl as string) ||
      null;
    const mediaType =
      (sourceNode.data?.resultType as string) || 'image';

    if (!mediaUrl) {
      alert('El nodo conectado no tiene media disponible todavía.');
      return;
    }

    // Store media context
    updateNodeData(id, {
      mediaContextUrl: mediaUrl,
      mediaContextType: mediaType,
      mediaContextSourceNodeId: sourceNode.id,
    });

    // For video, generate a generic description
    if (mediaType === 'video') {
      updateNodeData(id, {
        text: 'A cinematic video sequence with smooth motion and dramatic lighting. Use this as a reference for style, motion, and composition.',
      });
      return;
    }

    // For images, use Gemini vision
    setIsDescribing(true);
    try {
      const response = await fetch(mediaUrl);
      const blob = await response.blob();
      const base64Full = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      const base64Data = base64Full.split(',')[1];
      const mimeType = blob.type || 'image/jpeg';

      // @ts-ignore
      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
      const ai = new GoogleGenAI({ apiKey });
      const result = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: 'Describe this image in vivid detail for use as an AI image/video generation prompt. Be specific about composition, lighting, colors, subjects, style, and mood. Return ONLY the prompt text, no explanations or prefixes.',
              },
              {
                inlineData: { mimeType, data: base64Data },
              },
            ],
          },
        ],
      });

      if (result.text) {
        updateNodeData(id, { text: result.text });
      }
    } catch (error) {
      console.error('Failed to describe media:', error);
    } finally {
      setIsDescribing(false);
    }
  };

  const isBusy = isEnhancing || isDescribing;

  return (
    <BaseNode id={id} title="Prompt" className="w-80 p-4">
      {/* Media-in port */}
      <div className="absolute left-0 top-[70%] -translate-y-1/2">
        <Port
          type="target"
          id="media-in"
          color="green"
          icon={<ImageIcon size={14} />}
        />
      </div>

      <div className="flex items-center justify-between mb-3 gap-1">
        <span className="text-[13px] text-white/70 font-medium shrink-0">Prompt</span>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDescribeMedia}
            disabled={isBusy}
            className="text-[11px] font-medium text-[#32D74B] hover:text-[#28C840] transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {isDescribing ? (
              <Loader2 size={11} className="animate-spin" />
            ) : (
              <ImageIcon size={11} />
            )}
            {isDescribing ? 'Analizando...' : 'Describir'}
          </button>
          <button
            onClick={handleEnhance}
            disabled={isBusy || !data.text}
            className="text-[11px] font-medium text-[#FF2D55] hover:text-[#FF375F] transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {isEnhancing ? (
              <Loader2 size={11} className="animate-spin" />
            ) : (
              <Sparkles size={11} />
            )}
            {isEnhancing ? 'Mejorando...' : 'Mejorar'}
          </button>
        </div>
      </div>

      <div className="relative">
        <textarea
          className="nodrag w-full bg-white/5 border border-white/10 rounded-[16px] p-4 text-[15px] leading-relaxed text-white placeholder:text-white/30 focus:outline-none focus:bg-white/10 focus:border-[#0A84FF] focus:ring-4 focus:ring-[#0A84FF]/20 resize-none h-32 transition-all duration-300"
          placeholder="Tu prompt"
          value={data.text || ''}
          onChange={(e) => updateNodeData(id, { text: e.target.value })}
        />
      </div>

      {/* Media context indicator */}
      {data.mediaContextUrl && (
        <div className="mt-2 flex items-center gap-2 text-[10px] text-white/40 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5">
          <ImageIcon size={10} />
          <span className="truncate">
            Media: {data.mediaContextType || 'image'}
          </span>
        </div>
      )}

      <div className="absolute right-0 top-1/2 -translate-y-1/2">
        <Port type="source" id="out" color="pink" icon={<Type size={14} />} />
      </div>
    </BaseNode>
  );
}
