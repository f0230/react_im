import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';

const EMPTY_COUNTS = {
    unreadTeam: 0,
    unreadWhatsapp: 0,
    unreadClients: 0,
    unreadNotifications: 0,
};

const isMissingRelationError = (error) => {
    if (!error) return false;
    if (error.code === '42P01') return true;
    return /does not exist/i.test(error.message || '');
};

const getClientName = (record) => (
    record?.full_name
    || record?.company_name
    || record?.email
    || record?.phone
    || 'Cliente'
);

const isAfter = (current, base) => {
    if (!current) return false;
    if (!base) return true;
    return new Date(current) > new Date(base);
};

export const useUnreadCounts = () => {
    const { user, profile, client } = useAuth();
    const [counts, setCounts] = useState(EMPTY_COUNTS);
    const [previews, setPreviews] = useState([]);
    const [clientPreviews, setClientPreviews] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [hasClientMessagingTable, setHasClientMessagingTable] = useState(true);
    const [hasClientReadsTable, setHasClientReadsTable] = useState(true);
    const refreshTimeout = useRef(null);

    const role = profile?.role;
    const isStaff = role === 'admin' || role === 'worker';
    const isClient = role === 'client';
    const canUse = Boolean(user?.id && profile);

    const loadClientReadsMap = useCallback(async () => {
        if (!canUse || !user?.id || !hasClientReadsTable) return new Map();

        let query = supabase
            .from('client_message_reads')
            .select('client_id, last_read_at')
            .eq('user_id', user.id);

        if (isClient) {
            if (!client?.id) return new Map();
            query = query.eq('client_id', client.id);
        }

        const { data, error } = await query;
        if (error) {
            if (isMissingRelationError(error)) {
                setHasClientReadsTable(false);
            }
            return new Map();
        }

        return new Map((data || []).map((row) => [row.client_id, row.last_read_at]));
    }, [canUse, client?.id, hasClientReadsTable, isClient, user?.id]);

    const getUnreadClientThreads = useCallback(async () => {
        if (!canUse || !hasClientMessagingTable) return 0;

        const readsMap = await loadClientReadsMap();

        if (isClient) {
            if (!client?.id) return 0;
            const lastReadAt = readsMap.get(client.id);
            let query = supabase
                .from('client_messages')
                .select('id', { count: 'exact', head: true })
                .eq('client_id', client.id)
                .in('sender_role', ['admin', 'worker']);
            if (lastReadAt) {
                query = query.gt('created_at', lastReadAt);
            }
            const { count, error } = await query;
            if (error) {
                if (isMissingRelationError(error)) {
                    setHasClientMessagingTable(false);
                }
                return 0;
            }
            return (count || 0) > 0 ? 1 : 0;
        }

        if (!isStaff) return 0;

        const { data, error } = await supabase
            .from('client_messages')
            .select('client_id, created_at, sender_role')
            .eq('sender_role', 'client')
            .order('created_at', { ascending: false })
            .limit(500);

        if (error || !Array.isArray(data)) {
            if (isMissingRelationError(error)) {
                setHasClientMessagingTable(false);
            }
            return 0;
        }

        const latestInboundByClient = new Map();
        data.forEach((row) => {
            if (!row?.client_id || latestInboundByClient.has(row.client_id)) return;
            latestInboundByClient.set(row.client_id, row.created_at);
        });

        let unreadThreads = 0;
        latestInboundByClient.forEach((lastInboundAt, clientId) => {
            const lastReadAt = readsMap.get(clientId);
            if (isAfter(lastInboundAt, lastReadAt)) unreadThreads += 1;
        });

        return unreadThreads;
    }, [canUse, client?.id, hasClientMessagingTable, isClient, isStaff, loadClientReadsMap]);

    const refreshCounts = useCallback(async () => {
        if (!canUse || !user?.id) return;
        const nextCounts = { ...EMPTY_COUNTS };

        if (isStaff) {
            const { data, error } = await supabase.rpc('get_unread_counts_v1');
            if (!error && Array.isArray(data) && data[0]) {
                nextCounts.unreadTeam = Number(data[0].unread_team || 0);
                nextCounts.unreadWhatsapp = Number(data[0].unread_whatsapp || 0);
            }
        }

        nextCounts.unreadClients = await getUnreadClientThreads();

        const { count: unreadNotifications } = await supabase
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('recipient_id', user.id)
            .is('read_at', null);
        nextCounts.unreadNotifications = Number(unreadNotifications || 0);

        setCounts(nextCounts);
    }, [canUse, getUnreadClientThreads, isStaff, user?.id]);

    const refreshPreviews = useCallback(async () => {
        if (!canUse || !isStaff) {
            setPreviews([]);
            return;
        }
        const { data, error } = await supabase.rpc('get_unread_previews_v1', {
            limit_per_source: 6,
        });
        if (!error && Array.isArray(data)) {
            setPreviews(data);
        } else {
            setPreviews([]);
        }
    }, [canUse, isStaff]);

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
        } else {
            setNotifications([]);
        }
    }, [canUse, user?.id]);

    const refreshClientPreviews = useCallback(async () => {
        if (!canUse || !hasClientMessagingTable) {
            setClientPreviews([]);
            return;
        }

        if (isClient && !client?.id) {
            setClientPreviews([]);
            return;
        }

        const readsMap = await loadClientReadsMap();
        let query = supabase
            .from('client_messages')
            .select('client_id, body, created_at, sender_role, client:clients(full_name, company_name, email, phone)')
            .order('created_at', { ascending: false })
            .limit(300);

        if (isClient && client?.id) {
            query = query.eq('client_id', client.id);
        }

        const { data, error } = await query;
        if (error || !Array.isArray(data)) {
            if (isMissingRelationError(error)) {
                setHasClientMessagingTable(false);
            }
            setClientPreviews([]);
            return;
        }

        if (isClient) {
            if (data.length === 0) {
                setClientPreviews([]);
                return;
            }
            const latest = data[0];
            const lastReadAt = readsMap.get(latest.client_id);
            const unreadCount = data.reduce((acc, row) => {
                const isUnread = row.sender_role !== 'client' && isAfter(row.created_at, lastReadAt);
                return acc + (isUnread ? 1 : 0);
            }, 0);
            if (unreadCount <= 0) {
                setClientPreviews([]);
                return;
            }
            setClientPreviews([{
                source: 'clients',
                title: 'Equipo DTE',
                preview: latest.body || '',
                event_at: latest.created_at,
                unread_count: unreadCount,
                client_id: latest.client_id,
                author: latest.sender_role === 'client' ? 'Tú' : 'Equipo DTE',
            }]);
            return;
        }

        const latestByClient = new Map();
        data.forEach((row) => {
            if (!row?.client_id) return;
            const clientRecord = Array.isArray(row?.client) ? row.client[0] : row?.client;
            const clientName = getClientName(clientRecord);
            const lastReadAt = readsMap.get(row.client_id);
            const isUnread = row.sender_role === 'client' && isAfter(row.created_at, lastReadAt);

            if (!latestByClient.has(row.client_id)) {
                latestByClient.set(row.client_id, {
                    source: 'clients',
                    title: clientName,
                    preview: row.body || '',
                    event_at: row.created_at,
                    unread_count: isUnread ? 1 : 0,
                    client_id: row.client_id,
                    author: row.sender_role === 'client' ? clientName : 'Equipo DTE',
                });
                return;
            }

            if (isUnread) {
                const current = latestByClient.get(row.client_id);
                latestByClient.set(row.client_id, {
                    ...current,
                    unread_count: Number(current.unread_count || 0) + 1,
                });
            }
        });

        setClientPreviews(
            Array.from(latestByClient.values())
                .filter((item) => Number(item.unread_count || 0) > 0)
                .sort((a, b) => new Date(b.event_at) - new Date(a.event_at))
                .slice(0, 6)
        );
    }, [canUse, client?.id, hasClientMessagingTable, isClient, loadClientReadsMap]);

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
            setNotifications([]);
            setHasClientMessagingTable(true);
            setHasClientReadsTable(true);
            setLoading(false);
            return;
        }

        refreshAll();

        const channels = [];

        if (isStaff) {
            channels.push(
                supabase
                    .channel('unread-team-messages')
                    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'team_messages' }, scheduleRefresh)
                    .subscribe()
            );
            channels.push(
                supabase
                    .channel('unread-whatsapp-messages')
                    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'whatsapp_messages' }, scheduleRefresh)
                    .subscribe()
            );
            channels.push(
                supabase
                    .channel('unread-team-reads')
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'team_channel_reads' }, scheduleRefresh)
                    .subscribe()
            );
            channels.push(
                supabase
                    .channel('unread-whatsapp-reads')
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_thread_reads' }, scheduleRefresh)
                    .subscribe()
            );
        }

        channels.push(
            supabase
                .channel('unread-notifications')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, scheduleRefresh)
                .subscribe()
        );

        if (hasClientMessagingTable) {
            channels.push(
                supabase
                    .channel('unread-client-messages')
                    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'client_messages' }, scheduleRefresh)
                    .subscribe()
            );
        }

        if (hasClientReadsTable) {
            channels.push(
                supabase
                    .channel('unread-client-reads')
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'client_message_reads' }, scheduleRefresh)
                    .subscribe()
            );
        }

        if (typeof window !== 'undefined') {
            window.addEventListener('unread:refresh', handleExternalRefresh);
        }

        return () => {
            channels.forEach((channel) => supabase.removeChannel(channel));
            if (typeof window !== 'undefined') {
                window.removeEventListener('unread:refresh', handleExternalRefresh);
            }
            if (refreshTimeout.current) {
                clearTimeout(refreshTimeout.current);
                refreshTimeout.current = null;
            }
        };
    }, [
        canUse,
        handleExternalRefresh,
        hasClientMessagingTable,
        hasClientReadsTable,
        isStaff,
        refreshAll,
        scheduleRefresh,
    ]);

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
