import { GenerationTask, MODELS } from "../types";

const BASE_URL = "https://api.kie.ai";

declare global {
    interface Window {
        aistudio: {
            hasSelectedApiKey: () => Promise<boolean>;
            openSelectKey: () => Promise<void>;
        };
    }
}

export async function generateImage(task: GenerationTask): Promise<{ imageUrl: string; taskId: string }> {
    const modelConfig = MODELS.find((m) => m.id === task.model);
    if (!modelConfig) throw new Error("Invalid model selected");

    const apiKey = import.meta.env.VITE_KIE_API_KEY;
    if (!apiKey) throw new Error("KIE API Key missing.");

    // If task already has a long KIE ID, resume polling
    if (task.id.length > 15) {
        console.log(`[KIE AI] Resuming existing task: ${task.id}`);
        const imageUrl = await pollTaskStatus(task.id, apiKey);
        return { imageUrl, taskId: task.id };
    }

    // 1. Upload reference image if present
    let imageUrls: string[] = [];
    if (task.referenceImage) {
        const uploadedUrl = await uploadReferenceImage(task.referenceImage, apiKey);
        imageUrls = [uploadedUrl];
    }

    // 2. Submit Generation Task
    const createResponse = await fetch(`${BASE_URL}/api/v1/jobs/createTask`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: modelConfig.fullName,
            input: {
                prompt: task.prompt,
                image_input: imageUrls,
                aspect_ratio: task.aspectRatio,
                resolution: task.imageSize,
                output_format: "png",
            },
        }),
    });

    const createData = await createResponse.json();
    if (createData.code !== 200) throw new Error(createData.msg || `API Error: ${createData.code}`);

    const kieTaskId = (createData.data?.taskId || createData.data?.tid || createData.taskId || createData.tid)?.toString();
    if (!kieTaskId) throw new Error("Missing Task ID from API response.");

    // IMPORTANT: We need the ID back in the app immediately, but generateImage 
    // is usually awaited until completion. We'll return the ID along with the URL.
    const imageUrl = await pollTaskStatus(kieTaskId, apiKey);
    return { imageUrl, taskId: kieTaskId };
}

async function uploadReferenceImage(base64: string, apiKey: string): Promise<string> {
    const res = await fetch(base64);
    const blob = await res.blob();
    const formData = new FormData();
    formData.append("file", blob, "reference.png");

    const uploadResponse = await fetch(`${BASE_URL}/api/file-stream-upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: formData,
    });

    const data = await uploadResponse.json();
    if (data.code !== 200) throw new Error(data.msg || "Reference image upload failed");
    const fileUrl = data.data?.fileUrl || data.data?.downloadUrl || data.fileUrl || data.downloadUrl || data.data;
    if (typeof fileUrl !== "string") throw new Error("Could not find file URL in upload response");
    return fileUrl;
}

async function pollTaskStatus(taskId: string, apiKey: string): Promise<string> {
    const maxRetries = 120; // 10 minutes (120 * 5s)
    const interval = 5000;

    for (let i = 0; i < maxRetries; i++) {
        const response = await fetch(`${BASE_URL}/api/v1/jobs/recordInfo?taskId=${taskId}`, {
            headers: { Authorization: `Bearer ${apiKey}` },
        });

        const data = await response.json();
        console.log(`[KIE AI] Poll Response (${taskId}):`, data);

        if (data.code !== 200) {
            if (data.code === 404 && i < 5) {
                await new Promise((resolve) => setTimeout(resolve, interval));
                continue;
            }
            throw new Error(data.msg || "Error checking task status");
        }

        const d = data.data || {};
        const state = (d.state || "").toLowerCase();

        if (state === "success") {
            // According to spec, resultUrls are inside a JSON string resultJson
            if (d.resultJson) {
                try {
                    const result = JSON.parse(d.resultJson);
                    const url = result.resultUrls?.[0] || result.url;
                    if (url) return url;
                } catch (e) {
                    console.error("[KIE AI] Failed to parse resultJson:", d.resultJson);
                }
            }

            // Fallback: look for ANY URL in common fields
            const fallbackUrl = d.url || d.imageUrl || (Array.isArray(d.results) ? d.results[0]?.url : null);
            if (fallbackUrl) return fallbackUrl;

            throw new Error("Task successful but no image URL could be extracted.");
        }

        if (state === "fail") {
            throw new Error(d.failMsg || d.reason || "Image generation failed on server");
        }

        // Keep polling if state is waiting, queuing, or generating
        await new Promise((resolve) => setTimeout(resolve, interval));
    }

    throw new Error("Timed out waiting for results after 10 minutes.");
}

export async function checkApiKey(): Promise<boolean> {
    if (import.meta.env.VITE_KIE_API_KEY) return true;
    if (typeof window.aistudio?.hasSelectedApiKey === "function") {
        return await window.aistudio.hasSelectedApiKey();
    }
    return false;
}

export async function requestApiKey(): Promise<void> {
    if (typeof window.aistudio?.openSelectKey === "function") {
        await window.aistudio.openSelectKey();
        return;
    }
    alert("Please set your VITE_KIE_API_KEY in the .env file.");
}
