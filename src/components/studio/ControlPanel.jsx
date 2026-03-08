import React, { useState, useRef } from "react";
import {
    Plus,
    ChevronRight,
    Maximize2,
    Monitor,
    Type,
    Sparkles,
    X,
    Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    MODELS,
    ASPECT_RATIOS,
    PRO_ASPECT_RATIOS,
    IMAGE_SIZES,
} from "@/utils/studioTypes";

export default function ControlPanel({
    onGenerate,
    isGenerating,
    referenceImage,
    setReferenceImage,
    canGenerate = true,
    onRequestKey,
    batchState = { total: 0, completed: 0 },
}) {
    const [prompt, setPrompt] = useState("");
    const [model, setModel] = useState("nano-banana-2");
    const [aspectRatio, setAspectRatio] = useState("auto");
    const [imageSize, setImageSize] = useState("1K");
    const [showModelMenu, setShowModelMenu] = useState(false);
    const [showAspectMenu, setShowAspectMenu] = useState(false);
    const [showSizeMenu, setShowSizeMenu] = useState(false);

    const fileInputRef = useRef(null);
    const promptCount = getPromptBatch(prompt).length;
    const isBatchRunning = batchState.total > 0;
    const currentBatchStep = isBatchRunning
        ? Math.min(batchState.completed + 1, batchState.total)
        : 0;

    const handleFileSelection = async (file) => {
        if (!file) return;

        try {
            const dataUrl = await readFileAsDataUrl(file);
            setReferenceImage(dataUrl);
        } catch (error) {
            console.error("[studio] No se pudo leer la imagen:", error);
        }
    };

    const handleFileChange = (e) => {
        void handleFileSelection(e.target.files?.[0]);
    };

    const handlePaste = (e) => {
        const items = Array.from(e.clipboardData?.items || []);
        const imageItem = items.find((item) => item.type.startsWith("image/"));
        if (!imageItem) return;

        const file = imageItem.getAsFile();
        if (!file) return;

        e.preventDefault();
        void handleFileSelection(file);
    };

    const handleSubmit = (e) => {
        e?.preventDefault();
        if (!prompt.trim() || !canGenerate || isGenerating || isBatchRunning) return;

        onGenerate(prompt, {
            model,
            aspectRatio,
            imageSize,
            referenceImage: referenceImage || undefined,
        });
        setPrompt("");
    };

    const currentModel = MODELS.find((m) => m.id === model);
    const availableAspects =
        currentModel?.usesAspectRatio
            ? PRO_ASPECT_RATIOS  // nano-banana-2 supports extended ratios
            : ASPECT_RATIOS;
    const showResolution = !!currentModel?.hasResolution; // Only nano-banana-2

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
                            placeholder={canGenerate ? "Una línea = un prompt. También puedes pegar una imagen con Ctrl/Cmd + V." : "Configura una API Key para generar imágenes..."}
                            className="flex-1 bg-transparent border-none focus:ring-0 text-lg resize-none py-1 placeholder:text-white/20 min-h-[40px] max-h-[120px]"
                            disabled={!canGenerate}
                            onPaste={handlePaste}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                                    e.preventDefault();
                                    handleSubmit();
                                }
                            }}
                        />

                        <button
                            type={canGenerate ? "submit" : "button"}
                            onClick={!canGenerate ? onRequestKey : undefined}
                            disabled={canGenerate ? (!prompt.trim() || isGenerating || isBatchRunning) : false}
                            className="banana-button h-12"
                        >
                            <span>{getButtonLabel({ canGenerate, isGenerating, isBatchRunning, currentBatchStep, totalBatchSteps: batchState.total, promptCount })}</span>
                            <Sparkles size={18} />
                        </button>
                    </div>

                    {canGenerate && (
                        <div className="px-2 text-xs text-white/35 flex items-center justify-between gap-4">
                            <span>Una línea genera una imagen. Usa `Ctrl/Cmd + Enter` para enviar.</span>
                            <span>{promptCount > 1 ? `${promptCount} prompts en cola` : 'Ctrl/Cmd + V pega una referencia'}</span>
                        </div>
                    )}

                    {referenceImage && (
                        <div className="flex items-center gap-2 px-2">
                            <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-white/20">
                                <img
                                    src={referenceImage}
                                    alt="Reference"
                                    className="w-full h-full object-cover"
                                />
                                <button
                                    type="button"
                                    onClick={() => setReferenceImage(null)}
                                    className="absolute top-0 right-0 p-0.5 bg-black/60 text-white hover:bg-black"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                            <span className="text-xs text-white/40">Usando como referencia</span>
                        </div>
                    )}

                    <div className="flex items-center gap-3 pt-2 border-t border-white/5 relative">
                        <div className="relative">
                            <div
                                onClick={() => setShowModelMenu(!showModelMenu)}
                                className="control-item"
                            >
                                <div className="w-5 h-5 rounded-full bg-banana flex items-center justify-center">
                                    <span className="text-[10px] font-bold text-black">G</span>
                                </div>
                                <span className="text-sm font-medium">{currentModel?.name}</span>
                                <ChevronRight
                                    size={14}
                                    className={cn(
                                        "transition-transform",
                                        showModelMenu && "rotate-90"
                                    )}
                                />
                            </div>

                            {showModelMenu && (
                                <div className="absolute bottom-full mb-2 left-0 w-64 glass-panel p-2 overflow-hidden flex flex-col gap-1">
                                    {MODELS.map((m) => {
                                        const badges = {
                                            'nano-banana-2': { label: 'Más nuevo', color: 'bg-banana text-black' },
                                            'nano-banana': { label: 'Rápido', color: 'bg-blue-500/80 text-white' },
                                            'nano-banana-pro': { label: 'Alta calidad', color: 'bg-purple-500/80 text-white' },
                                        };
                                        const badge = badges[m.id];
                                        return (
                                            <div
                                                key={m.id}
                                                onClick={() => {
                                                    setModel(m.id);
                                                    setShowModelMenu(false);
                                                }}
                                                className={cn(
                                                    "px-3 py-2.5 rounded-xl cursor-pointer hover:bg-white/5 transition-colors flex flex-col gap-1",
                                                    model === m.id && "bg-white/10 ring-1 ring-banana/30"
                                                )}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className={cn("text-sm font-semibold", model === m.id ? "text-banana" : "text-white")}>
                                                        {m.name}
                                                    </span>
                                                    {badge && (
                                                        <span className={cn("text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full", badge.color)}>
                                                            {badge.label}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-white/40 leading-tight">{m.description}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="relative">
                            <div
                                onClick={() => setShowAspectMenu(!showAspectMenu)}
                                className="control-item"
                            >
                                <Maximize2 size={14} className="text-white/40" />
                                <span className="text-sm">{aspectRatio}</span>
                            </div>
                            {showAspectMenu && (
                                <div className="absolute bottom-full mb-2 left-0 w-32 glass-panel p-1 grid grid-cols-2 gap-1 z-10">
                                    {availableAspects.map((a) => (
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

                        {/* Resolution selector: only visible for models that support it (nano-banana-2) */}
                        {showResolution && (
                            <div className="relative">
                                <div
                                    onClick={() => setShowSizeMenu(!showSizeMenu)}
                                    className="control-item"
                                >
                                    <Monitor size={14} className="text-white/40" />
                                    <span className="text-sm">{imageSize}</span>
                                </div>
                                {showSizeMenu && (
                                    <div className="absolute bottom-full mb-2 left-0 w-32 glass-panel p-1 z-10">
                                        {IMAGE_SIZES.map((s) => (
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
                        )}

                        <div className="flex-1" />

                        <div className="flex items-center gap-4 text-white/40">
                            <button type="button" className="hover:text-white transition-colors">
                                <Type size={18} />
                            </button>
                            <button type="button" className="hover:text-white transition-colors">
                                <Layers size={18} />
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}

function getPromptBatch(prompt) {
    return String(prompt || "")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
}

function getButtonLabel({ canGenerate, isGenerating, isBatchRunning, currentBatchStep, totalBatchSteps, promptCount }) {
    if (!canGenerate) return "Activar API Key";
    if (isBatchRunning || (isGenerating && totalBatchSteps > 1)) return `Generando ${currentBatchStep}/${totalBatchSteps}`;
    if (isGenerating) return "Generando";
    if (promptCount > 1) return `Generar ${promptCount}`;
    return "Generar";
}

function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error || new Error("No se pudo leer el archivo"));
        reader.readAsDataURL(file);
    });
}
