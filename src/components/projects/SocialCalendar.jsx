import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Settings,
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
  isPast,
  parseISO
} from 'date-fns';
import { es } from 'date-fns/locale';
import { fetchProjectPosts, subscribeToProjectPosts } from '@/services/blotatoService';
import { CreatePostModal } from './CreatePostModal';
import { BlotatoConfigModal } from './BlotatoConfigModal';
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

function PostPill({ post, onClick }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick(post); }}
      className="w-full flex items-center gap-1 px-1.5 py-0.5 rounded-md text-left transition-all hover:opacity-80 group"
      style={{ minWidth: 0 }}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[post.status] || STATUS_DOT.draft}`} />
      <PlatformIcon platform={post.platform} size={9} className="shrink-0" />
      <span className="text-[9px] font-bold text-neutral-600 truncate leading-tight">
        {post.content_text?.slice(0, 20) || '—'}
      </span>
    </button>
  );
}

function DayCell({ day, posts, isCurrentMonth, onClick, onPostClick }) {
  const todayDay = isToday(day);
  const past = isPast(day) && !todayDay;
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
          <PostPill key={post.id} post={post} onClick={onPostClick} />
        ))}
        {overflow > 0 && (
          <span className="text-[9px] font-bold text-neutral-400 px-1.5">
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

        {post.scheduled_time && (
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <Clock size={12} />
            <span>{format(parseISO(post.scheduled_time), "d 'de' MMMM · HH:mm", { locale: es })}</span>
          </div>
        )}

        {post.published_at && (
          <div className="flex items-center gap-2 text-xs text-emerald-500">
            <CheckCircle2 size={12} />
            <span>Publicado {format(parseISO(post.published_at), "d 'de' MMMM · HH:mm", { locale: es })}</span>
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
  const [isConfigOpen, setIsConfigOpen] = useState(false);
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
      } else if (payload.eventType === 'DELETE') {
        setPosts(prev => prev.filter(p => p.id !== payload.old.id));
      }
    });
    return () => sub.unsubscribe();
  }, [projectId]);

  // Calendar grid
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getPostsForDay = (day) =>
    posts.filter(p => p.scheduled_time && isSameDay(parseISO(p.scheduled_time), day));

  const upcomingPosts = [...posts]
    .filter(p => p.scheduled_time && !['published', 'cancelled', 'failed'].includes(p.status))
    .sort((a, b) => new Date(a.scheduled_time) - new Date(b.scheduled_time));

  const publishedPosts = [...posts]
    .filter(p => p.status === 'published')
    .sort((a, b) => new Date(b.published_at || b.scheduled_time) - new Date(a.published_at || a.scheduled_time));

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
          <button
            onClick={() => setIsConfigOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-neutral-600 hover:text-black bg-white border border-neutral-200 rounded-xl hover:border-neutral-300 transition-all shadow-sm"
          >
            <Settings size={12} />
            Cuentas
          </button>
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
                {upcomingPosts.length > 0 && (
                  <section>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-3">
                      Programadas ({upcomingPosts.length})
                    </h3>
                    <div className="space-y-2">
                      {upcomingPosts.map(post => (
                        <ListPostCard key={post.id} post={post} onClick={() => setSelectedPost(post)} />
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
                        <ListPostCard key={post.id} post={post} onClick={() => setSelectedPost(post)} />
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        )}

        {/* Sidebar: upcoming list (only in calendar view) */}
        {view === 'calendar' && (
          <div className="w-64 xl:w-72 border-l border-neutral-200/60 flex flex-col overflow-hidden bg-white/20 shrink-0">
            <div className="px-4 py-3 border-b border-neutral-100">
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                Próximas
              </p>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 no-scrollbar">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={18} className="animate-spin text-neutral-300" />
                </div>
              ) : upcomingPosts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Share2 size={20} className="text-neutral-200 mb-2" />
                  <p className="text-[11px] text-neutral-400">Sin publicaciones próximas</p>
                </div>
              ) : (
                upcomingPosts.slice(0, 12).map(post => (
                  <button
                    key={post.id}
                    onClick={() => setSelectedPost(post)}
                    className="w-full flex items-start gap-2.5 p-3 bg-white border border-neutral-100 rounded-xl hover:border-neutral-200 hover:shadow-sm transition-all text-left"
                  >
                    <PlatformIcon platform={post.platform} size={14} className="mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-neutral-800 line-clamp-2 leading-tight">
                        {post.content_text}
                      </p>
                      {post.scheduled_time && (
                        <p className="text-[10px] text-neutral-400 mt-1">
                          {format(parseISO(post.scheduled_time), "d MMM · HH:mm", { locale: es })}
                        </p>
                      )}
                    </div>
                    <span className={`w-2 h-2 rounded-full mt-1 shrink-0 ${STATUS_DOT[post.status] || STATUS_DOT.draft}`} />
                  </button>
                ))
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
      <BlotatoConfigModal
        projectId={projectId}
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
      />
    </div>
  );
}

// Simple list card used in list view
function ListPostCard({ post, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3.5 bg-white border border-neutral-100 rounded-xl hover:border-neutral-200 hover:shadow-sm transition-all text-left"
    >
      <PlatformIcon platform={post.platform} size={16} className="shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-neutral-800 line-clamp-1">{post.content_text}</p>
        {post.scheduled_time && (
          <p className="text-[10px] text-neutral-400 mt-0.5">
            {format(parseISO(post.scheduled_time), "d 'de' MMMM · HH:mm", { locale: es })}
          </p>
        )}
      </div>
      <PostStatusBadge status={post.status} showLabel={false} size="sm" />
    </button>
  );
}

export default SocialCalendar;
