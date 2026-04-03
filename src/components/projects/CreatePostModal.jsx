import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Send,
  Calendar,
  Clock,
  ChevronDown,
  AlertCircle,
  Upload,
  Loader2,
  CheckCircle2,
  Film,
  Users
} from 'lucide-react';
import { PlatformIcon } from './PlatformIcon';
import {
  createPost,
  getMaxChars,
  uploadMediaFile
} from '@/services/blotatoService';
import { useBlotatoAccounts } from '@/hooks/useBlotatoAccounts';

const SCHEDULING_OPTIONS = [
  { id: 'immediate', label: 'Publicar ahora', icon: Send },
  { id: 'scheduled', label: 'Programar para', icon: Calendar },
  { id: 'nextSlot', label: 'Próximo slot disponible', icon: Clock }
];

const INSTAGRAM_MEDIA_TYPES = [
  { id: 'reel', label: 'Reel' },
  { id: 'story', label: 'Historia' },
  { id: 'feed', label: 'Feed' }
];

const TIKTOK_PRIVACY_LEVELS = [
  { id: 'PUBLIC_TO_EVERYONE', label: 'Público' },
  { id: 'MUTUAL_FOLLOW_FRIENDS', label: 'Amigos mutuos' },
  { id: 'FOLLOWER_OF_CREATOR', label: 'Seguidores' },
  { id: 'SELF_ONLY', label: 'Privado' }
];

const YOUTUBE_PRIVACY = [
  { id: 'public', label: 'Público' },
  { id: 'unlisted', label: 'No listado' },
  { id: 'private', label: 'Privado' }
];

const ACCEPTED_MEDIA = 'image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/webm';

