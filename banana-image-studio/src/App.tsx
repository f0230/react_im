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
import ControlPanel from './components/ControlPanel';
import ImageGrid from './components/ImageGrid';
import ImageViewer from './components/ImageViewer';
import { GenerationTask, ModelType, AspectRatio, ImageSize } from './types';
import { generateImage, checkApiKey, requestApiKey } from './services/imageService';
import confetti from 'canvas-confetti';

export default function App() {
  const [tasks, setTasks] = useState<GenerationTask[]>(() => {
    const saved = localStorage.getItem('banana-tasks');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Cleanup: remove tasks older than 3 days
        const threeDaysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000);
        return parsed.filter((t: GenerationTask) => t.createdAt > threeDaysAgo);
      } catch (e) {
        return [];
      }
    }
    return [];
  });
  const [selectedTask, setSelectedTask] = useState<GenerationTask | null>(null);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
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

  const resumeTaskPolling = async (task: GenerationTask) => {
    try {
      const { imageUrl, taskId: kieId } = await generateImage(task);
      setTasks(prev => prev.map(t =>
        t.id === task.id ? { ...t, status: 'completed', imageUrl, id: kieId || t.id } : t
      ));
    } catch (error: any) {
      setTasks(prev => prev.map(t =>
        t.id === task.id ? { ...t, status: 'failed', error: error.message } : t
      ));
    }
  };

  // Save tasks to localStorage
  useEffect(() => {
    localStorage.setItem('banana-tasks', JSON.stringify(tasks));
  }, [tasks]);

  const handleGenerate = useCallback(async (prompt: string, config: {
    model: ModelType;
    aspectRatio: AspectRatio;
    imageSize: ImageSize;
    referenceImage?: string;
  }) => {
    const taskId = Math.random().toString(36).substring(7);
    const newTask: GenerationTask = {
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
    } catch (error: any) {
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

  const handleRequestKey = async () => {
    await requestApiKey();
    setHasApiKey(true);
  };

  if (isCheckingApiKey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="animate-pulse text-banana font-mono">INITIALIZING STUDIO...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-[#0a0a0a]/50 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-banana flex items-center justify-center">
              <span className="text-black font-black text-xl">B</span>
            </div>
            <span className="font-bold tracking-tight text-lg">BANANA STUDIO</span>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 text-white/80 font-medium">
              <History size={18} />
              History
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors font-medium">
              <Users size={18} />
              Community
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={16} />
            <input
              type="text"
              placeholder="Search your gallery..."
              className="bg-white/5 border-none rounded-full pl-10 pr-4 py-2 text-sm focus:ring-1 focus:ring-banana/50 w-64"
            />
          </div>

          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors">
              <Bell size={20} />
            </button>
            <button className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors">
              <Settings size={20} />
            </button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-banana to-emerald-400 border border-white/10" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {!hasApiKey && (
          <div className="m-8 p-8 glass-panel border-banana/20 flex flex-col items-center text-center max-w-2xl mx-auto">
            <div className="w-16 h-16 rounded-full bg-banana/10 flex items-center justify-center mb-6">
              <Key className="text-banana" size={32} />
            </div>
            <h2 className="text-2xl font-bold mb-2">Pro Access Required</h2>
            <p className="text-white/60 mb-8 leading-relaxed">
              To use Nano Banana Pro models and high-resolution generation, you need to select a paid API key from your Google Cloud project.
            </p>
            <button
              onClick={handleRequestKey}
              className="banana-button px-8 py-4 text-lg"
            >
              Select API Key
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
