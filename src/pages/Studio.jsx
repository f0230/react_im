import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Key, LayoutGrid } from 'lucide-react';
import confetti from 'canvas-confetti';
import ControlPanel from '@/components/studio/ControlPanel';
import ImageGrid from '@/components/studio/ImageGrid';
import ImageViewer from '@/components/studio/ImageViewer';
import {
    checkApiKey,
    requestApiKey,
    resumeImageGeneration,
    startImageGeneration,
} from '@/services/imageService';
import {
    claimStudioTask,
    createStudioTask,
    deleteStudioTask,
    listStudioTasks,
    updateStudioTask,
} from '@/services/studioService';
import { useAuth } from '@/context/AuthContext';
import { MAX_REFERENCE_IMAGES } from '@/utils/studioTypes';

export default function Studio() {
    const { user } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [selectedTask, setSelectedTask] = useState(null);
    const [referenceImages, setReferenceImages] = useState([]);
    const [hasApiKey, setHasApiKey] = useState(true);
    const [isCheckingApiKey, setIsCheckingApiKey] = useState(true);
    const [isLoadingTasks, setIsLoadingTasks] = useState(true);
    const [batchState, setBatchState] = useState({ queued: 0, active: 0 });
    const activeTaskIdsRef = useRef(new Set());
    const promptQueueRef = useRef([]);
    const isProcessingQueueRef = useRef(false);

    const syncBatchState = useCallback(() => {
        setBatchState({
            queued: promptQueueRef.current.length,
            active: isProcessingQueueRef.current ? 1 : 0,
        });
    }, []);

    const syncSelectedTask = useCallback((nextTasks) => {
        setSelectedTask((current) => {
            if (!current) return null;
            return nextTasks.find((task) => task.id === current.id) || null;
        });
    }, []);

    const replaceTasks = useCallback((nextTasks) => {
        setTasks(nextTasks);
        syncSelectedTask(nextTasks);
    }, [syncSelectedTask]);

    const upsertTask = useCallback((nextTask) => {
        setTasks((current) => {
            const exists = current.some((task) => task.id === nextTask.id);
            const nextTasks = exists
                ? current.map((task) => (task.id === nextTask.id ? nextTask : task))
                : [nextTask, ...current];

            syncSelectedTask(nextTasks);
            return nextTasks;
        });
    }, [syncSelectedTask]);

    const removeTask = useCallback((taskId) => {
        setTasks((current) => {
            const nextTasks = current.filter((task) => task.id !== taskId);
            syncSelectedTask(nextTasks);
            return nextTasks;
        });
    }, [syncSelectedTask]);

    const resumeTaskPolling = useCallback(async (task) => {
        if (!task?.id || !task.kieTaskId) return;
        if (activeTaskIdsRef.current.has(task.id)) return;

        activeTaskIdsRef.current.add(task.id);

        try {
            const claimed = await claimStudioTask(task.id);
            if (!claimed) return;

            upsertTask({
                ...task,
                processingBy: user?.id || null,
                processingStartedAt: new Date().toISOString(),
            });

            const storagePath = await resumeImageGeneration({ kieTaskId: task.kieTaskId });
            const completedTask = await updateStudioTask(task.id, {
                status: 'completed',
                storagePath,
                error: null,
                processingBy: null,
                processingStartedAt: null,
            });

            upsertTask(completedTask);
        } catch (error) {
            console.error('[studio] Error reanudando tarea:', error);

            try {
                const failedTask = await updateStudioTask(task.id, {
                    status: 'failed',
                    error: error.message || 'Unknown error',
                    processingBy: null,
                    processingStartedAt: null,
                });
                upsertTask(failedTask);
            } catch (updateError) {
                console.error('[studio] No se pudo marcar la tarea como fallida:', updateError);
            }
        } finally {
            activeTaskIdsRef.current.delete(task.id);
        }
    }, [upsertTask, user?.id]);

    const processPrompt = useCallback(async (prompt, config) => {
        if (!user?.id) return null;

        const processingStartedAt = new Date().toISOString();
        let createdTask = null;
        let kieTaskId = null;

        try {
            createdTask = await createStudioTask({
                prompt,
                model: config.model,
                aspectRatio: config.aspectRatio,
                imageSize: config.imageSize,
                status: 'generating',
                createdBy: user.id,
                processingBy: user.id,
                processingStartedAt,
            });

            activeTaskIdsRef.current.add(createdTask.id);
            upsertTask(createdTask);

            kieTaskId = await startImageGeneration({
                prompt,
                model: config.model,
                aspectRatio: config.aspectRatio,
                imageSize: config.imageSize,
                referenceImages: config.referenceImages,
            });

            const queuedTask = await updateStudioTask(createdTask.id, { kieTaskId });
            upsertTask(queuedTask);

            const storagePath = await resumeImageGeneration({ kieTaskId });
            const completedTask = await updateStudioTask(createdTask.id, {
                status: 'completed',
                storagePath,
                error: null,
                kieTaskId,
                processingBy: null,
                processingStartedAt: null,
            });

            upsertTask(completedTask);
            setSelectedTask(completedTask);

            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#e3ff31', '#ffffff'],
            });

            return completedTask;
        } catch (error) {
            console.error('[studio] Generation failed:', error);

            if (error.message?.includes('Requested entity was not found')) {
                setHasApiKey(false);
            }

            if (createdTask?.id) {
                try {
                    const failedTask = await updateStudioTask(createdTask.id, {
                        status: 'failed',
                        error: error.message || 'Unknown error',
                        kieTaskId,
                        processingBy: null,
                        processingStartedAt: null,
                    });
                    upsertTask(failedTask);
                } catch (updateError) {
                    console.error('[studio] No se pudo guardar el error en Supabase:', updateError);
                }
            }

            return null;
        } finally {
            if (createdTask?.id) {
                activeTaskIdsRef.current.delete(createdTask.id);
            }
        }
    }, [upsertTask, user?.id]);

    const processQueuedPrompts = useCallback(async () => {
        if (!user?.id) return;
        if (isProcessingQueueRef.current) return;
        if (!promptQueueRef.current.length) {
            syncBatchState();
            return;
        }

        isProcessingQueueRef.current = true;
        syncBatchState();

        try {
            while (promptQueueRef.current.length > 0) {
                const nextItem = promptQueueRef.current.shift();
                syncBatchState();

                if (!nextItem) continue;
                await processPrompt(nextItem.prompt, nextItem.config);
            }
        } finally {
            isProcessingQueueRef.current = false;
            syncBatchState();
        }
    }, [processPrompt, syncBatchState, user?.id]);

    const loadTasks = useCallback(async ({ silent = false, resumePending = false } = {}) => {
        if (!user?.id) return;

        if (!silent) setIsLoadingTasks(true);

        try {
            const nextTasks = await listStudioTasks();
            replaceTasks(nextTasks);

            if (resumePending) {
                nextTasks
                    .filter((task) => task.status === 'generating' && task.kieTaskId)
                    .forEach((task) => {
                        if (activeTaskIdsRef.current.has(task.id)) return;
                        void resumeTaskPolling(task);
                    });
            }
        } catch (error) {
            console.error('[studio] Error cargando historial:', error);
        } finally {
            if (!silent) setIsLoadingTasks(false);
        }
    }, [replaceTasks, resumeTaskPolling, user?.id]);

    useEffect(() => {
        let mounted = true;

        const init = async () => {
            if (!user?.id) return;

            try {
                const ok = await checkApiKey();
                if (!mounted) return;

                setHasApiKey(ok);
                setIsCheckingApiKey(false);

                await loadTasks({ resumePending: ok });
            } catch (error) {
                console.error('[studio] Error inicializando:', error);
                if (mounted) {
                    setHasApiKey(false);
                    setIsCheckingApiKey(false);
                    setIsLoadingTasks(false);
                }
            }
        };

        void init();

        return () => {
            mounted = false;
        };
    }, [loadTasks, user?.id]);

    useEffect(() => {
        if (!user?.id) return undefined;

        const intervalId = window.setInterval(() => {
            void loadTasks({ silent: true, resumePending: hasApiKey });
        }, 15000);

        return () => window.clearInterval(intervalId);
    }, [hasApiKey, loadTasks, user?.id]);

    const handleGenerate = useCallback((promptInput, config) => {
        if (!user?.id) return;

        const prompts = parsePromptBatch(promptInput);
        if (!prompts.length) return;

        promptQueueRef.current.push(
            ...prompts.map((prompt) => ({
                prompt,
                config: {
                    ...config,
                    referenceImages: Array.isArray(config.referenceImages)
                        ? [...config.referenceImages]
                        : [],
                },
            }))
        );
        syncBatchState();
        void processQueuedPrompts();
    }, [processQueuedPrompts, syncBatchState, user?.id]);

    const handleAddReferenceImages = useCallback((nextImages) => {
        setReferenceImages((current) => mergeReferenceImages(current, nextImages));
    }, []);

    const handleRemoveReferenceImage = useCallback((indexToRemove) => {
        setReferenceImages((current) => current.filter((_, index) => index !== indexToRemove));
    }, []);

    const handleClearReferenceImages = useCallback(() => {
        setReferenceImages([]);
    }, []);

    const handleDismissTask = useCallback(async (taskId) => {
        const task = tasks.find((item) => item.id === taskId);
        if (!task) return;

        try {
            await deleteStudioTask(task);
            removeTask(taskId);
        } catch (error) {
            console.error('[studio] No se pudo eliminar la tarea:', error);
        }
    }, [removeTask, tasks]);

    const handleRequestKey = useCallback(async () => {
        await requestApiKey();
        const ok = await checkApiKey();
        setHasApiKey(ok);

        if (ok) {
            await loadTasks({ silent: true, resumePending: true });
        }
    }, [loadTasks]);

    const isGenerating = batchState.active > 0 || tasks.some((task) => (
        task.status === 'generating' && task.processingBy === user?.id
    ));

    if (isCheckingApiKey || isLoadingTasks) {
        return (
            <div className="flex h-[calc(100dvh-45px)] items-center justify-center bg-[#0a0a0a] text-white">
                <div className="animate-pulse text-banana font-mono">INICIALIZANDO STUDIO...</div>
            </div>
        );
    }

    return (
        <div className="relative flex h-[calc(100dvh-45px)] min-h-[calc(100dvh-45px)] flex-col overflow-hidden bg-[#0a0a0a] text-white">
            <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                {!hasApiKey && (
                    <div className="m-8 max-w-2xl mx-auto p-8 glass-panel border-banana/20 flex flex-col items-center text-center">
                        <div className="w-16 h-16 rounded-full bg-banana/10 flex items-center justify-center mb-6">
                            <Key className="text-banana" size={32} />
                        </div>
                        <h2 className="text-2xl font-bold mb-2 text-white">Acceso Pro Requerido</h2>
                        <p className="text-white/60 mb-8 leading-relaxed">
                            Puedes ver el historial compartido, pero para generar o reanudar imágenes necesitas configurar una API Key válida.
                        </p>
                        <button
                            onClick={handleRequestKey}
                            className="banana-button px-8 py-4 text-lg"
                        >
                            Seleccionar API Key
                        </button>
                        <a
                            href="https://ai.google.dev/gemini-api/docs/billing"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-4 text-xs text-white/20 hover:text-white transition-colors flex items-center gap-1"
                        >
                            Learn about billing <LayoutGrid size={10} />
                        </a>
                    </div>
                )}

                <ImageGrid
                    tasks={tasks}
                    onSelect={setSelectedTask}
                    onUseAsReference={handleAddReferenceImages}
                    onDismiss={handleDismissTask}
                />
            </main>

            <ControlPanel
                onGenerate={handleGenerate}
                isGenerating={isGenerating}
                referenceImages={referenceImages}
                onAddReferenceImages={handleAddReferenceImages}
                onRemoveReferenceImage={handleRemoveReferenceImage}
                onClearReferenceImages={handleClearReferenceImages}
                maxReferenceImages={MAX_REFERENCE_IMAGES}
                canGenerate={hasApiKey}
                onRequestKey={handleRequestKey}
                batchState={batchState}
            />

            <ImageViewer
                task={selectedTask}
                tasks={tasks}
                onClose={() => setSelectedTask(null)}
                onSelect={setSelectedTask}
                onUseAsReference={handleAddReferenceImages}
            />
        </div>
    );
}

function parsePromptBatch(promptInput) {
    return String(promptInput || '')
        .split(/\r?\n/)
        .map((prompt) => prompt.trim())
        .filter(Boolean);
}

function mergeReferenceImages(currentImages, nextImages) {
    const current = Array.isArray(currentImages) ? currentImages : [];
    const incoming = Array.isArray(nextImages)
        ? nextImages
        : nextImages
            ? [nextImages]
            : [];

    const merged = [...current];

    for (const image of incoming) {
        if (!image || merged.includes(image)) continue;
        if (merged.length >= MAX_REFERENCE_IMAGES) break;
        merged.push(image);
    }

    return merged;
}
