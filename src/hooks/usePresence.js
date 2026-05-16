import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

/**
 * Hook de presencia usando Supabase Realtime Presence.
 * Trackea quién está online en la sala especificada.
 *
 * @param {string} roomName - Nombre de la sala (ej: 'team-chat')
 * @param {{ id: string, full_name: string, avatar_url: string }} currentUser - Usuario actual
 * @returns {{ presenceMap: Map<string, object>, onlineCount: number }}
 */
const usePresence = (roomName, currentUser) => {
    const [presenceMap, setPresenceMap] = useState(new Map());
    const channelRef = useRef(null);

    useEffect(() => {
        if (!roomName || !currentUser?.id) return;

        const channel = supabase.channel(`presence:${roomName}`, {
            config: { presence: { key: currentUser.id } },
        });

        channelRef.current = channel;

        const syncPresence = () => {
            const state = channel.presenceState();
            const nextMap = new Map();
            Object.entries(state).forEach(([key, presences]) => {
                const latest = presences[presences.length - 1];
                if (latest) nextMap.set(key, latest);
            });
            setPresenceMap(nextMap);
        };

        channel
            .on('presence', { event: 'sync' }, syncPresence)
            .on('presence', { event: 'join' }, syncPresence)
            .on('presence', { event: 'leave' }, syncPresence)
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({
                        user_id: currentUser.id,
                        name: currentUser.full_name || currentUser.email || '',
                        avatar_url: currentUser.avatar_url || '',
                        online_at: new Date().toISOString(),
                    });
                }
            });

        return () => {
            channel.untrack().finally(() => {
                supabase.removeChannel(channel);
            });
            channelRef.current = null;
            setPresenceMap(new Map());
        };
    }, [roomName, currentUser?.id]);

    return {
        presenceMap,
        onlineCount: presenceMap.size,
        isOnline: (userId) => presenceMap.has(userId),
    };
};

export default usePresence;
