import {
    MAX_REFERENCE_IMAGES,
    MODELS,
    getModelReferenceLimit,
    modelSupportsReferenceImages,
} from "../utils/studioTypes";
import { supabase } from "../lib/supabaseClient";

const KIE_API_BASE_URL = "https://api.kie.ai";
export const STUDIO_SIGNED_URL_TTL = 60 * 60 * 24;
const SIGNED_URL_REFRESH_BUFFER_MS = 60 * 1000;
const studioSignedUrlCache = new Map();

export async function generateImage(task) {
    const kieTaskId = task.kieTaskId || await startImageGeneration(task);
    const storagePath = await resumeImageGeneration({ kieTaskId });
    const imageUrl = await createStudioSignedUrl(storagePath);

    return { imageUrl, storagePath, kieTaskId };
}

export async function startImageGeneration(task) {
    const modelConfig = MODELS.find((m) => m.id === task.model);
    if (!modelConfig) throw new Error("Invalid model selected");

    const apiKey = getApiKey();

    const referenceImages = normalizeReferenceImages(
        task.referenceImages ?? task.referenceImage,
        task.model
    );
    const imageUrls = referenceImages.length > 0
        ? await Promise.all(referenceImages.map((image) => uploadReferenceImage(image)))
        : [];

    const inputPayload = {
        prompt: task.prompt,
        output_format: "png",
    };

    if (modelConfig.usesAspectRatio) {
        inputPayload.aspect_ratio = task.aspectRatio || "auto";
        inputPayload.resolution = task.imageSize || "1K";
        if (imageUrls.length > 0) inputPayload.image_input = imageUrls;
        if (modelConfig.hasGoogleSearch) inputPayload.google_search = false;
    } else {
        inputPayload.image_size = task.aspectRatio || "1:1";
        if (imageUrls.length > 0) inputPayload.image_input = imageUrls;
    }

    const createResponse = await fetch(`${KIE_API_BASE_URL}/api/v1/jobs/createTask`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: modelConfig.fullName,
            input: inputPayload,
        }),
    });

    const createData = await createResponse.json();
    if (createData.code !== 200) {
        throw new Error(createData.msg || `API Error: ${createData.code}`);
    }

    const kieTaskId = (
        createData.data?.taskId ||
        createData.data?.tid ||
        createData.taskId ||
        createData.tid
    )?.toString();

    if (!kieTaskId) throw new Error("Missing Task ID from API response.");

    return kieTaskId;
}

export async function resumeImageGeneration({ kieTaskId }) {
    if (!kieTaskId) throw new Error("Missing KIE task id.");

    const apiKey = getApiKey();
    const imageUrlRaw = await pollTaskStatus(kieTaskId, apiKey);

    return uploadToSupabase(imageUrlRaw, kieTaskId);
}

export async function createStudioSignedUrl(path, expiresIn = STUDIO_SIGNED_URL_TTL) {
    if (!path) return null;

    const cacheKey = `${expiresIn}:${path}`;
    const cached = studioSignedUrlCache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now() + SIGNED_URL_REFRESH_BUFFER_MS) {
        return cached.url;
    }

    const { data, error } = await supabase.storage
        .from("banana-ai")
        .createSignedUrl(path, expiresIn);

    if (error) throw error;

    const signedUrl = data?.signedUrl || null;

    if (signedUrl) {
        studioSignedUrlCache.set(cacheKey, {
            url: signedUrl,
            expiresAt: Date.now() + expiresIn * 1000,
        });
    }

    return signedUrl;
}

function getApiKey() {
    const apiKey = import.meta.env.VITE_KIE_API_KEY;
    if (!apiKey) throw new Error("KIE API Key missing.");
    return apiKey;
}

