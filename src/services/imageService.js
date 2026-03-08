import { MODELS } from "../utils/studioTypes";

const BASE_URL = "https://api.kie.ai";

export async function generateImage(task) {
    const modelConfig = MODELS.find((m) => m.id === task.model);
    if (!modelConfig) throw new Error("Invalid model selected");

    const apiKey = import.meta.env.VITE_KIE_API_KEY;
    if (!apiKey) throw new Error("KIE API Key missing.");

    // If task already has a long KIE ID, resume polling
    if (task.id.length > 15) {
        console.log(`[KIE AI] Resuming existing task: ${task.id}`);
        const imageUrlRaw = await pollTaskStatus(task.id, apiKey);
        if (imageUrlRaw.includes('supabase')) {
            return { imageUrl: imageUrlRaw, taskId: task.id };
        }
        const supabaseUrl = await uploadToSupabase(imageUrlRaw, task.id);
        return { imageUrl: supabaseUrl, taskId: task.id };
    }

    // 1. Upload reference image if present
    let imageUrls = [];
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
    if (createData.code !== 200)
        throw new Error(createData.msg || `API Error: ${createData.code}`);

    const kieTaskId = (
        createData.data?.taskId ||
        createData.data?.tid ||
        createData.taskId ||
        createData.tid
    )?.toString();

    if (!kieTaskId) throw new Error("Missing Task ID from API response.");

    const imageUrlRaw = await pollTaskStatus(kieTaskId, apiKey);
    const supabaseUrl = await uploadToSupabase(imageUrlRaw, kieTaskId);

    return { imageUrl: supabaseUrl, taskId: kieTaskId };
}

async function uploadToSupabase(imageUrl, taskId) {
    try {
        console.log("[studio-proxy] Enviando imagen al servidor para guardar en Supabase...");

        const response = await fetch('/api/studio-proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageUrl, taskId }),
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || `HTTP ${response.status}`);
        }

        const { publicUrl } = await response.json();
        if (!publicUrl) throw new Error('No publicUrl returned from proxy');

        console.log("[studio-proxy] ✅ Imagen guardada en Supabase:", publicUrl);
        return publicUrl;
    } catch (error) {
        console.error("[studio-proxy] Falló al guardar, usando URL temporal:", error);
        return imageUrl;
    }
}

async function uploadReferenceImage(base64, apiKey) {
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
    if (data.code !== 200)
        throw new Error(data.msg || "Reference image upload failed");

    const fileUrl =
        data.data?.fileUrl ||
        data.data?.downloadUrl ||
        data.fileUrl ||
        data.downloadUrl ||
        data.data;

    if (typeof fileUrl !== "string")
        throw new Error("Could not find file URL in upload response");

    return fileUrl;
}

async function pollTaskStatus(taskId, apiKey) {
    const maxRetries = 120; // 10 minutes
    const interval = 5000;

    for (let i = 0; i < maxRetries; i++) {
        const response = await fetch(
            `${BASE_URL}/api/v1/jobs/recordInfo?taskId=${taskId}`,
            {
                headers: { Authorization: `Bearer ${apiKey}` },
            }
        );

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
            if (d.resultJson) {
                try {
                    const result = JSON.parse(d.resultJson);
                    const url = result.resultUrls?.[0] || result.url;
                    if (url) return url;
                } catch (e) {
                    console.error("[KIE AI] Failed to parse resultJson:", d.resultJson);
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
            throw new Error(
                d.failMsg || d.reason || "Image generation failed on server"
            );
        }

        await new Promise((resolve) => setTimeout(resolve, interval));
    }

    throw new Error("Timed out waiting for results after 10 minutes.");
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
