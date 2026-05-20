import { useCallback, useMemo } from 'react';

const STORAGE_PREFIX = 'dte_post_draft_v1';
const DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getKey(projectId) {
  return `${STORAGE_PREFIX}_${projectId || 'global'}`;
}

/**
 * Persist text-only draft state for the create-post modal.
 * Files are NOT persisted — they live as File objects + blob URLs in memory only.
 *
 * Shape stored:
 *   { content, scheduledDate, scheduledTime, collaborators, savedAt }
 */
export function useMediaDraft(projectId) {
  const key = useMemo(() => getKey(projectId), [projectId]);

  const saveDraft = useCallback((state) => {
    if (typeof window === 'undefined' || !state) return;

    const hasContent = !!(
      state.content?.trim() ||
      state.scheduledDate ||
      state.scheduledTime ||
      (state.collaborators?.length > 0)
    );
    if (!hasContent) return;

    try {
      window.localStorage.setItem(
        key,
        JSON.stringify({
          content: state.content || '',
          scheduledDate: state.scheduledDate || '',
          scheduledTime: state.scheduledTime || '',
          collaborators: Array.isArray(state.collaborators) ? state.collaborators : [],
          savedAt: Date.now(),
        })
      );
    } catch {
      // localStorage quota exceeded or unavailable — silently noop
    }
  }, [key]);

  const loadDraft = useCallback(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;

      if (parsed.savedAt && Date.now() - parsed.savedAt > DRAFT_MAX_AGE_MS) {
        window.localStorage.removeItem(key);
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }, [key]);

  const clearDraft = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(key);
    } catch {
      // noop
    }
  }, [key]);

  return { saveDraft, loadDraft, clearDraft };
}