async function uploadToSupabase(imageUrl, taskId) {
    const isLocalDev = typeof window !== "undefined" && window.location.hostname === "localhost";

    if (!isLocalDev) {
        try {
            const probeRes = await fetch("/api/studio-proxy", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ imageUrl, taskId }),
            });

            if (probeRes.ok) {
                const { path } = await probeRes.json();
                if (path) {
                    console.log("[studio] Imagen guardada via proxy:", path);
                    return path;
                }
            }

            const errBody = await probeRes.text().catch(() => "");
            console.warn("[studio] Proxy fallo:", probeRes.status, errBody.slice(0, 120));
        } catch (proxyErr) {
            console.warn("[studio] Proxy error:", proxyErr.message);
        }
    } else {
        console.log("[studio] Local dev detectado, usando upload directo a Supabase");
    }

    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error(`Image download failed: HTTP ${response.status}`);

    const blob = await response.blob();
    const safeId = (taskId || "unknown").replace(/[^a-zA-Z0-9_-]/g, "");
    const fileName = `banana-${safeId}-${Date.now()}.png`;

    const { data: uploadData, error: uploadError } = await supabase.storage
        .from("banana-ai")
        .upload(fileName, blob, { contentType: "image/png", upsert: true });

    if (uploadError) throw uploadError;

    return uploadData?.path || fileName;
}

async function uploadReferenceImage(base64) {
    const proxyResponse = await fetch("/api/kie-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl: base64 }),
    });

    const data = await proxyResponse.json();

    if (!proxyResponse.ok) {
        throw new Error(data.error || `Reference image upload failed (${proxyResponse.status})`);
    }

    if (typeof data.fileUrl !== "string") {
        throw new Error("KIE upload proxy no devolvió fileUrl.");
    }

    return data.fileUrl;
}

function normalizeReferenceImages(input, modelId) {
    if (!modelSupportsReferenceImages(modelId)) {
        return [];
    }

    const images = Array.isArray(input)
        ? input
        : input
            ? [input]
            : [];

    const limit = getModelReferenceLimit(modelId) || MAX_REFERENCE_IMAGES;
    return images.filter(Boolean).slice(0, limit);
}

async function pollTaskStatus(taskId, apiKey) {
    const maxRetries = 120;
    const interval = 5000;

    for (let i = 0; i < maxRetries; i++) {
        const response = await fetch(
            `${KIE_API_BASE_URL}/api/v1/jobs/recordInfo?taskId=${taskId}`,
            {
                headers: { Authorization: `Bearer ${apiKey}` },
            }
        );

        const data = await response.json();

        if (data.code !== 200) {
            if (data.code === 404 && i < 5) {
                await wait(interval);
                continue;
            }
            throw new Error(data.msg || "Error checking task status");
        }

        const d = data.data || {};
        const state = (d.state || "").toLowerCase();

        if (state === "success") {
            if (d.resultJson) {
                try {
                    const result = JSON.parse(d.resultJson);
                    const url = result.resultUrls?.[0] || result.url;
                    if (url) return url;
                } catch (error) {
                    console.error("[KIE AI] Failed to parse resultJson:", error);
                }
            }

            const fallbackUrl =
                d.url ||
                d.imageUrl ||
                (Array.isArray(d.results) ? d.results[0]?.url : null);

            if (fallbackUrl) return fallbackUrl;
            throw new Error("Task successful but no image URL could be extracted.");
        }

        if (state === "fail") {
            throw new Error(d.failMsg || d.reason || "Image generation failed on server");
        }

        await wait(interval);
    }

    throw new Error("Timed out waiting for results after 10 minutes.");
}

function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function getFileExtensionFromType(contentType) {
    if (contentType === "image/jpeg") return "jpg";
    if (contentType === "image/webp") return "webp";
    if (contentType === "image/gif") return "gif";
    return "png";
}

export async function checkApiKey() {
    if (import.meta.env.VITE_KIE_API_KEY) return true;
    if (typeof window.aistudio?.hasSelectedApiKey === "function") {
        return await window.aistudio.hasSelectedApiKey();
    }
    return false;
}

export async function requestApiKey() {
    if (typeof window.aistudio?.openSelectKey === "function") {
        await window.aistudio.openSelectKey();
        return;
    }
    alert("Por favor establece VITE_KIE_API_KEY en el archivo .env.");
}
