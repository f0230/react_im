import { useCallback, useEffect, useRef, useState } from 'react';
import { Node, Edge, Viewport } from '@xyflow/react';
import { supabase } from './supabaseClient';
import { hydrateNodeMediaUrls } from './mediaStorage';

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

// Longer debounce keeps a drag (which fires dozens of change events) down to
// a single DB write once the user settles.
const DEBOUNCE_MS = 2500;

/**
 * Builds a stable signature of the meaningful workflow state. Transient
 * React Flow fields (selection, drag flags, measured size) are excluded so a
 * pure selection or hover change does not trigger a redundant DB write.
 */
function workflowSignature(
  nodes: Node[],
  edges: Edge[],
  viewport: Viewport | null,
): string {
  const nodeSig = nodes.map((n) => ({
    id: n.id,
    type: n.type,
    position: n.position,
    data: n.data,
  }));
  const edgeSig = edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle,
    targetHandle: e.targetHandle,
    data: e.data,
  }));
  return JSON.stringify({ nodeSig, edgeSig, viewport });
}

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
  // Signature of the last state we persisted — skips redundant writes.
  const lastSavedSigRef = useRef<string | null>(null);

  // --------------------------------------------------------------------------
  // Load snapshot on project change
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    pendingSaveRef.current = null;
    lastSavedSigRef.current = null;

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
      .then(async ({ data, error }) => {
        if (cancelled) return;

        if (error) {
          console.error('[workflow-sync] load error:', error.message);
          setStatus('error');
          setHasLoaded(true);
          return;
        }

        if (data) {
          const hydratedNodes = await hydrateNodeMediaUrls(data.nodes as Node[]);
          if (cancelled) return;

          revisionRef.current = data.revision;
          setSnapshot({
            nodes: hydratedNodes,
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
  // performSave does the actual DB write. Kept in a ref so the unmount cleanup
  // can flush a pending save without re-running the effect on every change.
  const performSaveRef = useRef<(toSave: WorkflowSnapshot) => Promise<void>>();
  performSaveRef.current = async (toSave: WorkflowSnapshot) => {
    if (!projectId) return;

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
  };

  const save = useCallback(
    (nodes: Node[], edges: Edge[], viewport: Viewport | null) => {
      if (!projectId || !hasLoaded) return;

      // Skip writes when nothing meaningful changed (e.g. selecting a node).
      const signature = workflowSignature(nodes, edges, viewport);
      if (signature === lastSavedSigRef.current) return;
      lastSavedSigRef.current = signature;

      const pending: WorkflowSnapshot = {
        nodes,
        edges,
        viewport,
        revision: revisionRef.current,
      };
      pendingSaveRef.current = pending;

      if (debounceRef.current) clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(() => {
        const toSave = pendingSaveRef.current;
        pendingSaveRef.current = null;
        if (toSave) void performSaveRef.current?.(toSave);
      }, debounceMs);
    },
    [projectId, debounceMs, hasLoaded],
  );

  // Flush any pending save on unmount so in-flight changes are not lost.
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      const toSave = pendingSaveRef.current;
      pendingSaveRef.current = null;
      if (toSave) void performSaveRef.current?.(toSave);
    };
  }, []);

  return { snapshot, status, hasLoaded, save };
}
