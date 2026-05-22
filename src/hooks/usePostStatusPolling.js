/**
 * Hook para hacer polling del estado de posts en progreso.
 *
 * Solo hace polling de posts en estado `publishing` (activamente publicándose).
 * Posts `scheduled` no se pollan — están esperando su hora y no cambian de estado
 * hasta que Blotato los procesa. Se usa un intervalo único compartido para serializar
 * los requests y evitar saturar la API (429).
 */

import { useEffect, useRef, useCallback } from 'react';
import { checkPostStatus } from '@/services/blotatoService';

const POLL_INTERVAL_MS = 20_000; // 20s entre ciclos
const BACKOFF_AFTER_429_MS = 60_000; // 1 min de pausa tras rate limit

export function usePostStatusPolling(posts, onUpdate) {
  const onUpdateRef = useRef(onUpdate);
  const intervalRef = useRef(null);
  const queueRef = useRef([]);
  const backoffUntilRef = useRef(0);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  // Only publishing posts need active polling
  const getPostsToPoll = useCallback(() => {
    return posts.filter((p) => p.status === 'publishing');
  }, [posts]);

  const runPollCycle = useCallback(async () => {
    if (Date.now() < backoffUntilRef.current) return;

    const toPoll = getPostsToPoll();
    if (toPoll.length === 0) return;

    for (const post of toPoll) {
      if (Date.now() < backoffUntilRef.current) break;
      try {
        const result = await checkPostStatus(post.id);
        if (onUpdateRef.current) {
          onUpdateRef.current(post.id, result.post);
        }
      } catch (err) {
        if (err?.message?.includes('429') || String(err?.status) === '429') {
          backoffUntilRef.current = Date.now() + BACKOFF_AFTER_429_MS;
          console.warn('Blotato rate limited — pausing polling for 60s');
          break;
        }
        console.error('Polling error for post', post.id, err);
      }
    }
  }, [getPostsToPoll]);

  useEffect(() => {
    const toPoll = getPostsToPoll();

    if (toPoll.length === 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    if (!intervalRef.current) {
      // Small delay before first poll so initial render settles
      const t = setTimeout(() => runPollCycle(), 3000);
      intervalRef.current = setInterval(runPollCycle, POLL_INTERVAL_MS);
      return () => {
        clearTimeout(t);
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      };
    }
  }, [getPostsToPoll, runPollCycle]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);
}
