import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Share2,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  CalendarDays,
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  ChevronDown,
  Check,
  UserPlus,
  X,
  ExternalLink,
  Pencil,
  Trash2,
} from 'lucide-react';
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isToday,
  parseISO,
  addWeeks,
  subWeeks,
} from 'date-fns';
import { fetchProjectPosts, subscribeToProjectPosts, deleteDraftGroup, cancelPost, resetPostToDraft } from '@/services/blotatoService';
import { supabase } from '@/lib/supabaseClient';
import { useBlotatoAccounts } from '@/hooks/useBlotatoAccounts';
import { usePostStatusPolling } from '@/hooks/usePostStatusPolling';
import { CreatePostModal } from './CreatePostModal';
import { PlatformIcon } from './PlatformIcon';
import { PostStatusBadge } from './PostStatusBadge';
import { BlotatoConfigModal } from './BlotatoConfigModal';

function isVideoUrl(url = '') { return /\.(mp4|mov|webm)(\?.*)?$/i.test(url); }

// ─── Helpers ────────────────────────────────────────────────────────────────

const STATUS_DOT = {
  draft:      'bg-neutral-600',
  scheduled:  'bg-blue-400',
  publishing: 'bg-amber-400',
  published:  'bg-emerald-400',
  failed:     'bg-rose-400',
  cancelled:  'bg-neutral-700',
};

const STATUS_FILTER_OPTIONS = [
  { id: 'all',       label: 'Todas las publicaciones' },
  { id: 'scheduled', label: 'Programadas' },
  { id: 'published', label: 'Publicadas' },
  { id: 'draft',     label: 'Borradores' },
  { id: 'failed',    label: 'Fallidas' },
];

