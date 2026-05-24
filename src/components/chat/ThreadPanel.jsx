import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Hash, RefreshCw, Send, X } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { formatShortDateTime, formatTime, getUserColor } from '@/utils/messagingFormatters';
import {
    ChatBubble,
    ChatBubbleAvatar,
    ChatBubbleMessage,
} from '@/components/ui/chat-bubble';
import MessageReactionsBar from '@/components/chat/MessageReactionsBar';
import ReactionPickerPopover from '@/components/chat/ReactionPickerPopover';
import { fetchReactionsForMessages, toggleReaction } from '@/services/chatReactions';
import ChatAudioPlayer from '@/components/chat/ChatAudioPlayer';

const THREAD_MESSAGE_COLUMNS = 'id, body, created_at, author_id, author_name, message_type, media_url, file_name, reply_to_id, thread_root_id, author:profiles(id, full_name, email, avatar_url)';

const getInitials = (value) => {
    if (!value || typeof value !== 'string') return '?';
    return value.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
};

const renderTextWithLinks = (text) => {
    if (!text) return null;
    const linkRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/i;
    const parts = text.split(linkRegex);
    return parts.map((part, i) => {
        if (linkRegex.test(part)) {
            const href = part.startsWith('http') ? part : `https://${part}`;
            return <a key={i} href={href} target="_blank" rel="noopener noreferrer" className="underline text-indigo-600 break-all">{part}</a>;
        }
        return <span key={i}>{part}</span>;
    });
};

