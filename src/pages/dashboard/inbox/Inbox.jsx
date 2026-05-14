import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { MessageSquare, Search, RefreshCw, Send, Phone, Paperclip, ArrowLeft, X } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { useLocation, useSearchParams } from 'react-router-dom';
import ClientDetail from '@/pages/dashboard/crm/ClientDetail';
import useViewportHeight from '@/hooks/useViewportHeight';
import MessagingTabs from '@/components/messaging/MessagingTabs';
import { formatTime, formatTimestamp, getInitial, normalizePhone } from '@/utils/messagingFormatters';
import ChatAudioPlayer from '@/components/chat/ChatAudioPlayer';
import { formatPhoneForDisplay } from '@/utils/phone-format';

const INBOX_TAGS = [
    { id: 'urgent', label: 'Urgente', color: '#ef4444' },
    { id: 'followup', label: 'Seguimiento', color: '#f59e0b' },
    { id: 'prospect', label: 'Prospecto', color: '#10b981' },
    { id: 'client', label: 'Cliente', color: '#3b82f6' },
];

const WHATSAPP_THREAD_REQUIRED_COLUMNS = ['id', 'wa_id', 'client_name', 'client_phone', 'last_message', 'last_message_at', 'status', 'label'];
const buildWhatsappThreadColumns = ({ supportsAiToggle, supportsThreadClientId }) => [
    ...WHATSAPP_THREAD_REQUIRED_COLUMNS.slice(0, 2),
    ...(supportsThreadClientId ? ['client_id'] : []),
    ...WHATSAPP_THREAD_REQUIRED_COLUMNS.slice(2),
    ...(supportsAiToggle ? ['ai_enabled'] : []),
].join(', ');
const WHATSAPP_MESSAGE_COLUMNS = 'id, message_id, wa_id, direction, body, type, timestamp, created_at';

const isMissingColumnError = (error, columnName) => {
    const code = String(error?.code || '');
    const message = String(error?.message || '').toLowerCase();
    const details = String(error?.details || '').toLowerCase();
    const hint = String(error?.hint || '').toLowerCase();
    const target = String(columnName || '').toLowerCase();
    return (
        code === '42703'
        || code === 'PGRST204'
        || message.includes(target)
        || details.includes(target)
        || hint.includes(target)
    );
};

