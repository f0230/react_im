/**
 * Hook para hacer polling del estado de posts en progreso
 */

import { useEffect, useRef, useCallback } from 'react';
import { checkPostStatus } from '@/services/blotatoService';

export function usePostStatusPolling(posts, onUpdate) {
  const pollingRef = useRef({});
  const onUpdateRef = useRef(onUpdate);

  // Mantener referencia actualizada del callback
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  const pollPost = useCallback(async (post) => {
    try {
      const result = await checkPostStatus(post.id);

      if (onUpdateRef.current) {
        onUpdateRef.current(post.id, result.post);
      }

      // Si es estado final, detener polling
      if (result.isFinal) {
        if (pollingRef.current[post.id]) {
          clearInterval(pollingRef.current[post.id]);
          delete pollingRef.current[post.id];
        }
      }
    } catch (err) {
      console.error('Polling error for post', post.id, err);
    }
  }, []);

  useEffect(() => {
    // Filtrar posts que necesitan polling
    const postsToPoll = posts.filter(p =>
      ['publishing', 'scheduled'].includes(p.status)
    );

    // Iniciar polling para cada post
    postsToPoll.forEach(post => {
      if (pollingRef.current[post.id]) return;

      // Poll inmediatamente y luego cada 5 segundos
      pollPost(post);
      pollingRef.current[post.id] = setInterval(() => pollPost(post), 5000);
    });

    // Limpiar polling de posts que ya no necesitan
    Object.keys(pollingRef.current).forEach(postId => {
      if (!postsToPoll.find(p => p.id === postId)) {
        clearInterval(pollingRef.current[postId]);
        delete pollingRef.current[postId];
      }
    });

    return () => {
      Object.values(pollingRef.current).forEach(clearInterval);
      pollingRef.current = {};
    };
  }, [posts, pollPost]);
}