export function CreatePostModal({
  isOpen,
  onClose,
  projectId,
  serviceId,
  initialContent = '',
  initialDate = '',
}) {
  const { accountsForPosting: accounts, hasAssignments, loading: accountsLoading } = useBlotatoAccounts(projectId);
  const fileInputRef = useRef(null);

  const [content, setContent] = useState(initialContent);
  const [mediaItems, setMediaItems] = useState([]);
  const [schedulingType, setSchedulingType] = useState('scheduled');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  // Platform-specific config keyed by platform name
  const [platformConfigs, setPlatformConfigs] = useState({});
  // Subaccount selection for FB/LinkedIn keyed by account id
  const [subaccountSelections, setSubaccountSelections] = useState({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setContent(initialContent);
      setMediaItems([]);
      setSchedulingType('scheduled');
      setScheduledDate(initialDate || '');
      setScheduledTime(initialDate ? '10:00' : '');
      setPlatformConfigs({});
      setSubaccountSelections({});
      setError(null);
      setShowAdvanced(false);
    }
  }, [isOpen, initialContent, initialDate]);

  const platforms = [...new Set(accounts.map(a => a.platform))];
  const isUploading = mediaItems.some(m => m.uploading);

  // Char limit warning: show per-platform exceeded info
  const exceededPlatforms = platforms.filter(p => content.length > getMaxChars(p));

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const placeholders = files.map(f => ({
      name: f.name,
      url: null,
      uploading: true,
      error: null,
      isVideo: f.type.startsWith('video/')
    }));

    setMediaItems(prev => [...prev, ...placeholders]);
    const startIndex = mediaItems.length;

    await Promise.all(
      files.map(async (file, i) => {
        const idx = startIndex + i;
        try {
          const url = await uploadMediaFile(file);
          setMediaItems(prev => {
            const next = [...prev];
            next[idx] = { ...next[idx], url, uploading: false };
            return next;
          });
        } catch (err) {
          setMediaItems(prev => {
            const next = [...prev];
            next[idx] = { ...next[idx], uploading: false, error: err.message };
            return next;
          });
        }
      })
    );

    e.target.value = '';
  };

  const handleRemoveMedia = (index) => {
    setMediaItems(prev => prev.filter((_, i) => i !== index));
  };

  const setPlatformConfig = (platform, key, value) => {
    setPlatformConfigs(prev => ({
      ...prev,
      [platform]: { ...(prev[platform] || {}), [key]: value }
    }));
  };

  const getSchedulingPayload = () => {
    switch (schedulingType) {
      case 'immediate': return { type: 'immediate' };
      case 'scheduled':
        if (!scheduledDate || !scheduledTime) return null;
        return { type: 'scheduled', time: new Date(`${scheduledDate}T${scheduledTime}`).toISOString() };
      case 'nextSlot': return { type: 'nextSlot' };
      default: return { type: 'immediate' };
    }
  };

  const handleSubmit = async () => {
    if (!accounts.length) { setError('No hay cuentas asignadas a este proyecto'); return; }
    if (!content.trim()) { setError('Ingresa el contenido del post'); return; }
    if (isUploading) { setError('Espera a que terminen de subir los archivos'); return; }
    if (mediaItems.some(m => m.error)) { setError('Hay archivos que no se pudieron subir. Elimínalos e intentá de nuevo'); return; }
    if (schedulingType === 'scheduled' && !getSchedulingPayload()) { setError('Selecciona fecha y hora de publicación'); return; }

    // Validate platform-specific required fields
    const facebookAccountsWithoutPage = accounts.filter(
      a => a.platform === 'facebook' && a.subaccounts?.length > 0 && !subaccountSelections[a.id]
    );
    if (facebookAccountsWithoutPage.length > 0) {
      setError('Selecciona una página de Facebook para cada cuenta');
      return;
    }
    const hasPinterest = accounts.some(a => a.platform === 'pinterest');
    if (hasPinterest && !platformConfigs.pinterest?.boardId) {
      setError('Ingresa el Board ID de Pinterest');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const accountsPayload = accounts.map(account => {
        const targetConfig = { ...(platformConfigs[account.platform] || {}) };
        if (subaccountSelections[account.id]) {
          targetConfig.pageId = subaccountSelections[account.id];
        }
        return { id: account.id, platform: account.platform, targetConfig };
      });

      const result = await createPost({
        serviceId,
        projectId,
        contentText: content,
        mediaUrls: mediaItems.filter(m => m.url).map(m => m.url),
        accounts: accountsPayload,
        scheduling: getSchedulingPayload()
      });

      // Warn if some accounts failed but others succeeded
      if (result.errors?.length) {
        const failedPlatforms = result.errors.map(e => e.platform).join(', ');
        setError(`Publicado en ${result.posts.length} cuenta(s). Fallaron: ${failedPlatforms}`);
        return;
      }

      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Advanced platform-specific config sections
  const renderPlatformConfigs = () => {
    const sections = [];

    if (platforms.includes('instagram')) {
      sections.push(
        <div key="instagram" className="space-y-2 p-3 bg-neutral-50 rounded-xl">
          <div className="flex items-center gap-1.5 mb-2">
            <PlatformIcon platform="instagram" size={12} />
            <span className="text-xs font-bold text-neutral-600">Instagram — Tipo de contenido</span>
          </div>
          <div className="flex gap-2">
            {INSTAGRAM_MEDIA_TYPES.map(type => (
              <button
                key={type.id}
                onClick={() => setPlatformConfig('instagram', 'mediaType', type.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  (platformConfigs.instagram?.mediaType || 'reel') === type.id
                    ? 'bg-black text-white'
                    : 'bg-white text-neutral-600 border border-neutral-200'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (platforms.includes('tiktok')) {
      sections.push(
        <div key="tiktok" className="space-y-2 p-3 bg-neutral-50 rounded-xl">
          <div className="flex items-center gap-1.5 mb-2">
            <PlatformIcon platform="tiktok" size={12} />
            <span className="text-xs font-bold text-neutral-600">TikTok — Privacidad</span>
          </div>
          <select
            value={platformConfigs.tiktok?.privacyLevel || 'PUBLIC_TO_EVERYONE'}
            onChange={(e) => setPlatformConfig('tiktok', 'privacyLevel', e.target.value)}
            className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-xs"
          >
            {TIKTOK_PRIVACY_LEVELS.map(level => (
              <option key={level.id} value={level.id}>{level.label}</option>
            ))}
          </select>
        </div>
      );
    }

    if (platforms.includes('youtube')) {
      sections.push(
        <div key="youtube" className="space-y-2 p-3 bg-neutral-50 rounded-xl">
          <div className="flex items-center gap-1.5 mb-2">
            <PlatformIcon platform="youtube" size={12} />
            <span className="text-xs font-bold text-neutral-600">YouTube</span>
          </div>
          <input
            type="text"
            value={platformConfigs.youtube?.title || ''}
            onChange={(e) => setPlatformConfig('youtube', 'title', e.target.value)}
            placeholder="Título del video"
            className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-xs"
          />
          <select
            value={platformConfigs.youtube?.privacyStatus || 'private'}
            onChange={(e) => setPlatformConfig('youtube', 'privacyStatus', e.target.value)}
            className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-xs"
          >
            {YOUTUBE_PRIVACY.map(p => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        </div>
      );
    }

    if (platforms.includes('pinterest')) {
      sections.push(
        <div key="pinterest" className="space-y-2 p-3 bg-neutral-50 rounded-xl">
          <div className="flex items-center gap-1.5 mb-2">
            <PlatformIcon platform="pinterest" size={12} />
            <span className="text-xs font-bold text-neutral-600">Pinterest — Board ID *</span>
          </div>
          <input
            type="text"
            value={platformConfigs.pinterest?.boardId || ''}
            onChange={(e) => setPlatformConfig('pinterest', 'boardId', e.target.value)}
            placeholder="ID del tablero"
            className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-xs"
          />
        </div>
      );
    }

    // FB/LinkedIn subaccount per account
    accounts
      .filter(a => ['facebook', 'linkedin'].includes(a.platform) && a.subaccounts?.length > 0)
      .forEach(account => {
        sections.push(
          <div key={account.id} className="space-y-2 p-3 bg-neutral-50 rounded-xl">
            <div className="flex items-center gap-1.5 mb-2">
              <PlatformIcon platform={account.platform} size={12} />
              <span className="text-xs font-bold text-neutral-600">
                @{account.username} — {account.platform === 'facebook' ? 'Página *' : 'Página'}
              </span>
            </div>
            <select
              value={subaccountSelections[account.id] || ''}
              onChange={(e) => setSubaccountSelections(prev => ({ ...prev, [account.id]: e.target.value }))}
              className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-xs"
            >
              <option value="">Selecciona una página...</option>
              {account.subaccounts.map(sub => (
                <option key={sub.id} value={sub.id}>{sub.name}</option>
              ))}
            </select>
          </div>
        );
      });

    return sections;
  };

  const advancedSections = renderPlatformConfigs();
  const hasAdvanced = advancedSections.length > 0;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-neutral-100">
            <h2 className="text-lg font-bold text-neutral-800">Programar Publicación</h2>
            <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
              <X size={18} className="text-neutral-400" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">

            {/* Publicando en — read-only account chips */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-neutral-700">Publicando en</label>
              {accountsLoading ? (
                <div className="flex items-center gap-2 text-sm text-neutral-400">
                  <Loader2 size={14} className="animate-spin" />
                  Cargando cuentas...
                </div>
              ) : accounts.length === 0 ? (
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                  <Users size={14} />
                  {hasAssignments
                    ? 'Las cuentas asignadas no están disponibles. Sincronizá en "Cuentas".'
                    : 'No hay cuentas asignadas a este proyecto. Abrí "Cuentas" y asigná las que corresponden.'}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {accounts.map(account => (
                    <div
                      key={account.id}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-neutral-100 rounded-lg"
                    >
                      <PlatformIcon platform={account.platform} size={13} />
                      <span className="text-xs font-medium text-neutral-700">@{account.username}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Content textarea */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-neutral-700">Texto</label>
                {exceededPlatforms.length > 0 && (
                  <span className="text-xs text-amber-500 font-medium">
                    Excede el límite de {exceededPlatforms.join(', ')}
                  </span>
                )}
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Escribe tu publicación..."
                rows={5}
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm resize-none focus:outline-none focus:border-black transition-colors"
              />
              <p className="text-[10px] text-neutral-400 text-right">{content.length} caracteres</p>
            </div>

            {/* Media Upload */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-neutral-700">Archivos (imágenes / videos)</label>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_MEDIA}
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
              <div className="flex flex-wrap gap-2 items-start">
                {mediaItems.map((item, index) => (
                  <div
                    key={index}
                    className={`relative w-20 h-20 rounded-xl overflow-hidden border ${
                      item.error ? 'border-rose-300 bg-rose-50' : 'border-neutral-200 bg-neutral-100'
                    }`}
                  >
                    {item.uploading ? (
                      <div className="w-full h-full flex items-center justify-center">
                        <Loader2 size={18} className="animate-spin text-neutral-400" />
                      </div>
                    ) : item.error ? (
                      <div className="w-full h-full flex flex-col items-center justify-center p-1">
                        <AlertCircle size={14} className="text-rose-400" />
                        <span className="text-[9px] text-rose-400 text-center mt-1">Error al subir</span>
                      </div>
                    ) : item.isVideo || item.url?.match(/\.(mp4|mov|webm)/) ? (
                      <div className="w-full h-full flex items-center justify-center bg-neutral-800">
                        <Film size={24} className="text-white" />
                      </div>
                    ) : (
                      <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                    )}
                    <button
                      onClick={() => handleRemoveMedia(index)}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/60 hover:bg-black rounded-full flex items-center justify-center transition-colors"
                    >
                      <X size={10} className="text-white" />
                    </button>
                    {!item.uploading && !item.error && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/40 px-1 py-0.5">
                        <p className="text-[8px] text-white truncate">{item.name}</p>
                      </div>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-20 h-20 flex flex-col items-center justify-center gap-1 border-2 border-dashed border-neutral-300 rounded-xl text-neutral-400 hover:border-neutral-400 hover:text-neutral-600 transition-colors"
                >
                  <Upload size={16} />
                  <span className="text-[10px]">Subir</span>
                </button>
              </div>
              <p className="text-[10px] text-neutral-400">
                JPG, PNG, GIF, WebP · MP4, MOV, WebM · máx. 100 MB por archivo
              </p>
            </div>

            {/* Scheduling */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-neutral-700">Programación</label>
              <div className="flex flex-wrap gap-2">
                {SCHEDULING_OPTIONS.map(option => (
                  <button
                    key={option.id}
                    onClick={() => setSchedulingType(option.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      schedulingType === option.id
                        ? 'bg-black text-white'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    <option.icon size={14} />
                    {option.label}
                  </button>
                ))}
              </div>
              <AnimatePresence>
                {schedulingType === 'scheduled' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex gap-3 pt-2">
                      <input
                        type="date"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        className="px-3 py-2 bg-white border border-neutral-200 rounded-lg text-sm"
                      />
                      <input
                        type="time"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        className="px-3 py-2 bg-white border border-neutral-200 rounded-lg text-sm"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Advanced platform config */}
            {hasAdvanced && (
              <div className="space-y-2">
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-2 text-sm font-semibold text-neutral-600 hover:text-neutral-800 transition-colors"
                >
                  <ChevronDown size={14} className={`transition-transform ${showAdvanced ? '' : '-rotate-90'}`} />
                  Opciones por plataforma
                </button>
                <AnimatePresence>
                  {showAdvanced && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden space-y-3"
                    >
                      {advancedSections}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-600">
                <AlertCircle size={16} />
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-5 border-t border-neutral-100 bg-neutral-50 flex items-center justify-between gap-3">
            <p className="text-xs text-neutral-400">
              {accounts.length > 0
                ? `Se publicará en ${accounts.length} cuenta${accounts.length !== 1 ? 's' : ''}`
                : 'Sin cuentas asignadas'}
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || accounts.length === 0 || isUploading}
                className="flex items-center gap-2 px-6 py-2 bg-black text-white rounded-xl text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-800 transition-colors"
              >
                {isSubmitting ? (
                  <><Loader2 size={14} className="animate-spin" /> Creando...</>
                ) : isUploading ? (
                  <><Loader2 size={14} className="animate-spin" /> Subiendo...</>
                ) : (
                  <><Send size={14} />{schedulingType === 'immediate' ? 'Publicar' : 'Programar'}</>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default CreatePostModal;
