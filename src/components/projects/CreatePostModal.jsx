import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Send,
  Calendar,
  Clock,
  ChevronDown,
  AlertCircle,
  Image as ImageIcon,
  Upload,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  Film
} from 'lucide-react';
import { PlatformIcon } from './PlatformIcon';
import {
  createPost,
  getMaxChars,
  PLATFORM_CONFIG,
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
  aiPlanning = null
}) {
  const { accounts, loading: accountsLoading } = useBlotatoAccounts(projectId);
  const fileInputRef = useRef(null);

  // Form state
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [selectedSubaccount, setSelectedSubaccount] = useState(null);
  const [content, setContent] = useState(initialContent);
  const [mediaItems, setMediaItems] = useState([]); // { url, name, uploading, error }
  const [schedulingType, setSchedulingType] = useState('scheduled');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [platformConfig, setPlatformConfig] = useState({});
  const [showPlatformConfig, setShowPlatformConfig] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Reset form when opening
  useEffect(() => {
    if (isOpen) {
      setContent(initialContent);
      setSelectedAccount(null);
      setSelectedSubaccount(null);
      setMediaItems([]);
      setSchedulingType('scheduled');
      setScheduledDate(initialDate || '');
      setScheduledTime(initialDate ? '10:00' : '');
      setPlatformConfig({});
      setError(null);
      setShowPlatformConfig(false);
    }
  }, [isOpen, initialContent, initialDate]);

  const platform = selectedAccount?.platform;
  const maxChars = useMemo(() => getMaxChars(platform), [platform]);
  const charCount = content.length;
  const isOverLimit = charCount > maxChars;
  const isUploading = mediaItems.some(m => m.uploading);

  const handleAccountSelect = (account) => {
    setSelectedAccount(account);
    setSelectedSubaccount(null);
    setPlatformConfig({});
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    // Add placeholder entries while uploading
    const placeholders = files.map(f => ({
      name: f.name,
      url: null,
      uploading: true,
      error: null,
      isVideo: f.type.startsWith('video/')
    }));

    setMediaItems(prev => [...prev, ...placeholders]);

    // Upload each file
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

    // Reset input so the same file can be re-selected if needed
    e.target.value = '';
  };

  const handleRemoveMedia = (index) => {
    setMediaItems(prev => prev.filter((_, i) => i !== index));
  };

  const handlePlatformConfigChange = (key, value) => {
    setPlatformConfig(prev => ({ ...prev, [key]: value }));
  };

  const getSchedulingPayload = () => {
    switch (schedulingType) {
      case 'immediate':
        return { type: 'immediate' };
      case 'scheduled':
        if (!scheduledDate || !scheduledTime) return null;
        return { type: 'scheduled', time: new Date(`${scheduledDate}T${scheduledTime}`).toISOString() };
      case 'nextSlot':
        return { type: 'nextSlot' };
      default:
        return { type: 'immediate' };
    }
  };

  const validateForm = () => {
    if (!selectedAccount) return 'Selecciona una cuenta';
    if (!content.trim()) return 'Ingresa el contenido del post';
    if (isOverLimit) return `El contenido excede el límite de ${maxChars} caracteres`;
    if (isUploading) return 'Espera a que terminen de subir los archivos';
    if (mediaItems.some(m => m.error)) return 'Hay archivos que no se pudieron subir. Elimínalos e intentá de nuevo';

    if (platform === 'facebook' && !selectedSubaccount && selectedAccount.subaccounts?.length > 0) {
      return 'Selecciona una página de Facebook';
    }
    if (platform === 'pinterest' && !platformConfig.boardId) {
      return 'Ingresa el Board ID de Pinterest';
    }
    if (schedulingType === 'scheduled' && !getSchedulingPayload()) {
      return 'Selecciona fecha y hora de publicación';
    }

    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const targetConfig = { ...platformConfig };
      if (selectedSubaccount) {
        targetConfig.pageId = selectedSubaccount.id;
      }

      const mediaUrls = mediaItems.filter(m => m.url).map(m => m.url);

      await createPost({
        serviceId,
        projectId,
        contentText: content,
        mediaUrls,
        accountId: selectedAccount.id,
        platform,
        targetConfig,
        scheduling: getSchedulingPayload()
      });

      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderPlatformSpecificConfig = () => {
    if (!platform) return null;

    switch (platform) {
      case 'instagram':
        return (
          <div className="space-y-3 p-3 bg-neutral-50 rounded-xl">
            <label className="text-xs font-semibold text-neutral-600">Tipo de contenido</label>
            <div className="flex gap-2">
              {INSTAGRAM_MEDIA_TYPES.map(type => (
                <button
                  key={type.id}
                  onClick={() => handlePlatformConfigChange('mediaType', type.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    platformConfig.mediaType === type.id
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

      case 'tiktok':
        return (
          <div className="space-y-3 p-3 bg-neutral-50 rounded-xl">
            <label className="text-xs font-semibold text-neutral-600">Privacidad</label>
            <select
              value={platformConfig.privacyLevel || 'PUBLIC_TO_EVERYONE'}
              onChange={(e) => handlePlatformConfigChange('privacyLevel', e.target.value)}
              className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-sm"
            >
              {TIKTOK_PRIVACY_LEVELS.map(level => (
                <option key={level.id} value={level.id}>{level.label}</option>
              ))}
            </select>
            <div className="space-y-2 pt-2">
              {[
                { key: 'disabledComments', label: 'Desactivar comentarios' },
                { key: 'disabledDuet', label: 'Desactivar Duet' },
                { key: 'disabledStitch', label: 'Desactivar Stitch' }
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 text-xs text-neutral-600">
                  <input
                    type="checkbox"
                    checked={platformConfig[key] || false}
                    onChange={(e) => handlePlatformConfigChange(key, e.target.checked)}
                    className="rounded border-neutral-300"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        );

      case 'youtube':
        return (
          <div className="space-y-3 p-3 bg-neutral-50 rounded-xl">
            <label className="text-xs font-semibold text-neutral-600">Título del video</label>
            <input
              type="text"
              value={platformConfig.title || ''}
              onChange={(e) => handlePlatformConfigChange('title', e.target.value)}
              placeholder="Título del video"
              className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-sm"
            />
            <label className="text-xs font-semibold text-neutral-600">Privacidad</label>
            <select
              value={platformConfig.privacyStatus || 'private'}
              onChange={(e) => handlePlatformConfigChange('privacyStatus', e.target.value)}
              className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-sm"
            >
              {YOUTUBE_PRIVACY.map(p => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>
        );

      case 'pinterest':
        return (
          <div className="space-y-3 p-3 bg-neutral-50 rounded-xl">
            <label className="text-xs font-semibold text-neutral-600">Board ID *</label>
            <input
              type="text"
              value={platformConfig.boardId || ''}
              onChange={(e) => handlePlatformConfigChange('boardId', e.target.value)}
              placeholder="ID del tablero de Pinterest"
              className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-sm"
            />
            <p className="text-[10px] text-neutral-400">
              El Board ID no está disponible via API. Obtenerlo desde Pinterest manualmente.
            </p>
          </div>
        );

      case 'facebook':
      case 'linkedin':
        if (selectedAccount?.subaccounts?.length > 0) {
          return (
            <div className="space-y-3 p-3 bg-neutral-50 rounded-xl">
              <label className="text-xs font-semibold text-neutral-600">
                Seleccionar página {platform === 'facebook' ? '*' : ''}
              </label>
              <select
                value={selectedSubaccount?.id || ''}
                onChange={(e) => {
                  const sub = selectedAccount.subaccounts.find(s => s.id === e.target.value);
                  setSelectedSubaccount(sub);
                }}
                className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-sm"
              >
                <option value="">Selecciona una página...</option>
                {selectedAccount.subaccounts.map(sub => (
                  <option key={sub.id} value={sub.id}>{sub.name}</option>
                ))}
              </select>
            </div>
          );
        }
        return null;

      default:
        return null;
    }
  };

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
            <button
              onClick={onClose}
              className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
            >
              <X size={18} className="text-neutral-400" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Account Selection */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-neutral-700">Cuenta</label>
              {accountsLoading ? (
                <div className="flex items-center gap-2 text-sm text-neutral-400">
                  <Loader2 size={14} className="animate-spin" />
                  Cargando cuentas...
                </div>
              ) : accounts.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                  No hay cuentas sincronizadas. Abre la configuración de Blotato y presiona "Sincronizar".
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {accounts.map(account => (
                    <button
                      key={account.id}
                      onClick={() => handleAccountSelect(account)}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${
                        selectedAccount?.id === account.id
                          ? 'border-black bg-black/5'
                          : 'border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <PlatformIcon platform={account.platform} size={14} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-neutral-800 truncate">
                          @{account.username}
                        </p>
                      </div>
                      {selectedAccount?.id === account.id && (
                        <CheckCircle2 size={14} className="text-black" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Content */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-neutral-700">Texto</label>
                {platform && (
                  <span className={`text-xs ${isOverLimit ? 'text-rose-500 font-semibold' : 'text-neutral-400'}`}>
                    {charCount}/{maxChars}
                  </span>
                )}
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Escribe tu publicación..."
                rows={5}
                className={`w-full px-4 py-3 bg-neutral-50 border rounded-xl text-sm resize-none focus:outline-none focus:border-black transition-colors ${
                  isOverLimit ? 'border-rose-300' : 'border-neutral-200'
                }`}
              />
            </div>

            {/* Media Upload */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-neutral-700">Archivos (imágenes / videos)</label>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_MEDIA}
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />

              {/* Upload zone + previews */}
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
                        <span className="text-[9px] text-rose-400 text-center mt-1 leading-tight">Error al subir</span>
                      </div>
                    ) : item.isVideo || item.url?.includes('.mp4') || item.url?.includes('.mov') || item.url?.includes('.webm') ? (
                      <div className="w-full h-full flex items-center justify-center bg-neutral-800">
                        <Film size={24} className="text-white" />
                      </div>
                    ) : (
                      <img
                        src={item.url}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    )}

                    {/* Remove button */}
                    <button
                      onClick={() => handleRemoveMedia(index)}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/60 hover:bg-black rounded-full flex items-center justify-center transition-colors"
                    >
                      <X size={10} className="text-white" />
                    </button>

                    {/* File name tooltip */}
                    {!item.uploading && !item.error && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/40 px-1 py-0.5">
                        <p className="text-[8px] text-white truncate">{item.name}</p>
                      </div>
                    )}
                  </div>
                ))}

                {/* Add button */}
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

            {/* Platform-specific config */}
            {platform && (
              <div className="space-y-2">
                <button
                  onClick={() => setShowPlatformConfig(!showPlatformConfig)}
                  className="flex items-center gap-2 text-sm font-semibold text-neutral-700"
                >
                  <ChevronDown
                    size={14}
                    className={`transition-transform ${showPlatformConfig ? '' : '-rotate-90'}`}
                  />
                  Configuración de {platform}
                </button>

                <AnimatePresence>
                  {showPlatformConfig && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      {renderPlatformSpecificConfig()}
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
          <div className="p-5 border-t border-neutral-100 bg-neutral-50 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-800"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !selectedAccount || isUploading}
              className="flex items-center gap-2 px-6 py-2 bg-black text-white rounded-xl text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-800 transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Creando...
                </>
              ) : isUploading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Subiendo archivos...
                </>
              ) : (
                <>
                  <Send size={14} />
                  {schedulingType === 'immediate' ? 'Publicar' : 'Programar'}
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default CreatePostModal;
