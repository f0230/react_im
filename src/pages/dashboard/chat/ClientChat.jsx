import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, MessageSquare, RefreshCw, Search, Send } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import useViewportHeight from '@/hooks/useViewportHeight';
import MessagingTabs from '@/components/messaging/MessagingTabs';
import { formatTime, formatTimestamp, getInitial } from '@/utils/messagingFormatters';

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
    const role = profile?.role;
    const isAllowed = role === 'admin' || role === 'worker' || role === 'client';
    const isStaff = role === 'admin' || role === 'worker';

    const [threads, setThreads] = useState([]);
    const [selectedClientId, setSelectedClientId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [messageText, setMessageText] = useState('');
    const [loadingThreads, setLoadingThreads] = useState(false);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const [sendError, setSendError] = useState('');
    const [migrationPending, setMigrationPending] = useState(false);

    const messagesEndRef = useRef(null);

    const selectedThread = useMemo(
        () => threads.find((thread) => thread.id === selectedClientId) || null,
        [threads, selectedClientId]
    );

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

    const preselectedClientId = useMemo(() => {
        const params = new URLSearchParams(location.search);
        const value = params.get('client');
        return value || null;
    }, [location.search]);

    const loadThreads = useCallback(async () => {
        if (!isAllowed) return;
        setLoadingThreads(true);
        setError('');

        if (!isStaff) {
            if (!client?.id) {
                setThreads([]);
                setSelectedClientId(null);
                setError('No encontramos tu perfil de cliente. Completa tu perfil para usar soporte.');
                setLoadingThreads(false);
                return;
            }
            const ownThread = {
                id: client.id,
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
            .select('id, full_name, company_name, email, phone, created_at')
            .order('created_at', { ascending: false });

        if (supaError) {
            setError(supaError.message || 'No se pudo cargar la bandeja de clientes.');
            setThreads([]);
        } else {
            const nextThreads = data || [];
            setThreads(nextThreads);
            if (nextThreads.length > 0) {
                setSelectedClientId((prev) => prev || nextThreads[0].id);
            } else {
                setSelectedClientId(null);
            }
        }

        setLoadingThreads(false);
    }, [client, isAllowed, isStaff]);

    const loadMessages = useCallback(async (clientId, background = false) => {
        if (!clientId || !isAllowed) return;
        if (!background) setLoadingMessages(true);
        setSendError('');

        const { data, error: supaError } = await supabase
            .from('client_messages')
            .select('id, client_id, body, sender_id, sender_role, created_at')
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
            setMessages(data || []);
        }

        if (!background) setLoadingMessages(false);
    }, [isAllowed]);

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
        }

        setSending(false);
    }, [messageText, role, selectedClientId, sending, user?.id]);

    useEffect(() => {
        if (!isAllowed) return;
        loadThreads();
    }, [isAllowed, loadThreads]);

    useEffect(() => {
        if (!preselectedClientId || !isStaff || threads.length === 0) return;
        const match = threads.find((thread) => thread.id === preselectedClientId);
        if (match) setSelectedClientId(match.id);
    }, [isStaff, preselectedClientId, threads]);

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
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [isAllowed, loadMessages, selectedClientId]);

    useEffect(() => {
        if (!messagesEndRef.current) return;
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
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
            className="font-product text-neutral-900 fixed inset-x-0 top-[45px] z-10 mx-auto w-full max-w-[1440px] flex flex-col overflow-hidden bg-white"
            style={{ height: 'calc(var(--app-height, 100dvh) - 45px)' }}
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

                            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 custom-scrollbar overscroll-y-contain bg-neutral-50">
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
                                    return (
                                        <div key={message.id} className={`flex flex-col max-w-[85%] ${isOutbound ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                                            <span className="text-[10px] text-neutral-500 mb-1">{senderName}</span>
                                            <div className={`relative px-3 py-2 text-sm rounded-lg shadow-sm ${isOutbound ? 'bg-[#d9fdd3] text-neutral-900 rounded-tr-none' : 'bg-white text-neutral-900 rounded-tl-none'}`}>
                                                <p className="whitespace-pre-wrap">{message.body}</p>
                                                <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-neutral-500">
                                                    <span>{formatTime(message.created_at)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>

                            <div className="shrink-0 border-t border-black/5 px-4 pt-3 pb-2 bg-white shadow-[0_-12px_24px_-20px_rgba(0,0,0,0.3)]" style={{ paddingBottom: '1rem' }}>
                                {migrationPending && (
                                    <p className="text-xs text-amber-600 mb-2">
                                        Para habilitar este chat, ejecuta `supabase/client-messaging.sql`.
                                    </p>
                                )}
                                <div className="flex items-center gap-2">
                                    <input
                                        value={messageText}
                                        onChange={(event) => setMessageText(event.target.value)}
                                        placeholder="Escribe un mensaje"
                                        className="flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-neutral-400 focus:outline-none"
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
