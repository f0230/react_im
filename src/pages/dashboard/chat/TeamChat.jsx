import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Hash, Image, MessageSquare, Mic, Plus, RefreshCw, Search, Send, Square } from 'lucide-react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useUnreadCounts } from '@/context/UnreadCountsContext';
import useViewportHeight from '@/hooks/useViewportHeight';
import useThrottledCallback from '@/hooks/useThrottledCallback';
import MessagingTabs from '@/components/messaging/MessagingTabs';
import MessageReactionsBar from '@/components/chat/MessageReactionsBar';
import ReactionPickerPopover from '@/components/chat/ReactionPickerPopover';
import { fetchReactionsForMessages, toggleReaction } from '@/services/chatReactions';
import { formatShortDateTime, formatTime, formatTimestamp, getUserColor } from '@/utils/messagingFormatters';
import ChatAudioPlayer from '@/components/chat/ChatAudioPlayer';
import {
    ChatBubble,
    ChatBubbleAvatar,
    ChatBubbleMessage,
} from '@/components/ui/chat-bubble';

const buildSlug = (value) => {
    if (!value) return '';
    return value
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .slice(0, 60);
};

const linkRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/i;
const isHttpUrl = (value) => /^https?:\/\//i.test(value);
const TEAM_CHANNEL_COLUMNS = 'id, name, slug, created_by, project_id, created_at';
const TEAM_PROJECT_COLUMNS = 'id, name';
const TEAM_MESSAGE_COLUMNS = 'id, body, created_at, author_id, author_name, message_type, media_url, file_name, reply_to_id, author:profiles(id, full_name, email, avatar_url)';
const TEAM_MEDIA_SIGNED_URL_TTL = 60 * 60 * 24;
const TEAM_MEDIA_SIGNED_URL_REFRESH_BUFFER_MS = 60 * 1000;
const teamMediaUrlCache = new Map();
const MIKE_AVATAR_URL = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&h=96&q=80&crop=faces&fit=crop';

const renderTextWithLinks = (text) => {
    if (!text) return null;
    const parts = text.split(linkRegex);
    return parts.map((part, index) => {
        if (linkRegex.test(part)) {
            const href = part.startsWith('http') ? part : `https://${part}`;
            return (
                <a
                    key={`${part}-${index}`}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline break-all text-blue-600 hover:text-blue-700"
                >
                    {part}
                </a>
            );
        }
        return <span key={`${part}-${index}`}>{part}</span>;
    });
};

const looksLikeMike = (value) => typeof value === 'string' && /\b(mike|clawbot)\b/i.test(value);
const hasMikeMention = (value) => typeof value === 'string' && /(^|\s)@(mike|clawbot)\b/i.test(value);

const getInitials = (value) => {
    if (!value || typeof value !== 'string') return 'AI';
    const parts = value
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2);
    if (parts.length === 0) return 'AI';
    return parts.map((part) => part.charAt(0).toUpperCase()).join('');
};

const isMessageFromMike = (message) =>
    looksLikeMike(message?.author_name)
    || looksLikeMike(message?.author?.full_name)
    || looksLikeMike(message?.author?.email);

const getProjectLabel = (project) => {
    if (!project) return '';
    return project?.title
        || project?.name
        || project?.project_name
        || (project?.id ? `Proyecto ${String(project.id).slice(0, 8)}` : 'Proyecto');
};

const isMissingProjectColumnError = (error) => {
    const code = String(error?.code || '');
    const message = String(error?.message || '').toLowerCase();
    return code === '42703' || code === 'PGRST204' || message.includes('project_id');
};