function parsePostDate(value) {
  if (!value || typeof value !== 'string') return null;
  const parsed = parseISO(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getPublishedDisplayDate(post) {
  return (
    parsePostDate(post.scheduled_time) ||
    parsePostDate(post.published_at) ||
    parsePostDate(post.created_at)
  );
}

function getPostTimeline(post) {
  const publishedAt  = getPublishedDisplayDate(post);
  const scheduledTime = parsePostDate(post.scheduled_time);
  const updatedAt    = parsePostDate(post.updated_at);
  const createdAt    = parsePostDate(post.created_at);

  if (post.status === 'published' && publishedAt)  return { date: publishedAt,   source: 'published' };
  if (scheduledTime)                               return { date: scheduledTime,  source: 'scheduled' };
  if (['publishing','failed','cancelled'].includes(post.status) && updatedAt)
                                                   return { date: updatedAt,      source: 'updated'   };
  if (createdAt)                                   return { date: createdAt,      source: 'created'   };
  return null;
}

function getPostSortTime(post) {
  return getPostTimeline(post)?.date?.getTime() || 0;
}

function sortPostsAsc(a, b)  { return getPostSortTime(a) - getPostSortTime(b); }
function sortPostsDesc(a, b) { return getPostSortTime(b) - getPostSortTime(a); }

function getPostDateLabel(post) {
  const publishedAt  = getPublishedDisplayDate(post);
  const scheduledTime = parsePostDate(post.scheduled_time);
  const updatedAt    = parsePostDate(post.updated_at);
  const createdAt    = parsePostDate(post.created_at);
  const pattern = "d MMM · HH:mm";

  if (post.status === 'published' && publishedAt)  return `Publicado ${format(publishedAt,  pattern)}`;
  if (scheduledTime) {
    if (post.status === 'draft')      return `Borrador ${format(scheduledTime, pattern)}`;
    if (post.status === 'publishing') return `En proceso ${format(scheduledTime, pattern)}`;
    return `Programado ${format(scheduledTime, pattern)}`;
  }
  if (post.status === 'publishing' && updatedAt) return `Procesando desde ${format(updatedAt, pattern)}`;
  if (post.status === 'failed'     && updatedAt) return `Falló ${format(updatedAt, pattern)}`;
  if (post.status === 'cancelled'  && updatedAt) return `Cancelado ${format(updatedAt, pattern)}`;
  if (createdAt) return `Creado ${format(createdAt, pattern)}`;
  return 'Sin fecha';
}

const ACCOUNT_DESTINATION_KEYS = ['pageId', 'page_id', 'boardId', 'board_id', 'channelId', 'channel_id'];

function getDestinationId(targetConfig) {
  if (!targetConfig || typeof targetConfig !== 'object') return '';
  const entry = ACCOUNT_DESTINATION_KEYS.find((key) => targetConfig[key]);
  return entry ? String(targetConfig[entry]) : '';
}

function getAccountSelectionKey(account) {
  const destinationId = getDestinationId(account?.targetConfig || account?.target_config);
  return [account?.platform || 'unknown', account?.id || 'unknown', destinationId || 'default'].join('::');
}

function doesPostMatchAccount(post, account) {
  if (!post || !account) return false;
  if (String(post.account_id) !== String(account.id)) return false;
  if ((post.platform || '') !== (account.platform || '')) return false;

  const accountDestinationId = getDestinationId(account.targetConfig || account.target_config);
  if (!accountDestinationId) return true;

  const postDestinationId = getDestinationId(post.target_config);
  return postDestinationId === accountDestinationId;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function AccountItem({ account, selected, onToggle }) {
  const name = account.fullname || (account.username ? `@${account.username}` : account.id);
  const initial = (account.fullname || account.username || 'A')[0].toUpperCase();

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      className={`relative isolate w-full select-none text-left flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-all ${
        selected ? 'bg-white/[0.05]' : 'opacity-40 hover:opacity-65 hover:bg-white/[0.03]'
      }`}
    >
      <div className="relative shrink-0">
        <div className="w-8 h-8 rounded-full bg-[#222] flex items-center justify-center overflow-hidden ring-1 ring-white/10">
          {account.profileImageUrl ? (
            <img src={account.profileImageUrl} alt={name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs font-bold text-white/80">{initial}</span>
          )}
        </div>
        <div className="absolute -bottom-0.5 -right-0.5 w-[15px] h-[15px] rounded-full bg-[#0c0c0c] flex items-center justify-center ring-1 ring-white/10">
          <PlatformIcon platform={account.platform} size={8} />
        </div>
        {selected && (
          <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center">
            <Check size={7} className="text-white" strokeWidth={3} />
          </div>
        )}
      </div>
      <span className="flex-1 text-xs text-white/70 font-medium truncate leading-tight">
        {name}
      </span>
    </button>
  );
}

function StatusFilterDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = STATUS_FILTER_OPTIONS.find((opt) => opt.id === value) || STATUS_FILTER_OPTIONS[0];

  useEffect(() => {
    if (!open) return;
    const handle = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-xs text-white/70 hover:bg-white/[0.08] transition-colors"
      >
        {current.label}
        <ChevronDown size={12} className="text-white/40" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.1 }}
            className="absolute top-full left-0 mt-1 w-52 rounded-xl bg-[#1a1a1a] border border-white/[0.08] shadow-2xl z-50 overflow-hidden"
          >
            {STATUS_FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => { onChange(opt.id); setOpen(false); }}
                className={`w-full flex items-center gap-2 px-3.5 py-2.5 text-xs text-left transition-colors ${
                  opt.id === value ? 'bg-white/[0.08] text-white' : 'text-white/60 hover:bg-white/[0.05]'
                }`}
              >
                {opt.id === value && <Check size={11} className="text-emerald-400 shrink-0" />}
                <span className={opt.id === value ? '' : 'pl-[19px]'}>{opt.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function WeekPostCard({ post, onClick }) {
  const timeline = getPostTimeline(post);
  const timeLabel = timeline?.date ? format(timeline.date, 'HH:mm') : null;

  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(post); }}
      className="w-full text-left px-2.5 py-2 rounded-lg bg-white/[0.05] border border-white/[0.06] hover:bg-white/[0.09] transition-colors mb-1.5 last:mb-0"
    >
      <div className="flex items-center gap-1.5 mb-0.5">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[post.status] || STATUS_DOT.draft}`} />
        <PlatformIcon platform={post.platform} size={10} className="shrink-0" />
        {timeLabel && (
          <span className="ml-auto text-[9px] text-white/35 font-medium tabular-nums">{timeLabel}</span>
        )}
      </div>
      <p className="text-[10px] text-white/60 line-clamp-2 leading-relaxed">
        {post.content_text || '—'}
      </p>
    </button>
  );
}

function DayColumn({ day, posts, canManage, onDayClick, onPostClick }) {
  const today = isToday(day);
  const dayName = format(day, 'EEE');
  const dateLabel = format(day, 'MMM d');

  return (
    <div
      className="flex flex-col border-r border-white/[0.05] last:border-r-0 min-w-[100px] sm:min-w-0 sm:flex-1"
    >
      {/* Column header */}
      <div className="px-2 sm:px-3 pt-3 pb-2 shrink-0">
        <p className="text-[10px] font-medium text-white/30 tracking-wide mb-1.5 uppercase">{dayName}</p>
        <div className="inline-flex">
          {today ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-teal-500 text-white">
              {dateLabel}
            </span>
          ) : (
            <span className="text-xs font-medium text-white/60">{dateLabel}</span>
          )}
        </div>
      </div>

      {/* Posts area */}
      <div
        onClick={() => canManage && onDayClick(day)}
        className={`flex-1 overflow-y-auto px-1.5 sm:px-2.5 py-2 no-scrollbar ${
          canManage ? 'cursor-pointer group' : ''
        }`}
      >
        {posts.map((post) => (
          <WeekPostCard key={post.id} post={post} onClick={onPostClick} />
        ))}

        {canManage && posts.length === 0 && (
          <div className="h-full flex items-start pt-4 justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Plus size={16} className="text-white/20" />
          </div>
        )}
      </div>

      {/* Footer: calendar icon */}
      <div className="shrink-0 px-2 sm:px-3 pb-3 pt-1 flex justify-start">
        <button
          onClick={(e) => { e.stopPropagation(); if (canManage) onDayClick(day); }}
          className="p-1.5 rounded-lg hover:bg-white/[0.05] transition-colors group/cal"
          title={`Crear publicación para ${dateLabel}`}
        >
          <CalendarDays size={13} className="text-white/15 group-hover/cal:text-white/40 transition-colors" />
        </button>
      </div>
    </div>
  );
}

function InlineMedia({ urls, onExpand }) {
  if (!urls?.length) return null;
  const single = urls.length === 1;

  return (
    <div className={`overflow-hidden rounded-xl ${single ? '' : 'flex gap-1.5 overflow-x-auto no-scrollbar'}`}>
      {urls.map((url, i) => {
        const isVideo = isVideoUrl(url);
        return (
          <button
            key={i}
            type="button"
            onClick={() => onExpand(url)}
            className={`relative block overflow-hidden rounded-xl bg-white/[0.04] shrink-0 group/media
              ${single ? 'w-full h-48' : 'w-40 h-40'}`}
          >
            {isVideo ? (
              <video
                src={url}
                className="w-full h-full object-cover"
                muted playsInline autoPlay
                onCanPlay={(e) => e.currentTarget.pause()}
              />
            ) : (
              <img src={url} alt="" className="w-full h-full object-cover" />
            )}
            {/* expand hint */}
            <div className="absolute inset-0 bg-black/0 group-hover/media:bg-black/30 transition-colors flex items-center justify-center">
              <ExternalLink size={16} className="text-white opacity-0 group-hover/media:opacity-100 transition-opacity drop-shadow" />
            </div>
          </button>
        );
      })}
    </div>
  );
}

function MediaLightbox({ url, onClose }) {
  const isVideo = isVideoUrl(url);
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/92 z-[60] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors"
      >
        <X size={18} />
      </button>
      <div onClick={(e) => e.stopPropagation()} className="max-w-4xl max-h-[90vh]">
        {isVideo ? (
          <video src={url} controls className="max-w-full max-h-[85vh] rounded-xl" autoPlay />
        ) : (
          <img src={url} alt="" className="max-w-full max-h-[85vh] rounded-xl object-contain" />
        )}
      </div>
    </motion.div>
  );
}

function PostModal({ post, onClose, onEdit, onDelete, onCancel, onMoveToDraft }) {
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const [actioning, setActioning] = useState(false);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape' && !lightboxUrl) onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose, lightboxUrl]);

  if (!post) return null;

  const createdAt     = parsePostDate(post.created_at);
  const scheduledTime = parsePostDate(post.scheduled_time);
  const publishedAt   = getPublishedDisplayDate(post);
  const hasMedia      = post.media_urls?.length > 0;

  const handleDelete = async () => {
    setActioning(true);
    try {
      await onDelete(post);
      onClose();
    } catch (err) {
      console.error('Error deleting draft:', err);
    } finally {
      setActioning(false);
    }
  };

  const handleCancel = async () => {
    setActioning(true);
    try {
      await onCancel(post);
      onClose();
    } catch (err) {
      console.error('Error cancelling post:', err);
    } finally {
      setActioning(false);
    }
  };

  const handleMoveToDraftAction = async () => {
    setActioning(true);
    try {
      await onMoveToDraft(post);
      onClose();
    } catch (err) {
      console.error('Error moving post to draft:', err);
    } finally {
      setActioning(false);
    }
  };

  return (
    <>
      {/* Light backdrop — doesn't dominate the screen */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      />

      {/* Popover card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 6 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
      >
        <div
          className="pointer-events-auto w-full max-w-sm bg-[#181818] border border-white/[0.1] rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden max-h-[88dvh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Media — full bleed at top if present */}
          {hasMedia && (
            <div className="shrink-0 p-3 pb-0">
              <InlineMedia urls={post.media_urls} onExpand={setLightboxUrl} />
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 no-scrollbar">

            {/* Platform + status row */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <PlatformIcon platform={post.platform} size={13} />
                <span className="text-xs font-semibold text-white/50 capitalize">{post.platform}</span>
              </div>
              <PostStatusBadge status={post.status} size="sm" />
            </div>

            {/* Post text */}
            {post.content_text && (
              <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">
                {post.content_text}
              </p>
            )}

            {/* Meta */}
            <div className="space-y-1.5">
              {scheduledTime && (
                <div className="flex items-center gap-1.5 text-xs text-white/35">
                  <Clock size={11} />
                  <span>Programado {format(scheduledTime, "d MMM · HH:mm")}</span>
                </div>
              )}
              {post.status === 'published' && publishedAt && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-400/80">
                  <CheckCircle2 size={11} />
                  <span>Publicado {format(publishedAt, "d MMM · HH:mm")}</span>
                </div>
              )}
              {!scheduledTime && !publishedAt && createdAt && (
                <div className="flex items-center gap-1.5 text-xs text-white/35">
                  <CalendarDays size={11} />
                  <span>Creado {format(createdAt, "d MMM · HH:mm")}</span>
                </div>
              )}
            </div>

            {post.error_message && (
              <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl leading-relaxed">
                {post.error_message}
              </p>
            )}
          </div>

          {/* Footer actions */}
          <div className="shrink-0 flex items-center justify-between gap-2 px-4 py-3 border-t border-white/[0.06]">
            {post.public_url ? (
              <a
                href={post.public_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-semibold text-teal-400 hover:text-teal-300 transition-colors"
              >
                <ExternalLink size={12} />
                Ver publicación
              </a>
            ) : <div />}

            <div className="flex items-center gap-2">
              {(post.status === 'draft' || post.status === 'scheduled') && onEdit && (
                <button
                  onClick={() => onEdit(post)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.07] hover:bg-white/[0.12] text-white/60 hover:text-white/90 border border-white/[0.08] transition-colors"
                >
                  <Pencil size={11} />
                  Editar
                </button>
              )}
              {post.status === 'draft' && (
                <button
                  onClick={handleDelete}
                  disabled={actioning}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 transition-colors disabled:opacity-50"
                >
                  {actioning ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                  Eliminar
                </button>
              )}
              {post.status === 'scheduled' && onCancel && (
                <button
                  onClick={handleCancel}
                  disabled={actioning}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 transition-colors disabled:opacity-50"
                >
                  {actioning ? <Loader2 size={11} className="animate-spin" /> : <XCircle size={11} />}
                  Cancelar
                </button>
              )}
              {['cancelled', 'failed'].includes(post.status) && onMoveToDraft && (
                <button
                  onClick={handleMoveToDraftAction}
                  disabled={actioning}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.07] hover:bg-white/[0.12] text-white/60 hover:text-white/90 border border-white/[0.08] transition-colors disabled:opacity-50"
                >
                  {actioning ? <Loader2 size={11} className="animate-spin" /> : <Pencil size={11} />}
                  Mover a borrador
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/25 hover:text-white/60 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {lightboxUrl && (
          <MediaLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SocialCalendar({ projectId, canManage }) {
  // Posts state
  const [currentDate, setCurrentDate]   = useState(new Date());
  const [posts, setPosts]               = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isBlotatoConfigOpen, setIsBlotatoConfigOpen] = useState(false);
  const [preselectedDate, setPreselectedDate] = useState('');
  const [selectedPost, setSelectedPost] = useState(null);
  const [editingDraft, setEditingDraft] = useState(null);
  const [scheduledPostToEdit, setScheduledPostToEdit] = useState(null);

  // Filter state
  const [accountSearch, setAccountSearch]   = useState('');
  const [selectedAccountKeys, setSelectedAccountKeys] = useState(null); // null = all
  const [postSearch, setPostSearch]         = useState('');
  const [statusFilter, setStatusFilter]     = useState('all');

  // Accounts
  const { accountsForPosting, loading: accountsLoading } = useBlotatoAccounts(projectId);

  // Load posts
  const loadPosts = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoadingPosts(true);
      const data = await fetchProjectPosts(projectId);
      setPosts(data);
    } catch (err) {
      console.error('Error loading posts:', err);
    } finally {
      setLoadingPosts(false);
    }
  }, [projectId]);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  // Realtime subscription
  useEffect(() => {
    if (!projectId) return;
    const sub = subscribeToProjectPosts(projectId, (payload) => {
      if (payload.eventType === 'INSERT') {
        setPosts((prev) => [...prev, payload.new]);
      } else if (payload.eventType === 'UPDATE') {
        setPosts((prev) => prev.map((p) => (p.id === payload.new.id ? payload.new : p)));
        setSelectedPost((prev) => (prev?.id === payload.new.id ? payload.new : prev));
      } else if (payload.eventType === 'DELETE') {
        setPosts((prev) => prev.filter((p) => p.id !== payload.old.id));
        setSelectedPost((prev) => (prev?.id === payload.old.id ? null : prev));
      }
    });
    return () => sub.unsubscribe();
  }, [projectId]);

  const handlePostStatusUpdate = useCallback((postId, updatedPost) => {
    setPosts((prev) => prev.map((p) => (p.id === postId ? updatedPost : p)));
    setSelectedPost((prev) => (prev?.id === postId ? updatedPost : prev));
  }, []);

  usePostStatusPolling(posts, handlePostStatusUpdate);

  // Week helpers
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd   = endOfWeek(currentDate,   { weekStartsOn: 1 });
  const weekDays  = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const weekRangeLabel = `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d')}`;

  const prevWeek = () => setCurrentDate((d) => subWeeks(d, 1));
  const nextWeek = () => setCurrentDate((d) => addWeeks(d, 1));
  const goToday  = () => setCurrentDate(new Date());

  // Filtered accounts (for sidebar list)
  const filteredAccounts = useMemo(() => {
    const q = accountSearch.toLowerCase();
    return accountsForPosting.filter((acc) => {
      const name = (acc.fullname || acc.username || '').toLowerCase();
      return !q || name.includes(q);
    });
  }, [accountsForPosting, accountSearch]);

  // Check if an account is "selected" for filtering
  const isAccountSelected = (account) =>
    selectedAccountKeys === null || selectedAccountKeys.has(getAccountSelectionKey(account));

  const toggleAccount = (account) => {
    if (accountsForPosting.length <= 1) return; // can't deselect if only one
    const accountKey = getAccountSelectionKey(account);
    if (selectedAccountKeys === null) {
      // Currently all selected → select only this one
      setSelectedAccountKeys(new Set([accountKey]));
    } else if (selectedAccountKeys.has(accountKey)) {
      const next = new Set(selectedAccountKeys);
      next.delete(accountKey);
      if (next.size === 0) {
        setSelectedAccountKeys(null); // back to "all"
      } else {
        setSelectedAccountKeys(next);
      }
    } else {
      const next = new Set(selectedAccountKeys);
      next.add(accountKey);
      if (next.size === accountsForPosting.length) {
        setSelectedAccountKeys(null); // all selected → normalize to null
      } else {
        setSelectedAccountKeys(next);
      }
    }
  };

  // Filtered posts (apply account + status + text filters)
  const filteredPosts = useMemo(() => {
    const selectedAccounts = selectedAccountKeys === null
      ? null
      : accountsForPosting.filter((account) => selectedAccountKeys.has(getAccountSelectionKey(account)));

    return posts.filter((post) => {
      if (selectedAccounts && !selectedAccounts.some((account) => doesPostMatchAccount(post, account))) return false;
      if (statusFilter !== 'all' && post.status !== statusFilter) return false;
      if (postSearch) {
        const q = postSearch.toLowerCase();
        if (!post.content_text?.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [posts, accountsForPosting, selectedAccountKeys, statusFilter, postSearch]);

  // Group posts by day for the week grid
  const postsByDay = useMemo(() => {
    const grouped = new Map();
    filteredPosts.forEach((post) => {
      const timeline = getPostTimeline(post);
      if (!timeline?.date) return;
      const key = format(timeline.date, 'yyyy-MM-dd');
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(post);
    });
    grouped.forEach((items, key) => {
      grouped.set(key, [...items].sort(sortPostsAsc));
    });
    return grouped;
  }, [filteredPosts]);

  const getPostsForDay = (day) =>
    postsByDay.get(format(day, 'yyyy-MM-dd')) || [];

  const handleDeleteDraft = useCallback(async (post) => {
    // Optimistic update — remove from local state immediately so UI is instant
    // (realtime DELETE also handles this once REPLICA IDENTITY FULL migration is applied)
    if (post.post_group_id) {
      setPosts((prev) => prev.filter((p) => p.post_group_id !== post.post_group_id || p.status !== 'draft'));
      await deleteDraftGroup(post.post_group_id);
    } else {
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
      const { error } = await supabase
        .from('service_posts')
        .delete()
        .eq('id', post.id)
        .eq('status', 'draft');
      if (error) throw error;
    }
  }, []);

  const handleCancelScheduled = useCallback(async (post) => {
    setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, status: 'cancelled' } : p)));
    setSelectedPost(null);
    try {
      await cancelPost(post.id);
    } catch (err) {
      console.error('Error cancelling post:', err);
      setPosts((prev) => prev.map((p) => (p.id === post.id ? post : p)));
    }
  }, []);

  const handleMoveToDraft = useCallback(async (post) => {
    setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, status: 'draft', scheduled_time: null } : p)));
    setSelectedPost(null);
    try {
      await resetPostToDraft(post.id);
    } catch (err) {
      console.error('Error moving post to draft:', err);
      setPosts((prev) => prev.map((p) => (p.id === post.id ? post : p)));
    }
  }, []);

  const handleEditDraft = useCallback((post) => {
    setSelectedPost(null);
    setEditingDraft(post);
    setPreselectedDate('');
    setIsCreateOpen(true);
  }, []);

  const handleEditScheduled = useCallback((post) => {
    setSelectedPost(null);
    setScheduledPostToEdit(post);
    setEditingDraft(null);
    setPreselectedDate('');
    setIsCreateOpen(true);
  }, []);

  const handleDayClick = useCallback((day) => {
    if (!canManage) return;
    setPreselectedDate(format(day, 'yyyy-MM-dd'));
    setSelectedPost(null);
    setIsCreateOpen(true);
  }, [canManage]);

  const handleNewPost = useCallback(() => {
    setPreselectedDate('');
    setSelectedPost(null);
    setIsCreateOpen(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setIsCreateOpen(false);
    setPreselectedDate('');
    setEditingDraft(null);
    setScheduledPostToEdit(null);
    loadPosts();
  }, [loadPosts]);

  const currentStatusFilterLabel =
    STATUS_FILTER_OPTIONS.find((o) => o.id === statusFilter)?.label || 'Todas las publicaciones';

  return (
    <div className="flex h-full bg-[#0c0c0c] overflow-hidden rounded-[24px] md:rounded-[32px]">

      {/* ── Left sidebar ────────────────────────────────── */}
      <aside className="w-44 shrink-0 flex flex-col border-r border-white/[0.05] overflow-hidden">

        {/* Account list */}
        <div className="flex-1 overflow-y-auto px-2 py-2 no-scrollbar space-y-0.5">
          {accountsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={14} className="animate-spin text-white/20" />
            </div>
          ) : filteredAccounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center px-3">
              <Share2 size={16} className="text-white/15 mb-2" />
              <p className="text-[10px] text-white/20">Sin cuentas conectadas</p>
            </div>
          ) : (
            filteredAccounts.map((account) => (
              <AccountItem
                key={getAccountSelectionKey(account)}
                account={account}
                selected={isAccountSelected(account)}
                onToggle={() => toggleAccount(account)}
              />
            ))
          )}
        </div>

        {/* Add account */}
        <div className="px-2 pb-3">
          <button
            type="button"
            onClick={() => setIsBlotatoConfigOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-white/[0.08] text-[11px] text-white/30 hover:text-white/60 hover:bg-white/[0.04] hover:border-white/[0.14] transition-all"
          >
            <UserPlus size={12} />
            Añadir cuenta
          </button>
        </div>
      </aside>

      {/* ── Main content ────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Top bar */}
        <div className="shrink-0 flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 border-b border-white/[0.05]">

          {/* Week range label */}
          <span className="text-xs sm:text-sm font-semibold text-white/70 tabular-nums shrink-0">
            {weekRangeLabel}
          </span>

          {/* Navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={prevWeek}
              className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white/80 transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={goToday}
              className="px-2 sm:px-3 py-1 rounded-lg text-xs font-medium text-white/50 hover:text-white/90 hover:bg-white/[0.06] transition-colors border border-white/[0.08]"
            >
              Hoy
            </button>
            <button
              onClick={nextWeek}
              className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white/80 transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Post search — hidden on mobile */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.06] flex-1 max-w-xs">
            <Search size={12} className="text-white/25 shrink-0" />
            <input
              type="text"
              value={postSearch}
              onChange={(e) => setPostSearch(e.target.value)}
              placeholder="Buscar posts"
              className="flex-1 bg-transparent text-xs text-white/65 placeholder:text-white/25 outline-none min-w-0"
            />
            {postSearch && (
              <button onClick={() => setPostSearch('')} className="text-white/25 hover:text-white/60">
                <X size={11} />
              </button>
            )}
          </div>

          {/* Status filter — hidden on mobile */}
          <div className="hidden sm:block">
            <StatusFilterDropdown value={statusFilter} onChange={setStatusFilter} />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 ml-auto">
            <button className="hidden sm:flex p-1.5 rounded-lg hover:bg-white/[0.06] text-white/25 hover:text-white/60 transition-colors">
              <SlidersHorizontal size={14} />
            </button>

            {/* New post button */}
            {canManage && (
              <>
                <div className="hidden sm:block w-px h-4 bg-white/[0.08] mx-1" />
                <button
                  onClick={handleNewPost}
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-white text-black text-xs font-semibold hover:bg-white/90 transition-colors"
                >
                  <Plus size={13} />
                  <span className="hidden sm:inline">Nueva</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Week grid */}
        <div className="flex-1 overflow-hidden relative">
          {loadingPosts ? (
            <div className="flex-1 flex items-center justify-center h-full">
              <Loader2 size={20} className="animate-spin text-white/20" />
            </div>
          ) : (
            <div className="flex h-full overflow-x-auto overflow-y-hidden no-scrollbar">
              <div className="flex h-full min-w-full">
                {weekDays.map((day) => (
                  <DayColumn
                    key={day.toISOString()}
                    day={day}
                    posts={getPostsForDay(day)}
                    canManage={canManage}
                    onDayClick={handleDayClick}
                    onPostClick={setSelectedPost}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Post detail modal */}
      <AnimatePresence>
        {selectedPost && (
          <PostModal
            post={selectedPost}
            onClose={() => setSelectedPost(null)}
            onEdit={canManage ? (selectedPost.status === 'scheduled' ? handleEditScheduled : handleEditDraft) : null}
            onDelete={handleDeleteDraft}
            onCancel={canManage ? handleCancelScheduled : null}
            onMoveToDraft={canManage ? handleMoveToDraft : null}
          />
        )}
      </AnimatePresence>

      {/* Create / edit post modal */}
      <CreatePostModal
        isOpen={isCreateOpen}
        onClose={handleModalClose}
        projectId={projectId}
        serviceId={scheduledPostToEdit?.service_id ?? editingDraft?.service_id ?? null}
        initialDate={preselectedDate}
        initialContent={editingDraft?.content_text ?? ''}
        initialMediaUrls={editingDraft?.media_urls ?? []}
        draftGroupId={editingDraft?.post_group_id ?? null}
        scheduledPostToEdit={scheduledPostToEdit}
      />

      <BlotatoConfigModal
        isOpen={isBlotatoConfigOpen}
        onClose={() => setIsBlotatoConfigOpen(false)}
        projectId={projectId}
      />
    </div>
  );
}

export default SocialCalendar;
