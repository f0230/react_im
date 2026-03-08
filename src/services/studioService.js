import { supabase } from "@/lib/supabaseClient";
import { createStudioSignedUrl } from "@/services/imageService";

const STUDIO_COLUMNS = `
    id,
    created_at,
    updated_at,
    prompt,
    model,
    aspect_ratio,
    image_size,
    status,
    storage_path,
    error,
    kie_task_id,
    created_by,
    processing_by,
    processing_started_at
`;

export async function listStudioTasks() {
    const { data, error } = await supabase
        .from("studio_generations")
        .select(STUDIO_COLUMNS)
        .order("created_at", { ascending: false });

    if (error) throw error;

    return Promise.all((data || []).map(hydrateStudioTask));
}

export async function createStudioTask(task) {
    const payload = toDbPayload(task);
    const { data, error } = await supabase
        .from("studio_generations")
        .insert(payload)
        .select(STUDIO_COLUMNS)
        .single();

    if (error) throw error;
    return hydrateStudioTask(data);
}

export async function updateStudioTask(taskId, patch) {
    const payload = toDbPayload(patch);
    const { data, error } = await supabase
        .from("studio_generations")
        .update(payload)
        .eq("id", taskId)
        .select(STUDIO_COLUMNS)
        .single();

    if (error) throw error;
    return hydrateStudioTask(data);
}

export async function claimStudioTask(taskId) {
    const { data, error } = await supabase.rpc("fn_claim_studio_generation", {
        p_generation_id: taskId,
    });

    if (error) throw error;
    return Boolean(data);
}

export async function deleteStudioTask(task) {
    if (task.storagePath) {
        const { error: storageError } = await supabase.storage
            .from("banana-ai")
            .remove([task.storagePath]);

        if (storageError) throw storageError;
    }

    const { error } = await supabase
        .from("studio_generations")
        .delete()
        .eq("id", task.id);

    if (error) throw error;
}

async function hydrateStudioTask(row) {
    let imageUrl = null;

    if (row.storage_path) {
        try {
            imageUrl = await createStudioSignedUrl(row.storage_path);
        } catch (error) {
            console.warn("[studio] No se pudo firmar la imagen:", row.storage_path, error.message);
        }
    }

    return {
        id: row.id,
        prompt: row.prompt || "",
        model: row.model || null,
        aspectRatio: row.aspect_ratio || "auto",
        imageSize: row.image_size || "N/A",
        status: row.status,
        imageUrl,
        storagePath: row.storage_path || null,
        error: row.error || null,
        kieTaskId: row.kie_task_id || null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        createdBy: row.created_by || null,
        processingBy: row.processing_by || null,
        processingStartedAt: row.processing_started_at || null,
    };
}

function toDbPayload(task) {
    const payload = {};

    if (task.prompt !== undefined) payload.prompt = task.prompt || null;
    if (task.model !== undefined) payload.model = task.model || null;
    if (task.aspectRatio !== undefined) payload.aspect_ratio = task.aspectRatio || null;
    if (task.imageSize !== undefined) payload.image_size = task.imageSize || null;
    if (task.status !== undefined) payload.status = task.status;
    if (task.storagePath !== undefined) payload.storage_path = task.storagePath || null;
    if (task.error !== undefined) payload.error = task.error || null;
    if (task.kieTaskId !== undefined) payload.kie_task_id = task.kieTaskId || null;
    if (task.createdBy !== undefined) payload.created_by = task.createdBy || null;
    if (task.processingBy !== undefined) payload.processing_by = task.processingBy || null;
    if (task.processingStartedAt !== undefined) {
        payload.processing_started_at = task.processingStartedAt || null;
    }

    return payload;
}
