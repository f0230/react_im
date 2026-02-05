import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';

const EMPTY_COUNTS = {
    unreadTeam: 0,
    unreadWhatsapp: 0,
    unreadClients: 0,
    unreadNotifications: 0,
};

export const useUnreadCounts = () => {
    const { user, profile } = useAuth();
    const [counts, setCounts] = useState(EMPTY_COUNTS);
    const [previews, setPreviews] = useState([]);
    const [clientPreviews, setClientPreviews] = useState([]);
    const [hasClientMessagingTable, setHasClientMessagingTable] = useState(true);
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
                unreadClients: Number(data[0].unread_clients || 0),
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

    const refreshClientPreviews = useCallback(async () => {
        if (!canUse || !hasClientMessagingTable) return;
        const { data, error } = await supabase
            .from('client_messages')
            .select('client_id, body, created_at, sender_role, client:clients(full_name, company_name, email, phone)')
            .order('created_at', { ascending: false })
            .limit(40);

        if (error || !Array.isArray(data)) {
            if (error?.code === '42P01' || /does not exist/i.test(error?.message || '')) {
                setHasClientMessagingTable(false);
            }
            setClientPreviews([]);
            return;
        }

        const latestByClient = new Map();
        data.forEach((row) => {
            if (!row?.client_id || latestByClient.has(row.client_id)) return;
            const clientRecord = Array.isArray(row?.client) ? row.client[0] : row?.client;
            const clientName = clientRecord?.full_name || clientRecord?.company_name || clientRecord?.email || clientRecord?.phone || 'Cliente';
            latestByClient.set(row.client_id, {
                source: 'clients',
                title: clientName,
                preview: row.body || '',
                event_at: row.created_at,
                unread_count: 0,
                client_id: row.client_id,
                author: row.sender_role === 'client' ? clientName : 'Equipo DTE',
            });
        });

        setClientPreviews(Array.from(latestByClient.values()).slice(0, 6));
    }, [canUse, hasClientMessagingTable]);

    const refreshAll = useCallback(async () => {
        if (!canUse) return;
        setLoading(true);
        await Promise.all([refreshCounts(), refreshPreviews(), refreshNotifications(), refreshClientPreviews()]);
        setLoading(false);
    }, [canUse, refreshClientPreviews, refreshCounts, refreshNotifications, refreshPreviews]);

    const scheduleRefresh = useCallback(() => {
        if (refreshTimeout.current) return;
        refreshTimeout.current = setTimeout(() => {
            refreshTimeout.current = null;
            refreshAll();
        }, 350);
    }, [refreshAll]);

    const handleExternalRefresh = useCallback(() => {
        scheduleRefresh();
    }, [scheduleRefresh]);

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
            setClientPreviews([]);
            setHasClientMessagingTable(true);
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
        const clientsChannel = hasClientMessagingTable
            ? supabase
                .channel('unread-client-messages')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'client_messages' }, scheduleRefresh)
                .subscribe()
            : null;

        const teamReadsChannel = supabase
            .channel('unread-team-reads')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'team_channel_reads' }, scheduleRefresh)
            .subscribe();

        const whatsappReadsChannel = supabase
            .channel('unread-whatsapp-reads')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_thread_reads' }, scheduleRefresh)
            .subscribe();

        if (typeof window !== 'undefined') {
            window.addEventListener('unread:refresh', handleExternalRefresh);
        }

        return () => {
            supabase.removeChannel(teamChannel);
            supabase.removeChannel(whatsappChannel);
            supabase.removeChannel(notificationsChannel);
            if (clientsChannel) supabase.removeChannel(clientsChannel);
            supabase.removeChannel(teamReadsChannel);
            supabase.removeChannel(whatsappReadsChannel);
            if (typeof window !== 'undefined') {
                window.removeEventListener('unread:refresh', handleExternalRefresh);
            }
            if (refreshTimeout.current) {
                clearTimeout(refreshTimeout.current);
                refreshTimeout.current = null;
            }
        };
    }, [canUse, handleExternalRefresh, hasClientMessagingTable, refreshAll, scheduleRefresh]);

    const messageUnreadTotal = counts.unreadTeam + counts.unreadWhatsapp + counts.unreadClients;

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
        clientPreviews,
        messageUnreadTotal,
        refreshAll,
        markAllNotificationsRead,
    };
};
