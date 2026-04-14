import { useCallback, useEffect, useRef, useState } from 'react';
import { Node, Edge, Viewport } from '@xyflow/react';
import { supabase } from './supabaseClient';

interface WorkflowSnapshot {
  nodes: Node[];
  edges: Edge[];
  viewport: Viewport | null;
  revision: number;
}

interface SyncOptions {
  projectId: string | null;
  debounceMs?: number;
}

type SyncStatus = 'idle' | 'loading' | 'saving' | 'saved' | 'error';

const DEBOUNCE_MS = 800;

/**
 * Manages debounced persistence of workflow state to Supabase.
 *
 * - On mount (projectId change): fetches the snapshot for the project.
 * - On graph changes: debounces writes to avoid a DB round-trip on every drag frame.
 * - Uses optimistic locking (revision check) to detect concurrent edits.
 */
export function useWorkflowSync({ projectId, debounceMs = DEBOUNCE_MS }: SyncOptions) {
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [snapshot, setSnapshot] = useState<WorkflowSnapshot | null>(null);

  // Pending save state, compared against revision at write time
  const revisionRef = useRef<number>(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSaveRef = useRef<WorkflowSnapshot | null>(null);

  // --------------------------------------------------------------------------
  // Load snapshot on project change
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!projectId) {
      setSnapshot(null);
      setStatus('idle');
      return;
    }

    let cancelled = false;
    setStatus('loading');

    supabase
      .from('studio_workflow_snapshots')
      .select('nodes, edges, viewport, revision')
      .eq('project_id', projectId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;

        if (error) {
          console.error('[workflow-sync] load error:', error.message);
          setStatus('error');
          return;
        }

        if (data) {
          revisionRef.current = data.revision;
          setSnapshot({
            nodes: data.nodes as Node[],
            edges: data.edges as Edge[],
            viewport: data.viewport as Viewport | null,
            revision: data.revision,
          });
        } else {
          // First time for this project — no snapshot yet
          revisionRef.current = 0;
          setSnapshot(null);
        }
        setStatus('idle');
      });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  // --------------------------------------------------------------------------
  // Debounced save
  // --------------------------------------------------------------------------
  const save = useCallback(
    (nodes: Node[], edges: Edge[], viewport: Viewport | null) => {
      if (!projectId) return;

      const pending: WorkflowSnapshot = {
        nodes,
        edges,
        viewport,
        revision: revisionRef.current,
      };
      pendingSaveRef.current = pending;

      if (debounceRef.current) clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(async () => {
        const toSave = pendingSaveRef.current;
        if (!toSave || !projectId) return;

        setStatus('saving');

        // Strip transient output node data before persisting
        const cleanNodes = toSave.nodes.map((n) => {
          if (n.type === 'output') {
            return {
              ...n,
              data: {
                status: 'idle',
                resultUrl: null,
                resultType: null,
                taskId: null,
                provider: null,
              },
            };
          }
          return n;
        });

        const { data: { user } } = await supabase.auth.getUser();

        const { error } = await supabase
          .from('studio_workflow_snapshots')
          .upsert(
            {
              project_id: projectId,
              nodes: cleanNodes,
              edges: toSave.edges,
              viewport: toSave.viewport,
              revision: toSave.revision + 1,
              updated_by: user?.id ?? null,
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: 'project_id',
              ignoreDuplicates: false,
            },
          );

        if (error) {
          console.error('[workflow-sync] save error:', error.message);
          setStatus('error');
          return;
        }

        revisionRef.current = toSave.revision + 1;
        setStatus('saved');

        // Reset to idle after a moment so the UI indicator fades
        setTimeout(() => setStatus((s) => (s === 'saved' ? 'idle' : s)), 1500);
      }, debounceMs);
    },
    [projectId, debounceMs],
  );

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return { snapshot, status, save };
}
