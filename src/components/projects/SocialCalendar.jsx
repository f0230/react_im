import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  List
} from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO
} from 'date-fns';
import { es } from 'date-fns/locale';
import { fetchProjectPosts, subscribeToProjectPosts } from '@/services/blotatoService';
import { usePostStatusPolling } from '@/hooks/usePostStatusPolling';
import { CreatePostModal } from './CreatePostModal';
import { PlatformIcon } from './PlatformIcon';
import { PostStatusBadge } from './PostStatusBadge';

const WEEK_DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const STATUS_DOT = {
  draft:      'bg-neutral-300',
  scheduled:  'bg-blue-400',
  publishing: 'bg-amber-400',
  published:  'bg-emerald-400',
  failed:     'bg-rose-400',
  cancelled:  'bg-neutral-200',
};

function parsePostDate(value) {
  if (!value || typeof value !== 'string') return null;
  const parsed = parseISO(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getPostTimeline(post) {
  const publishedAt = parsePostDate(post.published_at);
  const scheduledTime = parsePostDate(post.scheduled_time);
  const updatedAt = parsePostDate(post.updated_at);
  const createdAt = parsePostDate(post.created_at);

  if (post.status === 'published' && publishedAt) {
    return { date: publishedAt, source: 'published' };
  }

  if (scheduledTime) {
    return { date: scheduledTime, source: 'scheduled' };
  }

  if ((post.status === 'publishing' || post.status === 'failed' || post.status === 'cancelled') && updatedAt) {
    return { date: updatedAt, source: 'updated' };
  }

  if (createdAt) {
    return { date: createdAt, source: 'created' };
  }

  return null;
}

function getPostSortTime(post) {
  return getPostTimeline(post)?.date?.getTime() || 0;
}

function sortPostsAsc(a, b) {
  return getPostSortTime(a) - getPostSortTime(b);
}

function sortPostsDesc(a, b) {
  return getPostSortTime(b) - getPostSortTime(a);
}

function getPostDateLabel(post, { compact = false } = {}) {
  const pattern = compact ? "d MMM · HH:mm" : "d 'de' MMMM · HH:mm";
  const publishedAt = parsePostDate(post.published_at);
  const scheduledTime = parsePostDate(post.scheduled_time);
  const updatedAt = parsePostDate(post.updated_at);
  const createdAt = parsePostDate(post.created_at);

  if (post.status === 'published' && publishedAt) {
    return `Publicado ${format(publishedAt, pattern, { locale: es })}`;
  }

  if (scheduledTime) {
    if (post.status === 'draft') {
      return `Borrador ${format(scheduledTime, pattern, { locale: es })}`;
    }
    if (post.status === 'publishing') {
      return `En proceso ${format(scheduledTime, pattern, { locale: es })}`;
    }
    return `Programado ${format(scheduledTime, pattern, { locale: es })}`;
  }

  if (post.status === 'publishing' && updatedAt) {
    return `Procesando desde ${format(updatedAt, pattern, { locale: es })}`;
  }

  if (post.status === 'failed' && updatedAt) {
    return `Falló ${format(updatedAt, pattern, { locale: es })}`;
  }

  if (post.status === 'cancelled' && updatedAt) {
    return `Cancelado ${format(updatedAt, pattern, { locale: es })}`;
  }

  if (createdAt) {
    return `Creado ${format(createdAt, pattern, { locale: es })}`;
  }

  return 'Sin fecha';
}

function PostPill({ post, onClick, inverted = false }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick(post); }}
      className={`w-full flex items-center gap-1 px-1.5 py-0.5 rounded-md text-left transition-all group ${
        inverted ? 'hover:bg-white/10' : 'hover:bg-neutral-100/80'
      }`}
      style={{ minWidth: 0 }}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[post.status] || STATUS_DOT.draft}`} />
      <PlatformIcon platform={post.platform} size={9} className="shrink-0" />
      <span className={`text-[9px] font-bold truncate leading-tight ${
        inverted ? 'text-white/85' : 'text-neutral-600'
      }`}>
        {post.content_text?.slice(0, 20) || '—'}
      </span>
    </button>
  );
}

function DayCell({ day, posts, isCurrentMonth, onClick, onPostClick }) {
  const todayDay = isToday(day);
  const visible = posts.slice(0, 2);
  const overflow = posts.length - 2;

  return (
    <div
      onClick={() => onClick(day)}
      className={`relative flex flex-col min-h-[72px] rounded-xl p-1.5 cursor-pointer border transition-all group ${
        todayDay
          ? 'bg-black border-black'
          : isCurrentMonth
            ? 'bg-white border-neutral-100 hover:border-neutral-300 hover:shadow-sm'
            : 'bg-transparent border-transparent'
      }`}
    >
      {/* Day number */}
      <span className={`text-[11px] font-black self-end leading-none mb-1 ${
        todayDay ? 'text-white' : isCurrentMonth ? 'text-neutral-700' : 'text-neutral-300'
      }`}>
        {format(day, 'd')}
      </span>

      {/* Posts */}
      <div className="flex flex-col gap-0.5 overflow-hidden">
        {visible.map(post => (
          <PostPill key={post.id} post={post} onClick={onPostClick} inverted={todayDay} />
        ))}
        {overflow > 0 && (
          <span className={`text-[9px] font-bold px-1.5 ${
            todayDay ? 'text-white/70' : 'text-neutral-400'
          }`}>
            +{overflow} más
          </span>
        )}
      </div>

      {/* Hover add hint */}
      {isCurrentMonth && !todayDay && posts.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Plus size={14} className="text-neutral-300" />
        </div>
      )}
    </div>
  );
}

function PostDrawer({ post, onClose }) {
  if (!post) return null;

  const createdAt = parsePostDate(post.created_at);
  const scheduledTime = parsePostDate(post.scheduled_time);
  const publishedAt = parsePostDate(post.published_at);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="absolute inset-y-0 right-0 w-80 bg-white border-l border-neutral-100 shadow-2xl z-20 flex flex-col"
    >
      <div className="flex items-center justify-between p-5 border-b border-neutral-100">
        <div className="flex items-center gap-2">
          <PlatformIcon platform={post.platform} size={16} />
          <span className="text-sm font-black text-neutral-800 capitalize">{post.platform}</span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-neutral-100 rounded-full transition-colors"
        >
          <XCircle size={16} className="text-neutral-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        <PostStatusBadge status={post.status} size="md" />

        <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap">
          {post.content_text}
        </p>

        {scheduledTime && (
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <Clock size={12} />
            <span>Programado {format(scheduledTime, "d 'de' MMMM · HH:mm", { locale: es })}</span>
          </div>
        )}

        {publishedAt && (
          <div className="flex items-center gap-2 text-xs text-emerald-500">
            <CheckCircle2 size={12} />
            <span>Publicado {format(publishedAt, "d 'de' MMMM · HH:mm", { locale: es })}</span>
          </div>
        )}

        {!scheduledTime && !publishedAt && createdAt && (
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <CalendarDays size={12} />
            <span>Creado {format(createdAt, "d 'de' MMMM · HH:mm", { locale: es })}</span>
          </div>
        )}

        {post.public_url && (
          <a
            href={post.public_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:underline"
          >
            Ver publicación
          </a>
        )}

        {post.error_message && (
          <p className="text-xs text-rose-500 bg-rose-50 p-3 rounded-xl leading-relaxed">
            {post.error_message}
          </p>
        )}

        {post.media_urls?.length > 0 && (
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2">Archivos</p>
            <div className="flex flex-wrap gap-2">
              {post.media_urls.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-neutral-100 border border-neutral-200">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function SocialCalendar({ projectId, canManage }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('calendar'); // 'calendar' | 'list'
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [preselectedDate, setPreselectedDate] = useState('');
  const [selectedPost, setSelectedPost] = useState(null);

  const loadPosts = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const data = await fetchProjectPosts(projectId);
      setPosts(data);
    } catch (err) {
      console.error('Error loading posts:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  useEffect(() => {
    if (!projectId) return;
    const sub = subscribeToProjectPosts(projectId, (payload) => {
      if (payload.eventType === 'INSERT') {
        setPosts(prev => [...prev, payload.new]);
      } else if (payload.eventType === 'UPDATE') {
        setPosts(prev => prev.map(p => p.id === payload.new.id ? payload.new : p));
        setSelectedPost(prev => prev?.id === payload.new.id ? payload.new : prev);
      } else if (payload.eventType === 'DELETE') {
        setPosts(prev => prev.filter(p => p.id !== payload.old.id));
        setSelectedPost(prev => prev?.id === payload.old.id ? null : prev);
      }
    });
    return () => sub.unsubscribe();
  }, [projectId]);

  usePostStatusPolling(posts, (postId, updatedPost) => {
    setPosts(prev => prev.map(p => p.id === postId ? updatedPost : p));
    setSelectedPost(prev => prev?.id === postId ? updatedPost : prev);
  });

  // Calendar grid
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const calendarPostsByDay = useMemo(() => {
    const grouped = new Map();

    posts.forEach((post) => {
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
  }, [posts]);

  const getPostsForDay = useCallback(
    (day) => calendarPostsByDay.get(format(day, 'yyyy-MM-dd')) || [],
    [calendarPostsByDay]
  );

  const queuedPosts = useMemo(
    () => [...posts]
      .filter((post) => ['draft', 'scheduled'].includes(post.status))
      .sort(sortPostsAsc),
    [posts]
  );

  const processingPosts = useMemo(
    () => [...posts]
      .filter((post) => post.status === 'publishing')
      .sort(sortPostsDesc),
    [posts]
  );

  const publishedPosts = useMemo(
    () => [...posts]
      .filter((post) => post.status === 'published')
      .sort(sortPostsDesc),
    [posts]
  );

  const archivedPosts = useMemo(
    () => [...posts]
      .filter((post) => ['failed', 'cancelled'].includes(post.status))
      .sort(sortPostsDesc),
    [posts]
  );

  const handleDayClick = (day) => {
    if (!canManage) return;
    setPreselectedDate(format(day, 'yyyy-MM-dd'));
    setSelectedPost(null);
    setIsCreateOpen(true);
  };

  const prevMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200/60 bg-white/30 shrink-0">
        <div className="flex items-center gap-3">
          {/* Month navigation */}
          <button
            onClick={prevMonth}
            className="p-2 rounded-full hover:bg-white hover:shadow-sm transition-all text-neutral-500 hover:text-black"
          >
            <ChevronLeft size={16} />
          </button>
          <h2 className="text-base font-black text-neutral-800 capitalize w-36 text-center">
            {format(currentDate, 'MMMM yyyy', { locale: es })}
          </h2>
          <button
            onClick={nextMonth}
            className="p-2 rounded-full hover:bg-white hover:shadow-sm transition-all text-neutral-500 hover:text-black"
          >
            <ChevronRight size={16} />
          </button>

          {/* View toggle */}
          <div className="ml-3 flex items-center gap-0.5 bg-white/60 border border-neutral-200 rounded-xl p-0.5">
            <button
              onClick={() => setView('calendar')}
              className={`p-1.5 rounded-lg transition-all ${view === 'calendar' ? 'bg-black text-white shadow-sm' : 'text-neutral-400 hover:text-neutral-700'}`}
              title="Calendario"
            >
              <CalendarDays size={13} />
            </button>
            <button
              onClick={() => setView('list')}
              className={`p-1.5 rounded-lg transition-all ${view === 'list' ? 'bg-black text-white shadow-sm' : 'text-neutral-400 hover:text-neutral-700'}`}
              title="Lista"
            >
              <List size={13} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canManage && (
            <button
              onClick={() => { setPreselectedDate(''); setSelectedPost(null); setIsCreateOpen(true); }}
              className="flex items-center gap-1.5 px-4 py-2 bg-black text-white text-xs font-black rounded-xl hover:bg-neutral-800 transition-all shadow-md"
            >
              <Plus size={13} />
              Nueva
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">

        {/* CALENDAR VIEW */}
        {view === 'calendar' && (
          <div className="flex-1 flex flex-col p-4 overflow-hidden">
            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
              {WEEK_DAYS.map(d => (
                <div key={d} className="text-center text-[10px] font-black uppercase tracking-widest text-neutral-400 py-2">
                  {d}
                </div>
              ))}
            </div>

            {/* Grid */}
            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 size={24} className="animate-spin text-neutral-300" />
              </div>
            ) : (
              <div className="flex-1 grid grid-cols-7 auto-rows-fr gap-1 overflow-hidden">
                {calendarDays.map(day => (
                  <DayCell
                    key={day.toISOString()}
                    day={day}
                    posts={getPostsForDay(day)}
                    isCurrentMonth={isSameMonth(day, currentDate)}
                    onClick={handleDayClick}
                    onPostClick={setSelectedPost}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* LIST VIEW */}
        {view === 'list' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={24} className="animate-spin text-neutral-300" />
              </div>
            ) : posts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Share2 size={32} className="text-neutral-200 mb-3" />
                <p className="text-sm font-bold text-neutral-400">Sin publicaciones aún</p>
                <p className="text-xs text-neutral-400 mt-1">Crea la primera para este proyecto</p>
              </div>
            ) : (
              <>
                {queuedPosts.length > 0 && (
                  <section>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-3">
                      Pendientes y borradores ({queuedPosts.length})
                    </h3>
                    <div className="space-y-2">
                      {queuedPosts.map(post => (
                        <ActivityPostCard key={post.id} post={post} onClick={() => setSelectedPost(post)} />
                      ))}
                    </div>
                  </section>
                )}
                {processingPosts.length > 0 && (
                  <section>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-3">
                      Procesándose ({processingPosts.length})
                    </h3>
                    <div className="space-y-2">
                      {processingPosts.map(post => (
                        <ActivityPostCard key={post.id} post={post} onClick={() => setSelectedPost(post)} />
                      ))}
                    </div>
                  </section>
                )}
                {publishedPosts.length > 0 && (
                  <section>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-3">
                      Publicadas ({publishedPosts.length})
                    </h3>
                    <div className="space-y-2">
                      {publishedPosts.map(post => (
                        <ActivityPostCard key={post.id} post={post} onClick={() => setSelectedPost(post)} />
                      ))}
                    </div>
                  </section>
                )}
                {archivedPosts.length > 0 && (
                  <section>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-3">
                      No publicadas ({archivedPosts.length})
                    </h3>
                    <div className="space-y-2">
                      {archivedPosts.map(post => (
                        <ActivityPostCard key={post.id} post={post} onClick={() => setSelectedPost(post)} />
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        )}

        {/* Sidebar: activity feed (only in calendar view) */}
        {view === 'calendar' && (
          <div className="w-64 xl:w-72 border-l border-neutral-200/60 flex flex-col overflow-hidden bg-white/20 shrink-0">
            <div className="px-4 py-3 border-b border-neutral-100">
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                Actividad
              </p>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 no-scrollbar">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={18} className="animate-spin text-neutral-300" />
                </div>
              ) : posts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Share2 size={20} className="text-neutral-200 mb-2" />
                  <p className="text-[11px] text-neutral-400">Sin publicaciones todavía</p>
                </div>
              ) : (
                <>
                  {queuedPosts.length > 0 && (
                    <section className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                        Pendientes y borradores
                      </p>
                      <div className="space-y-2">
                        {queuedPosts.map(post => (
                          <ActivityPostCard
                            key={post.id}
                            post={post}
                            onClick={() => setSelectedPost(post)}
                            compact
                          />
                        ))}
                      </div>
                    </section>
                  )}

                  {processingPosts.length > 0 && (
                    <section className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                        Procesándose
                      </p>
                      <div className="space-y-2">
                        {processingPosts.map(post => (
                          <ActivityPostCard
                            key={post.id}
                            post={post}
                            onClick={() => setSelectedPost(post)}
                            compact
                          />
                        ))}
                      </div>
                    </section>
                  )}

                  {publishedPosts.length > 0 && (
                    <section className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                        Historial
                      </p>
                      <div className="space-y-2">
                        {publishedPosts.map(post => (
                          <ActivityPostCard
                            key={post.id}
                            post={post}
                            onClick={() => setSelectedPost(post)}
                            compact
                          />
                        ))}
                      </div>
                    </section>
                  )}

                  {archivedPosts.length > 0 && (
                    <section className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                        No publicadas
                      </p>
                      <div className="space-y-2">
                        {archivedPosts.map(post => (
                          <ActivityPostCard
                            key={post.id}
                            post={post}
                            onClick={() => setSelectedPost(post)}
                            compact
                          />
                        ))}
                      </div>
                    </section>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Post detail drawer */}
      <AnimatePresence>
        {selectedPost && (
          <PostDrawer post={selectedPost} onClose={() => setSelectedPost(null)} />
        )}
      </AnimatePresence>

      {/* Modals */}
      <CreatePostModal
        isOpen={isCreateOpen}
        onClose={() => { setIsCreateOpen(false); setPreselectedDate(''); }}
        projectId={projectId}
        serviceId={null}
        initialDate={preselectedDate}
      />
    </div>
  );
}

function ActivityPostCard({ post, onClick, compact = false }) {
  return (
    <button
      onClick={onClick}
      className={`w-full bg-white border border-neutral-100 rounded-xl hover:border-neutral-200 hover:shadow-sm transition-all text-left ${
        compact ? 'p-3' : 'p-3.5'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 flex items-center justify-center rounded-full bg-neutral-100 shrink-0 ${
          compact ? 'w-8 h-8' : 'w-9 h-9'
        }`}>
          <PlatformIcon platform={post.platform} size={compact ? 14 : 16} />
        </div>

        <div className="flex-1 min-w-0">
          <p className={`${compact ? 'text-[11px]' : 'text-xs'} font-bold text-neutral-800 line-clamp-2 leading-tight`}>
            {post.content_text || 'Sin contenido'}
          </p>

          <p className={`${compact ? 'text-[10px]' : 'text-[11px]'} text-neutral-400 mt-1`}>
            {getPostDateLabel(post, { compact })}
          </p>

          <div className="mt-2 flex items-center justify-between gap-2">
            <PostStatusBadge status={post.status} size="sm" />
            <span className="text-[10px] uppercase tracking-widest text-neutral-300">
              {post.platform}
            </span>
          </div>

          {post.error_message && (
            <p className="text-[10px] text-rose-500 mt-1 line-clamp-2">
              {post.error_message}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}

export default SocialCalendar;