const TeamChat = () => {
    useViewportHeight(); // Activar ajuste dinámico del viewport para teclados móviles

    const { user, profile } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const { teamPreviews } = useUnreadCounts();
    const isAllowed = profile?.role === 'admin' || profile?.role === 'worker';
    const canCreateChannel = profile?.role === 'admin';

    const [channels, setChannels] = useState([]);

    // Use URL search param as source of truth
    const selectedChannelId = useMemo(() => searchParams.get('channel'), [searchParams]);
    const setSelectedChannelId = useCallback((id) => {
        if (id) {
            setSearchParams({ channel: id });
        } else {
            setSearchParams({});
        }
    }, [setSearchParams]);

    const [messages, setMessages] = useState([]);
    const [loadingChannels, setLoadingChannels] = useState(false);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [error, setError] = useState('');
    const [sendError, setSendError] = useState('');
    const [messageText, setMessageText] = useState('');
    const [replyingTo, setReplyingTo] = useState(null);
    const [sending, setSending] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newChannelName, setNewChannelName] = useState('');
    const [newChannelProjectId, setNewChannelProjectId] = useState('');
    const [channelError, setChannelError] = useState('');
    const [creatingChannel, setCreatingChannel] = useState(false);
    const [projects, setProjects] = useState([]);
    const [projectsLoading, setProjectsLoading] = useState(false);
    const [projectsError, setProjectsError] = useState('');
    const [people, setPeople] = useState([]);
    const [members, setMembers] = useState([]);
    const [membersLoading, setMembersLoading] = useState(false);
    const [membersError, setMembersError] = useState('');
    const [isMembersOpen, setIsMembersOpen] = useState(false);
    const [selectedMemberIds, setSelectedMemberIds] = useState([]);
    const [selectedChannelProjectId, setSelectedChannelProjectId] = useState('');
    const [savingProjectLink, setSavingProjectLink] = useState(false);
    const [projectLinkError, setProjectLinkError] = useState('');
    const [savingMembers, setSavingMembers] = useState(false);
    const [uploadingAudio, setUploadingAudio] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [composerHeight, setComposerHeight] = useState(72);
    const [reactionsByMessage, setReactionsByMessage] = useState({});
    const [channelReads, setChannelReads] = useState([]);
    const [lightboxImage, setLightboxImage] = useState(null);
    const [channelLastMsgAt, setChannelLastMsgAt] = useState(new Map());

    const recorderRef = useRef(null);
    const streamRef = useRef(null);
    const audioChunksRef = useRef([]);
    const lastReadRef = useRef({});

    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const composerRef = useRef(null);
    const textareaRef = useRef(null);
    const fileInputRef = useRef(null);

    const reactionTable = 'team_message_reactions';



    const selectedChannel = useMemo(
        () => channels.find((channel) => channel.id === selectedChannelId) || null,
        [channels, selectedChannelId]
    );

    const projectsById = useMemo(
        () => new Map(projects.map((project) => [project.id, project])),
        [projects]
    );

    const selectedChannelProjectLabel = useMemo(() => {
        if (!selectedChannel?.project_id) return '';
        const relatedProject = projectsById.get(selectedChannel.project_id);
        return getProjectLabel(relatedProject) || `Proyecto ${selectedChannel.project_id.slice(0, 8)}`;
    }, [projectsById, selectedChannel]);

    const messageIdKey = useMemo(
        () => messages.map((message) => message.id).join(','),
        [messages]
    );

    const unreadByChannel = useMemo(() => {
        const map = new Map();
        teamPreviews.forEach((preview) => {
            if (!preview?.channel_id) return;
            map.set(preview.channel_id, Number(preview.unread_count || 0));
        });
        return map;
    }, [teamPreviews]);

    const lastMsgAtByChannel = useMemo(() => {
        const map = new Map(channelLastMsgAt);
        teamPreviews.forEach((preview) => {
            if (!preview?.channel_id || !preview?.event_at) return;
            const existing = map.get(preview.channel_id);
            if (!existing || new Date(preview.event_at) > new Date(existing)) {
                map.set(preview.channel_id, preview.event_at);
            }
        });
        return map;
    }, [channelLastMsgAt, teamPreviews]);

    const formatUnread = (value) => {
        if (!value) return 0;
        return value > 99 ? '99+' : value;
    };

    const openLightbox = useCallback((url, name) => {
        if (!url) return;
        setLightboxImage({ url, name });
    }, []);

    const closeLightbox = useCallback(() => {
        setLightboxImage(null);
    }, []);

    const filteredChannels = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        if (!term) return channels;
        return channels.filter((channel) =>
            [channel.name, channel.slug]
                .filter(Boolean)
                .some((value) => value.toLowerCase().includes(term))
        );
    }, [channels, searchTerm]);

    const sortedProjects = useMemo(() => {
        const next = [...projects];
        next.sort((a, b) => getProjectLabel(a).localeCompare(getProjectLabel(b)));
        return next;
    }, [projects]);

    const otherReadAt = useMemo(() => {
        if (!channelReads.length || !user?.id) return null;
        const others = channelReads.filter((read) => read.user_id !== user.id && read.last_read_at);
        if (others.length === 0) return null;
        return others.reduce((latest, read) => {
            if (!latest) return read.last_read_at;
            return new Date(read.last_read_at) > new Date(latest) ? read.last_read_at : latest;
        }, null);
    }, [channelReads, user?.id]);

    const selectedChannelIdRef = useRef(selectedChannelId);
    selectedChannelIdRef.current = selectedChannelId;

    const loadChannels = useCallback(async (background = false) => {
        if (!isAllowed) return;
        if (!background) setLoadingChannels(true);
        setError('');

        const { data, error: supaError } = await supabase
            .from('team_channels')
            .select(TEAM_CHANNEL_COLUMNS)
            .order('name', { ascending: true });

        if (supaError) {
            if (!background) setError(supaError.message || 'No se pudo cargar los canales.');
        } else {
            const nextChannels = data || [];
            setChannels(nextChannels);
            const currentSelected = selectedChannelIdRef.current;
            if (currentSelected && !nextChannels.some((channel) => channel.id === currentSelected)) {
                setSelectedChannelId(null);
            }
        }

        if (!background) setLoadingChannels(false);
    }, [isAllowed]);

    const loadChannelLastMessages = useCallback(async () => {
        if (!isAllowed) return;
        const { data } = await supabase
            .from('team_messages')
            .select('channel_id, created_at')
            .order('created_at', { ascending: false })
            .limit(500);
        if (!Array.isArray(data)) return;
        const map = new Map();
        data.forEach(({ channel_id, created_at }) => {
            if (!map.has(channel_id)) map.set(channel_id, created_at);
        });
        setChannelLastMsgAt(map);
    }, [isAllowed]);

    const resolveMediaMessage = useCallback(async (message) => {
        if (!message || message.message_type === 'text' || !message.media_url) return message;
        if (isHttpUrl(message.media_url)) {
            return { ...message, resolved_media_url: message.media_url };
        }
        const cached = teamMediaUrlCache.get(message.media_url);
        if (cached && cached.expiresAt > Date.now() + TEAM_MEDIA_SIGNED_URL_REFRESH_BUFFER_MS) {
            return { ...message, resolved_media_url: cached.url };
        }
        const { data, error } = await supabase.storage
            .from('chat-media')
            .createSignedUrl(message.media_url, TEAM_MEDIA_SIGNED_URL_TTL);
        if (error) {
            return { ...message, resolved_media_url: null };
        }
        const signedUrl = data?.signedUrl || null;
        if (signedUrl) {
            teamMediaUrlCache.set(message.media_url, {
                url: signedUrl,
                expiresAt: Date.now() + TEAM_MEDIA_SIGNED_URL_TTL * 1000,
            });
        }
        return { ...message, resolved_media_url: signedUrl };
    }, []);

    const hydrateMediaMessages = useCallback(async (items) => {
        if (!Array.isArray(items) || items.length === 0) return items;
        const resolved = await Promise.all(items.map(resolveMediaMessage));
        return resolved;
    }, [resolveMediaMessage]);

    const loadMessages = useCallback(async (channelId, background = false) => {
        if (!channelId || !isAllowed) return;
        if (!background) setLoadingMessages(true);
        setSendError('');

        const { data, error: supaError } = await supabase
            .from('team_messages')
            .select(TEAM_MESSAGE_COLUMNS)
            .eq('channel_id', channelId)
            .order('created_at', { ascending: true });

        if (supaError) {
            if (!background) setError(supaError.message || 'No se pudieron cargar los mensajes.');
        } else {
            const hydrated = await hydrateMediaMessages(data || []);
            setMessages(hydrated);
        }

        if (!background) setLoadingMessages(false);
    }, [hydrateMediaMessages, isAllowed]);

    const loadProjects = useCallback(async () => {
        if (!canCreateChannel) return;
        setProjectsLoading(true);
        setProjectsError('');

        const { data, error: supaError } = await supabase
            .from('projects')
            .select(TEAM_PROJECT_COLUMNS)
            .limit(500);

        if (supaError) {
            setProjectsError(supaError.message || 'No se pudieron cargar los proyectos.');
        } else {
            setProjects(data || []);
        }

        setProjectsLoading(false);
    }, [canCreateChannel]);

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
            .select('member_id, member:profiles!team_channel_members_member_id_fkey(id, full_name, email, avatar_url, role)')
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

    const loadChannelReads = useCallback(async (channelId) => {
        if (!channelId || !user?.id) return;
        const { data, error } = await supabase
            .from('team_channel_reads')
            .select('user_id, last_read_at')
            .eq('channel_id', channelId);
        if (!error) {
            setChannelReads(data || []);
        }
    }, [user?.id]);

    const fetchMessageById = useCallback(async (messageId) => {
        const { data } = await supabase
            .from('team_messages')
            .select(TEAM_MESSAGE_COLUMNS)
            .eq('id', messageId)
            .single();
        if (!data) return null;
        return resolveMediaMessage(data);
    }, [resolveMediaMessage]);

    const throttledMarkRead = useThrottledCallback(async (channelId, timestamp) => {
        if (!channelId || !user?.id) return;
        const { error } = await supabase
            .from('team_channel_reads')
            .upsert(
                {
                    channel_id: channelId,
                    user_id: user.id,
                    last_read_at: timestamp,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: 'channel_id,user_id' }
            );
        if (error) {
            console.error('Failed to update team_channel_reads', error);
            return;
        }
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('unread:refresh'));
        }
    }, 2500);

    const markChannelRead = useCallback(
        async (channelId, timestamp) => {
            if (!channelId || !user?.id) return;
            const nextReadAt = timestamp || new Date().toISOString();
            const previous = lastReadRef.current[channelId];
            if (previous && new Date(previous) >= new Date(nextReadAt)) return;
            lastReadRef.current[channelId] = nextReadAt;

            throttledMarkRead(channelId, nextReadAt);
        },
        [throttledMarkRead, user?.id]
    );

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

    const invokeMikeTeamChat = useCallback(async ({ prompt, triggerMessageId }) => {
        if (!selectedChannelId || !prompt || !triggerMessageId) return;

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const accessToken = session?.access_token;
            if (!accessToken) return;

            const response = await fetch('/api/clawbot-team-chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                    channel_id: selectedChannelId,
                    prompt,
                    trigger_message_id: triggerMessageId,
                }),
            });

            if (!response.ok) {
                const payload = await response.json().catch(() => ({}));
                console.error('Mike team chat failed:', payload?.error || response.status);
            }
        } catch (error) {
            console.error('Mike team chat failed:', error);
        }
    }, [selectedChannelId]);

    const notifySlackTeamMessage = useCallback(async (messageId) => {
        if (!messageId) return;

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const accessToken = session?.access_token;
            if (!accessToken) return;

            const response = await fetch('/api/notifications?action=team-chat-message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({ messageId }),
            });

            if (!response.ok) {
                const payload = await response.json().catch(() => ({}));
                console.error('TeamChat Slack notify failed:', payload?.error || response.status);
            }
        } catch (error) {
            console.error('TeamChat Slack notify failed:', error);
        }
    }, []);

    const handleSend = useCallback(async () => {
        if (!selectedChannelId || sending || !user?.id) return;
        const body = messageText.trim();
        if (!body) return;

        const replyTarget = replyingTo;

        setSending(true);
        setSendError('');

        const { data: insertedMessage, error: supaError } = await supabase
            .from('team_messages')
            .insert({
                channel_id: selectedChannelId,
                author_id: user.id,
                body,
                message_type: 'text',
                reply_to_id: replyTarget?.id || null,
            })
            .select('id')
            .single();

        if (supaError) {
            setSendError('No se pudo enviar el mensaje.');
        } else {
            setMessageText('');
            setReplyingTo(null);
            if (insertedMessage?.id) {
                void notifySlackTeamMessage(insertedMessage.id);
                if (hasMikeMention(body)) {
                    void invokeMikeTeamChat({
                        prompt: body,
                        triggerMessageId: insertedMessage.id,
                    });
                }
            }
        }

        setSending(false);
    }, [invokeMikeTeamChat, messageText, notifySlackTeamMessage, replyingTo, selectedChannelId, sending, user?.id]);

    const uploadAudioBlob = useCallback(async (blob, fileName) => {
        if (!selectedChannelId || !user?.id) return;
        setUploadingAudio(true);
        setSendError('');

        try {
            if (blob.size > 20 * 1024 * 1024) {
                throw new Error('El audio es demasiado grande (max 20MB).');
            }

            const mime = blob.type || 'audio/webm';
            const ext = mime.includes('ogg') ? 'ogg' : mime.includes('mp4') ? 'm4a' : 'webm';
            const safeName = fileName || `nota-${Date.now()}.${ext}`;
            const storagePath = `team-chat/${selectedChannelId}/${Date.now()}-${safeName}`;

            const { error: uploadError } = await supabase.storage
                .from('chat-media')
                .upload(storagePath, blob, { contentType: mime });

            if (uploadError) throw uploadError;

            const { data: insertedMessage, error: insertError } = await supabase
                .from('team_messages')
                .insert({
                    channel_id: selectedChannelId,
                    author_id: user.id,
                    body: safeName,
                    message_type: 'audio',
                    media_url: storagePath,
                    file_name: safeName,
                })
                .select('id')
                .single();

            if (insertError) throw insertError;
            if (insertedMessage?.id) {
                void notifySlackTeamMessage(insertedMessage.id);
            }
        } catch (err) {
            setSendError(err.message || 'No se pudo subir el audio.');
        } finally {
            setUploadingAudio(false);
        }
    }, [notifySlackTeamMessage, selectedChannelId, user?.id]);

    const uploadImageFile = useCallback(async (file) => {
        if (!file || !selectedChannelId || !user?.id) return;

        if (!file.type.startsWith('image/')) {
            setSendError('Solo se permiten imágenes.');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            setSendError('La imagen es demasiado grande (max 10MB).');
            return;
        }

        setUploadingImage(true);
        setSendError('');

        try {
            const ext = file.name.split('.').pop() || 'jpg';
            const safeBase = file.name.replace(/\.[^/.]+$/, '').replace(/[^\w.-]+/g, '-').slice(0, 60) || 'imagen';
            const safeName = `${safeBase}.${ext}`;
            const storagePath = `team-chat/${selectedChannelId}/${Date.now()}-${safeName}`;

            const { error: uploadError } = await supabase.storage
                .from('chat-media')
                .upload(storagePath, file, { contentType: file.type || 'image/jpeg' });

            if (uploadError) throw uploadError;

            const { data: insertedMessage, error: insertError } = await supabase
                .from('team_messages')
                .insert({
                    channel_id: selectedChannelId,
                    author_id: user.id,
                    body: safeName,
                    message_type: 'image',
                    media_url: storagePath,
                    file_name: safeName,
                })
                .select('id')
                .single();

            if (insertError) throw insertError;
            if (insertedMessage?.id) {
                void notifySlackTeamMessage(insertedMessage.id);
            }
        } catch (err) {
            setSendError(err.message || 'No se pudo subir la imagen.');
        } finally {
            setUploadingImage(false);
        }
    }, [notifySlackTeamMessage, selectedChannelId, user?.id]);

    const handleImageUpload = useCallback((event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        event.target.value = '';
        uploadImageFile(file);
    }, [uploadImageFile]);

    const stopRecording = useCallback(() => {
        if (recorderRef.current && recorderRef.current.state !== 'inactive') {
            recorderRef.current.stop();
        }
        setIsRecording(false);
    }, []);

    const startRecording = useCallback(async () => {
        if (!selectedChannelId || !user?.id || uploadingAudio) return;
        setSendError('');

        try {
            if (typeof MediaRecorder === 'undefined') {
                throw new Error('Tu navegador no soporta grabación de audio.');
            }
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const preferredTypes = [
                'audio/webm;codecs=opus',
                'audio/webm',
                'audio/ogg;codecs=opus',
                'audio/ogg',
            ];
            const mimeType = preferredTypes.find((type) => MediaRecorder.isTypeSupported(type));
            const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
            recorderRef.current = recorder;
            audioChunksRef.current = [];

            recorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            recorder.onstop = async () => {
                const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
                await uploadAudioBlob(blob);
                stream.getTracks().forEach((track) => track.stop());
                streamRef.current = null;
                recorderRef.current = null;
                setIsRecording(false);
            };

            recorder.start();
            setIsRecording(true);
        } catch (err) {
            setSendError(err.message || 'No se pudo acceder al micrófono.');
        }
    }, [selectedChannelId, uploadingAudio, uploadAudioBlob, user?.id]);

    const handleCreateChannel = useCallback(async () => {
        if (!canCreateChannel || !user?.id || creatingChannel) return;
        const name = newChannelName.trim();
        if (!name) return;

        setChannelError('');
        setCreatingChannel(true);

        const slug = buildSlug(name) || `canal-${Date.now()}`;

        const insertPayload = {
            name,
            slug,
            created_by: user.id,
            project_id: newChannelProjectId || null,
        };

        let { data, error: supaError } = await supabase
            .from('team_channels')
            .insert(insertPayload)
            .select(TEAM_CHANNEL_COLUMNS)
            .single();

        if (supaError && isMissingProjectColumnError(supaError)) {
            const retry = await supabase
                .from('team_channels')
                .insert({
                    name,
                    slug,
                    created_by: user.id,
                })
                .select(TEAM_CHANNEL_COLUMNS)
                .single();
            data = retry.data;
            supaError = retry.error;
            if (!supaError) {
                setChannelError('Canal creado, pero falta la migracion de project_id en team_channels.');
            }
        }

        if (supaError) {
            setChannelError(supaError.message || 'No se pudo crear el canal.');
        } else if (data) {
            setChannels((prev) => {
                const next = [...prev, data];
                return next.sort((a, b) => a.name.localeCompare(b.name));
            });
            setSelectedChannelId(data.id);
            setNewChannelName('');
            setNewChannelProjectId('');
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
    }, [canCreateChannel, creatingChannel, newChannelName, newChannelProjectId, user?.id]);

    const handleSaveMembers = useCallback(async () => {
        if (!canCreateChannel || !selectedChannelId || savingMembers) return;
        setSavingMembers(true);
        setMembersError('');

        const previousProjectId = selectedChannel?.project_id || '';
        const nextProjectId = selectedChannelProjectId || '';

        if (previousProjectId !== nextProjectId) {
            const { data: updatedChannel, error: updateError } = await supabase
                .from('team_channels')
                .update({ project_id: nextProjectId || null })
                .eq('id', selectedChannelId)
                .select(TEAM_CHANNEL_COLUMNS)
                .single();

            if (updateError) {
                if (isMissingProjectColumnError(updateError)) {
                    setMembersError('Falta la migracion project_id en team_channels para vincular proyectos.');
                } else {
                    setMembersError(updateError.message || 'No se pudo guardar el proyecto vinculado.');
                }
            } else if (updatedChannel) {
                setChannels((prev) =>
                    prev
                        .map((channel) => (channel.id === updatedChannel.id ? updatedChannel : channel))
                        .sort((a, b) => a.name.localeCompare(b.name))
                );
            }
        }

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
    }, [canCreateChannel, loadMembers, members, savingMembers, selectedChannel, selectedChannelId, selectedChannelProjectId, selectedMemberIds, user?.id]);

    const handleSaveChannelProject = useCallback(async () => {
        if (!canCreateChannel || !selectedChannelId || savingProjectLink) return;

        const previousProjectId = selectedChannel?.project_id || '';
        const nextProjectId = selectedChannelProjectId || '';
        if (previousProjectId === nextProjectId) return;

        setSavingProjectLink(true);
        setProjectLinkError('');

        const { data: updatedChannel, error: updateError } = await supabase
            .from('team_channels')
            .update({ project_id: nextProjectId || null })
            .eq('id', selectedChannelId)
            .select(TEAM_CHANNEL_COLUMNS)
            .single();

        if (updateError) {
            if (isMissingProjectColumnError(updateError)) {
                setProjectLinkError('Falta la migracion project_id en team_channels para vincular proyectos.');
            } else {
                setProjectLinkError(updateError.message || 'No se pudo guardar el proyecto del canal.');
            }
            setSavingProjectLink(false);
            return;
        }

        if (updatedChannel) {
            setChannels((prev) =>
                prev
                    .map((channel) => (channel.id === updatedChannel.id ? updatedChannel : channel))
                    .sort((a, b) => a.name.localeCompare(b.name))
            );
        }

        setSavingProjectLink(false);
    }, [canCreateChannel, savingProjectLink, selectedChannel, selectedChannelId, selectedChannelProjectId]);

    useEffect(() => {
        if (!isAllowed) return;
        loadChannels();
        loadChannelLastMessages();

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
    }, [isAllowed, loadChannels, loadChannelLastMessages]);

    useEffect(() => {
        if (!canCreateChannel) return;
        loadPeople();
    }, [canCreateChannel, loadPeople]);

    useEffect(() => {
        if (!canCreateChannel) return;
        loadProjects();
    }, [canCreateChannel, loadProjects]);

    useEffect(() => {
        if (!canCreateChannel) return;
        setSelectedChannelProjectId(selectedChannel?.project_id || '');
        setProjectLinkError('');
    }, [canCreateChannel, selectedChannel]);

    useEffect(() => {
        if (!isMembersOpen) return;
        setSelectedChannelProjectId(selectedChannel?.project_id || '');
    }, [isMembersOpen, selectedChannel]);

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
                    setChannelLastMsgAt((prev) => {
                        const next = new Map(prev);
                        next.set(payload.new.channel_id, payload.new.created_at);
                        return next;
                    });
                    markChannelRead(selectedChannelId, payload.new.created_at);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(messageSubscription);
        };
    }, [fetchMessageById, isAllowed, loadMessages, markChannelRead, selectedChannelId]);

    useEffect(() => {
        if (!selectedChannelId || !messageIdKey) {
            setReactionsByMessage({});
            return;
        }

        const messageIds = messageIdKey.split(',').filter(Boolean);
        fetchReactionsForMessages({ table: reactionTable, messageIds })
            .then((grouped) => setReactionsByMessage(grouped))
            .catch(() => { });
    }, [messageIdKey, reactionTable, selectedChannelId]);

    useEffect(() => {
        if (!selectedChannelId || !messageIdKey) return;
        const filter = `message_id=in.(${messageIdKey})`;
        const reactionsChannel = supabase
            .channel(`team-reactions-${selectedChannelId}`)
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
    }, [messageIdKey, reactionTable, selectedChannelId]);

    useEffect(() => {
        if (!selectedChannelId) {
            setChannelReads([]);
            return;
        }
        loadChannelReads(selectedChannelId);
        const readsChannel = supabase
            .channel(`team-reads-${selectedChannelId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'team_channel_reads', filter: `channel_id=eq.${selectedChannelId}` }, (payload) => {
                const row = payload.new || payload.old;
                if (!row) return;
                setChannelReads((prev) => {
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
    }, [loadChannelReads, selectedChannelId]);

    useEffect(() => {
        if (!canCreateChannel || !selectedChannelId) return;
        loadMembers(selectedChannelId);
    }, [canCreateChannel, loadMembers, selectedChannelId]);

    useEffect(() => {
        if (!selectedChannelId || !user?.id) return;
        if (messages.length === 0) {
            markChannelRead(selectedChannelId, new Date().toISOString());
            return;
        }
        const lastMessage = messages[messages.length - 1];
        if (lastMessage?.created_at) {
            markChannelRead(selectedChannelId, lastMessage.created_at);
        }
    }, [markChannelRead, messages, selectedChannelId, user?.id]);

    useLayoutEffect(() => {
        if (!selectedChannelId || !messagesContainerRef.current) return;
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }, [messages.length, selectedChannelId]);

    useEffect(() => {
        if (!lightboxImage) return undefined;
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') closeLightbox();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [closeLightbox, lightboxImage]);

    // Cleaned up overflow locking effect as it conflicts with interactive-widget meta tag

    useEffect(() => {
        const composer = composerRef.current;
        if (!composer) return undefined;

        const updateComposerHeight = () => {
            const nextHeight = Math.round(composer.getBoundingClientRect().height);
            if (nextHeight > 0) setComposerHeight(nextHeight);
        };

        updateComposerHeight();

        if (typeof ResizeObserver === 'undefined') return undefined;
        const resizeObserver = new ResizeObserver(updateComposerHeight);
        resizeObserver.observe(composer);
        return () => {
            resizeObserver.disconnect();
        };
    }, [selectedChannelId]);
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
        <div
            className="font-product text-neutral-900 fixed inset-x-0 z-10 mx-auto w-full max-w-[1440px] flex flex-col overflow-hidden overscroll-none bg-white"
            style={{
                top: '45px',
                height: 'calc(var(--app-height, 100dvh) + var(--app-viewport-offset-top, 0px) - 45px)',
            }}
        >
            <MessagingTabs />
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-[320px_1fr] min-h-0">
                <div className={`flex flex-col min-h-0 h-full overflow-hidden border-r border-neutral-100 bg-white ${selectedChannelId ? 'hidden lg:flex' : 'flex'}`}>
                    <div className="p-4 border-b border-neutral-100 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Hash size={18} className="text-neutral-400" />
                                <p className="text-[13px] font-bold text-neutral-800 tracking-tight">Canales</p>
                            </div>
                            {canCreateChannel && (
                                <button
                                    onClick={() => setIsCreateOpen((prev) => !prev)}
                                    className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
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
                                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 pl-9 pr-3 py-2 text-xs focus:border-neutral-300 focus:bg-white focus:shadow-sm transition-all"
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
                                            setNewChannelProjectId('');
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
                    <div className="flex-1 overflow-y-auto p-2 space-y-0.5 custom-scrollbar overscroll-y-contain">
                        {error && !loadingChannels && (
                            <div className="p-3 m-1 rounded-xl bg-amber-50 border border-amber-100 text-xs text-amber-700">
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
                            <div className="text-sm text-neutral-400 px-3 py-4">No hay canales disponibles.</div>
                        )}
                        {filteredChannels.map((channel) => {
                            const isActive = channel.id === selectedChannelId;
                            const unreadCount = unreadByChannel.get(channel.id) || 0;
                            const channelProject = channel?.project_id ? projectsById.get(channel.project_id) : null;
                            const channelProjectLabel = channel?.project_id
                                ? (getProjectLabel(channelProject) || `Proyecto ${channel.project_id.slice(0, 8)}`)
                                : '';
                            return (
                                <button
                                    key={channel.id}
                                    onClick={() => setSelectedChannelId(channel.id)}
                                    className={`chat-sidebar-item w-full text-left rounded-xl px-3 py-2.5 ${isActive
                                        ? 'chat-sidebar-active text-white'
                                        : 'hover:bg-neutral-50'
                                        }`}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isActive ? 'bg-white/10' : 'bg-neutral-100'}`}>
                                                <Hash size={14} className={isActive ? 'text-white/80' : 'text-neutral-500'} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className={`text-[13px] font-semibold truncate ${isActive ? 'text-white' : 'text-neutral-800'}`}>
                                                    {channel.name}
                                                </p>
                                                <span className={`text-[10px] ${isActive ? 'text-white/50' : 'text-neutral-400'}`}>
                                                    {formatTimestamp(lastMsgAtByChannel.get(channel.id) || channel.created_at)}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center shrink-0">
                                            {unreadCount > 0 && (
                                                <span
                                                    className={`inline-flex items-center justify-center min-w-[20px] h-[20px] rounded-full px-1 text-[10px] font-bold ${isActive
                                                        ? 'bg-white/20 text-white'
                                                        : 'bg-red-500 text-white'
                                                        }`}
                                                    aria-label={`${formatUnread(unreadCount)} mensajes sin leer`}
                                                >
                                                    {formatUnread(unreadCount)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {channel.description && (
                                        <p className={`text-[11px] mt-0.5 ml-[42px] truncate ${isActive ? 'text-white/60' : 'text-neutral-400'}`}>
                                            {channel.description}
                                        </p>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className={`relative flex flex-col min-h-0 h-full overflow-hidden bg-white ${!selectedChannelId ? 'hidden lg:flex' : 'flex'}`}>
                    {selectedChannel ? (
                        <>
                            <div className="sticky top-0 z-40 shrink-0 chat-header">
                                <div className="px-4 py-3 flex items-center justify-between gap-4">
                                    <div className="min-w-0 flex items-center gap-3">
                                        <button
                                            onClick={() => setSelectedChannelId(null)}
                                            className="lg:hidden p-2 -ml-2 text-neutral-400 hover:text-neutral-800 transition-colors"
                                            aria-label="Volver"
                                        >
                                            <ArrowLeft size={20} />
                                        </button>
                                        <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center shrink-0">
                                            <Hash size={18} className="text-neutral-500" />
                                        </div>
                                        <div className="min-w-0">
                                            {selectedChannel.project_id ? (
                                                <button
                                                    type="button"
                                                    onClick={() => navigate(`/dashboard/tasks?projectId=${selectedChannel.project_id}`)}
                                                    className="text-[15px] font-bold text-neutral-900 flex items-center gap-1 min-w-0 hover:text-blue-600 transition-colors group/title"
                                                    title="Ver proyecto"
                                                >
                                                    <span className="truncate underline-offset-2 group-hover/title:underline">{selectedChannel.name}</span>
                                                </button>
                                            ) : (
                                                <p className="text-[15px] font-bold text-neutral-900 truncate">
                                                    {selectedChannel.name}
                                                </p>
                                            )}
                                            {selectedChannelProjectLabel && (
                                                <p className="text-[11px] text-neutral-400 truncate">{selectedChannelProjectLabel}</p>
                                            )}
                                        </div>
                                    </div>
                                    {canCreateChannel && (
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => {
                                                    setIsMembersOpen(true);
                                                    loadMembers(selectedChannelId);
                                                }}
                                                className="rounded-lg bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:text-neutral-800 hover:bg-neutral-200 transition-colors"
                                            >
                                                Miembros
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div
                                ref={messagesContainerRef}
                                className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-1.5 custom-scrollbar overscroll-y-contain chat-bg"
                                style={{ paddingBottom: `calc(${composerHeight}px)` }}
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
                                        <p className="text-sm font-medium text-neutral-500">No hay mensajes en este canal</p>
                                        <p className="text-xs text-neutral-400 mt-1">Inicia la conversacion enviando un mensaje</p>
                                    </div>
                                )}
                                {messages.map((message) => {
                                    const botMessage = isMessageFromMike(message);
                                    const isOutbound = message.author_id === user?.id && !botMessage;
                                    const authorName = isOutbound
                                        ? 'Tú'
                                        : message?.author_name
                                        || message?.author?.full_name
                                        || message?.author?.email
                                        || 'Equipo';
                                    const mediaUrl = message?.resolved_media_url || message?.media_url;
                                    const isAudio = message?.message_type === 'audio' && mediaUrl;
                                    const isImage = message?.message_type === 'image' && mediaUrl;
                                    const isSeen = isOutbound && otherReadAt
                                        ? new Date(otherReadAt) >= new Date(message.created_at)
                                        : false;
                                    const repliedMessage = message.reply_to_id
                                        ? messages.find((item) => item.id === message.reply_to_id)
                                        : null;
                                    const repliedAuthor = repliedMessage?.author_name
                                        || repliedMessage?.author?.full_name
                                        || repliedMessage?.author?.email
                                        || 'Mensaje original';
                                    const repliedBody = repliedMessage?.body || '...';
                                    const avatarSrc = botMessage
                                        ? MIKE_AVATAR_URL
                                        : message?.author?.avatar_url
                                        || (isOutbound ? profile?.avatar_url || user?.user_metadata?.avatar_url : null);
                                    const avatarFallback = botMessage
                                        ? 'AI'
                                        : getInitials(isOutbound
                                            ? profile?.full_name || user?.email || 'Tu'
                                            : authorName);
                                    return (
                                        <ChatBubble
                                            key={message.id}
                                            variant={isOutbound ? 'sent' : 'received'}
                                            layout={botMessage ? 'ai' : 'default'}
                                            className="chat-animate-in mb-2 w-full group"
                                        >
                                            <ChatBubbleAvatar
                                                src={avatarSrc}
                                                fallback={avatarFallback}
                                                className="h-9 w-9 shrink-0 ring-1 ring-black/5"
                                            />
                                            <div className={`flex min-w-0 max-w-[80%] flex-col ${isOutbound ? 'items-end' : 'items-start'}`}>
                                                <div className="flex items-center gap-1.5 mb-0.5 px-1">
                                                {isOutbound && (
                                                    <button
                                                        onClick={() => setReplyingTo(message)}
                                                        className="text-[9px] text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-neutral-600 leading-none"
                                                    >
                                                        Responder
                                                    </button>
                                                )}
                                                <span className={`text-[10px] font-bold leading-none ${getUserColor(authorName)}`}>
                                                    {authorName}
                                                </span>
                                                <span className="text-[9px] text-neutral-400/80 leading-none">
                                                    {formatShortDateTime(message.created_at)}
                                                </span>
                                                {isSeen && (
                                                    <span className="text-[9px] font-semibold leading-none text-emerald-500">
                                                        Leído
                                                    </span>
                                                )}
                                                {!isOutbound && (
                                                    <button
                                                        onClick={() => setReplyingTo(message)}
                                                        className="text-[9px] text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-neutral-600 leading-none"
                                                    >
                                                        Responder
                                                    </button>
                                                )}
                                                </div>
                                                <ReactionPickerPopover
                                                    onSelect={(emoji) => handleToggleReaction(message.id, emoji)}
                                                    openOnClick={false}
                                                >
                                                    <ChatBubbleMessage
                                                        id={`msg-${message.id}`}
                                                        variant={isOutbound ? 'sent' : 'received'}
                                                        role="button"
                                                        tabIndex={0}
                                                        className={cn(
                                                            'chat-bubble relative max-w-full px-3 py-2 text-sm shadow-sm',
                                                            isOutbound
                                                                ? 'chat-bubble-out bg-transparent text-neutral-900'
                                                                : 'chat-bubble-in bg-transparent text-neutral-900',
                                                        )}
                                                    >
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
                                                                className="chat-reply-preview mb-2 w-full min-w-0 max-w-full overflow-hidden p-2 text-[11px] cursor-pointer hover:opacity-80 transition-opacity"
                                                            >
                                                                <p className="font-semibold text-neutral-600 truncate">
                                                                    Respondiendo a {repliedAuthor}
                                                                </p>
                                                                <p className="truncate max-w-full text-neutral-500">
                                                                    {repliedBody}
                                                                </p>
                                                            </div>
                                                        )}
                                                        {isAudio ? (
                                                            <ChatAudioPlayer
                                                                src={mediaUrl}
                                                                fileName={message.file_name}
                                                                variant={isOutbound ? 'outbound' : 'inbound'}
                                                            />
                                                        ) : isImage ? (
                                                            <div className="space-y-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => openLightbox(mediaUrl, message.file_name)}
                                                                    className="block focus:outline-none"
                                                                >
                                                                    <img
                                                                        src={mediaUrl}
                                                                        alt={message.file_name || 'Imagen compartida'}
                                                                        className="max-h-64 rounded-lg object-cover cursor-zoom-in"
                                                                        loading="lazy"
                                                                    />
                                                                </button>
                                                                {message.file_name && (
                                                                    <p className="text-[11px] text-neutral-500 break-all">{message.file_name}</p>
                                                                )}
                                                            </div>
                                                        ) : message?.message_type === 'audio' ? (
                                                            <p className="text-xs text-neutral-500">Audio no disponible.</p>
                                                        ) : message?.message_type === 'image' ? (
                                                            <p className="text-xs text-neutral-500">Imagen no disponible.</p>
                                                        ) : (
                                                            <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{renderTextWithLinks(message.body)}</p>
                                                        )}
                                                    </ChatBubbleMessage>
                                                </ReactionPickerPopover>
                                                <MessageReactionsBar
                                                    reactions={reactionsByMessage[message.id] || []}
                                                    currentUserId={user?.id}
                                                    onToggle={(emoji) => handleToggleReaction(message.id, emoji)}
                                                />
                                            </div>
                                        </ChatBubble>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>

                            <div
                                ref={composerRef}
                                className="shrink-0 chat-composer px-4 py-3"
                                style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
                            >
                                <div className="space-y-2">
                                    {replyingTo && (
                                        <div className="chat-reply-preview chat-animate-in flex items-center justify-between gap-2 p-2.5 mb-1 rounded-lg">
                                            <div className="min-w-0 flex-1">
                                                <p className={`text-[11px] font-semibold truncate ${getUserColor(replyingTo.author_name || replyingTo.author?.full_name)}`}>
                                                    Respondiendo a {replyingTo.author_name || replyingTo.author?.full_name || 'Equipo'}
                                                </p>
                                                <p className="text-[11px] text-neutral-500 truncate max-w-full">{replyingTo.body}</p>
                                            </div>
                                            <button
                                                onClick={() => setReplyingTo(null)}
                                                className="shrink-0 p-1.5 rounded-full text-neutral-400 hover:text-neutral-600 hover:bg-black/5 transition-colors"
                                            >
                                                <span className="text-xs font-bold">✕</span>
                                            </button>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            type="button"
                                            className={`p-2 rounded-lg transition disabled:opacity-50 ${uploadingImage ? 'text-neutral-400' : 'text-neutral-500 hover:text-neutral-700 hover:bg-white/60'}`}
                                            title="Adjuntar imagen"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={uploadingImage || !selectedChannelId}
                                        >
                                            {uploadingImage ? <RefreshCw size={20} className="animate-spin" /> : <Image size={20} />}
                                        </button>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                            className="hidden"
                                        />
                                        <button
                                            className={`p-2 rounded-lg transition disabled:opacity-50 ${isRecording ? 'text-red-500 bg-red-50' : uploadingAudio ? 'text-neutral-400' : 'text-neutral-500 hover:text-neutral-700 hover:bg-white/60'}`}
                                            title={isRecording ? 'Detener grabación' : 'Grabar nota de voz'}
                                            onClick={() => {
                                                if (isRecording) {
                                                    stopRecording();
                                                } else {
                                                    startRecording();
                                                }
                                            }}
                                            disabled={uploadingAudio}
                                        >
                                            {uploadingAudio
                                                ? <RefreshCw size={20} className="animate-spin" />
                                                : isRecording
                                                    ? <Square size={20} />
                                                    : <Mic size={20} />
                                            }
                                        </button>
                                        <textarea
                                            ref={textareaRef}
                                            value={messageText}
                                            onChange={(event) => setMessageText(event.target.value)}
                                            placeholder="Escribe un mensaje..."
                                            className="flex-1 min-h-[40px] max-h-32 rounded-xl bg-white px-4 py-2.5 text-base lg:text-[14px] focus:outline-none focus:ring-1 focus:ring-neutral-300 resize-none transition-all custom-scrollbar shadow-sm"
                                            onPaste={(event) => {
                                                const items = event.clipboardData?.items;
                                                if (!items || items.length === 0) return;
                                                const imageItem = Array.from(items).find((item) => item.type?.startsWith('image/'));
                                                if (!imageItem) return;
                                                const file = imageItem.getAsFile();
                                                if (!file) return;
                                                event.preventDefault();
                                                uploadImageFile(file);
                                            }}
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
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center chat-bg">
                            <div className="text-center chat-empty-state">
                                <div className="w-16 h-16 rounded-2xl bg-white/80 flex items-center justify-center mx-auto mb-4 shadow-sm">
                                    <MessageSquare size={28} className="text-neutral-300" />
                                </div>
                                <p className="font-semibold text-neutral-600">Selecciona un canal</p>
                                <p className="text-[13px] text-neutral-400 mt-1">
                                    Elige un canal para ver los mensajes
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {
                isMembersOpen && canCreateChannel && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
                        <div className="relative w-full max-w-3xl h-[80svh] rounded-3xl bg-white shadow-2xl border border-neutral-200 overflow-hidden flex flex-col">
                            <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-200 bg-white">
                                <div>
                                    <p className="text-sm font-semibold text-neutral-900">Configuracion del canal</p>
                                    <p className="text-xs text-neutral-500">Define quienes pueden ver este canal.</p>
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

                                <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                                    Miembros del canal
                                </p>
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
                )
            }
            {
                lightboxImage && (
                    <div
                        className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 px-4 py-6"
                        role="dialog"
                        aria-modal="true"
                        onClick={closeLightbox}
                    >
                        <div
                            className="relative w-full max-w-5xl max-h-[90svh]"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <button
                                type="button"
                                onClick={closeLightbox}
                                className="absolute -top-10 right-0 text-xs font-semibold uppercase tracking-wide text-white/80 hover:text-white"
                            >
                                Cerrar
                            </button>
                            <img
                                src={lightboxImage.url}
                                alt={lightboxImage.name || 'Imagen ampliada'}
                                className="w-full max-h-[90svh] object-contain rounded-xl shadow-2xl"
                            />
                            {lightboxImage.name && (
                                <p className="mt-2 text-center text-xs text-white/80 break-all">
                                    {lightboxImage.name}
                                </p>
                            )}
                        </div>
                    </div>
                )}
        </div>
    );
};

export default TeamChat;
