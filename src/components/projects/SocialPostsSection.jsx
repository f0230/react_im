import React, { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Share2, 
  Plus, 
  RefreshCw, 
  ExternalLink,
  Trash2,
  Edit3,
  X,
  AlertCircle,
  CheckCircle2,
  Clock,
  Calendar,
  Loader2
} from 'lucide-react';
import { 
  fetchServicePosts, 
  cancelPost,
  subscribeToServicePosts,
  getPlatformName
} from '@/services/blotatoService';
import { usePostStatusPolling } from '@/hooks/usePostStatusPolling';
import { PlatformIcon } from './PlatformIcon';
import { PostStatusBadge } from './PostStatusBadge';
import { CreatePostModal } from './CreatePostModal';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';

const STATUS_FILTERS = [
  { id: 'all', label: 'Todas' },
  { id: 'scheduled', label: 'Programadas' },
  { id: 'published', label: 'Publicadas' },
  { id: 'failed', label: 'Con errores' }
];

export function SocialPostsSection({ 
  serviceId, 
  projectId, 
  aiPlanning,
  canManage 
}) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [initialContent, setInitialContent] = useState('');
  const [cancellingId, setCancellingId] = useState(null);

  // Track posts that already reached a final state so we only toast on new transitions
  const finalizedRef = useRef(new Set());

  const notifyStatusChange = useCallback((post) => {
    if (finalizedRef.current.has(post.id)) return;
    if (!['published', 'failed', 'cancelled'].includes(post.status)) return;
    finalizedRef.current.add(post.id);
    const platform = getPlatformName(post.platform);
    if (post.status === 'published') {
      toast.success(`Publicado en ${platform}`, { duration: 5000 });
    } else if (post.status === 'failed') {
      toast.error(`Falló en ${platform}: ${post.error_message || 'Error desconocido'}`, { duration: 8000 });
    }
  }, []);

  // Cargar posts
  const loadPosts = useCallback(async () => {
    if (!serviceId) return;

    try {
      setLoading(true);
      const data = await fetchServicePosts(serviceId);
      // Mark already-final posts so we don't toast on initial load
      data.forEach((p) => {
        if (['published', 'failed', 'cancelled'].includes(p.status)) {
          finalizedRef.current.add(p.id);
        }
      });
      setPosts(data);
    } catch (err) {
      console.error('Error loading posts:', err);
    } finally {
      setLoading(false);
    }
  }, [serviceId]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  // Suscripción a cambios en tiempo real
  useEffect(() => {
    if (!serviceId) return;
    
    const subscription = subscribeToServicePosts(serviceId, (payload) => {
      if (payload.eventType === 'INSERT') {
        setPosts(prev => [payload.new, ...prev]);
      } else if (payload.eventType === 'UPDATE') {
        notifyStatusChange(payload.new);
        setPosts(prev => prev.map(p => p.id === payload.new.id ? payload.new : p));
      } else if (payload.eventType === 'DELETE') {
        setPosts(prev => prev.filter(p => p.id !== payload.old.id));
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [serviceId]);

  // Polling de estados
  usePostStatusPolling(posts, (postId, updatedPost) => {
    notifyStatusChange(updatedPost);
    setPosts(prev => prev.map(p => p.id === postId ? updatedPost : p));
  });

  // Filtrar posts
  const filteredPosts = posts.filter(post => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'scheduled') return ['scheduled', 'draft'].includes(post.status);
    return post.status === statusFilter;
  });

  // Agrupar posts por estado
  const postsByStatus = {
    scheduled: filteredPosts.filter(p => ['scheduled', 'draft'].includes(p.status)),
    publishing: filteredPosts.filter(p => p.status === 'publishing'),
    published: filteredPosts.filter(p => p.status === 'published'),
    failed: filteredPosts.filter(p => ['failed', 'cancelled'].includes(p.status))
  };

  const handleCancel = async (postId) => {
    if (!window.confirm('¿Estás seguro de cancelar esta publicación?')) return;
    
    try {
      setCancellingId(postId);
      await cancelPost(postId);
      // El estado se actualizará via subscription
    } catch (err) {
      console.error('Error cancelling post:', err);
      alert('Error al cancelar: ' + err.message);
    } finally {
      setCancellingId(null);
    }
  };

  const openCreateModal = (content = '') => {
    setInitialContent(content);
    setIsCreateModalOpen(true);
  };

  const renderPostCard = (post) => (
    <motion.div
      key={post.id}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-3 bg-white border border-neutral-100 rounded-xl hover:border-neutral-200 transition-colors"
    >
      <div className="flex items-start gap-3">
        <PlatformIcon platform={post.platform} size={18} className="mt-0.5" />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-neutral-800 line-clamp-2">
                {post.content_text}
              </p>
              
              <div className="flex items-center gap-2 mt-1.5">
                <PostStatusBadge status={post.status} size="sm" />
                
                {post.scheduled_time && ['scheduled', 'draft'].includes(post.status) && (
                  <span className="text-[10px] text-neutral-400 flex items-center gap-1">
                    <Clock size={10} />
                    {format(new Date(post.scheduled_time), 'dd/MM HH:mm', { locale: es })}
                  </span>
                )}
                
                {post.published_at && (
                  <span className="text-[10px] text-neutral-400">
                    {formatDistanceToNow(new Date(post.published_at), { addSuffix: true, locale: es })}
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              {post.public_url && (
                <a
                  href={post.public_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 text-neutral-400 hover:text-black transition-colors"
                  title="Ver publicación"
                >
                  <ExternalLink size={14} />
                </a>
              )}
              
              {['scheduled', 'draft'].includes(post.status) && canManage && (
                <button
                  onClick={() => handleCancel(post.id)}
                  disabled={cancellingId === post.id}
                  className="p-1.5 text-neutral-400 hover:text-rose-500 transition-colors"
                  title="Cancelar"
                >
                  {cancellingId === post.id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Trash2 size={14} />
                  )}
                </button>
              )}
            </div>
          </div>
          
          {post.error_message && (
            <p className="text-[10px] text-rose-500 mt-1.5 flex items-center gap-1">
              <AlertCircle size={10} />
              {post.error_message}
            </p>
          )}
          
          {post.media_urls?.length > 0 && (
            <div className="flex gap-1 mt-2">
              {post.media_urls.map((url, i) => (
                <div key={i} className="w-8 h-8 bg-neutral-100 rounded-lg flex items-center justify-center">
                  <span className="text-[10px] text-neutral-400">📎</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );

  return (
    <>
      <div className="border-t border-neutral-200 pt-6 mt-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Share2 size={18} className="text-neutral-400" />
            <h3 className="text-sm font-bold text-neutral-800">Publicaciones Sociales</h3>
            {posts.length > 0 && (
              <span className="text-[10px] text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-full">
                {posts.length}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={loadPosts}
              className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-full transition-colors"
              title="Recargar"
            >
              <RefreshCw size={14} />
            </button>
            
            <button
              onClick={() => openCreateModal()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white rounded-full text-xs font-semibold hover:bg-neutral-800 transition-colors"
            >
              <Plus size={12} />
              Nueva
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {STATUS_FILTERS.map(filter => (
            <button
              key={filter.id}
              onClick={() => setStatusFilter(filter.id)}
              className={`px-3 py-1 rounded-full text-[11px] font-medium transition-colors ${
                statusFilter === filter.id
                  ? 'bg-black text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Quick actions from AI Planning */}
        {aiPlanning?.phase1?.output?.frase_eje && (
          <div className="mb-4 p-3 bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-100 rounded-xl">
            <p className="text-[11px] font-semibold text-sky-700 mb-2">
              Usar contenido del Planificador IA:
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => openCreateModal(aiPlanning.phase1.output.frase_eje)}
                className="px-3 py-1.5 bg-white text-sky-700 border border-sky-200 rounded-lg text-[11px] font-medium hover:bg-sky-50 transition-colors"
              >
                Frase Eje (Fase 1)
              </button>
              {aiPlanning?.phase2?.output?.ancla?.[0] && (
                <button
                  onClick={() => {
                    const piece = aiPlanning.phase2.output.ancla[0];
                    openCreateModal(`${piece.hook}\n\n${piece.mensaje}\n\n${piece.cta}`);
                  }}
                  className="px-3 py-1.5 bg-white text-sky-700 border border-sky-200 rounded-lg text-[11px] font-medium hover:bg-sky-50 transition-colors"
                >
                  Reel Ancla (Fase 2)
                </button>
              )}
            </div>
          </div>
        )}

        {/* Posts list */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw size={20} className="animate-spin text-neutral-300" />
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-8 bg-neutral-50 rounded-xl border border-dashed border-neutral-200">
            <Share2 size={24} className="mx-auto text-neutral-300 mb-2" />
            <p className="text-sm text-neutral-400">No hay publicaciones</p>
            <p className="text-[11px] text-neutral-400 mt-1">
              Crea tu primera publicación para esta tarea
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Scheduled */}
            {postsByStatus.scheduled.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                  Programadas
                </h4>
                <div className="space-y-2">
                  {postsByStatus.scheduled.map(renderPostCard)}
                </div>
              </div>
            )}

            {/* Publishing */}
            {postsByStatus.publishing.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                  Publicando ahora
                </h4>
                <div className="space-y-2">
                  {postsByStatus.publishing.map(renderPostCard)}
                </div>
              </div>
            )}

            {/* Published */}
            {postsByStatus.published.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                  Publicadas
                </h4>
                <div className="space-y-2">
                  {postsByStatus.published.slice(0, 5).map(renderPostCard)}
                  {postsByStatus.published.length > 5 && (
                    <button
                      onClick={() => setStatusFilter('published')}
                      className="w-full py-2 text-[11px] text-neutral-400 hover:text-neutral-600"
                    >
                      Ver {postsByStatus.published.length - 5} más...
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Failed */}
            {postsByStatus.failed.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">
                  Con Errores
                </h4>
                <div className="space-y-2">
                  {postsByStatus.failed.map(renderPostCard)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setInitialContent('');
        }}
        projectId={projectId}
        serviceId={serviceId}
        initialContent={initialContent}
        aiPlanning={aiPlanning}
      />
    </>
  );
}

export default SocialPostsSection;
