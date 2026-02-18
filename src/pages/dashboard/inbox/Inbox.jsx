import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MessageSquare, Search, RefreshCw, Send, Phone, Paperclip, ArrowLeft, X } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { useLocation, useSearchParams } from 'react-router-dom';
import ClientDetail from '@/pages/dashboard/crm/ClientDetail';
import useViewportHeight from '@/hooks/useViewportHeight';
import MessagingTabs from '@/components/messaging/MessagingTabs';
import { formatTime, formatTimestamp, getInitial, normalizePhone } from '@/utils/messagingFormatters';


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
    const [isClientModalOpen, setIsClientModalOpen] = useState(false);
    const [clientIdByWa, setClientIdByWa] = useState({});
    const fileInputRef = React.useRef(null);
    const inputRef = React.useRef(null);
    const lastReadRef = useRef({});




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
            .order('full_name', { ascending: true });

        if (!supaError && data) {
            setAssignees(data);
        }
    }, []);

    const loadThreads = useCallback(async (background = false) => {
        if (!isAllowed) return;
        if (!background) setLoadingThreads(true);
        setError('');
        const { data, error: supaError } = await supabase
            .from('whatsapp_threads')
            .select('*')
            .order('last_message_at', { ascending: false, nullsFirst: false });

        if (supaError) {
            if (!background) setError('No se pudo cargar la bandeja.');
        } else {
            setThreads(data || []);
        }
        if (!background) setLoadingThreads(false);
    }, [isAllowed]);

    const loadMessages = useCallback(
        async (waId, background = false) => {
            if (!waId || !isAllowed) return;
            if (!background) setLoadingMessages(true);
            const { data, error: supaError } = await supabase
                .from('whatsapp_messages')
                .select('*')
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
            const { data, error: supaError } = await supabase
                .from('whatsapp_threads')
                .update(updates)
                .eq('wa_id', selectedThreadId)
                .select()
                .single();

            if (!supaError && data) {
                setThreads((prev) =>
                    prev.map((thread) => (thread.wa_id === data.wa_id ? { ...thread, ...data } : thread))
                );
            }
        },
        [selectedThreadId]
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
        if (!selectedThreadId || aiToggleLoading) return;
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
    }, [aiToggleLoading, selectedClientId, selectedThread?.ai_enabled, selectedThread?.id, selectedThreadId, updateThread]);

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

            setMessageText('');
            // No need to reload messages/threads manually, Realtime will handle it
            // eventually, but for UX 'snappiness' we might wait for the insert event
        } catch (sendErr) {
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
                            return [newRecord, ...prev];
                        } else if (eventType === 'UPDATE') {
                            return prev.map((t) => (t.id === newRecord.id ? newRecord : t))
                                .sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at));
                        } else if (eventType === 'DELETE') {
                            return prev.filter((t) => t.id !== oldRecord.id);
                        }
                        return prev;
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [isAllowed, loadAssignees, loadThreads]);


    // Better message filtering for current thread in Realtime
    useEffect(() => {
        if (!selectedThreadId || !isAllowed) return;

        setMessages([]);

        const messageChannel = supabase
            .channel(`messages-${selectedThreadId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'whatsapp_messages',
                    filter: `wa_id=eq.${selectedThreadId}`
                },
                (payload) => {
                    setMessages((prev) => {
                        if (prev.some((message) => message.id === payload.new.id)) return prev;
                        return [...prev, payload.new];
                    });
                    if (payload.new?.direction !== 'outbound') {
                        markThreadRead(selectedThreadId, payload.new.timestamp);
                    }
                }
            )
            .subscribe();

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
            if (!selectedThread.client_id) {
                await updateThread({ client_id: clientId });
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [findClientByPhone, resolvedClientId, selectedThread, selectedThreadId, updateThread]);

    useEffect(() => {
        if (!isClientModalOpen) return undefined;
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = originalOverflow;
        };
    }, [isClientModalOpen]);


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
            className="font-product text-neutral-900 fixed inset-x-0 top-[45px] z-10 mx-auto w-full max-w-[1440px] flex flex-col overflow-hidden bg-white"
            style={{ height: 'calc(var(--app-height, 100dvh) - 45px)' }}
        >
            <MessagingTabs />

            {/* Main Content Grid */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-[360px_1fr] min-h-0">
                {/* List Side */}
                <div
                    className={`flex flex-col min-h-0 h-full overflow-hidden border-r border-neutral-200 ${selectedThreadId ? 'hidden lg:flex' : 'flex'
                        }`}
                >
                    <div className="p-4 border-b border-black/5 shrink-0">
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                            <input
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                                placeholder="Buscar..."
                                className="w-full rounded-full border border-black/10 bg-neutral-50 pl-9 pr-3 py-2 text-sm focus:border-black/40 focus:bg-white transition"
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar overscroll-y-contain">
                        {loadingThreads && (
                            <div className="text-xs text-neutral-400 px-2 flex items-center gap-2">
                                <RefreshCw size={12} className="animate-spin" />
                                Cargando bandeja...
                            </div>
                        )}
                        {error && !loadingThreads && (
                            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-700">
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
                            <div className="text-sm text-neutral-400 px-2">No hay conversaciones.</div>
                        )}
                        {filteredThreads.map((thread) => {
                            const displayName = thread.client_name || thread.client_phone || thread.wa_id || 'Cliente';
                            const isActive = thread.wa_id === selectedThreadId;
                            return (
                                <button
                                    key={thread.wa_id}
                                    onClick={() => setSelectedThreadId(thread.wa_id)}
                                    className={`w-full text-left rounded-2xl border px-3 py-3 transition ${isActive
                                        ? 'border-black/10 bg-black text-white shadow-lg'
                                        : 'border-black/5 bg-white hover:bg-neutral-50'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${isActive ? 'bg-white/10 text-white' : 'bg-neutral-100 text-neutral-700'
                                                }`}
                                        >
                                            {getInitial(displayName)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className={`text-sm font-semibold truncate ${isActive ? 'text-white' : 'text-neutral-900'}`}>
                                                    {displayName}
                                                </p>
                                                <span className={`text-[10px] shrink-0 ${isActive ? 'text-white/60' : 'text-neutral-400'}`}>
                                                    {formatTimestamp(thread.last_message_at)}
                                                </span>
                                            </div>
                                            <p className={`text-xs truncate ${isActive ? 'text-white/70' : 'text-neutral-500'}`}>
                                                {thread.last_message || 'Sin mensajes'}
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Chat Side */}
                <div
                    className={`flex flex-col min-h-0 h-full overflow-hidden bg-white ${!selectedThreadId ? 'hidden lg:flex' : 'flex'
                        }`}
                >
                    {selectedThread ? (
                        <>
                            <div className="sticky top-0 z-20 border-b border-neutral-200 bg-white/90 backdrop-blur">
                                <div className="px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <button
                                            onClick={() => setSelectedThreadId(null)}
                                            className="lg:hidden p-2 -ml-2 text-neutral-500 hover:text-neutral-900"
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
                                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-50 to-sky-50 text-emerald-700 flex items-center justify-center font-semibold shadow-sm ring-1 ring-emerald-100">
                                                    {getInitial(selectedThread.client_name || selectedThread.client_phone || selectedThread.wa_id)}
                                                </div>
                                                <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-white shadow-sm flex items-center justify-center">
                                                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                                </span>
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-base font-semibold text-neutral-900 truncate group-hover:text-black">
                                                    {selectedThread.client_name || selectedThread.client_phone || selectedThread.wa_id}
                                                </p>
                                                <div className="flex items-center gap-2 text-xs text-neutral-500 truncate">
                                                    <Phone size={12} />
                                                    {selectedThread.wa_id}
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
                                    </div>
                                </div>
                            </div>

                            <div
                                className="flex-1 overflow-y-auto px-4 py-4 space-y-2 custom-scrollbar overscroll-y-contain bg-neutral-50"
                                style={{ paddingBottom: 'calc(72px + 1rem)' }}
                            >
                                {loadingMessages && (
                                    <div className="text-xs text-neutral-400">Cargando mensajes...</div>
                                )}
                                {!loadingMessages && messages.length === 0 && (
                                    <div className="text-sm text-neutral-400">No hay mensajes en esta conversacion.</div>
                                )}
                                {messages.map((message) => {
                                    const isOutbound = message.direction === 'outbound';
                                    const bubbleClass = isOutbound
                                        ? 'ml-auto bg-[#d9fdd3] text-neutral-900 rounded-tr-none shadow-sm'
                                        : 'mr-auto bg-white text-neutral-900 rounded-tl-none shadow-sm';

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
                                                    <img src={cleanUrl} alt="Sent image" className="rounded-lg max-w-full max-h-64 object-cover" />
                                                    {caption && <p>{caption}</p>}
                                                </div>
                                            );
                                        }
                                        if (message.type === 'video') {
                                            return (
                                                <div className="space-y-1">
                                                    <video src={cleanUrl} controls className="rounded-lg max-w-full max-h-64" />
                                                    {caption && <p>{caption}</p>}
                                                </div>
                                            );
                                        }
                                        if (message.type === 'audio') {
                                            return <audio src={cleanUrl} controls className="w-full min-w-[200px]" />;
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
                                        <div key={message.id || message.message_id} className="flex flex-col max-w-[85%]">
                                            <div className={`relative px-3 py-2 text-sm rounded-lg ${bubbleClass}`}>
                                                {renderContent()}
                                                <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-neutral-500">
                                                    <span>{formatTime(message.timestamp)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div
                                className="shrink-0 border-t border-black/5 px-4 pt-3 pb-2 bg-white shadow-[0_-12px_24px_-20px_rgba(0,0,0,0.3)]"
                                style={{ paddingBottom: '1rem' }}
                            >
                                <div className="space-y-3">
                                    <div className="flex flex-col gap-3">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                className="hidden"
                                                onChange={handleFileUpload}
                                                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
                                            />
                                            <button
                                                className="p-2 text-neutral-500 hover:text-neutral-700 transition"
                                                title="Adjuntar"
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={uploading}
                                            >
                                                {uploading ? <RefreshCw size={24} className="animate-spin" /> : <Paperclip size={24} />}
                                            </button>
                                            <input
                                                value={messageText}
                                                onChange={(event) => setMessageText(event.target.value)}
                                                placeholder="Escribe un mensaje"
                                                className="flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-neutral-400 focus:outline-none"
                                            />

                                            <button
                                                onClick={handleSend}
                                                disabled={sending || !messageText.trim()}
                                                className="p-2 text-neutral-500 hover:text-neutral-700 transition disabled:opacity-50"
                                            >
                                                <Send size={24} />
                                            </button>
                                        </div>
                                    </div>
                                    {sendError && <p className="text-xs text-red-600">{sendError}</p>}
                                    {error && <p className="text-xs text-amber-600">{error}</p>}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-neutral-400">
                            <div className="text-center">
                                <MessageSquare size={32} className="mx-auto mb-3" />
                                <p className="font-semibold text-neutral-700">Selecciona una conversacion</p>
                                <p className="text-sm text-neutral-400 mt-1">
                                    Elige un thread de la bandeja para ver los mensajes.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
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
