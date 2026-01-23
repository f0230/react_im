import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Hash, MessageSquare, Plus, RefreshCw, Search, Send } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';

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

const buildSlug = (value) => {
    if (!value) return '';
    return value
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .slice(0, 60);
};

const TeamChat = () => {
    const { user, profile } = useAuth();
    const isAllowed = profile?.role === 'admin' || profile?.role === 'worker';
    const canCreateChannel = profile?.role === 'admin';

    const [channels, setChannels] = useState([]);
    const [selectedChannelId, setSelectedChannelId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [loadingChannels, setLoadingChannels] = useState(false);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [error, setError] = useState('');
    const [sendError, setSendError] = useState('');
    const [messageText, setMessageText] = useState('');
    const [sending, setSending] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newChannelName, setNewChannelName] = useState('');
    const [channelError, setChannelError] = useState('');
    const [creatingChannel, setCreatingChannel] = useState(false);
    const [people, setPeople] = useState([]);
    const [members, setMembers] = useState([]);
    const [membersLoading, setMembersLoading] = useState(false);
    const [membersError, setMembersError] = useState('');
    const [isMembersOpen, setIsMembersOpen] = useState(false);
    const [selectedMemberIds, setSelectedMemberIds] = useState([]);
    const [savingMembers, setSavingMembers] = useState(false);

    const messagesEndRef = useRef(null);

    const selectedChannel = useMemo(
        () => channels.find((channel) => channel.id === selectedChannelId) || null,
        [channels, selectedChannelId]
    );

    const filteredChannels = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        if (!term) return channels;
        return channels.filter((channel) =>
            [channel.name, channel.slug]
                .filter(Boolean)
                .some((value) => value.toLowerCase().includes(term))
        );
    }, [channels, searchTerm]);

    const loadChannels = useCallback(async (background = false) => {
        if (!isAllowed) return;
        if (!background) setLoadingChannels(true);
        setError('');

        const { data, error: supaError } = await supabase
            .from('team_channels')
            .select('*')
            .order('name', { ascending: true });

        if (supaError) {
            if (!background) setError(supaError.message || 'No se pudo cargar los canales.');
        } else {
            const nextChannels = data || [];
            setChannels(nextChannels);
            if (!selectedChannelId && nextChannels.length > 0) {
                setSelectedChannelId(nextChannels[0].id);
            } else if (selectedChannelId && !nextChannels.some((channel) => channel.id === selectedChannelId)) {
                setSelectedChannelId(nextChannels[0]?.id || null);
            }
        }

        if (!background) setLoadingChannels(false);
    }, [isAllowed, selectedChannelId]);

    const loadMessages = useCallback(async (channelId, background = false) => {
        if (!channelId || !isAllowed) return;
        if (!background) setLoadingMessages(true);
        setSendError('');

        const { data, error: supaError } = await supabase
            .from('team_messages')
            .select('id, body, created_at, author_id, author_name, author:profiles(id, full_name, email, avatar_url)')
            .eq('channel_id', channelId)
            .order('created_at', { ascending: true });

        if (supaError) {
            if (!background) setError(supaError.message || 'No se pudieron cargar los mensajes.');
        } else {
            setMessages(data || []);
        }

        if (!background) setLoadingMessages(false);
    }, [isAllowed]);

    const loadPeople = useCallback(async () => {
        if (!canCreateChannel) return;
        const { data, error: supaError } = await supabase
            .from('profiles')
            .select('id, full_name, email, role, avatar_url')
            .in('role', ['admin', 'worker'])
            .order('full_name', { ascending: true });

        if (supaError) {
            setMembersError(supaError.message || 'No se pudo cargar el equipo.');
        } else {
            setPeople(data || []);
        }
    }, [canCreateChannel]);

    const loadMembers = useCallback(async (channelId) => {
        if (!canCreateChannel || !channelId) return;
        setMembersLoading(true);
        setMembersError('');

        const { data, error: supaError } = await supabase
            .from('team_channel_members')
            .select('member_id, member:profiles(id, full_name, email, avatar_url, role)')
            .eq('channel_id', channelId);

        if (supaError) {
            setMembersError(supaError.message || 'No se pudo cargar los miembros.');
        } else {
            const nextMembers = data || [];
            setMembers(nextMembers);
            setSelectedMemberIds(nextMembers.map((member) => member.member_id));
        }

        setMembersLoading(false);
    }, [canCreateChannel]);

    const fetchMessageById = useCallback(async (messageId) => {
        const { data } = await supabase
            .from('team_messages')
            .select('id, body, created_at, author_id, author_name, author:profiles(id, full_name, email, avatar_url)')
            .eq('id', messageId)
            .single();
        return data || null;
    }, []);

    const handleSend = useCallback(async () => {
        if (!selectedChannelId || sending || !user?.id) return;
        const body = messageText.trim();
        if (!body) return;

        setSending(true);
        setSendError('');

        const { error: supaError } = await supabase
            .from('team_messages')
            .insert({
                channel_id: selectedChannelId,
                author_id: user.id,
                body,
            });

        if (supaError) {
            setSendError('No se pudo enviar el mensaje.');
        } else {
            setMessageText('');
        }

        setSending(false);
    }, [messageText, selectedChannelId, sending, user?.id]);

    const handleCreateChannel = useCallback(async () => {
        if (!canCreateChannel || !user?.id || creatingChannel) return;
        const name = newChannelName.trim();
        if (!name) return;

        setChannelError('');
        setCreatingChannel(true);

        const slug = buildSlug(name) || `canal-${Date.now()}`;

        const { data, error: supaError } = await supabase
            .from('team_channels')
            .insert({
                name,
                slug,
                created_by: user.id,
            })
            .select()
            .single();

        if (supaError) {
            setChannelError(supaError.message || 'No se pudo crear el canal.');
        } else if (data) {
            setChannels((prev) => {
                const next = [...prev, data];
                return next.sort((a, b) => a.name.localeCompare(b.name));
            });
            setSelectedChannelId(data.id);
            setNewChannelName('');
            setIsCreateOpen(false);
            const { error: memberError } = await supabase
                .from('team_channel_members')
                .upsert(
                    { channel_id: data.id, member_id: user.id, added_by: user.id },
                    { onConflict: 'channel_id,member_id' }
                );
            if (memberError && memberError.code !== '23505' && memberError.status !== 409) {
                setChannelError(memberError.message || 'No se pudo asignar el creador al canal.');
            }
        }

        setCreatingChannel(false);
    }, [canCreateChannel, creatingChannel, newChannelName, user?.id]);

    const handleSaveMembers = useCallback(async () => {
        if (!canCreateChannel || !selectedChannelId || savingMembers) return;
        setSavingMembers(true);
        setMembersError('');

        const currentIds = new Set(members.map((member) => member.member_id));
        const selectedIds = new Set(selectedMemberIds);

        const toAdd = [...selectedIds].filter((id) => !currentIds.has(id));
        const toRemove = [...currentIds].filter((id) => !selectedIds.has(id));

        if (toAdd.length > 0) {
            const payload = toAdd.map((memberId) => ({
                channel_id: selectedChannelId,
                member_id: memberId,
                added_by: user?.id || null,
            }));
            const { error: insertError } = await supabase
                .from('team_channel_members')
                .upsert(payload, { onConflict: 'channel_id,member_id' });
            if (insertError && insertError.code !== '23505' && insertError.status !== 409) {
                setMembersError(insertError.message || 'No se pudo agregar miembros.');
            }
        }

        if (toRemove.length > 0) {
            const { error: deleteError } = await supabase
                .from('team_channel_members')
                .delete()
                .eq('channel_id', selectedChannelId)
                .in('member_id', toRemove);
            if (deleteError) {
                setMembersError(deleteError.message || 'No se pudo quitar miembros.');
            }
        }

        await loadMembers(selectedChannelId);
        setSavingMembers(false);
    }, [canCreateChannel, loadMembers, members, savingMembers, selectedChannelId, selectedMemberIds, user?.id]);

    useEffect(() => {
        if (!isAllowed) return;
        loadChannels();

        const channelSubscription = supabase
            .channel('team-channels')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'team_channels' },
                (payload) => {
                    const { eventType, new: newRecord, old: oldRecord } = payload;
                    setChannels((prev) => {
                        if (eventType === 'INSERT') {
                            const exists = prev.some((channel) => channel.id === newRecord.id);
                            if (exists) return prev;
                            return [...prev, newRecord].sort((a, b) => a.name.localeCompare(b.name));
                        }
                        if (eventType === 'UPDATE') {
                            return prev
                                .map((channel) => (channel.id === newRecord.id ? newRecord : channel))
                                .sort((a, b) => a.name.localeCompare(b.name));
                        }
                        if (eventType === 'DELETE') {
                            return prev.filter((channel) => channel.id !== oldRecord.id);
                        }
                        return prev;
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channelSubscription);
        };
    }, [isAllowed, loadChannels]);

    useEffect(() => {
        if (!canCreateChannel) return;
        loadPeople();
    }, [canCreateChannel, loadPeople]);

    useEffect(() => {
        if (!selectedChannelId || !isAllowed) return;

        setMessages([]);
        loadMessages(selectedChannelId);

        const messageSubscription = supabase
            .channel(`team-messages-${selectedChannelId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'team_messages',
                    filter: `channel_id=eq.${selectedChannelId}`,
                },
                async (payload) => {
                    const fullMessage = await fetchMessageById(payload.new.id);
                    setMessages((prev) => {
                        if (prev.some((message) => message.id === payload.new.id)) return prev;
                        return [...prev, fullMessage || payload.new];
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(messageSubscription);
        };
    }, [fetchMessageById, isAllowed, loadMessages, selectedChannelId]);

    useEffect(() => {
        if (!canCreateChannel || !selectedChannelId) return;
        loadMembers(selectedChannelId);
    }, [canCreateChannel, loadMembers, selectedChannelId]);

    useEffect(() => {
        if (!messagesEndRef.current) return;
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, [messages.length, selectedChannelId]);

    if (!isAllowed) {
        return (
            <div className="font-product text-neutral-900">
                <div className="rounded-2xl bg-white border border-black/5 shadow-lg p-8">
                    <h2 className="text-xl font-semibold mb-2">Acceso restringido</h2>
                    <p className="text-sm text-neutral-500">
                        Este chat interno solo esta disponible para roles admin y worker.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="font-product text-neutral-900 h-[calc(100vh-55px)] h-[calc(100svh-55px)] h-[calc(100dvh-55px)] min-h-[calc(100svh-55px)] flex overflow-hidden bg-white w-full max-w-[1440px] mx-auto">
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-[320px_1fr] min-h-0">
                <div className={`flex-col h-full overflow-hidden border-r border-neutral-200 ${selectedChannelId ? 'hidden lg:flex' : 'flex'}`}>
                    <div className="p-4 border-b border-black/5 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Hash size={18} className="text-neutral-500" />
                                <p className="text-sm font-semibold text-neutral-800">Canales</p>
                            </div>
                            {canCreateChannel && (
                                <button
                                    onClick={() => setIsCreateOpen((prev) => !prev)}
                                    className="p-1 rounded-full border border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:border-neutral-400"
                                    title="Crear canal"
                                >
                                    <Plus size={16} />
                                </button>
                            )}
                        </div>
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                            <input
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                                placeholder="Buscar canales..."
                                className="w-full rounded-full border border-black/10 bg-neutral-50 pl-9 pr-3 py-2 text-xs focus:border-black/40 focus:bg-white transition"
                            />
                        </div>
                        {isCreateOpen && canCreateChannel && (
                            <div className="space-y-2">
                                <input
                                    value={newChannelName}
                                    onChange={(event) => setNewChannelName(event.target.value)}
                                    placeholder="Nombre del canal"
                                    className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs focus:border-neutral-400 focus:outline-none"
                                />
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleCreateChannel}
                                        disabled={creatingChannel || !newChannelName.trim()}
                                        className="px-3 py-1.5 rounded-full bg-black text-white text-xs font-semibold disabled:opacity-60"
                                    >
                                        {creatingChannel ? 'Creando...' : 'Crear'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsCreateOpen(false);
                                            setNewChannelName('');
                                            setChannelError('');
                                        }}
                                        className="text-xs text-neutral-500 hover:text-neutral-700"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                                {channelError && (
                                    <p className="text-xs text-amber-600">{channelError}</p>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                        {error && !loadingChannels && (
                            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-700">
                                <p className="font-semibold mb-1">Error de carga</p>
                                {error}
                                <button
                                    onClick={() => loadChannels()}
                                    className="block mt-2 underline font-medium hover:text-amber-900"
                                >
                                    Reintentar
                                </button>
                            </div>
                        )}
                        {!loadingChannels && !error && filteredChannels.length === 0 && (
                            <div className="text-sm text-neutral-400 px-2">No hay canales disponibles.</div>
                        )}
                        {filteredChannels.map((channel) => {
                            const isActive = channel.id === selectedChannelId;
                            return (
                                <button
                                    key={channel.id}
                                    onClick={() => setSelectedChannelId(channel.id)}
                                    className={`w-full text-left rounded-2xl border px-3 py-2.5 transition ${isActive
                                        ? 'border-black/10 bg-black text-white shadow-lg'
                                        : 'border-black/5 bg-white hover:bg-neutral-50'
                                        }`}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <Hash size={14} className={isActive ? 'text-white/70' : 'text-neutral-400'} />
                                            <p className={`text-sm font-semibold truncate ${isActive ? 'text-white' : 'text-neutral-900'}`}>
                                                {channel.name}
                                            </p>
                                        </div>
                                        <span className={`text-[10px] shrink-0 ${isActive ? 'text-white/60' : 'text-neutral-400'}`}>
                                            {formatTimestamp(channel.created_at)}
                                        </span>
                                    </div>
                                    {channel.description && (
                                        <p className={`text-xs mt-1 truncate ${isActive ? 'text-white/70' : 'text-neutral-500'}`}>
                                            {channel.description}
                                        </p>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className={`flex-col h-full overflow-hidden bg-white ${!selectedChannelId ? 'hidden lg:flex' : 'flex'}`}>
                    {selectedChannel ? (
                        <>
                            <div className="sticky top-0 z-20 border-b border-neutral-200 bg-white/90 backdrop-blur">
                                <div className="px-4 py-3 flex items-center justify-between gap-4">
                                    <div className="min-w-0">
                                        <p className="text-base font-semibold text-neutral-900 flex items-center gap-2">
                                            <Hash size={16} className="text-neutral-400" />
                                            <span className="truncate">{selectedChannel.name}</span>
                                        </p>
                                  
                                    </div>
                                    {canCreateChannel && (
                                        <button
                                            onClick={() => {
                                                setIsMembersOpen(true);
                                                loadMembers(selectedChannelId);
                                            }}
                                            className="rounded-full border border-neutral-200 px-3 py-1 text-xs font-semibold text-neutral-600 hover:text-neutral-900 hover:border-neutral-400"
                                        >
                                            Miembros
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 custom-scrollbar bg-neutral-50">
                                {loadingMessages && (
                                    <div className="text-xs text-neutral-400">Cargando mensajes...</div>
                                )}
                                {!loadingMessages && messages.length === 0 && (
                                    <div className="text-sm text-neutral-400">No hay mensajes en este canal.</div>
                                )}
                                {messages.map((message) => {
                                    const isOutbound = message.author_id === user?.id;
                                    const authorName = isOutbound
                                        ? 'Tú'
                                        : message?.author?.full_name
                                            || message?.author_name
                                            || message?.author?.email
                                            || 'Equipo';
                                    return (
                                        <div key={message.id} className={`flex flex-col max-w-[85%] ${isOutbound ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                                            <span className="text-[10px] text-neutral-500 mb-1">
                                                {authorName}
                                            </span>
                                            <div
                                                className={`relative px-3 py-2 text-sm rounded-lg shadow-sm ${isOutbound
                                                    ? 'bg-[#d9fdd3] text-neutral-900 rounded-tr-none'
                                                    : 'bg-white text-neutral-900 rounded-tl-none'
                                                    }`}
                                            >
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

                            <div className="border-t border-black/5 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shrink-0 bg-white sticky bottom-0 shadow-[0_-12px_24px_-20px_rgba(0,0,0,0.3)]">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <textarea
                                            value={messageText}
                                            onChange={(event) => setMessageText(event.target.value)}
                                            placeholder="Escribe un mensaje para el equipo"
                                            className="flex-1 min-h-[44px] max-h-32 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-neutral-400 focus:outline-none resize-none"
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
                                            className="p-2 text-neutral-500 hover:text-neutral-700 transition disabled:opacity-50"
                                        >
                                            {sending ? <RefreshCw size={20} className="animate-spin" /> : <Send size={20} />}
                                        </button>
                                    </div>
                                    {sendError && <p className="text-xs text-red-600">{sendError}</p>}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-neutral-400">
                            <div className="text-center">
                                <MessageSquare size={32} className="mx-auto mb-3" />
                                <p className="font-semibold text-neutral-700">Selecciona un canal</p>
                                <p className="text-sm text-neutral-400 mt-1">
                                    Elige un canal para ver los mensajes.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {isMembersOpen && canCreateChannel && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
                    <div className="relative w-full max-w-3xl h-[80svh] rounded-3xl bg-white shadow-2xl border border-neutral-200 overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-200 bg-white">
                            <div>
                                <p className="text-sm font-semibold text-neutral-900">Miembros del canal</p>
                                <p className="text-xs text-neutral-500">Selecciona quienes pueden ver este canal.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsMembersOpen(false)}
                                className="p-2 rounded-full hover:bg-neutral-100 text-neutral-500"
                                aria-label="Cerrar"
                            >
                                X
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto bg-neutral-50 p-4 space-y-3">
                            {membersLoading && (
                                <div className="text-xs text-neutral-400">Cargando miembros...</div>
                            )}
                            {!membersLoading && people.length === 0 && (
                                <div className="text-sm text-neutral-400">No hay usuarios disponibles.</div>
                            )}
                            {people.map((person) => {
                                const isChecked = selectedMemberIds.includes(person.id);
                                const label = person.full_name || person.email;
                                return (
                                    <label
                                        key={person.id}
                                        className="flex items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3 shadow-sm"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-9 h-9 rounded-full bg-neutral-100 text-neutral-700 flex items-center justify-center text-xs font-semibold">
                                                {(label || 'U').charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-neutral-900 truncate">{label}</p>
                                                <p className="text-xs text-neutral-500 truncate">{person.role}</p>
                                            </div>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => {
                                                setSelectedMemberIds((prev) => {
                                                    if (prev.includes(person.id)) {
                                                        return prev.filter((id) => id !== person.id);
                                                    }
                                                    return [...prev, person.id];
                                                });
                                            }}
                                            className="h-4 w-4"
                                        />
                                    </label>
                                );
                            })}
                            {membersError && (
                                <p className="text-xs text-amber-600">{membersError}</p>
                            )}
                        </div>
                        <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-neutral-200 bg-white">
                            <button
                                type="button"
                                onClick={() => setIsMembersOpen(false)}
                                className="text-xs text-neutral-500 hover:text-neutral-700"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveMembers}
                                disabled={savingMembers}
                                className="px-4 py-2 rounded-full bg-black text-white text-xs font-semibold disabled:opacity-60"
                            >
                                {savingMembers ? 'Guardando...' : 'Guardar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeamChat;
