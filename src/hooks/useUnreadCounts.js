import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';

const EMPTY_COUNTS = {
    unreadTeam: 0,
    unreadWhatsapp: 0,
    unreadNotifications: 0,
};

export const useUnreadCounts = () => {
    const { user, profile } = useAuth();
    const [counts, setCounts] = useState(EMPTY_COUNTS);
    const [previews, setPreviews] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const refreshTimeout = useRef(null);

    const canUse = Boolean(user?.id && profile && (profile.role === 'admin' || profile.role === 'worker'));

    const refreshCounts = useCallback(async () => {
        if (!canUse) return;
        const { data, error } = await supabase.rpc('get_unread_counts_v1');
        if (!error && Array.isArray(data) && data[0]) {
            setCounts({
                unreadTeam: Number(data[0].unread_team || 0),
                unreadWhatsapp: Number(data[0].unread_whatsapp || 0),
                unreadNotifications: Number(data[0].unread_notifications || 0),
            });
        }
    }, [canUse]);

    const refreshPreviews = useCallback(async () => {
        if (!canUse) return;
        const { data, error } = await supabase.rpc('get_unread_previews_v1', {
            limit_per_source: 6,
        });
        if (!error && Array.isArray(data)) {
            setPreviews(data);
        }
    }, [canUse]);

    const refreshNotifications = useCallback(async () => {
        if (!canUse || !user?.id) return;
        const { data, error } = await supabase
            .from('notifications')
            .select('id, title, body, type, created_at, read_at, data')
            .eq('recipient_id', user.id)
            .order('created_at', { ascending: false })
            .limit(20);
        if (!error && Array.isArray(data)) {
            setNotifications(data);
        }
    }, [canUse, user?.id]);

    const refreshAll = useCallback(async () => {
        if (!canUse) return;
        setLoading(true);
        await Promise.all([refreshCounts(), refreshPreviews(), refreshNotifications()]);
        setLoading(false);
    }, [canUse, refreshCounts, refreshNotifications, refreshPreviews]);

    const scheduleRefresh = useCallback(() => {
        if (refreshTimeout.current) return;
        refreshTimeout.current = setTimeout(() => {
            refreshTimeout.current = null;
            refreshAll();
        }, 350);
    }, [refreshAll]);

    const markAllNotificationsRead = useCallback(async () => {
        if (!user?.id) return;
        await supabase
            .from('notifications')
            .update({ read_at: new Date().toISOString() })
            .eq('recipient_id', user.id)
            .is('read_at', null);
        await refreshAll();
    }, [refreshAll, user?.id]);

    useEffect(() => {
        if (!canUse) {
            setCounts(EMPTY_COUNTS);
            setPreviews([]);
            setNotifications([]);
            setLoading(false);
            return;
        }

        refreshAll();

        const teamChannel = supabase
            .channel('unread-team-messages')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'team_messages' }, scheduleRefresh)
            .subscribe();

        const whatsappChannel = supabase
            .channel('unread-whatsapp-messages')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'whatsapp_messages' }, scheduleRefresh)
            .subscribe();

        const notificationsChannel = supabase
            .channel('unread-notifications')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, scheduleRefresh)
            .subscribe();

        const teamReadsChannel = supabase
            .channel('unread-team-reads')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'team_channel_reads' }, scheduleRefresh)
            .subscribe();

        const whatsappReadsChannel = supabase
            .channel('unread-whatsapp-reads')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_thread_reads' }, scheduleRefresh)
            .subscribe();

        return () => {
            supabase.removeChannel(teamChannel);
            supabase.removeChannel(whatsappChannel);
            supabase.removeChannel(notificationsChannel);
            supabase.removeChannel(teamReadsChannel);
            supabase.removeChannel(whatsappReadsChannel);
            if (refreshTimeout.current) {
                clearTimeout(refreshTimeout.current);
                refreshTimeout.current = null;
            }
        };
    }, [canUse, refreshAll, scheduleRefresh]);

    const messageUnreadTotal = counts.unreadTeam + counts.unreadWhatsapp;

    const teamPreviews = useMemo(
        () => previews.filter((item) => item.source === 'team'),
        [previews]
    );

    const whatsappPreviews = useMemo(
        () => previews.filter((item) => item.source === 'whatsapp'),
        [previews]
    );

    return {
        loading,
        counts,
        previews,
        notifications,
        teamPreviews,
        whatsappPreviews,
        messageUnreadTotal,
        refreshAll,
        markAllNotificationsRead,
    };
};
