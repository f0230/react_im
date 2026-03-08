export const MODELS = [
    {
        id: "nano-banana-2",
        name: "Nano Banana 2",
        fullName: "nano-banana-2",
        description: "Next-gen Google Nano Banana 2 on KIE AI",
    },
    {
        id: "nano-banana",
        name: "Nano Banana",
        fullName: "gemini-2.5-flash-image",
        description: "Fast and efficient image generation",
    },
    {
        id: "nano-banana-pro",
        name: "Nano Banana Pro",
        fullName: "gemini-3-pro-image-preview",
        description: "High-quality generation with advanced controls",
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
