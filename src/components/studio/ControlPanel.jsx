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
    MAX_REFERENCE_IMAGES,
    getModelReferenceLimit,
    modelSupportsReferenceImages,
} from "@/utils/studioTypes";

export default function ControlPanel({
    onGenerate,
    isGenerating,
    referenceImages = [],
    onAddReferenceImages,
    onRemoveReferenceImage,
    onClearReferenceImages,
    maxReferenceImages = MAX_REFERENCE_IMAGES,
    canGenerate = true,
    onRequestKey,
    batchState = { queued: 0, active: 0 },
}) {
    const [prompt, setPrompt] = useState("");
    const [model, setModel] = useState("nano-banana-2");
    const [aspectRatio, setAspectRatio] = useState("auto");
    const [imageSize, setImageSize] = useState("1K");
    const [showModelMenu, setShowModelMenu] = useState(false);
    const [showAspectMenu, setShowAspectMenu] = useState(false);
    const [showSizeMenu, setShowSizeMenu] = useState(false);

    const fileInputRef = useRef(null);
    const currentModel = MODELS.find((m) => m.id === model);
    const effectiveMaxReferenceImages = Math.min(
        maxReferenceImages,
        getModelReferenceLimit(model)
    );
    const supportsReferenceImages = modelSupportsReferenceImages(model);
    const promptCount = getPromptBatch(prompt).length;
    const queuedCount = batchState.queued || 0;
    const isQueueActive = queuedCount > 0 || batchState.active > 0;
    const remainingReferenceSlots = Math.max(effectiveMaxReferenceImages - referenceImages.length, 0);

    const handleFileSelection = async (files) => {
        const selectedFiles = Array.from(files || []).slice(0, remainingReferenceSlots);
        if (!selectedFiles.length) return;

        try {
            const dataUrls = await readFilesAsDataUrls(selectedFiles);
            onAddReferenceImages?.(dataUrls);
        } catch (error) {
            console.error("[studio] No se pudo leer la imagen:", error);
        }
    };

    const handleFileChange = (e) => {
        void handleFileSelection(e.target.files);
        e.target.value = "";
    };

    const handlePaste = (e) => {
        const files = Array.from(e.clipboardData?.items || [])
            .filter((item) => item.type.startsWith("image/"))
            .map((item) => item.getAsFile())
            .filter(Boolean)
            .slice(0, remainingReferenceSlots);
        if (!files.length) return;

        e.preventDefault();
        void handleFileSelection(files);
    };

    const handleSubmit = (e) => {
        e?.preventDefault();
        if (!prompt.trim() || !canGenerate) return;

        onGenerate(prompt, {
            model,
            aspectRatio,
            imageSize,
            referenceImages,
        });
        setPrompt("");
    };

    const availableAspects =
        currentModel?.usesAspectRatio
            ? PRO_ASPECT_RATIOS
            : ASPECT_RATIOS;
    const showResolution = !!currentModel?.hasResolution;

    return (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-full max-w-3xl px-4 z-50">
            <div className="glass-panel p-3 shadow-2xl ring-1 ring-white/10">
                <form onSubmit={handleSubmit} className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={!supportsReferenceImages || remainingReferenceSlots === 0}
                            className="p-1.5 rounded-lg hover:bg-white/5 transition-colors text-white/60 hover:text-white border border-white/5 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                        >
                            <Plus size={16} />
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            multiple
                            disabled={!supportsReferenceImages}
                            onChange={handleFileChange}
                        />

                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder={canGenerate ? "Una línea = un prompt." : "Configura una API Key para generar imágenes..."}
                            className="flex-1 bg-transparent border-none focus:ring-0 text-sm resize-none placeholder:text-white/20 min-h-[32px] max-h-[96px] leading-tight py-1"
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
                            disabled={canGenerate ? !prompt.trim() : false}
                            className="banana-button h-9 shrink-0"
                        >
                            <span>{getButtonLabel({ canGenerate, isGenerating, isQueueActive, queuedCount, promptCount })}</span>
                            <Sparkles size={16} />
                        </button>
                    </div>

                    {referenceImages.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 px-2">
                            {referenceImages.map((image, index) => (
                                <div
                                    key={`${image}-${index}`}
                                    className="relative w-12 h-12 rounded-lg overflow-hidden border border-white/20"
                                >
                                    <img
                                        src={image}
                                        alt={`Reference ${index + 1}`}
                                        className="w-full h-full object-cover"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => onRemoveReferenceImage?.(index)}
                                        className="absolute top-0 right-0 p-0.5 bg-black/60 text-white hover:bg-black"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            ))}
                            <span className="text-xs text-white/40">
                                {referenceImages.length}/{effectiveMaxReferenceImages} referencias
                            </span>
                            {referenceImages.length > 1 && (
                                <button
                                    type="button"
                                    onClick={onClearReferenceImages}
                                    className="text-xs text-white/45 hover:text-white transition-colors"
                                >
                                    Limpiar
                                </button>
                            )}
                        </div>
                    )}

                    <div className="flex items-center gap-2 pt-1.5 border-t border-white/5 relative">
                        <div className="relative">
                            <div
                                onClick={() => setShowModelMenu(!showModelMenu)}
                                className="control-item"
                            >
                                <div className="w-5 h-5 rounded-full bg-[#0DD122] flex items-center justify-center">
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
                                            'nano-banana-2': { label: 'Más nuevo', color: 'bg-[#0DD122] text-black' },
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
                                                    model === m.id && "bg-white/10 ring-1 ring-[#0DD122]/30"
                                                )}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className={cn("text-sm font-semibold", model === m.id ? "text-[#0DD122]" : "text-white")}>
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
                                                aspectRatio === a.value && "bg-white/10 text-[#0DD122]"
                                            )}
                                        >
                                            {a.label}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Resolution selector for models that support Kie AI resolution control */}
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
                                                    imageSize === s.value && "bg-white/10 text-[#0DD122]"
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

function getButtonLabel({ canGenerate, isGenerating, isQueueActive, queuedCount, promptCount }) {
    if (!canGenerate) return "Activar API Key";
    if (promptCount > 1) return `Encolar ${promptCount}`;
    if (isQueueActive || isGenerating) return queuedCount > 0 ? `Agregar (${queuedCount})` : "Agregar";
    return "Generar";
}

function readFilesAsDataUrls(files) {
    return Promise.all(
        files.map((file) => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error || new Error("No se pudo leer el archivo"));
            reader.readAsDataURL(file);
        }))
    );
}