const Inbox = () => {
    useViewportHeight(); // Activar ajuste dinámico del viewport para teclados móviles

    const { profile, user } = useAuth();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const isAllowed = profile?.role === 'admin' || profile?.role === 'worker';
    const [threads, setThreads] = useState([]);
    const [messages, setMessages] = useState([]);
    const [assignees, setAssignees] = useState([]);

    // Use URL search param as source of truth
    const selectedThreadId = useMemo(() => {
        const raw = searchParams.get('wa');
        if (!raw) return null;
        return raw.replace(/\D/g, '') || raw;
    }, [searchParams]);

    const setSelectedThreadId = useCallback((id) => {
        if (id) {
            setSearchParams({ wa: id });
        } else {
            setSearchParams({});
        }
    }, [setSearchParams]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loadingThreads, setLoadingThreads] = useState(false);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const [sendError, setSendError] = useState('');
    const [messageText, setMessageText] = useState('');
    const [uploading, setUploading] = useState(false);
    const [aiToggleLoading, setAiToggleLoading] = useState(false);
    const [supportsAiToggle, setSupportsAiToggle] = useState(true);
    const [supportsThreadClientId, setSupportsThreadClientId] = useState(true);
    const [isClientModalOpen, setIsClientModalOpen] = useState(false);
    const [clientIdByWa, setClientIdByWa] = useState({});
    const [composerHeight, setComposerHeight] = useState(88);
    const [contextMenu, setContextMenu] = useState(null); // { x, y, waId }
    const fileInputRef = React.useRef(null);
    const composerRef = useRef(null);
    const inputRef = React.useRef(null);
    const lastReadRef = useRef({});
    const messagesContainerRef = useRef(null);




    const selectedThread = useMemo(
        () => threads.find((thread) => thread.wa_id === selectedThreadId) || null,
        [threads, selectedThreadId]
    );
    const resolvedClientId = selectedThreadId ? clientIdByWa[selectedThreadId] : null;
    const selectedClientId =
        selectedThread?.client_id || selectedThread?.clientId || resolvedClientId || null;

    const filteredThreads = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        return threads.filter((thread) => {
            if (thread.status === 'closed') return false;
            if (!term) return true;
            return [
                thread.client_name,
                thread.client_phone,
                thread.wa_id,
                thread.last_message,
            ]
                .filter(Boolean)
                .some((value) => value.toLowerCase().includes(term));
        });
    }, [threads, searchTerm]);

    const loadAssignees = useCallback(async () => {
        const { data, error: supaError } = await supabase
            .from('profiles')
            .select('id, full_name, email, role')
            .in('role', ['admin', 'worker'])
            .order('full_name', { ascending: true })
            .limit(200);

        if (!supaError && data) {
            setAssignees(data);
        }
    }, []);

    const supportsAiToggleRef = useRef(supportsAiToggle);
    supportsAiToggleRef.current = supportsAiToggle;
    const supportsThreadClientIdRef = useRef(supportsThreadClientId);
    supportsThreadClientIdRef.current = supportsThreadClientId;

    const loadThreads = useCallback(async (background = false) => {
        if (!isAllowed) return;
        if (!background) setLoadingThreads(true);
        setError('');
        let nextSupportsAiToggle = supportsAiToggleRef.current;
        let nextSupportsThreadClientId = supportsThreadClientIdRef.current;

        const fetchThreads = (columns) => supabase
            .from('whatsapp_threads')
            .select(columns)
            .order('last_message_at', { ascending: false, nullsFirst: false })
            .limit(300);

        let requestedColumns = buildWhatsappThreadColumns({
            supportsAiToggle: nextSupportsAiToggle,
            supportsThreadClientId: nextSupportsThreadClientId,
        });

        let { data, error: supaError } = await fetchThreads(requestedColumns);

        if (supaError && nextSupportsThreadClientId && isMissingColumnError(supaError, 'client_id')) {
            nextSupportsThreadClientId = false;
            requestedColumns = buildWhatsappThreadColumns({
                supportsAiToggle: nextSupportsAiToggle,
                supportsThreadClientId: nextSupportsThreadClientId,
            });
            const fallback = await fetchThreads(requestedColumns);
            data = fallback.data;
            supaError = fallback.error;
            if (!fallback.error) {
                setSupportsThreadClientId(false);
            }
        }

        if (supaError && nextSupportsAiToggle && isMissingColumnError(supaError, 'ai_enabled')) {
            nextSupportsAiToggle = false;
            requestedColumns = buildWhatsappThreadColumns({
                supportsAiToggle: nextSupportsAiToggle,
                supportsThreadClientId: nextSupportsThreadClientId,
            });
            const fallback = await fetchThreads(requestedColumns);
            data = fallback.data;
            supaError = fallback.error;
            if (!fallback.error) {
                setSupportsAiToggle(false);
            }
        }

        if (supaError) {
            console.error('Failed to load whatsapp_threads', supaError);
            if (!background) setError('No se pudo cargar la bandeja.');
        } else {
            setThreads((data || []).map((thread) => ({
                ...thread,
                client_id: thread?.client_id ?? null,
                ai_enabled: typeof thread?.ai_enabled === 'boolean' ? thread.ai_enabled : null,
            })));
        }
        if (!background) setLoadingThreads(false);
    }, [isAllowed]);

    const loadMessages = useCallback(
        async (waId, background = false) => {
            if (!waId || !isAllowed) return;
            if (!background) setLoadingMessages(true);
            const { data, error: supaError } = await supabase
                .from('whatsapp_messages')
                .select(WHATSAPP_MESSAGE_COLUMNS)
                .eq('wa_id', waId)
                .order('timestamp', { ascending: true });

            if (supaError) {
                if (!background) setError('No se pudieron cargar los mensajes.');
            } else {
                setMessages(data || []);
            }
            if (!background) setLoadingMessages(false);
        },
        [isAllowed]
    );

    const markThreadRead = useCallback(
        async (waId, timestamp) => {
            if (!waId || !user?.id) return;
            const nextReadAt = timestamp || new Date().toISOString();
            const previous = lastReadRef.current[waId];
            if (previous && new Date(previous) >= new Date(nextReadAt)) return;
            lastReadRef.current[waId] = nextReadAt;

            const { error } = await supabase
                .from('whatsapp_thread_reads')
                .upsert(
                    {
                        wa_id: waId,
                        user_id: user.id,
                        last_read_at: nextReadAt,
                        updated_at: new Date().toISOString(),
                    },
                    { onConflict: 'wa_id,user_id' }
                );
            if (error) {
                console.error('Failed to update whatsapp_thread_reads', error);
                return;
            }
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('unread:refresh'));
            }
        },
        [user?.id]
    );

    const updateThread = useCallback(
        async (updates) => {
            if (!selectedThreadId) return;
            const nextUpdates = { ...updates };
            if (!supportsThreadClientId) {
                delete nextUpdates.client_id;
            }
            if (!supportsAiToggle) {
                delete nextUpdates.ai_enabled;
            }
            if (Object.keys(nextUpdates).length === 0) return;

            const selectColumns = buildWhatsappThreadColumns({
                supportsAiToggle,
                supportsThreadClientId,
            });
            const { data, error: supaError } = await supabase
                .from('whatsapp_threads')
                .update(nextUpdates)
                .eq('wa_id', selectedThreadId)
                .select(selectColumns)
                .single();

            if (!supaError && data) {
                setThreads((prev) =>
                    prev.map((thread) => (
                        thread.wa_id === data.wa_id
                            ? {
                                ...thread,
                                ...data,
                                client_id: data?.client_id ?? thread.client_id ?? null,
                                ai_enabled: typeof data?.ai_enabled === 'boolean' ? data.ai_enabled : thread.ai_enabled ?? null,
                            }
                            : thread
                    ))
                );
            }
        },
        [selectedThreadId, supportsAiToggle, supportsThreadClientId]
    );

    const findClientByPhone = useCallback(async (rawPhone) => {
        const normalized = normalizePhone(rawPhone);
        if (!normalized) return null;

        const results = [];
        const { data: exactData } = await supabase
            .from('clients')
            .select('id, phone')
            .eq('phone', rawPhone)
            .limit(3);

        if (Array.isArray(exactData)) results.push(...exactData);

        const { data: likeData } = await supabase
            .from('clients')
            .select('id, phone')
            .ilike('phone', `%${normalized}%`)
            .limit(10);

        if (Array.isArray(likeData)) results.push(...likeData);

        const match = results.find((client) => normalizePhone(client?.phone) === normalized);
        return match?.id || null;
    }, []);

    const handleAiToggle = useCallback(async () => {
        if (!selectedThreadId || aiToggleLoading || !supportsAiToggle) return;
        const nextValue = !Boolean(selectedThread?.ai_enabled);
        setThreads((prev) =>
            prev.map((thread) =>
                thread.wa_id === selectedThreadId ? { ...thread, ai_enabled: nextValue } : thread
            )
        );
        setAiToggleLoading(true);
        try {
            await updateThread({ ai_enabled: nextValue });
            await fetch('/api/whatsapp-ai-toggle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    wa_id: selectedThreadId,
                    client_id: selectedClientId,
                    thread_id: selectedThread?.id,
                    ai_enabled: nextValue,
                }),
            });
        } catch (toggleError) {
            console.error('AI toggle error:', toggleError);
        } finally {
            setAiToggleLoading(false);
        }
    }, [aiToggleLoading, selectedClientId, selectedThread?.ai_enabled, selectedThread?.id, selectedThreadId, supportsAiToggle, updateThread]);

    const handleCloseThread = useCallback(async (waId) => {
        setThreads((prev) => prev.map((t) => t.wa_id === waId ? { ...t, status: 'closed' } : t));
        if (selectedThreadId === waId) setSelectedThreadId(null);
        await supabase.from('whatsapp_threads').update({ status: 'closed' }).eq('wa_id', waId);
        setContextMenu(null);
    }, [selectedThreadId, setSelectedThreadId]);

    const handleTagThread = useCallback(async (waId, tagId) => {
        const thread = threads.find((t) => t.wa_id === waId);
        const newLabel = thread?.label === tagId ? null : tagId;
        setThreads((prev) => prev.map((t) => t.wa_id === waId ? { ...t, label: newLabel } : t));
        setContextMenu(null);
        await supabase.from('whatsapp_threads').update({ label: newLabel }).eq('wa_id', waId);
    }, [threads]);

    const handleContextMenu = useCallback((event, waId) => {
        event.preventDefault();
        event.stopPropagation();
        setContextMenu({ x: event.clientX, y: event.clientY, waId });
    }, []);

    useEffect(() => {
        if (!contextMenu) return;
        const close = () => setContextMenu(null);
        const onKey = (e) => e.key === 'Escape' && setContextMenu(null);
        document.addEventListener('click', close);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('click', close);
            document.removeEventListener('keydown', onKey);
        };
    }, [contextMenu]);

    const handleFileUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file || !selectedThreadId) return;

        // Reset input
        event.target.value = '';

        if (file.size > 10 * 1024 * 1024) { // 10MB limit
            setSendError('El archivo es demasiado grande (max 10MB).');
            return;
        }

        setUploading(true);
        setSendError('');

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${selectedThreadId}/${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage
                .from('chat-media')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data: publicData } = supabase.storage
                .from('chat-media')
                .getPublicUrl(fileName);

            if (!publicData?.publicUrl) throw new Error('No public URL');

            // Determine type
            let type = 'document';
            if (file.type.startsWith('image/')) type = 'image';
            else if (file.type.startsWith('video/')) type = 'video';
            else if (file.type.startsWith('audio/')) type = 'audio';

            await sendMediaMessage(type, publicData.publicUrl, file.name);

        } catch (err) {
            console.error(err);
            setSendError('Error subiendo archivo: ' + err.message);
        } finally {
            setUploading(false);
        }
    };

    const sendMediaMessage = async (type, url, caption) => {
        try {
            const payload = {
                to: selectedThreadId,
                type,
                url,
                caption: type === 'document' ? caption : undefined // Simple caption logic
            };

            const response = await fetch('/api/whatsapp-send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const result = await response.json().catch(() => ({}));
                throw new Error(result?.error || 'Error enviando archivo');
            }
            // Realtime will handle the update
        } catch (err) {
            setSendError(err.message);
        }
    };

    const handleSend = useCallback(async () => {
        if (!selectedThreadId || sending) return;
        setSendError('');

        const body = messageText.trim();
        if (!body) return;
        const payload = { to: selectedThreadId, text: body };

        // Optimistic update — show the message immediately
        const optimisticId = `optimistic-${Date.now()}`;
        const optimisticMsg = {
            id: optimisticId,
            wa_id: selectedThreadId,
            direction: 'outbound',
            body,
            type: 'text',
            timestamp: new Date().toISOString(),
            created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, optimisticMsg]);
        setMessageText('');

        setSending(true);
        try {
            const response = await fetch('/api/whatsapp-send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const result = await response.json().catch(() => ({}));
                throw new Error(result?.error || 'Error enviando mensaje');
            }
            // Realtime INSERT will eventually arrive with the real DB row;
            // the duplicate guard (prev.some(m => m.id === msg.id)) handles it.
            // Remove the optimistic placeholder once the real row lands.
        } catch (sendErr) {
            // Roll back the optimistic message on failure
            setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
            setMessageText(body);
            setSendError(sendErr.message || 'Error enviando mensaje');
        } finally {
            setSending(false);
        }
    }, [
        selectedThreadId,
        sending,
        messageText,
    ]);

    useEffect(() => {
        if (!isAllowed) return;
        loadAssignees();
        loadThreads();

        // Realtime Subscription
        const channel = supabase
            .channel('inbox-updates')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'whatsapp_threads' },
                (payload) => {
                    const { eventType, new: newRecord, old: oldRecord } = payload;
                    setThreads((prev) => {
                        if (eventType === 'INSERT') {
                            if (prev.some((t) => t.id === newRecord.id)) return prev;
                            return [newRecord, ...prev];
                        } else if (eventType === 'UPDATE') {
                            return prev.map((t) =>
                                t.id === newRecord.id ? { ...t, ...newRecord } : t
                            ).sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at));
                        } else if (eventType === 'DELETE') {
                            return prev.filter((t) => t.id !== oldRecord.id);
                        }
                        return prev;
                    });
                }
            )
            .subscribe((status, err) => {
                if (err) console.error('[Inbox] threads subscription error:', err);
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [isAllowed, loadAssignees, loadThreads]);


    // Better message filtering for current thread in Realtime
    useEffect(() => {
        if (!selectedThreadId || !isAllowed) return;

        setMessages([]);

        // NOTE: We subscribe WITHOUT a server-side filter on wa_id because
        // Supabase Realtime filters only work when the column is part of
        // the table's replica identity (usually just `id`). If wa_id is not
        // in the replica identity the filter silently matches nothing and
        // no events are delivered. We filter client-side instead.
        const messageChannel = supabase
            .channel(`messages-${selectedThreadId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'whatsapp_messages',
                },
                (payload) => {
                    const msg = payload.new;
                    if (msg.wa_id !== selectedThreadId) return; // client-side filter
                    setMessages((prev) => {
                        if (prev.some((m) => m.id === msg.id)) return prev;
                        return [...prev, msg];
                    });
                    if (msg.direction !== 'outbound') {
                        markThreadRead(selectedThreadId, msg.timestamp);
                    }
                }
            )
            .subscribe((status, err) => {
                if (err) console.error('[Inbox] messages subscription error:', err);
            });

        loadMessages(selectedThreadId);

        return () => {
            supabase.removeChannel(messageChannel);
        };

    }, [markThreadRead, selectedThreadId, loadMessages, isAllowed]);

    useEffect(() => {
        if (!selectedThreadId || !user?.id) return;
        if (messages.length === 0) {
            markThreadRead(selectedThreadId, new Date().toISOString());
            return;
        }
        const lastMessage = messages[messages.length - 1];
        if (lastMessage?.timestamp) {
            markThreadRead(selectedThreadId, lastMessage.timestamp);
        }
    }, [markThreadRead, messages, selectedThreadId, user?.id]);

    useEffect(() => {
        if (!selectedThreadId || !selectedThread) return;
        if (selectedThread.client_id || resolvedClientId) return;
        const phone = selectedThread.client_phone || selectedThread.wa_id;
        if (!phone) return;

        let cancelled = false;

        (async () => {
            const clientId = await findClientByPhone(phone);
            if (cancelled || !clientId) return;
            setClientIdByWa((prev) => ({ ...prev, [selectedThreadId]: clientId }));
            if (!selectedThread.client_id && supportsThreadClientId) {
                await updateThread({ client_id: clientId });
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [findClientByPhone, resolvedClientId, selectedThread, selectedThreadId, supportsThreadClientId, updateThread]);

    useEffect(() => {
        if (!isClientModalOpen) return undefined;
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = originalOverflow;
        };
    }, [isClientModalOpen]);

    useEffect(() => {
        if (!selectedThreadId) return undefined;
        const composer = composerRef.current;
        if (!composer) return undefined;

        const updateComposerHeight = () => {
            const nextHeight = Math.ceil(composer.getBoundingClientRect().height);
            if (Number.isFinite(nextHeight) && nextHeight > 0) {
                setComposerHeight(nextHeight);
            }
        };

        updateComposerHeight();
        if (typeof ResizeObserver === 'undefined') return undefined;

        const resizeObserver = new ResizeObserver(updateComposerHeight);
        resizeObserver.observe(composer);
        return () => resizeObserver.disconnect();
    }, [selectedThreadId]);

    useLayoutEffect(() => {
        if (!selectedThreadId || !messagesContainerRef.current) return;
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }, [messages.length, selectedThreadId]);


    if (!isAllowed) {
        return (
            <div className="font-product text-neutral-900">
                <div className="rounded-2xl bg-white border border-black/5 shadow-lg p-8">
                    <h2 className="text-xl font-semibold mb-2">Acceso restringido</h2>
                    <p className="text-sm text-neutral-500">
                        Esta bandeja solo esta disponible para roles admin y worker.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div
            className="font-product text-neutral-900 fixed inset-x-0 z-10 mx-auto w-full max-w-[1440px] flex flex-col overflow-hidden overscroll-none bg-white"
            style={{
                top: '45px',
                height: 'calc(var(--app-height, 100dvh) + var(--app-viewport-offset-top, 0px) - 45px)',
            }}
        >
            <MessagingTabs />

            {/* Main Content Grid */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-[360px_1fr] min-h-0">
                {/* List Side */}
                <div
                    className={`flex flex-col min-h-0 h-full overflow-hidden border-r border-neutral-100 bg-white ${selectedThreadId ? 'hidden lg:flex' : 'flex'
                        }`}
                >
                    <div className="p-4 border-b border-neutral-100 shrink-0">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                            <input
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                                placeholder="Buscar conversacion..."
                                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 pl-9 pr-3 py-2 text-xs focus:border-neutral-300 focus:bg-white focus:shadow-sm transition-all"
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-0.5 custom-scrollbar overscroll-y-contain">
                        {loadingThreads && filteredThreads.length === 0 && (
                            <div className="text-xs text-neutral-400 px-3 py-4 flex items-center gap-2">
                                <RefreshCw size={12} className="animate-spin" />
                                Cargando bandeja...
                            </div>
                        )}
                        {error && !loadingThreads && (
                            <div className="p-3 m-1 rounded-xl bg-amber-50 border border-amber-100 text-xs text-amber-700">
                                <p className="font-semibold mb-1">Error de carga</p>
                                {error}
                                <button
                                    onClick={() => loadThreads()}
                                    className="block mt-2 underline font-medium hover:text-amber-900"
                                >
                                    Reintentar
                                </button>
                            </div>
                        )}
                        {!loadingThreads && !error && filteredThreads.length === 0 && (
                            <div className="text-sm text-neutral-400 px-3 py-4">No hay conversaciones.</div>
                        )}
                        {filteredThreads.map((thread) => {
                            const displayName = thread.client_name || formatPhoneForDisplay(thread.client_phone) || formatPhoneForDisplay(thread.wa_id) || 'Cliente';
                            const isActive = thread.wa_id === selectedThreadId;
                            const tag = INBOX_TAGS.find((t) => t.id === thread.label);
                            return (
                                <button
                                    key={thread.wa_id}
                                    onClick={() => setSelectedThreadId(thread.wa_id)}
                                    onContextMenu={(e) => handleContextMenu(e, thread.wa_id)}
                                    className={`chat-sidebar-item w-full text-left rounded-xl px-3 py-2.5 ${isActive
                                        ? 'chat-sidebar-active text-white'
                                        : 'hover:bg-neutral-50'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="relative shrink-0">
                                            <div
                                                className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-semibold ${isActive ? 'chat-avatar-active' : 'chat-avatar'
                                                    }`}
                                            >
                                                {getInitial(displayName)}
                                            </div>
                                            {tag && (
                                                <span
                                                    className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-white"
                                                    style={{ backgroundColor: tag.color }}
                                                />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className={`text-[13px] font-semibold truncate ${isActive ? 'text-white' : 'text-neutral-800'}`}>
                                                    {displayName}
                                                </p>
                                                <span className={`text-[10px] shrink-0 ${isActive ? 'text-white/50' : 'text-neutral-400'}`}>
                                                    {formatTimestamp(thread.last_message_at)}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                {tag && (
                                                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ backgroundColor: tag.color + '22', color: tag.color }}>
                                                        {tag.label}
                                                    </span>
                                                )}
                                                <p className={`text-[11px] truncate ${isActive ? 'text-white/60' : 'text-neutral-400'}`}>
                                                    {thread.last_message || 'Sin mensajes'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Chat Side */}
                <div
                    className={`relative flex flex-col min-h-0 h-full overflow-hidden bg-white ${!selectedThreadId ? 'hidden lg:flex' : 'flex'}`}
                >
                    {selectedThread ? (
                        <>
                            <div className="sticky top-0 z-40 shrink-0 chat-header">
                                <div className="px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <button
                                            onClick={() => setSelectedThreadId(null)}
                                            className="lg:hidden p-2 -ml-2 text-neutral-400 hover:text-neutral-800 transition-colors"
                                            aria-label="Volver"
                                        >
                                            <ArrowLeft size={20} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIsClientModalOpen(true)}
                                            className="group flex items-center gap-3 min-w-0 text-left"
                                        >
                                            <div className="relative">
                                                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-50 to-sky-50 text-emerald-700 flex items-center justify-center font-semibold shadow-sm">
                                                    {getInitial(selectedThread.client_name || formatPhoneForDisplay(selectedThread.client_phone) || formatPhoneForDisplay(selectedThread.wa_id))}
                                                </div>
                                                <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-white shadow-sm flex items-center justify-center">
                                                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                                </span>
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-base font-semibold text-neutral-900 truncate group-hover:text-black">
                                                    {selectedThread.client_name || formatPhoneForDisplay(selectedThread.client_phone) || formatPhoneForDisplay(selectedThread.wa_id)}
                                                </p>
                                                <div className="flex items-center gap-2 text-xs text-neutral-500 truncate">
                                                    <Phone size={12} />
                                                    {formatPhoneForDisplay(selectedThread.wa_id)}
                                                    <span className="text-[10px] text-neutral-400">• Ver perfil</span>
                                                </div>
                                            </div>
                                        </button>
                                    </div>
                                    <div className="hidden md:flex flex-wrap items-center gap-3">
                                        <div className="flex flex-col gap-1 rounded-2xl border border-neutral-200 bg-white px-3 py-2 shadow-sm">
                                            <span className="text-[10px] uppercase tracking-[0.2em] text-neutral-400">Estado</span>
                                            <select
                                                value={selectedThread.status || 'open'}
                                                onChange={(event) => updateThread({ status: event.target.value })}
                                                className="bg-transparent text-xs uppercase tracking-wide text-neutral-700 focus:outline-none"
                                            >
                                                <option value="open">Open</option>
                                                <option value="pending">Pending</option>
                                                <option value="closed">Closed</option>
                                            </select>
                                        </div>
                                        <div className="flex flex-col gap-1 rounded-2xl border border-neutral-200 bg-white px-3 py-2 shadow-sm">
                                            <span className="text-[10px] uppercase tracking-[0.2em] text-neutral-400">Asignar</span>
                                            <select
                                                value={selectedThread.assigned_to || ''}
                                                onChange={(event) =>
                                                    updateThread({ assigned_to: event.target.value || null })
                                                }
                                                className="bg-transparent text-xs text-neutral-700 focus:outline-none"
                                            >
                                                <option value="">Sin asignar</option>
                                                {assignees.map((assignee) => (
                                                    <option key={assignee.id} value={assignee.id}>
                                                        {assignee.full_name || assignee.email}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        {supportsAiToggle && (
                                            <div className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-3 py-2 shadow-sm">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] uppercase tracking-[0.2em] text-neutral-400">AI Bot</span>
                                                    <span className="text-xs text-neutral-600">
                                                        {selectedThread?.ai_enabled ? 'Activado' : 'Desactivado'}
                                                    </span>
                                                </div>
                                                <button
                                                    type="button"
                                                    role="switch"
                                                    aria-checked={Boolean(selectedThread?.ai_enabled)}
                                                    onClick={handleAiToggle}
                                                    disabled={aiToggleLoading}
                                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${selectedThread?.ai_enabled ? 'bg-emerald-500' : 'bg-neutral-300'
                                                        } ${aiToggleLoading ? 'opacity-60' : ''}`}
                                                >
                                                    <span
                                                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${selectedThread?.ai_enabled ? 'translate-x-5' : 'translate-x-1'
                                                            }`}
                                                    />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div
                                ref={messagesContainerRef}
                                className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-1.5 custom-scrollbar overscroll-y-contain chat-bg"
                                style={{ paddingBottom: `${composerHeight}px` }}
                            >
                                {loadingMessages && (
                                    <div className="flex items-center gap-2 text-xs text-neutral-400 py-8 justify-center">
                                        <RefreshCw size={14} className="animate-spin" />
                                        Cargando mensajes...
                                    </div>
                                )}
                                {!loadingMessages && messages.length === 0 && (
                                    <div className="chat-empty-state flex flex-col items-center justify-center py-16 text-center">
                                        <div className="w-14 h-14 rounded-2xl bg-white/80 flex items-center justify-center mb-3 shadow-sm">
                                            <MessageSquare size={24} className="text-neutral-300" />
                                        </div>
                                        <p className="text-sm font-medium text-neutral-500">No hay mensajes en esta conversacion</p>
                                        <p className="text-xs text-neutral-400 mt-1">Los mensajes apareceran aqui</p>
                                    </div>
                                )}
                                {messages.map((message) => {
                                    const isOutbound = message.direction === 'outbound';
                                    const bubbleClass = isOutbound
                                        ? 'ml-auto chat-bubble chat-bubble-out text-neutral-900'
                                        : 'mr-auto chat-bubble chat-bubble-in text-neutral-900';

                                    const renderContent = () => {
                                        if (message.type === 'text' || !message.type) {
                                            return <p className="whitespace-pre-wrap">{message.body}</p>;
                                        }

                                        const url = message.body;
                                        const [mediaUrl, caption] = (url || '').split('|');
                                        const cleanUrl = mediaUrl || url;

                                        if (message.type === 'image') {
                                            return (
                                                <div className="space-y-1">
                                                    <img src={cleanUrl} alt="Sent image" loading="lazy" className="rounded-lg max-w-full max-h-64 object-cover" />
                                                    {caption && <p>{caption}</p>}
                                                </div>
                                            );
                                        }
                                        if (message.type === 'video') {
                                            return (
                                                <div className="space-y-1">
                                                    <video src={cleanUrl} controls preload="none" className="rounded-lg max-w-full max-h-64" />
                                                    {caption && <p>{caption}</p>}
                                                </div>
                                            );
                                        }
                                        if (message.type === 'audio') {
                                            return (
                                                <ChatAudioPlayer
                                                    src={cleanUrl}
                                                    variant={isOutbound ? 'outbound' : 'inbound'}
                                                />
                                            );
                                        }
                                        if (message.type === 'document' || message.type === 'file') {
                                            return (
                                                <a href={cleanUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 underline break-all">
                                                    <Paperclip size={14} />
                                                    {caption || 'Descargar archivo'}
                                                </a>
                                            );
                                        }
                                        return <p className="italic text-xs">[Tipo no soportado: {message.type}]</p>;
                                    };

                                    return (
                                        <div key={message.id || message.message_id} className={`chat-animate-in flex flex-col max-w-[80%] ${isOutbound ? 'ml-auto' : 'mr-auto'}`}>
                                            <div className={`relative px-3 py-2 text-sm ${bubbleClass}`}>
                                                {renderContent()}
                                                <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-neutral-400/80">
                                                    <span>{formatTime(message.timestamp)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div
                                ref={composerRef}
                                className="shrink-0 chat-composer px-4 py-3"
                                style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
                            >
                                <div className="space-y-2">
                                    <div className="flex items-center gap-1.5">
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            className="hidden"
                                            onChange={handleFileUpload}
                                            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
                                        />
                                        <button
                                            className={`p-2 rounded-lg transition disabled:opacity-50 ${uploading ? 'text-neutral-400' : 'text-neutral-500 hover:text-neutral-700 hover:bg-white/60'}`}
                                            title="Adjuntar"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={uploading}
                                        >
                                            {uploading ? <RefreshCw size={20} className="animate-spin" /> : <Paperclip size={20} />}
                                        </button>
                                        <input
                                            value={messageText}
                                            onChange={(event) => setMessageText(event.target.value)}
                                            placeholder="Escribe un mensaje..."
                                            className="flex-1 rounded-xl bg-white px-4 py-2.5 text-base lg:text-[14px] focus:outline-none focus:ring-1 focus:ring-neutral-300 transition-all shadow-sm"
                                            onKeyDown={(event) => {
                                                if (event.key === 'Enter' && !event.shiftKey) {
                                                    event.preventDefault();
                                                    handleSend();
                                                }
                                            }}
                                        />
                                        <button
                                            onClick={handleSend}
                                            disabled={sending || !messageText.trim()}
                                            className={`p-2.5 rounded-xl transition-all disabled:opacity-30 ${messageText.trim() ? 'bg-neutral-900 text-white hover:bg-neutral-800 shadow-sm' : 'text-neutral-400'}`}
                                        >
                                            {sending ? <RefreshCw size={18} className="animate-spin" /> : <Send size={18} />}
                                        </button>
                                    </div>
                                    {sendError && <p className="text-xs text-red-600 mt-1">{sendError}</p>}
                                    {error && <p className="text-xs text-amber-600 mt-1">{error}</p>}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center chat-bg">
                            <div className="text-center chat-empty-state">
                                <div className="w-16 h-16 rounded-2xl bg-white/80 flex items-center justify-center mx-auto mb-4 shadow-sm">
                                    <MessageSquare size={28} className="text-neutral-300" />
                                </div>
                                <p className="font-semibold text-neutral-600">Selecciona una conversacion</p>
                                <p className="text-[13px] text-neutral-400 mt-1">
                                    Elige un thread de la bandeja para ver los mensajes
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {contextMenu && (
                <div
                    className="fixed z-[100] min-w-[180px] rounded-xl bg-white shadow-xl border border-neutral-100 py-1 text-sm"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="px-3 py-1.5 text-[10px] uppercase tracking-widest text-neutral-400 font-medium">Clasificar</div>
                    {INBOX_TAGS.map((tag) => (
                        <button
                            key={tag.id}
                            onClick={() => handleTagThread(contextMenu.waId, tag.id)}
                            className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-neutral-50 transition-colors text-left"
                        >
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                            <span className="text-neutral-700">{tag.label}</span>
                            {threads.find((t) => t.wa_id === contextMenu.waId)?.label === tag.id && (
                                <span className="ml-auto text-neutral-400 text-xs">✓</span>
                            )}
                        </button>
                    ))}
                    <div className="my-1 border-t border-neutral-100" />
                    <button
                        onClick={() => handleCloseThread(contextMenu.waId)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-red-50 transition-colors text-left text-red-600"
                    >
                        <X size={14} />
                        Cerrar conversación
                    </button>
                </div>
            )}
            {isClientModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
                    <div className="relative w-full max-w-5xl h-[85svh] rounded-3xl bg-white shadow-2xl border border-neutral-200 overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-200 bg-white">
                            <div>
                                <p className="text-sm font-semibold text-neutral-900">Detalles del cliente</p>
                                <p className="text-xs text-neutral-500">Vista rapida del CRM</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsClientModalOpen(false)}
                                className="p-2 rounded-full hover:bg-neutral-100 text-neutral-500"
                                aria-label="Cerrar"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto bg-neutral-50 p-4">
                            {selectedThread && (
                                <div className="mb-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="flex flex-col gap-1 rounded-2xl border border-neutral-200 bg-white px-3 py-2 shadow-sm">
                                            <span className="text-[10px] uppercase tracking-[0.2em] text-neutral-400">Estado</span>
                                            <select
                                                value={selectedThread.status || 'open'}
                                                onChange={(event) => updateThread({ status: event.target.value })}
                                                className="bg-transparent text-xs uppercase tracking-wide text-neutral-700 focus:outline-none"
                                            >
                                                <option value="open">Open</option>
                                                <option value="pending">Pending</option>
                                                <option value="closed">Closed</option>
                                            </select>
                                        </div>
                                        <div className="flex flex-col gap-1 rounded-2xl border border-neutral-200 bg-white px-3 py-2 shadow-sm">
                                            <span className="text-[10px] uppercase tracking-[0.2em] text-neutral-400">Asignar</span>
                                            <select
                                                value={selectedThread.assigned_to || ''}
                                                onChange={(event) =>
                                                    updateThread({ assigned_to: event.target.value || null })
                                                }
                                                className="bg-transparent text-xs text-neutral-700 focus:outline-none"
                                            >
                                                <option value="">Sin asignar</option>
                                                {assignees.map((assignee) => (
                                                    <option key={assignee.id} value={assignee.id}>
                                                        {assignee.full_name || assignee.email}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    {supportsAiToggle && (
                                        <div className="mt-3 flex items-center justify-between rounded-2xl border border-neutral-200 bg-white px-3 py-2 shadow-sm">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] uppercase tracking-[0.2em] text-neutral-400">AI Bot</span>
                                                <span className="text-xs text-neutral-600">
                                                    {selectedThread?.ai_enabled ? 'Activado' : 'Desactivado'}
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                role="switch"
                                                aria-checked={Boolean(selectedThread?.ai_enabled)}
                                                onClick={handleAiToggle}
                                                disabled={aiToggleLoading}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${selectedThread?.ai_enabled ? 'bg-emerald-500' : 'bg-neutral-300'
                                                    } ${aiToggleLoading ? 'opacity-60' : ''}`}
                                            >
                                                <span
                                                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${selectedThread?.ai_enabled ? 'translate-x-5' : 'translate-x-1'
                                                        }`}
                                                />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                            {selectedClientId ? (
                                <ClientDetail clientIdOverride={selectedClientId} hideBackLink />
                            ) : (
                                <div className="rounded-2xl border border-dashed border-neutral-200 bg-white p-6 text-sm text-neutral-500">
                                    Este chat no tiene un cliente asociado para mostrar.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Inbox;
