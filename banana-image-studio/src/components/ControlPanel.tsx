import React, { useState, useRef } from 'react';
import {
  Plus,
  ChevronRight,
  Maximize2,
  Monitor,
  Type,
  Image as ImageIcon,
  Sparkles,
  X,
  Layers
} from 'lucide-react';
import { cn } from '../lib/utils';
import {
  AspectRatio,
  ImageSize,
  ModelType,
  MODELS,
  ASPECT_RATIOS,
  PRO_ASPECT_RATIOS,
  IMAGE_SIZES
} from '../types';

interface ControlPanelProps {
  onGenerate: (prompt: string, config: {
    model: ModelType;
    aspectRatio: AspectRatio;
    imageSize: ImageSize;
    referenceImage?: string;
  }) => void;
  isGenerating: boolean;
  referenceImage: string | null;
  setReferenceImage: (img: string | null) => void;
}

export default function ControlPanel({
  onGenerate,
  isGenerating,
  referenceImage,
  setReferenceImage
}: ControlPanelProps) {
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState<ModelType>('nano-banana-2');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('auto');
  const [imageSize, setImageSize] = useState<ImageSize>('1K');
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [showAspectMenu, setShowAspectMenu] = useState(false);
  const [showSizeMenu, setShowSizeMenu] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReferenceImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!prompt.trim()) return;

    onGenerate(prompt, {
      model,
      aspectRatio,
      imageSize,
      referenceImage: referenceImage || undefined
    });
    setPrompt('');
  };

  const currentModel = MODELS.find(m => m.id === model);
  const availableAspects = (model === 'nano-banana-pro' || model === 'nano-banana-2') ? PRO_ASPECT_RATIOS : ASPECT_RATIOS;

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-4xl px-4 z-50">
      <div className="glass-panel p-4 shadow-2xl ring-1 ring-white/10">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-1 p-2 rounded-lg hover:bg-white/5 transition-colors text-white/60 hover:text-white border border-white/5"
            >
              <Plus size={20} />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleFileChange}
            />

            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe what you want to create..."
              className="flex-1 bg-transparent border-none focus:ring-0 text-lg resize-none py-1 placeholder:text-white/20 min-h-[40px] max-h-[120px]"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />

            <button
              disabled={!prompt.trim()}
              className="banana-button h-12"
            >
              <span>Generate</span>
              <Sparkles size={18} />
            </button>
          </div>

          {referenceImage && (
            <div className="flex items-center gap-2 px-2">
              <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-white/20">
                <img src={referenceImage} alt="Reference" className="w-full h-full object-cover" />
                <button
                  onClick={() => setReferenceImage(null)}
                  className="absolute top-0 right-0 p-0.5 bg-black/60 text-white hover:bg-black"
                >
                  <X size={12} />
                </button>
              </div>
              <span className="text-xs text-white/40">Using as reference</span>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2 border-t border-white/5">
            {/* Model Selector */}
            <div className="relative">
              <div
                onClick={() => setShowModelMenu(!showModelMenu)}
                className="control-item"
              >
                <div className="w-5 h-5 rounded-full bg-banana flex items-center justify-center">
                  <span className="text-[10px] font-bold text-black">G</span>
                </div>
                <span className="text-sm font-medium">{currentModel?.name}</span>
                <ChevronRight size={14} className={cn("transition-transform", showModelMenu && "rotate-90")} />
              </div>

              {showModelMenu && (
                <div className="absolute bottom-full mb-2 left-0 w-48 glass-panel p-1 overflow-hidden">
                  {MODELS.map(m => (
                    <div
                      key={m.id}
                      onClick={() => {
                        setModel(m.id);
                        setShowModelMenu(false);
                      }}
                      className={cn(
                        "px-3 py-2 rounded-lg text-sm cursor-pointer hover:bg-white/5",
                        model === m.id && "bg-white/10 text-banana"
                      )}
                    >
                      {m.name}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Aspect Ratio */}
            <div className="relative">
              <div
                onClick={() => setShowAspectMenu(!showAspectMenu)}
                className="control-item"
              >
                <Maximize2 size={14} className="text-white/40" />
                <span className="text-sm">{aspectRatio}</span>
              </div>
              {showAspectMenu && (
                <div className="absolute bottom-full mb-2 left-0 w-32 glass-panel p-1 grid grid-cols-2 gap-1">
                  {availableAspects.map(a => (
                    <div
                      key={a.value}
                      onClick={() => {
                        setAspectRatio(a.value);
                        setShowAspectMenu(false);
                      }}
                      className={cn(
                        "px-2 py-1.5 rounded text-xs text-center cursor-pointer hover:bg-white/5",
                        aspectRatio === a.value && "bg-white/10 text-banana"
                      )}
                    >
                      {a.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Resolution */}
            <div className="relative">
              <div
                onClick={() => setShowSizeMenu(!showSizeMenu)}
                className="control-item"
              >
                <Monitor size={14} className="text-white/40" />
                <span className="text-sm">{imageSize}</span>
              </div>
              {showSizeMenu && (
                <div className="absolute bottom-full mb-2 left-0 w-32 glass-panel p-1">
                  {IMAGE_SIZES.map(s => (
                    <div
                      key={s.value}
                      onClick={() => {
                        setImageSize(s.value);
                        setShowSizeMenu(false);
                      }}
                      className={cn(
                        "px-3 py-2 rounded-lg text-sm cursor-pointer hover:bg-white/5",
                        imageSize === s.value && "bg-white/10 text-banana"
                      )}
                    >
                      {s.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex-1" />

            <div className="flex items-center gap-4 text-white/40">
              <button className="hover:text-white transition-colors">
                <Type size={18} />
              </button>
              <button className="hover:text-white transition-colors">
                <Layers size={18} />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
