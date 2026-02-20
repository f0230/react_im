import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, MessageSquare, RefreshCw, Search, Send } from 'lucide-react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import useViewportHeight from '@/hooks/useViewportHeight';
import useThrottledCallback from '@/hooks/useThrottledCallback';
import MessagingTabs from '@/components/messaging/MessagingTabs';
import MessageReactionsBar from '@/components/chat/MessageReactionsBar';
import ReactionPickerPopover from '@/components/chat/ReactionPickerPopover';
import { fetchReactionsForMessages, toggleReaction } from '@/services/chatReactions';
import { formatShortDateTime, formatTime, formatTimestamp, getInitial, getUserColor } from '@/utils/messagingFormatters';

const isMissingRelationError = (error) => {
    if (!error) return false;
    if (error.code === '42P01') return true;
    return /does not exist/i.test(error.message || '');
};

const getThreadDisplayName = (thread) => {
    if (!thread) return 'Cliente';
    return thread.full_name || thread.company_name || thread.email || thread.phone || 'Cliente';
};

const ClientChat = () => {
    useViewportHeight();

    const { user, profile, client } = useAuth();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const role = profile?.role;
    const isAllowed = role === 'admin' || role === 'worker' || role === 'client';
    const isStaff = role === 'admin' || role === 'worker';

    const [threads, setThreads] = useState([]);

    // Use URL search param as source of truth
    const selectedClientId = useMemo(() => searchParams.get('client'), [searchParams]);
    const setSelectedClientId = useCallback((id) => {
        if (id) {
            setSearchParams({ client: id });
        } else {
            setSearchParams({});
        }
    }, [setSearchParams]);

    const [messages, setMessages] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [messageText, setMessageText] = useState('');
    const [replyingTo, setReplyingTo] = useState(null);
    const [loadingThreads, setLoadingThreads] = useState(false);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const [sendError, setSendError] = useState('');
    const [migrationPending, setMigrationPending] = useState(false);
    const [readTrackingPending, setReadTrackingPending] = useState(false);
    const [reactionsByMessage, setReactionsByMessage] = useState({});
    const [readReceipts, setReadReceipts] = useState([]);

    const messagesContainerRef = useRef(null);
    const inputRef = useRef(null);
    const lastReadRef = useRef({});

    const reactionTable = 'client_message_reactions';

    const selectedThread = useMemo(
        () => threads.find((thread) => thread.id === selectedClientId) || null,
        [threads, selectedClientId]
    );

    const messageIdKey = useMemo(
        () => messages.map((message) => message.id).join(','),
        [messages]
    );

    const otherReadAt = useMemo(() => {
        if (!user?.id || readReceipts.length === 0) return null;
        if (isStaff && selectedThread?.user_id) {
            const clientRead = readReceipts.find((read) => read.user_id === selectedThread.user_id);
            return clientRead?.last_read_at || null;
        }
        const others = readReceipts.filter((read) => read.user_id !== user.id && read.last_read_at);
        if (others.length === 0) return null;
        return others.reduce((latest, read) => {
            if (!latest) return read.last_read_at;
            return new Date(read.last_read_at) > new Date(latest) ? read.last_read_at : latest;
        }, null);
    }, [isStaff, readReceipts, selectedThread?.user_id, user?.id]);

    const filteredThreads = useMemo(() => {
        if (!isStaff) return threads;
        const term = searchTerm.trim().toLowerCase();
        if (!term) return threads;
        return threads.filter((thread) =>
            [thread.full_name, thread.company_name, thread.email, thread.phone]
                .filter(Boolean)
                .some((value) => value.toLowerCase().includes(term))
        );
    }, [isStaff, searchTerm, threads]);

    const loadThreads = useCallback(async () => {
        if (!isAllowed) return;
        setLoadingThreads(true);
        setError('');

        if (!isStaff) {
            if (!client?.id) {
                setThreads([]);
                setSelectedClientId(null);
                setError('No encontramos tu perfil de cliente. Completa tu perfil para usar mensajería.');
                setLoadingThreads(false);
                return;
            }
            const ownThread = {
                id: client.id,
                user_id: client.user_id,
                full_name: client.full_name,
                company_name: client.company_name,
                email: client.email,
                phone: client.phone,
                created_at: client.created_at,
            };
            setThreads([ownThread]);
            setSelectedClientId(client.id);
            setLoadingThreads(false);
            return;
        }

        const { data, error: supaError } = await supabase
            .from('clients')
            .select('id, user_id, full_name, company_name, email, phone, created_at')
            .order('created_at', { ascending: false });

        if (supaError) {
            setError(supaError.message || 'No se pudo cargar la bandeja de clientes.');
            setThreads([]);
        } else {
            const nextThreads = data || [];
            setThreads(nextThreads);
            if (nextThreads.length > 0) {
                const keepCurrentSelection = selectedClientId && nextThreads.some((thread) => thread.id === selectedClientId);
                setSelectedClientId(keepCurrentSelection ? selectedClientId : nextThreads[0].id);
            } else {
                setSelectedClientId(null);
            }
        }

        setLoadingThreads(false);
    }, [client, isAllowed, isStaff, selectedClientId, setSelectedClientId]);

    const throttledMarkRead = useThrottledCallback(async (clientId, timestamp) => {
        if (!clientId || !user?.id) return;
        const { error: supaError } = await supabase
            .from('client_message_reads')
            .upsert(
                {
                    client_id: clientId,
                    user_id: user.id,
                    last_read_at: timestamp,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: 'client_id,user_id' }
            );

        if (supaError) {
            if (isMissingRelationError(supaError)) {
                setReadTrackingPending(true);
            }
            return;
        }

        setReadTrackingPending(false);
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('unread:refresh'));
        }
    }, 2500);

    const markClientRead = useCallback(
        async (clientId, timestamp) => {
            if (!clientId || !user?.id) return;
            const nextReadAt = timestamp || new Date().toISOString();
            const previous = lastReadRef.current[clientId];
            if (previous && new Date(previous) >= new Date(nextReadAt)) return;
            lastReadRef.current[clientId] = nextReadAt;
            throttledMarkRead(clientId, nextReadAt);
        },
        [throttledMarkRead, user?.id]
    );

    const loadReadReceipts = useCallback(async (clientId) => {
        if (!clientId) return;
        const { data, error } = await supabase
            .from('client_message_reads')
            .select('user_id, last_read_at')
            .eq('client_id', clientId);
        if (!error) setReadReceipts(data || []);
    }, []);

    const handleToggleReaction = useCallback(async (messageId, emoji) => {
        if (!messageId || !emoji || !user?.id) return;
        setReactionsByMessage((prev) => {
            const list = prev[messageId] || [];
            const existing = list.find((reaction) => reaction.user_id === user.id && reaction.emoji === emoji);
            if (existing) {
                return { ...prev, [messageId]: list.filter((reaction) => reaction.id !== existing.id) };
            }
            return {
                ...prev,
                [messageId]: [
                    ...list,
                    {
                        id: `optimistic-${messageId}-${emoji}`,
                        message_id: messageId,
                        user_id: user.id,
                        emoji,
                        created_at: new Date().toISOString(),
                    },
                ],
            };
        });

        try {
            await toggleReaction({ table: reactionTable, messageId, userId: user.id, emoji });
        } catch (error) {
            fetchReactionsForMessages({ table: reactionTable, messageIds: [messageId] })
                .then((grouped) => {
                    setReactionsByMessage((prev) => ({ ...prev, ...grouped }));
                })
                .catch(() => { });
        }
    }, [reactionTable, user?.id]);

    const loadMessages = useCallback(async (clientId, background = false) => {
        if (!clientId || !isAllowed) return;
        if (!background) setLoadingMessages(true);
        setSendError('');

        const { data, error: supaError } = await supabase
            .from('client_messages')
            .select('id, client_id, body, sender_id, sender_role, created_at, reply_to_id')
            .eq('client_id', clientId)
            .order('created_at', { ascending: true });

        if (supaError) {
            if (!background) {
                if (isMissingRelationError(supaError)) {
                    setMigrationPending(true);
                    setError('Falta crear la tabla de mensajería de clientes (ver supabase/client-messaging.sql).');
                } else {
                    setError(supaError.message || 'No se pudieron cargar los mensajes.');
                }
            }
            setMessages([]);
        } else {
            setMigrationPending(false);
            const nextMessages = data || [];
            setMessages(nextMessages);

            // Mark read immediately after fetching to keep unread badges in sync
            if (nextMessages.length === 0) {
                markClientRead(clientId, new Date().toISOString());
            } else {
                const lastMessage = nextMessages[nextMessages.length - 1];
                if (lastMessage?.created_at) {
                    markClientRead(clientId, lastMessage.created_at);
                }
            }
        }

        if (!background) setLoadingMessages(false);
    }, [isAllowed, markClientRead]);

    const handleSend = useCallback(async () => {
        if (!selectedClientId || !user?.id || sending) return;
        const body = messageText.trim();
        if (!body) return;

        setSending(true);
        setSendError('');

        const senderRole = role === 'client' ? 'client' : role === 'worker' ? 'worker' : 'admin';
        const { error: supaError } = await supabase
            .from('client_messages')
            .insert({
                client_id: selectedClientId,
                sender_id: user.id,
                sender_role: senderRole,
                body,
                reply_to_id: replyingTo?.id || null,
            });

        if (supaError) {
            if (isMissingRelationError(supaError)) {
                setMigrationPending(true);
                setSendError('Falta crear la tabla de mensajería de clientes (supabase/client-messaging.sql).');
            } else {
                setSendError(supaError.message || 'No se pudo enviar el mensaje.');
            }
        } else {
            setMessageText('');
            setReplyingTo(null);
        }

        setSending(false);
    }, [messageText, replyingTo, role, selectedClientId, sending, user?.id]);

    useEffect(() => {
        if (!isAllowed) return;
        loadThreads();
    }, [isAllowed, loadThreads]);


    useEffect(() => {
        if (!selectedClientId || !isAllowed) return;

        setMessages([]);
        loadMessages(selectedClientId);

        const subscription = supabase
            .channel(`client-messages-${selectedClientId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'client_messages',
                    filter: `client_id=eq.${selectedClientId}`,
                },
                (payload) => {
                    setMessages((prev) => {
                        if (prev.some((message) => message.id === payload.new.id)) return prev;
                        return [...prev, payload.new];
                    });
                    markClientRead(selectedClientId, payload.new.created_at);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [isAllowed, loadMessages, markClientRead, selectedClientId]);

    useEffect(() => {
        if (!selectedClientId || !messageIdKey) {
            setReactionsByMessage({});
            return;
        }
        const messageIds = messageIdKey.split(',').filter(Boolean);
        fetchReactionsForMessages({ table: reactionTable, messageIds })
            .then((grouped) => setReactionsByMessage(grouped))
            .catch(() => { });
    }, [messageIdKey, reactionTable, selectedClientId]);

    useEffect(() => {
        if (!selectedClientId || !messageIdKey) return;
        const filter = `message_id=in.(${messageIdKey})`;
        const reactionsChannel = supabase
            .channel(`client-reactions-${selectedClientId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: reactionTable, filter }, (payload) => {
                const row = payload.new || payload.old;
                if (!row) return;
                setReactionsByMessage((prev) => {
                    const list = prev[row.message_id] || [];
                    if (payload.eventType === 'DELETE') {
                        return { ...prev, [row.message_id]: list.filter((item) => item.id !== row.id) };
                    }
                    const exists = list.some((item) => item.id === row.id);
                    return {
                        ...prev,
                        [row.message_id]: exists ? list.map((item) => (item.id === row.id ? row : item)) : [...list, row],
                    };
                });
            })
            .subscribe();

        return () => {
            supabase.removeChannel(reactionsChannel);
        };
    }, [messageIdKey, reactionTable, selectedClientId]);

    useEffect(() => {
        if (!selectedClientId) {
            setReadReceipts([]);
            return;
        }
        loadReadReceipts(selectedClientId);
        const readsChannel = supabase
            .channel(`client-reads-${selectedClientId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'client_message_reads', filter: `client_id=eq.${selectedClientId}` }, (payload) => {
                const row = payload.new || payload.old;
                if (!row) return;
                setReadReceipts((prev) => {
                    if (payload.eventType === 'DELETE') {
                        return prev.filter((item) => item.user_id !== row.user_id);
                    }
                    const exists = prev.some((item) => item.user_id === row.user_id);
                    return exists
                        ? prev.map((item) => (item.user_id === row.user_id ? row : item))
                        : [...prev, row];
                });
            })
            .subscribe();

        return () => {
            supabase.removeChannel(readsChannel);
        };
    }, [loadReadReceipts, selectedClientId]);

    useEffect(() => {
        if (!selectedClientId || !user?.id) return;
        if (messages.length === 0) {
            markClientRead(selectedClientId, new Date().toISOString());
            return;
        }
        const lastMessage = messages[messages.length - 1];
        if (lastMessage?.created_at) {
            markClientRead(selectedClientId, lastMessage.created_at);
        }
    }, [markClientRead, messages, selectedClientId, user?.id]);

    useLayoutEffect(() => {
        if (!selectedClientId || !messagesContainerRef.current) return;
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }, [messages.length, selectedClientId]);
    if (!isAllowed) {
        return (
            <div className="font-product text-neutral-900">
                <div className="rounded-2xl bg-white border border-black/5 shadow-lg p-8">
                    <h2 className="text-xl font-semibold mb-2">Acceso restringido</h2>
                    <p className="text-sm text-neutral-500">
                        Esta sección de mensajería no está disponible para tu rol.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div
            className="font-product text-neutral-900 fixed inset-x-0 z-10 mx-auto w-full max-w-[1440px] flex flex-col overflow-hidden overscroll-none bg-white"
            style={{
                top: 'calc(45px + var(--app-viewport-offset-top, 0px))',
                height: 'calc(var(--app-height, 100dvh) - 45px)',
            }}
        >
            <MessagingTabs />
            <div className={`flex-1 grid min-h-0 ${isStaff ? 'grid-cols-1 lg:grid-cols-[320px_1fr]' : 'grid-cols-1'}`}>
                {isStaff && (
                    <div className={`flex flex-col min-h-0 h-full overflow-hidden border-r border-neutral-200 ${selectedClientId ? 'hidden lg:flex' : 'flex'}`}>
                        <div className="p-4 border-b border-black/5">
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                                <input
                                    value={searchTerm}
                                    onChange={(event) => setSearchTerm(event.target.value)}
                                    placeholder="Buscar cliente..."
                                    className="w-full rounded-full border border-black/10 bg-neutral-50 pl-9 pr-3 py-2 text-xs focus:border-black/40 focus:bg-white transition"
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar overscroll-y-contain">
                            {loadingThreads && (
                                <div className="text-xs text-neutral-400 px-2 flex items-center gap-2">
                                    <RefreshCw size={12} className="animate-spin" />
                                    Cargando clientes...
                                </div>
                            )}
                            {!loadingThreads && filteredThreads.length === 0 && (
                                <div className="text-sm text-neutral-400 px-2">No hay clientes para mostrar.</div>
                            )}
                            {filteredThreads.map((thread) => {
                                const isActive = thread.id === selectedClientId;
                                return (
                                    <button
                                        key={thread.id}
                                        onClick={() => setSelectedClientId(thread.id)}
                                        className={`w-full text-left rounded-2xl border px-3 py-3 transition ${isActive
                                            ? 'border-black/10 bg-black text-white shadow-lg'
                                            : 'border-black/5 bg-white hover:bg-neutral-50'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${isActive ? 'bg-white/10 text-white' : 'bg-neutral-100 text-neutral-700'}`}>
                                                {getInitial(getThreadDisplayName(thread))}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm font-semibold truncate ${isActive ? 'text-white' : 'text-neutral-900'}`}>
                                                    {getThreadDisplayName(thread)}
                                                </p>
                                                <p className={`text-xs truncate ${isActive ? 'text-white/70' : 'text-neutral-500'}`}>
                                                    {thread.email || thread.phone || 'Sin contacto'}
                                                </p>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className={`flex flex-col min-h-0 h-full overflow-hidden bg-white ${isStaff && !selectedClientId ? 'hidden lg:flex' : 'flex'}`}>
                    {selectedThread ? (
                        <>
                            <div className="sticky top-0 z-20 border-b border-neutral-200 bg-white/90 backdrop-blur">
                                <div className="px-4 py-3 flex items-center justify-between gap-4">
                                    <div className="min-w-0 flex items-center gap-2">
                                        {isStaff && (
                                            <button
                                                onClick={() => setSelectedClientId(null)}
                                                className="lg:hidden p-2 -ml-2 text-neutral-500 hover:text-neutral-900"
                                                aria-label="Volver"
                                            >
                                                <ArrowLeft size={20} />
                                            </button>
                                        )}
                                        <div className="w-10 h-10 rounded-full bg-neutral-100 text-neutral-700 flex items-center justify-center text-sm font-semibold">
                                            {getInitial(getThreadDisplayName(selectedThread))}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-neutral-900 truncate">
                                                {getThreadDisplayName(selectedThread)}
                                            </p>
                                            <p className="text-xs text-neutral-500 truncate">
                                                {selectedThread.email || selectedThread.phone || 'Canal directo'}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-[11px] uppercase tracking-[0.2em] text-neutral-400">Clients</span>
                                </div>
                            </div>

                            <div
                                ref={messagesContainerRef}
                                className="flex-1 overflow-y-auto px-4 py-4 space-y-3 custom-scrollbar overscroll-y-contain bg-neutral-50"
                            >
                                {loadingMessages && (
                                    <div className="text-xs text-neutral-400">Cargando mensajes...</div>
                                )}
                                {!loadingMessages && messages.length === 0 && (
                                    <div className="text-sm text-neutral-400">Todavía no hay mensajes en esta conversación.</div>
                                )}
                                {messages.map((message) => {
                                    const isOutbound = message.sender_id === user?.id;
                                    const senderName = isOutbound
                                        ? 'Tú'
                                        : message.sender_role === 'client'
                                            ? getThreadDisplayName(selectedThread)
                                            : 'Equipo DTE';
                                    const isSeen = isOutbound && otherReadAt
                                        ? new Date(otherReadAt) >= new Date(message.created_at)
                                        : false;
                                    return (
                                        <div key={message.id} id={`msg-${message.id}`} className={`flex flex-col max-w-[85%] group ${isOutbound ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                                            <div className="flex items-center gap-2 mb-0.5 px-1">
                                                <span className={`text-[10px] font-bold ${getUserColor(senderName)}`}>
                                                    {senderName}
                                                </span>
                                                <span className="text-[9px] text-neutral-400">
                                                    {formatShortDateTime(message.created_at)}
                                                </span>
                                                <button
                                                    onClick={() => setReplyingTo(message)}
                                                    className="text-[9px] text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-neutral-600"
                                                >
                                                    • Responder
                                                </button>
                                            </div>
                                            <ReactionPickerPopover onSelect={(emoji) => handleToggleReaction(message.id, emoji)}>
                                                <div className={`relative px-3 py-2 text-sm rounded-lg shadow-sm ${isOutbound ? 'bg-[#d9fdd3] text-neutral-900 rounded-tr-none' : 'bg-white text-neutral-900 rounded-tl-none'}`}>
                                                    {message.reply_to_id && (
                                                        <div
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const el = document.getElementById(`msg-${message.reply_to_id}`);
                                                                if (el) {
                                                                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                                    el.classList.add('bg-black/10', 'transition-colors', 'duration-500');
                                                                    setTimeout(() => {
                                                                        el.classList.remove('bg-black/10');
                                                                    }, 1500);
                                                                }
                                                            }}
                                                            className="mb-2 p-2 bg-black/5 border-l-4 border-black/20 rounded text-[11px] cursor-pointer hover:bg-black/10 transition-colors"
                                                        >
                                                            <p className="font-bold opacity-70 italic">Respondiento a:</p>
                                                            <p className="truncate opacity-60">
                                                                {messages.find(m => m.id === message.reply_to_id)?.body || 'Mensaje original'}
                                                            </p>
                                                        </div>
                                                    )}
                                                    <p className="whitespace-pre-wrap">{message.body}</p>
                                                    {isOutbound && (
                                                        <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-neutral-500">
                                                            <span>{isSeen ? '✓✓' : '✓'}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </ReactionPickerPopover>
                                            <MessageReactionsBar
                                                reactions={reactionsByMessage[message.id] || []}
                                                currentUserId={user?.id}
                                                onToggle={(emoji) => handleToggleReaction(message.id, emoji)}
                                            />
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="shrink-0 border-t border-black/5 px-4 py-3 bg-white" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
                                {migrationPending && (
                                    <p className="text-xs text-amber-600 mb-2">
                                        Para habilitar este chat, ejecuta `supabase/client-messaging.sql`.
                                    </p>
                                )}
                                {readTrackingPending && !migrationPending && (
                                    <p className="text-xs text-amber-600 mb-2">
                                        Ejecuta `supabase/client-messaging.sql` para activar notificaciones no leídas.
                                    </p>
                                )}
                                <div className="space-y-2">
                                    {replyingTo && (
                                        <div className="flex items-center justify-between p-2 mb-2 bg-neutral-50 border-l-4 border-black/40 rounded-lg animate-in slide-in-from-bottom-2">
                                            <div className="min-w-0">
                                                <p className={`text-[11px] font-bold ${getUserColor(replyingTo.sender_role === 'client' ? getThreadDisplayName(selectedThread) : 'Equipo DTE')}`}>
                                                    Reponiendo a {replyingTo.sender_role === 'client' ? getThreadDisplayName(selectedThread) : 'Equipo DTE'}
                                                </p>
                                                <p className="text-xs text-neutral-500 truncate">{replyingTo.body}</p>
                                            </div>
                                            <button
                                                onClick={() => setReplyingTo(null)}
                                                className="p-1 text-neutral-400 hover:text-neutral-600"
                                            >
                                                X
                                            </button>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <input
                                            ref={inputRef}
                                            value={messageText}
                                            onChange={(event) => setMessageText(event.target.value)}
                                            placeholder="Mensaje..."
                                            className="flex-1 rounded-full bg-neutral-100 px-4 py-2 text-base lg:text-[14px] focus:bg-neutral-200 focus:outline-none transition-colors"
                                            onKeyDown={(event) => {
                                                if (event.key === 'Enter' && !event.shiftKey) {
                                                    event.preventDefault();
                                                    handleSend();
                                                }
                                            }}
                                        />
                                        <button
                                            onClick={handleSend}
                                            disabled={sending || !messageText.trim() || migrationPending}
                                            className="p-2 text-neutral-500 hover:text-neutral-700 transition disabled:opacity-50"
                                        >
                                            {sending ? <RefreshCw size={20} className="animate-spin" /> : <Send size={20} />}
                                        </button>
                                    </div>
                                </div>
                                {sendError && <p className="text-xs text-red-600 mt-2">{sendError}</p>}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-neutral-400">
                            <div className="text-center">
                                <MessageSquare size={32} className="mx-auto mb-3" />
                                <p className="font-semibold text-neutral-700">Selecciona una conversación</p>
                                <p className="text-sm text-neutral-400 mt-1">
                                    Elige un cliente para abrir el chat.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {error && (
                <div className="absolute bottom-3 left-3 right-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    {error}
                </div>
            )}
            {selectedThread && (
                <div className="absolute top-16 right-4 text-[10px] text-neutral-400 hidden lg:block">
                    Última actividad: {messages.length > 0 ? formatTimestamp(messages[messages.length - 1]?.created_at) : 'Sin mensajes'}
                </div>
            )}
        </div>
    );
};

export default ClientChat;