const ThreadPanel = ({ rootMessage, onClose, channelId }) => {
    const { user, profile } = useAuth();
    const [replies, setReplies] = useState([]);
    const [loading, setLoading] = useState(false);
    const [messageText, setMessageText] = useState('');
    const [sending, setSending] = useState(false);
    const [sendError, setSendError] = useState('');
    const [reactionsByMessage, setReactionsByMessage] = useState({});
    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);
    const repliesRequestRef = useRef(0);
    const rootMessageIdRef = useRef(rootMessage?.id);

    rootMessageIdRef.current = rootMessage?.id;

    const authorName = rootMessage?.author_name || rootMessage?.author?.full_name || 'Equipo';

    const loadReplies = useCallback(async () => {
        if (!rootMessage?.id) return;
        const rootId = rootMessage.id;
        const requestId = repliesRequestRef.current + 1;
        repliesRequestRef.current = requestId;
        setLoading(true);
        const { data, error } = await supabase
            .from('team_messages')
            .select(THREAD_MESSAGE_COLUMNS)
            .eq('thread_root_id', rootId)
            .order('created_at', { ascending: true });
        const isCurrentRequest = requestId === repliesRequestRef.current && rootMessage?.id === rootId;
        if (!error && isCurrentRequest) setReplies(data || []);
        if (isCurrentRequest) setLoading(false);
    }, [rootMessage?.id]);

    useEffect(() => {
        setReplies([]);
        setMessageText('');
        setSendError('');
        loadReplies();
    }, [loadReplies]);

    useEffect(() => {
        if (!rootMessage?.id) return;
        const sub = supabase
            .channel(`thread-${rootMessage.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'team_messages',
                filter: `thread_root_id=eq.${rootMessage.id}`,
            }, async (payload) => {
                const { data } = await supabase
                    .from('team_messages')
                    .select(THREAD_MESSAGE_COLUMNS)
                    .eq('id', payload.new.id)
                    .single();
                if (rootMessageIdRef.current !== payload.new.thread_root_id) return;
                if (data) {
                    setReplies((prev) => prev.some((r) => r.id === data.id) ? prev : [...prev, data]);
                }
            })
            .subscribe();
        return () => supabase.removeChannel(sub);
    }, [rootMessage?.id]);

    const messageIdKey = useMemo(() => replies.map((r) => r.id).join(','), [replies]);

    useEffect(() => {
        if (!messageIdKey) return;
        const ids = messageIdKey.split(',').filter(Boolean);
        fetchReactionsForMessages({ table: 'team_message_reactions', messageIds: ids })
            .then((grouped) => setReactionsByMessage(grouped))
            .catch(() => {});
    }, [messageIdKey]);

    useLayoutEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [replies.length]);

    useEffect(() => {
        const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [onClose]);

    const handleSend = useCallback(async () => {
        if (!rootMessage?.id || !channelId || !user?.id || sending) return;
        const body = messageText.trim();
        if (!body) return;
        setSending(true);
        setSendError('');
        const { error } = await supabase.from('team_messages').insert({
            channel_id: channelId,
            author_id: user.id,
            body,
            message_type: 'text',
            thread_root_id: rootMessage.id,
        });
        if (error) setSendError('No se pudo enviar.');
        else setMessageText('');
        setSending(false);
    }, [channelId, messageText, rootMessage?.id, sending, user?.id]);

    const handleToggleReaction = useCallback(async (messageId, emoji) => {
        if (!messageId || !emoji || !user?.id) return;
        setReactionsByMessage((prev) => {
            const list = prev[messageId] || [];
            const existing = list.find((r) => r.user_id === user.id && r.emoji === emoji);
            if (existing) return { ...prev, [messageId]: list.filter((r) => r.id !== existing.id) };
            return { ...prev, [messageId]: [...list, { id: `opt-${messageId}-${emoji}`, message_id: messageId, user_id: user.id, emoji, created_at: new Date().toISOString() }] };
        });
        await toggleReaction({ table: 'team_message_reactions', messageId, userId: user.id, emoji });
    }, [user?.id]);

    return (
        <div className="chat-thread-panel flex flex-col h-full min-h-0">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-200 bg-white shrink-0">
                <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-neutral-800">Hilo</p>
                    <p className="text-[11px] text-neutral-400 truncate">#{rootMessage?.body?.slice(0, 40) || 'mensaje'}</p>
                </div>
                <button onClick={onClose} className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors">
                    <X size={15} />
                </button>
            </div>

            {/* mensaje raíz */}
            <div className="px-4 py-3 border-b border-neutral-100 bg-neutral-50 shrink-0">
                <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center shrink-0 text-xs font-semibold text-neutral-600">
                        {getInitials(authorName)}
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-baseline gap-1.5 mb-0.5">
                            <span className={`text-[12px] font-semibold ${getUserColor(authorName)}`}>{authorName}</span>
                            <span className="text-[10px] text-neutral-400">{formatShortDateTime(rootMessage?.created_at)}</span>
                        </div>
                        <p className="text-[13px] text-neutral-800 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                            {rootMessage?.body}
                        </p>
                    </div>
                </div>
            </div>

            {/* replies */}
            <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-2 custom-scrollbar">
                {loading && (
                    <div className="flex justify-center py-6">
                        <RefreshCw size={14} className="animate-spin text-neutral-400" />
                    </div>
                )}
                {!loading && replies.length === 0 && (
                    <p className="text-center text-[12px] text-neutral-400 py-6">Sin respuestas aún. ¡Sé el primero!</p>
                )}
                {replies.map((reply) => {
                    const isOut = reply.author_id === user?.id;
                    const name = isOut ? 'Tú' : reply.author_name || reply.author?.full_name || 'Equipo';
                    const avatarSrc = reply.author?.avatar_url || (isOut ? profile?.avatar_url : null);
                    return (
                        <ChatBubble key={reply.id} variant={isOut ? 'sent' : 'received'} className="chat-animate-in w-full group">
                            <ChatBubbleAvatar src={avatarSrc} fallback={getInitials(name)} className="h-7 w-7 shrink-0 ring-1 ring-black/5" />
                            <div className={`flex min-w-0 max-w-[85%] flex-col ${isOut ? 'items-end' : 'items-start'}`}>
                                <div className="flex items-center gap-1.5 mb-0.5 px-0.5">
                                    <span className={`text-[11px] font-semibold ${getUserColor(name)}`}>{name}</span>
                                    <span className="text-[10px] text-neutral-400">{formatTime(reply.created_at)}</span>
                                </div>
                                <ReactionPickerPopover onSelect={(emoji) => handleToggleReaction(reply.id, emoji)} openOnClick={false}>
                                    <ChatBubbleMessage
                                        id={`thread-msg-${reply.id}`}
                                        variant={isOut ? 'sent' : 'received'}
                                        role="button"
                                        tabIndex={0}
                                        className={cn(
                                            'chat-bubble relative max-w-full px-3 py-2 text-[13px] leading-relaxed',
                                            isOut ? 'chat-bubble-out text-neutral-900' : 'chat-bubble-in text-neutral-900'
                                        )}
                                    >
                                        {reply.message_type === 'audio' && reply.media_url ? (
                                            <ChatAudioPlayer src={reply.media_url} fileName={reply.file_name} variant={isOut ? 'outbound' : 'inbound'} />
                                        ) : reply.message_type === 'image' && reply.media_url ? (
                                            <img src={reply.media_url} alt={reply.file_name} className="max-h-48 rounded-lg object-cover" loading="lazy" />
                                        ) : (
                                            <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{renderTextWithLinks(reply.body)}</p>
                                        )}
                                    </ChatBubbleMessage>
                                </ReactionPickerPopover>
                                <MessageReactionsBar
                                    reactions={reactionsByMessage[reply.id] || []}
                                    currentUserId={user?.id}
                                    onToggle={(emoji) => handleToggleReaction(reply.id, emoji)}
                                />
                            </div>
                        </ChatBubble>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* composer */}
            <div className="shrink-0 px-3 py-3 border-t border-neutral-200 bg-white">
                <div className="flex items-end gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 focus-within:border-neutral-300 transition-colors">
                    <textarea
                        ref={textareaRef}
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        placeholder="Responder en el hilo..."
                        className="flex-1 min-h-[28px] max-h-24 bg-transparent text-[13px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none resize-none custom-scrollbar leading-relaxed py-0.5"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                        }}
                    />
                    <button
                        onClick={handleSend}
                        disabled={sending || !messageText.trim()}
                        className={`p-1.5 rounded-lg transition-all disabled:opacity-30 shrink-0 mb-0.5 ${messageText.trim() ? 'bg-neutral-900 text-white hover:bg-neutral-700' : 'text-neutral-300'}`}
                    >
                        {sending ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                    </button>
                </div>
                {sendError && <p className="text-xs text-red-500 mt-1">{sendError}</p>}
            </div>
        </div>
    );
};

export default ThreadPanel;
