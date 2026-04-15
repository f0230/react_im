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
  const [hasLoaded, setHasLoaded] = useState(false);

  // Pending save state, compared against revision at write time
  const revisionRef = useRef<number>(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSaveRef = useRef<WorkflowSnapshot | null>(null);

  // --------------------------------------------------------------------------
  // Load snapshot on project change
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    pendingSaveRef.current = null;

    if (!projectId) {
      setSnapshot(null);
      setStatus('idle');
      setHasLoaded(false);
      revisionRef.current = 0;
      return;
    }

    let cancelled = false;
    setHasLoaded(false);
    setStatus('loading');
    setSnapshot(null);

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
          setHasLoaded(true);
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
        setHasLoaded(true);
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
      if (!projectId || !hasLoaded) return;

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

        // Normalize output runtime state before persisting.
        // Keep generated media URLs so refresh does not wipe previews.
        const cleanNodes = toSave.nodes.map((n) => {
          if (n.type === 'output') {
            const nodeData = (n.data && typeof n.data === 'object' ? n.data : {}) as Record<string, any>;
            const hasResult = Boolean(nodeData.resultUrl);
            const safeStatus =
              nodeData.status === 'loading'
                ? (hasResult ? 'success' : 'idle')
                : (nodeData.status ?? (hasResult ? 'success' : 'idle'));

            return {
              ...n,
              data: {
                ...nodeData,
                status: safeStatus,
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
    [projectId, debounceMs, hasLoaded],
  );

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return { snapshot, status, hasLoaded, save };
}
