import { Sparkles, Loader2, Type, Image as ImageIcon } from 'lucide-react';
import { useReactFlow } from '@xyflow/react';
import BaseNode from './BaseNode';
import { Port } from './Port';
import { useState, useRef, useEffect, useCallback } from 'react';
import OpenAI from 'openai';
import { enhancePrompt } from '../../lib/prompt-enhancer';
import toast from 'react-hot-toast';

export default function PromptNode({ id, data }: { id: string; data: any }) {
  const { updateNodeData, getEdges, getNodes } = useReactFlow();
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isDescribing, setIsDescribing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(80, el.scrollHeight)}px`;
  }, []);

  useEffect(() => {
    autoResize();
  }, [data.text, autoResize]);

  const handleEnhance = async () => {
    const currentText = data.text as string;
    if (!currentText) return;

    setIsEnhancing(true);
    try {
      const enhanced = await enhancePrompt(currentText);
      updateNodeData(id, { text: enhanced });
      toast.success('Prompt enhanced');
    } catch (error) {
      console.error('Failed to enhance prompt:', error);
      toast.error('Failed to enhance prompt');
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
      toast.error('Conecta un Output o Image al puerto media-in primero.');
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
      toast.error('El nodo conectado no tiene media disponible todavia.');
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

    // For images, use OpenAI vision
    setIsDescribing(true);
    try {
      // Convert to base64 if it's a remote URL
      let imageDataUrl = mediaUrl;
      if (mediaUrl.startsWith('http')) {
        const response = await fetch(mediaUrl);
        const blob = await response.blob();
        imageDataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      }

      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      if (!apiKey) throw new Error('VITE_OPENAI_API_KEY is not configured');
      const ai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
      const response = await ai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Describe this image in vivid detail for use as an AI image/video generation prompt. Be specific about composition, lighting, colors, subjects, style, and mood. Return ONLY the prompt text, no explanations or prefixes.',
              },
              {
                type: 'image_url',
                image_url: { url: imageDataUrl },
              },
            ],
          },
        ],
        max_tokens: 500,
      });

      const text = response.choices[0]?.message?.content?.trim();
      if (text) {
        updateNodeData(id, { text });
        toast.success('Media described');
      }
    } catch (error) {
      console.error('Failed to describe media:', error);
      toast.error('Failed to describe media');
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
          ref={textareaRef}
          className="nodrag w-full bg-white/5 border border-white/10 rounded-[16px] p-4 text-[15px] leading-relaxed text-white placeholder:text-white/30 focus:outline-none focus:bg-white/10 focus:border-[#0A84FF] focus:ring-4 focus:ring-[#0A84FF]/20 resize-none transition-all duration-300"
          style={{ minHeight: 80 }}
          placeholder="Tu prompt"
          value={data.text || ''}
          onChange={(e) => {
            updateNodeData(id, { text: e.target.value });
            autoResize();
          }}
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
