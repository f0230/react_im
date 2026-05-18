import { create } from 'zustand';

export type QueueJobStatus = 'running' | 'done' | 'error';

export interface QueueJob {
  id: string;
  modelNodeId: string;
  model: string;
  label: string;
  status: QueueJobStatus;
  startedAt: number;
  finishedAt?: number;
  error?: string;
}

interface QueueState {
  jobs: QueueJob[];
  addJob: (job: QueueJob) => void;
  updateJob: (id: string, patch: Partial<QueueJob>) => void;
  clearFinished: () => void;
}

/**
 * Global, lightweight queue of in-flight and recent generations. Model nodes
 * push jobs here so a single panel can show everything running at once.
 */
export const useGenerationQueue = create<QueueState>((set) => ({
  jobs: [],
  addJob: (job) => set((s) => ({ jobs: [...s.jobs, job] })),
  updateJob: (id, patch) =>
    set((s) => ({
      jobs: s.jobs.map((j) => (j.id === id ? { ...j, ...patch } : j)),
    })),
  clearFinished: () =>
    set((s) => ({ jobs: s.jobs.filter((j) => j.status === 'running') })),
}));
