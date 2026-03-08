import React, { useState, useEffect, useCallback } from 'react';
import {
    History,
    Users,
    Settings,
    Bell,
    Search,
    LayoutGrid,
    Key
} from 'lucide-react';
import ControlPanel from '@/components/studio/ControlPanel';
import ImageGrid from '@/components/studio/ImageGrid';
import ImageViewer from '@/components/studio/ImageViewer';
import { generateImage, checkApiKey, requestApiKey } from '@/services/imageService';
import confetti from 'canvas-confetti';

export default function Studio() {
    const [tasks, setTasks] = useState(() => {
        const saved = localStorage.getItem('banana-tasks');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Cleanup: remove tasks older than 3 days
                const threeDaysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000);
                return parsed.filter((t) => t.createdAt > threeDaysAgo);
            } catch (e) {
                return [];
            }
        }
        return [];
    });
    const [selectedTask, setSelectedTask] = useState(null);
    const [referenceImage, setReferenceImage] = useState(null);
    const [hasApiKey, setHasApiKey] = useState(true);
    const [isCheckingApiKey, setIsCheckingApiKey] = useState(true);

    useEffect(() => {
        const init = async () => {
            const ok = await checkApiKey();
            setHasApiKey(ok);
            setIsCheckingApiKey(false);

            // Resume polling for any tasks that were left in 'generating' state
            const generatingTasks = tasks.filter(t => t.status === 'generating');
            generatingTasks.forEach(task => {
                resumeTaskPolling(task);
            });
        };
        init();
    }, []);

    const resumeTaskPolling = async (task) => {
        try {
            const { imageUrl, taskId: kieId } = await generateImage(task);
            setTasks(prev => prev.map(t =>
                t.id === task.id ? { ...t, status: 'completed', imageUrl, id: kieId || t.id } : t
            ));
        } catch (error) {
            setTasks(prev => prev.map(t =>
                t.id === task.id ? { ...t, status: 'failed', error: error.message } : t
            ));
        }
    };

    // Save tasks to localStorage
    useEffect(() => {
        localStorage.setItem('banana-tasks', JSON.stringify(tasks));
    }, [tasks]);

    const handleGenerate = useCallback(async (prompt, config) => {
        const taskId = Math.random().toString(36).substring(7);
        const newTask = {
            id: taskId,
            prompt,
            model: config.model,
            aspectRatio: config.aspectRatio,
            imageSize: config.imageSize,
            status: 'generating',
            createdAt: Date.now(),
            referenceImage: config.referenceImage
        };

        setTasks(prev => [newTask, ...prev]);

        try {
            const { imageUrl, taskId: kieId } = await generateImage(newTask);
            setTasks(prev => {
                const updated = prev.map(t =>
                    t.id === taskId ? { ...t, status: 'completed', imageUrl, id: kieId || t.id } : t
                );
                // Auto-select if it's the one we just generated
                const finishedTask = updated.find(t => t.id === (kieId || taskId));
                if (finishedTask) setSelectedTask(finishedTask);
                return updated;
            });

            // Success effect
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#e3ff31', '#ffffff']
            });
        } catch (error) {
            console.error('Generation failed:', error);

            // Handle API key error
            if (error.message?.includes('Requested entity was not found')) {
                setHasApiKey(false);
            }

            setTasks(prev => prev.map(t =>
                t.id === taskId ? { ...t, status: 'failed', error: error.message || 'Unknown error' } : t
            ));
        }
    }, []);

    const handleDismissTask = useCallback((taskId) => {
        setTasks(prev => prev.filter(t => t.id !== taskId));
    }, []);

    const handleRequestKey = async () => {
        await requestApiKey();
        setHasApiKey(true);
    };

    if (isCheckingApiKey) {
        return (
            <div className="flex h-[calc(100dvh-45px)] items-center justify-center bg-[#0a0a0a] text-white">
                <div className="animate-pulse text-banana font-mono">INICIALIZANDO STUDIO...</div>
            </div>
        );
    }

    return (
        <div className="relative flex h-[calc(100dvh-45px)] min-h-[calc(100dvh-45px)] flex-col overflow-hidden bg-[#0a0a0a] text-white">
            {/* Main Content */}
            <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                {!hasApiKey && (
                    <div className="m-8 p-8 glass-panel border-banana/20 flex flex-col items-center text-center max-w-2xl mx-auto">
                        <div className="w-16 h-16 rounded-full bg-banana/10 flex items-center justify-center mb-6">
                            <Key className="text-banana" size={32} />
                        </div>
                        <h2 className="text-2xl font-bold mb-2 text-white">Acceso Pro Requerido</h2>
                        <p className="text-white/60 mb-8 leading-relaxed">
                            Para usar los modelos Nano Banana Pro y generación de alta resolución, necesitas configurar e ingresar tu API Key.
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
                    onUseAsReference={setReferenceImage}
                    onDismiss={handleDismissTask}
                />
            </main>

            {/* Controls */}
            <ControlPanel
                onGenerate={handleGenerate}
                isGenerating={tasks.some(t => t.status === 'generating')}
                referenceImage={referenceImage}
                setReferenceImage={setReferenceImage}
            />

            {/* Overlays */}
            <ImageViewer
                task={selectedTask}
                tasks={tasks}
                onClose={() => setSelectedTask(null)}
                onSelect={setSelectedTask}
                onUseAsReference={setReferenceImage}
            />
        </div>
    );
}
