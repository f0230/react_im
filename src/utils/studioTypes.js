export const MODELS = [
    {
        id: "nano-banana-2",
        name: "Nano Banana 2",
        fullName: "nano-banana-2",         // No google/ prefix per API spec
        description: "Next-gen, alta calidad con control de resolución",
        supportsReferenceImages: true,
        maxReferenceImages: 14,
        hasResolution: true,               // Supports resolution: 1K/2K/4K
        hasGoogleSearch: true,             // Supports google_search grounding
        usesAspectRatio: true,             // Uses aspect_ratio + resolution (not image_size)
        creditsByResolution: {
            "1K": 8,
            "2K": 12,
            "4K": 18,
        },
    },
    {
        id: "nano-banana",
        name: "Nano Banana",
        fullName: "google/nano-banana",
        description: "Rápido y eficiente",
        supportsReferenceImages: false,
        maxReferenceImages: 0,
        hasResolution: false,
        hasGoogleSearch: false,
        usesAspectRatio: false,            // Uses image_size field
        credits: 4,
    },
    {
        id: "nano-banana-pro",
        name: "Nano Banana Pro",
        fullName: "nano-banana-pro",
        description: "Alta calidad con control de resolucion",
        supportsReferenceImages: true,
        maxReferenceImages: 8,
        hasResolution: true,
        hasGoogleSearch: false,
        usesAspectRatio: true,             // Uses aspect_ratio + resolution (not image_size)
        creditsByResolution: {
            "1K": 18,
            "2K": 18,
            "4K": 24,
        },
    },
];

export const ASPECT_RATIOS = [
    { label: "Auto", value: "auto" },
    { label: "1:1", value: "1:1" },
    { label: "3:4", value: "3:4" },
    { label: "4:3", value: "4:3" },
    { label: "16:9", value: "16:9" },
    { label: "9:16", value: "9:16" },
    { label: "21:9", value: "21:9" },
];

export const PRO_ASPECT_RATIOS = [
    ...ASPECT_RATIOS,
    { label: "2:3", value: "2:3" },
    { label: "3:2", value: "3:2" },
    { label: "4:5", value: "4:5" },
    { label: "5:4", value: "5:4" },
    { label: "1:4", value: "1:4" },
    { label: "1:8", value: "1:8" },
    { label: "4:1", value: "4:1" },
    { label: "8:1", value: "8:1" },
];

export const IMAGE_SIZES = [
    { label: "1K", value: "1K" },
    { label: "2K", value: "2K" },
    { label: "4K", value: "4K" },
];

export const MAX_REFERENCE_IMAGES = 14;

export function getModelReferenceLimit(modelId) {
    const model = MODELS.find((item) => item.id === modelId);
    return model?.maxReferenceImages ?? MAX_REFERENCE_IMAGES;
}

export function modelSupportsReferenceImages(modelId) {
    const model = MODELS.find((item) => item.id === modelId);
    return Boolean(model?.supportsReferenceImages);
}

export function getStudioCredits(modelId, imageSize = "1K") {
    const model = MODELS.find((item) => item.id === modelId);
    if (!model) return 0;

    if (model.creditsByResolution) {
        return model.creditsByResolution[imageSize] ?? model.creditsByResolution["1K"] ?? 0;
    }

    return model.credits ?? 0;
}
