import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { MessageSquare, Search, RefreshCw, Send, Phone, Paperclip, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { useLocation } from 'react-router-dom';

const formatTimestamp = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('es-ES', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
};

const formatTime = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
};

const getInitial = (name) => {
    if (!name) return 'C';
    return name.trim().charAt(0).toUpperCase();
};

const Inbox = () => {
    const { profile } = useAuth();
    const location = useLocation();
    const isAllowed = profile?.role === 'admin' || profile?.role === 'worker';
    const [threads, setThreads] = useState([]);
    const [messages, setMessages] = useState([]);
    const [assignees, setAssignees] = useState([]);
    const [selectedThreadId, setSelectedThreadId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [loadingThreads, setLoadingThreads] = useState(false);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const [sendError, setSendError] = useState('');
    const [messageText, setMessageText] = useState('');
    const [uploading, setUploading] = useState(false);
    const fileInputRef = React.useRef(null);

    const preselectWaId = useMemo(() => {
        const params = new URLSearchParams(location.search);
        const raw = params.get('wa');
        if (!raw) return null;
        const normalized = raw.replace(/\D/g, '');
        return normalized || raw;
    }, [location.search]);

    const selectedThread = useMemo(
        () => threads.find((thread) => thread.wa_id === selectedThreadId) || null,
        [threads, selectedThreadId]
    );

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

    useEffect(() => {
        if (!preselectWaId || selectedThreadId || threads.length === 0) return;
        const match = threads.find((thread) => {
            if (!thread) return false;
            const candidates = [thread.wa_id, thread.client_phone].filter(Boolean).map(String);
            return candidates.some((value) => {
                if (value === preselectWaId) return true;
                return value.replace(/\D/g, '') === preselectWaId;
            });
        });
        if (match) {
            setSelectedThreadId(match.wa_id);
        }
    }, [preselectWaId, selectedThreadId, threads]);

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
                }
            )
            .subscribe();

        loadMessages(selectedThreadId);

        return () => {
            supabase.removeChannel(messageChannel);
        };

    }, [selectedThreadId, loadMessages, isAllowed]);


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
        <div className="font-product text-neutral-900 h-[calc(100vh-55px)] flex overflow-hidden bg-white w-full max-w-[1440px] mx-auto">

            {/* Main Content Grid */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-[360px_1fr] min-h-0">
                {/* List Side */}
                <div
                    className={`flex-col h-full overflow-hidden border-r border-neutral-200 ${selectedThreadId ? 'hidden lg:flex' : 'flex'
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
                    <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
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
                    className={`flex-col h-full overflow-hidden bg-white ${!selectedThreadId ? 'hidden lg:flex' : 'flex'
                        }`}
                >
                    {selectedThread ? (
                        <>
                            <div className="p-3 bg-neutral-100 border-b border-neutral-200 flex items-center justify-between gap-4 shrink-0 h-[60px] flex-nowrap overflow-x-auto">
                                <div className="flex items-center gap-3 min-w-0">
                                    <button
                                        onClick={() => setSelectedThreadId(null)}
                                        className="lg:hidden p-2 -ml-2 text-neutral-500 hover:text-neutral-900"
                                    >
                                        <ArrowLeft size={20} />
                                    </button>
                                    <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center font-semibold">
                                        {getInitial(selectedThread.client_name || selectedThread.client_phone || selectedThread.wa_id)}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-lg font-semibold text-neutral-900 truncate">
                                            {selectedThread.client_name || selectedThread.client_phone || selectedThread.wa_id}
                                        </p>
                                        <div className="flex items-center gap-2 text-xs text-neutral-500 truncate">
                                            <Phone size={12} />
                                            {selectedThread.wa_id}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0 flex-nowrap">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] uppercase tracking-widest text-neutral-400">Estado</span>
                                        <select
                                            value={selectedThread.status || 'open'}
                                            onChange={(event) => updateThread({ status: event.target.value })}
                                            className="rounded-full border border-black/10 bg-neutral-50 px-3 py-2 text-xs uppercase tracking-wide text-neutral-700"
                                        >
                                            <option value="open">Open</option>
                                            <option value="pending">Pending</option>
                                            <option value="closed">Closed</option>
                                        </select>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] uppercase tracking-widest text-neutral-400">Asignar</span>
                                        <select
                                            value={selectedThread.assigned_to || ''}
                                            onChange={(event) =>
                                                updateThread({ assigned_to: event.target.value || null })
                                            }
                                            className="rounded-full border border-black/10 bg-neutral-50 px-3 py-2 text-xs text-neutral-700"
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
                            </div>

                            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 custom-scrollbar bg-neutral-50">
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

                            <div className="border-t border-black/5 p-4 shrink-0 bg-white">
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
        </div>
    );
};

export default Inbox;
