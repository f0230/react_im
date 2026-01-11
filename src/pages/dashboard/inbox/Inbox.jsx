import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Search, RefreshCw, Send, Phone } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';

const STATUS_META = {
    open: { label: 'Open', className: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
    pending: { label: 'Pending', className: 'bg-amber-50 text-amber-700 border border-amber-200' },
    closed: { label: 'Closed', className: 'bg-neutral-100 text-neutral-600 border border-neutral-200' },
};

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
    const isAllowed = profile?.role === 'admin' || profile?.role === 'worker';
    const [threads, setThreads] = useState([]);
    const [messages, setMessages] = useState([]);
    const [assignees, setAssignees] = useState([]);
    const [selectedThreadId, setSelectedThreadId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [loadingThreads, setLoadingThreads] = useState(false);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const [sendError, setSendError] = useState('');
    const [messageText, setMessageText] = useState('');
    const [useTemplate, setUseTemplate] = useState(false);
    const [templateName, setTemplateName] = useState('');
    const [templateLang, setTemplateLang] = useState('es');
    const [templateComponents, setTemplateComponents] = useState('');

    const selectedThread = useMemo(
        () => threads.find((thread) => thread.wa_id === selectedThreadId) || null,
        [threads, selectedThreadId]
    );

    const assigneeMap = useMemo(() => {
        return assignees.reduce((acc, user) => {
            acc[user.id] = user.full_name || user.email || 'User';
            return acc;
        }, {});
    }, [assignees]);

    const filteredThreads = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        return threads.filter((thread) => {
            if (filterStatus !== 'all' && thread.status !== filterStatus) {
                return false;
            }
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
    }, [threads, searchTerm, filterStatus]);

    const stats = useMemo(() => {
        return threads.reduce(
            (acc, thread) => {
                if (thread.status === 'open') acc.open += 1;
                if (thread.status === 'pending') acc.pending += 1;
                if (thread.status === 'closed') acc.closed += 1;
                return acc;
            },
            { open: 0, pending: 0, closed: 0 }
        );
    }, [threads]);

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

    const loadThreads = useCallback(async () => {
        if (!isAllowed) return;
        setLoadingThreads(true);
        setError('');
        const { data, error: supaError } = await supabase
            .from('whatsapp_threads')
            .select('*')
            .order('last_message_at', { ascending: false, nullsFirst: false });

        if (supaError) {
            setError('No se pudo cargar la bandeja.');
        } else {
            setThreads(data || []);
            if (!selectedThreadId && data?.length) {
                setSelectedThreadId(data[0].wa_id);
            }
        }
        setLoadingThreads(false);
    }, [isAllowed, selectedThreadId]);

    const loadMessages = useCallback(
        async (waId) => {
            if (!waId || !isAllowed) return;
            setLoadingMessages(true);
            const { data, error: supaError } = await supabase
                .from('whatsapp_messages')
                .select('*')
                .eq('wa_id', waId)
                .order('timestamp', { ascending: true });

            if (supaError) {
                setError('No se pudieron cargar los mensajes.');
            } else {
                setMessages(data || []);
            }
            setLoadingMessages(false);
        },
        [isAllowed]
    );

    const refreshAll = useCallback(async () => {
        await loadThreads();
        if (selectedThreadId) {
            await loadMessages(selectedThreadId);
        }
    }, [loadThreads, loadMessages, selectedThreadId]);

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

    const handleSend = useCallback(async () => {
        if (!selectedThreadId || sending) return;
        setSendError('');

        let payload = null;
        if (useTemplate) {
            if (!templateName.trim()) {
                setSendError('Template requerido.');
                return;
            }
            let components = [];
            if (templateComponents.trim()) {
                try {
                    components = JSON.parse(templateComponents);
                } catch (parseError) {
                    setSendError('Components JSON invalido.');
                    return;
                }
            }
            payload = {
                to: selectedThreadId,
                template: {
                    name: templateName.trim(),
                    language: templateLang.trim() || 'es',
                    components,
                },
            };
        } else {
            const body = messageText.trim();
            if (!body) return;
            payload = { to: selectedThreadId, text: body };
        }

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
            await loadMessages(selectedThreadId);
            await loadThreads();
        } catch (sendErr) {
            setSendError(sendErr.message || 'Error enviando mensaje');
        } finally {
            setSending(false);
        }
    }, [
        selectedThreadId,
        sending,
        useTemplate,
        templateName,
        templateLang,
        templateComponents,
        messageText,
        loadMessages,
        loadThreads,
    ]);

    useEffect(() => {
        if (!isAllowed) return;
        loadAssignees();
        loadThreads();
    }, [isAllowed, loadAssignees, loadThreads]);

    useEffect(() => {
        if (selectedThreadId) {
            loadMessages(selectedThreadId);
        }
    }, [selectedThreadId, loadMessages]);

    useEffect(() => {
        if (!isAllowed) return;
        const interval = setInterval(() => {
            refreshAll();
        }, 15000);
        return () => clearInterval(interval);
    }, [isAllowed, refreshAll]);

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
        <div className="font-product text-neutral-900 pb-12">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-neutral-400">WhatsApp</p>
                    <h1 className="text-3xl md:text-4xl font-bold text-neutral-900">Inbox</h1>
                    <p className="text-sm text-neutral-500 mt-2 max-w-xl">
                        Centraliza las conversaciones y asigna cada chat a un worker o admin desde un solo numero.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={refreshAll}
                        className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider rounded-full border border-black/10 bg-white hover:bg-neutral-50 transition"
                    >
                        <RefreshCw size={14} />
                        Refresh
                    </button>
                    <div className="rounded-full border border-black/10 px-3 py-2 text-xs text-neutral-500 bg-white">
                        {loadingThreads ? 'Sync...' : `${threads.length} threads`}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
                <div className="rounded-2xl bg-white border border-black/5 shadow-lg p-4">
                    <p className="text-xs uppercase tracking-widest text-neutral-400">Open</p>
                    <p className="text-2xl font-semibold text-emerald-600 mt-2">{stats.open}</p>
                </div>
                <div className="rounded-2xl bg-white border border-black/5 shadow-lg p-4">
                    <p className="text-xs uppercase tracking-widest text-neutral-400">Pending</p>
                    <p className="text-2xl font-semibold text-amber-600 mt-2">{stats.pending}</p>
                </div>
                <div className="rounded-2xl bg-white border border-black/5 shadow-lg p-4">
                    <p className="text-xs uppercase tracking-widest text-neutral-400">Closed</p>
                    <p className="text-2xl font-semibold text-neutral-600 mt-2">{stats.closed}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6 mt-8">
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-3xl bg-white border border-black/5 shadow-xl flex flex-col min-h-[580px]"
                >
                    <div className="p-4 border-b border-black/5">
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                                <input
                                    value={searchTerm}
                                    onChange={(event) => setSearchTerm(event.target.value)}
                                    placeholder="Buscar por nombre o numero"
                                    className="w-full rounded-full border border-black/10 bg-neutral-50 pl-9 pr-3 py-2 text-sm focus:border-black/40 focus:bg-white transition"
                                />
                            </div>
                            <select
                                value={filterStatus}
                                onChange={(event) => setFilterStatus(event.target.value)}
                                className="rounded-full border border-black/10 bg-neutral-50 px-3 py-2 text-xs uppercase tracking-wide text-neutral-600"
                            >
                                <option value="all">Todos</option>
                                <option value="open">Open</option>
                                <option value="pending">Pending</option>
                                <option value="closed">Closed</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {loadingThreads && (
                            <div className="text-xs text-neutral-400 px-2">Cargando bandeja...</div>
                        )}
                        {!loadingThreads && filteredThreads.length === 0 && (
                            <div className="text-sm text-neutral-400 px-2">No hay conversaciones.</div>
                        )}
                        {filteredThreads.map((thread) => {
                            const statusMeta = STATUS_META[thread.status] || STATUS_META.open;
                            const assigneeName = thread.assigned_to ? assigneeMap[thread.assigned_to] : null;
                            const displayName = thread.client_name || thread.client_phone || thread.wa_id || 'Cliente';
                            const isActive = thread.wa_id === selectedThreadId;
                            return (
                                <button
                                    key={thread.wa_id}
                                    onClick={() => setSelectedThreadId(thread.wa_id)}
                                    className={`w-full text-left rounded-2xl border px-3 py-3 transition ${
                                        isActive
                                            ? 'border-black/10 bg-black text-white shadow-lg'
                                            : 'border-black/5 bg-white hover:bg-neutral-50'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                                                isActive ? 'bg-white/10 text-white' : 'bg-neutral-100 text-neutral-700'
                                            }`}
                                        >
                                            {getInitial(displayName)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className={`text-sm font-semibold truncate ${isActive ? 'text-white' : 'text-neutral-900'}`}>
                                                    {displayName}
                                                </p>
                                                <span className={`text-[10px] ${isActive ? 'text-white/60' : 'text-neutral-400'}`}>
                                                    {formatTimestamp(thread.last_message_at)}
                                                </span>
                                            </div>
                                            <p className={`text-xs truncate ${isActive ? 'text-white/70' : 'text-neutral-500'}`}>
                                                {thread.last_message || 'Sin mensajes'}
                                            </p>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className={`text-[10px] uppercase px-2 py-0.5 rounded-full ${statusMeta.className}`}>
                                                    {statusMeta.label}
                                                </span>
                                                <span className={`text-[10px] ${isActive ? 'text-white/70' : 'text-neutral-400'}`}>
                                                    {assigneeName ? `Asignado: ${assigneeName}` : 'Sin asignar'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-3xl bg-white border border-black/5 shadow-xl flex flex-col min-h-[580px]"
                >
                    {selectedThread ? (
                        <>
                            <div className="p-5 border-b border-black/5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center font-semibold">
                                        {getInitial(selectedThread.client_name || selectedThread.client_phone || selectedThread.wa_id)}
                                    </div>
                                    <div>
                                        <p className="text-lg font-semibold text-neutral-900">
                                            {selectedThread.client_name || selectedThread.client_phone || selectedThread.wa_id}
                                        </p>
                                        <div className="flex items-center gap-2 text-xs text-neutral-500">
                                            <Phone size={12} />
                                            {selectedThread.wa_id}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-3">
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

                            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 bg-gradient-to-b from-white via-white to-neutral-50">
                                {loadingMessages && (
                                    <div className="text-xs text-neutral-400">Cargando mensajes...</div>
                                )}
                                {!loadingMessages && messages.length === 0 && (
                                    <div className="text-sm text-neutral-400">No hay mensajes en esta conversacion.</div>
                                )}
                                {messages.map((message) => {
                                    const isOutbound = message.direction === 'outbound';
                                    const bubbleClass = isOutbound
                                        ? 'ml-auto bg-black text-white'
                                        : 'mr-auto bg-neutral-100 text-neutral-900';
                                    return (
                                        <div key={message.id || message.message_id} className="flex flex-col">
                                            <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm ${bubbleClass}`}>
                                                <p className="whitespace-pre-wrap">
                                                    {message.body || (message.type ? `[${message.type}]` : 'Mensaje')}
                                                </p>
                                                <div
                                                    className={`mt-2 flex items-center justify-between gap-3 text-[10px] ${
                                                        isOutbound ? 'text-white/60' : 'text-neutral-500'
                                                    }`}
                                                >
                                                    <span>{formatTime(message.timestamp)}</span>
                                                    {isOutbound && message.status ? (
                                                        <span className="uppercase tracking-widest">{message.status}</span>
                                                    ) : null}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="border-t border-black/5 p-4">
                                <div className="space-y-3">
                                    <textarea
                                        value={messageText}
                                        onChange={(event) => setMessageText(event.target.value)}
                                        placeholder="Escribe un mensaje..."
                                        rows={3}
                                        className="w-full rounded-2xl border border-black/10 bg-neutral-50 px-4 py-3 text-sm focus:bg-white focus:border-black/30 transition"
                                    />
                                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                        <label className="flex items-center gap-2 text-xs text-neutral-500">
                                            <input
                                                type="checkbox"
                                                checked={useTemplate}
                                                onChange={(event) => setUseTemplate(event.target.checked)}
                                                className="rounded border-black/10"
                                            />
                                            Usar template (requerido fuera de 24h)
                                        </label>
                                        <button
                                            onClick={handleSend}
                                            disabled={sending || (!useTemplate && !messageText.trim())}
                                            className="inline-flex items-center gap-2 rounded-full bg-black text-white px-4 py-2 text-xs uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-900 transition"
                                        >
                                            <Send size={14} />
                                            {sending ? 'Enviando...' : 'Enviar'}
                                        </button>
                                    </div>
                                    {useTemplate && (
                                        <div className="grid grid-cols-1 md:grid-cols-[1fr_120px] gap-3">
                                            <input
                                                value={templateName}
                                                onChange={(event) => setTemplateName(event.target.value)}
                                                placeholder="template_name"
                                                className="rounded-xl border border-black/10 bg-neutral-50 px-3 py-2 text-sm focus:bg-white focus:border-black/30 transition"
                                            />
                                            <input
                                                value={templateLang}
                                                onChange={(event) => setTemplateLang(event.target.value)}
                                                placeholder="es"
                                                className="rounded-xl border border-black/10 bg-neutral-50 px-3 py-2 text-sm focus:bg-white focus:border-black/30 transition"
                                            />
                                            <textarea
                                                value={templateComponents}
                                                onChange={(event) => setTemplateComponents(event.target.value)}
                                                placeholder='components JSON opcional: [{"type":"body","parameters":[{"type":"text","text":"Juan"}]}]'
                                                rows={2}
                                                className="md:col-span-2 rounded-xl border border-black/10 bg-neutral-50 px-3 py-2 text-xs focus:bg-white focus:border-black/30 transition"
                                            />
                                        </div>
                                    )}
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
                </motion.div>
            </div>
        </div>
    );
};

export default Inbox;
