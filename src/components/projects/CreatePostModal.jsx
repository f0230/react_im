import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Send,
  Calendar,
  Clock,
  AlertCircle,
  Upload,
  Loader2,
  Film,
  Users,
  ChevronDown,
  ImagePlus,
  Check
} from 'lucide-react';
import { PlatformIcon } from './PlatformIcon';
import {
  createPost,
  getMaxChars,
  getPlatformName,
  uploadMediaFile
} from '@/services/blotatoService';
import { useBlotatoAccounts } from '@/hooks/useBlotatoAccounts';

const SCHEDULING_OPTIONS = [
  {
    id: 'immediate',
    label: 'Publicar ahora',
    description: 'Se envía de inmediato a Blotato.',
    icon: Send
  },
  {
    id: 'scheduled',
    label: 'Elegir fecha y hora',
    description: 'Definí exactamente cuándo debe salir.',
    icon: Calendar
  },
  {
    id: 'nextSlot',
    label: 'Siguiente hueco libre',
    description: 'Blotato toma el próximo espacio disponible.',
    icon: Clock
  }
];

const PUBLICATION_FORMATS = [
  {
    id: 'post',
    label: 'Publicación',
    description: 'Post normal. Si subís varias imágenes, Blotato lo convierte en carrusel automáticamente.'
  },
  {
    id: 'carousel',
    label: 'Carrusel',
    description: 'Pensado para 2 o más imágenes en una misma publicación.'
  },
  {
    id: 'reel',
    label: 'Reel / Video',
    description: 'Usá 1 video para reels o publicaciones de video corto.'
  },
  {
    id: 'story',
    label: 'Historia',
    description: 'Una sola imagen o video vertical. Solo disponible para Instagram.'
  }
];

const FACEBOOK_MEDIA_TYPES = [
  { id: 'reel', label: 'Reel' },
  { id: 'video', label: 'Video' }
];

const TIKTOK_PRIVACY_LEVELS = [
  { id: 'PUBLIC_TO_EVERYONE', label: 'Publico' },
  { id: 'MUTUAL_FOLLOW_FRIENDS', label: 'Amigos mutuos' },
  { id: 'FOLLOWER_OF_CREATOR', label: 'Seguidores' },
  { id: 'SELF_ONLY', label: 'Privado' }
];

const YOUTUBE_PRIVACY = [
  { id: 'public', label: 'Publico' },
  { id: 'unlisted', label: 'No listado' },
  { id: 'private', label: 'Privado' }
];

const ACCEPTED_MEDIA = 'image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/webm';
const ACCEPTED_IMAGE_MEDIA = 'image/jpeg,image/png,image/gif,image/webp';
const INPUT_CLASSNAME = 'w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-sm text-neutral-700 outline-none transition-colors placeholder:text-neutral-400 focus:border-black';
const TEXTAREA_CLASSNAME = `${INPUT_CLASSNAME} resize-none`;
const INSTAGRAM_VIDEO_MAX_BYTES = 100 * 1024 * 1024;
const INSTAGRAM_COVER_MAX_BYTES = 8 * 1024 * 1024;
const INSTAGRAM_VIDEO_MIME_TYPES = new Set(['video/mp4', 'video/quicktime']);

function isVideoUrl(url = '') {
  return /\.(mp4|mov|webm)$/i.test(url);
}

function formatBytes(bytes = 0) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 MB';
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function parseCollaborators(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.replace(/^@+/, '').trim())
    .filter(Boolean);
}

function getAccountDisplayName(account) {
  return (
    account?.targetConfig?.pageName ||
    account?.fullname ||
    (account?.username ? `@${account.username}` : getPlatformName(account?.platform || ''))
  );
}

function ToggleField({ label, description, checked, onChange }) {
  return (
    <label className="flex items-start justify-between gap-4 rounded-xl border border-neutral-200 bg-white px-3.5 py-3">
      <div className="space-y-1">
        <p className="text-sm font-medium text-neutral-800">{label}</p>
        {description ? <p className="text-xs text-neutral-500">{description}</p> : null}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          checked ? 'bg-black' : 'bg-neutral-200'
        }`}
        aria-pressed={checked}
      >
        <span
          className={`inline-block h-5 w-5 rounded-full bg-white transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </label>
  );
}

function PlatformPanel({ platform, title, subtitle, open, onToggle, children, badge }) {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
      >
        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100">
            <PlatformIcon platform={platform} size={16} />
          </div>
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-neutral-800">{title}</h3>
              {badge ? (
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-500">
                  {badge}
                </span>
              ) : null}
            </div>
            {subtitle ? <p className="text-xs text-neutral-500">{subtitle}</p> : null}
          </div>
        </div>
        <ChevronDown
          size={16}
          className={`shrink-0 text-neutral-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-4 border-t border-neutral-100 px-4 py-4">
              {children}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

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
  const instagramCoverInputRef = useRef(null);

  const [content, setContent] = useState(initialContent);
  const [mediaItems, setMediaItems] = useState([]);
  const [schedulingType, setSchedulingType] = useState('scheduled');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [contentFormat, setContentFormat] = useState('post');
  const [platformConfigs, setPlatformConfigs] = useState({});
  const [subaccountSelections, setSubaccountSelections] = useState({});
  const [openPlatformSections, setOpenPlatformSections] = useState({});
  const [instagramCoverUpload, setInstagramCoverUpload] = useState({
    uploading: false,
    error: null,
    fileName: '',
    mimeType: '',
    sizeBytes: 0
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    setContent(initialContent);
    setMediaItems([]);
    setSchedulingType('scheduled');
    setScheduledDate(initialDate || '');
    setScheduledTime(initialDate ? '10:00' : '');
    setContentFormat('post');
    setPlatformConfigs({});
    setSubaccountSelections({});
    setOpenPlatformSections({});
    setInstagramCoverUpload({ uploading: false, error: null, fileName: '', mimeType: '', sizeBytes: 0 });
    setError(null);
  }, [isOpen, initialContent, initialDate]);

  useEffect(() => {
    if (!error) return;
    setError(null);
  }, [
    content,
    mediaItems,
    schedulingType,
    scheduledDate,
    scheduledTime,
    contentFormat,
    platformConfigs,
    subaccountSelections
  ]);

  const platforms = useMemo(
    () => [...new Set(accounts.map((account) => account.platform))],
    [accounts]
  );

  const accountsByPlatform = useMemo(
    () => accounts.reduce((acc, account) => {
      if (!acc[account.platform]) acc[account.platform] = [];
      acc[account.platform].push(account);
      return acc;
    }, {}),
    [accounts]
  );

  const isUploadingMedia = mediaItems.some((item) => item.uploading);
  const uploadedMediaItems = mediaItems.filter((item) => item.url && !item.uploading && !item.error);
  const uploadedMediaUrls = uploadedMediaItems.map((item) => item.url);
  const uploadedImageItems = uploadedMediaItems.filter((item) => !item.isVideo && !isVideoUrl(item.url));
  const uploadedVideoItems = uploadedMediaItems.filter((item) => item.isVideo || isVideoUrl(item.url));
  const uploadedMediaCount = uploadedMediaItems.length;
  const uploadedImageCount = uploadedImageItems.length;
  const uploadedVideoCount = uploadedVideoItems.length;
  const supportsStoryFormat = platforms.includes('instagram');

  const availableFormats = PUBLICATION_FORMATS.filter(
    (format) => format.id !== 'story' || supportsStoryFormat
  );

  const activeAccounts = contentFormat === 'story'
    ? accounts.filter((account) => account.platform === 'instagram')
    : accounts;

  const activePlatforms = [...new Set(activeAccounts.map((account) => account.platform))];
  const hasInstagramTarget = activePlatforms.includes('instagram');
  const primaryVideoItem = uploadedVideoItems[0] || null;

  useEffect(() => {
    if (contentFormat === 'story' && !supportsStoryFormat) {
      setContentFormat('post');
    }
  }, [contentFormat, supportsStoryFormat]);

  const exceededPlatforms = platforms.filter((platform) => content.length > getMaxChars(platform));
  const instagramCollaborators = parseCollaborators(platformConfigs.instagram?.collaborators);
  const isBusyUploading = isUploadingMedia || instagramCoverUpload.uploading;

  const togglePlatformSection = (platform) => {
    setOpenPlatformSections((prev) => ({
      ...prev,
      [platform]: !(prev[platform] ?? true)
    }));
  };

  const setPlatformConfig = (platform, key, value) => {
    setPlatformConfigs((prev) => ({
      ...prev,
      [platform]: { ...(prev[platform] || {}), [key]: value }
    }));
  };

  const getSelectedPageId = (account) => (
    subaccountSelections[account.id] ||
    account.targetConfig?.pageId ||
    ''
  );

  const handleFileSelect = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const startIndex = mediaItems.length;
    const placeholders = files.map((file) => ({
      name: file.name,
      url: null,
      uploading: true,
      error: null,
      isVideo: file.type.startsWith('video/'),
      mimeType: file.type || '',
      sizeBytes: Number(file.size || 0)
    }));

    setMediaItems((prev) => [...prev, ...placeholders]);

    await Promise.all(
      files.map(async (file, offset) => {
        const currentIndex = startIndex + offset;

        try {
          const url = await uploadMediaFile(file);
          setMediaItems((prev) => {
            const next = [...prev];
            next[currentIndex] = { ...next[currentIndex], url, uploading: false };
            return next;
          });
        } catch (uploadError) {
          setMediaItems((prev) => {
            const next = [...prev];
            next[currentIndex] = {
              ...next[currentIndex],
              uploading: false,
              error: uploadError.message
            };
            return next;
          });
        }
      })
    );

    event.target.value = '';
  };

  const handleInstagramCoverFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setInstagramCoverUpload({
      uploading: true,
      error: null,
      fileName: file.name,
      mimeType: file.type || '',
      sizeBytes: Number(file.size || 0)
    });

    try {
      const coverImageUrl = await uploadMediaFile(file);
      setPlatformConfig('instagram', 'coverImageUrl', coverImageUrl);
      setInstagramCoverUpload({
        uploading: false,
        error: null,
        fileName: file.name,
        mimeType: file.type || '',
        sizeBytes: Number(file.size || 0)
      });
    } catch (uploadError) {
      setInstagramCoverUpload({
        uploading: false,
        error: uploadError.message,
        fileName: file.name,
        mimeType: file.type || '',
        sizeBytes: Number(file.size || 0)
      });
    } finally {
      event.target.value = '';
    }
  };

  const handleRemoveMedia = (index) => {
    setMediaItems((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const clearInstagramCover = () => {
    setPlatformConfig('instagram', 'coverImageUrl', '');
    setInstagramCoverUpload({
      uploading: false,
      error: null,
      fileName: '',
      mimeType: '',
      sizeBytes: 0
    });
  };

  const getSchedulingPayload = () => {
    switch (schedulingType) {
      case 'immediate':
        return { type: 'immediate' };
      case 'scheduled':
        if (!scheduledDate || !scheduledTime) return null;
        return {
          type: 'scheduled',
          time: new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
        };
      case 'nextSlot':
        return { type: 'nextSlot' };
      default:
        return { type: 'immediate' };
    }
  };

  const getValidationError = () => {
    if (accountsLoading) return 'Cargando cuentas conectadas...';
    if (!activeAccounts.length) {
      return hasAssignments
        ? 'Las cuentas asignadas no estan disponibles. Revisa la sincronizacion de Blotato.'
        : 'Asigna al menos una cuenta de Blotato para poder publicar.';
    }

    if (!content.trim()) return 'Escribe el mensaje principal de la publicacion.';
    if (isUploadingMedia) return 'Espera a que terminen de subir los archivos principales.';
    if (mediaItems.some((item) => item.error)) return 'Elimina o vuelve a subir los archivos con error.';
    if (instagramCoverUpload.uploading) return 'Espera a que termine de subir la portada de Instagram.';

    if (contentFormat === 'carousel') {
      if (uploadedImageCount < 2) return 'Sube al menos 2 imagenes para el carrusel.';
      if (uploadedVideoCount > 0) return 'El carrusel de esta interfaz admite solo imagenes.';
    }

    if (contentFormat === 'reel') {
      if (uploadedVideoCount !== 1 || uploadedMediaCount !== 1) {
        return 'Reel / Video requiere exactamente 1 archivo de video.';
      }
    }

    if (contentFormat === 'story') {
      if (!supportsStoryFormat) return 'Historia solo esta disponible al publicar unicamente en Instagram.';
      if (uploadedMediaCount !== 1) return 'Historia requiere exactamente 1 imagen o video.';
    }

    if (schedulingType === 'scheduled' && !getSchedulingPayload()) {
      return 'Completa la fecha y la hora de publicacion.';
    }

    const facebookAccountsWithoutPage = activeAccounts.filter(
      (account) => account.platform === 'facebook'
        && account.subaccounts?.length > 0
        && !getSelectedPageId(account)
    );

    if (facebookAccountsWithoutPage.length > 0) {
      return 'Selecciona una pagina para cada destino de Facebook.';
    }

    if ((platformConfigs.instagram?.altText || '').length > 1000) {
      return 'El alt text de Instagram no puede superar los 1000 caracteres.';
    }

    if (instagramCollaborators.length > 3) {
      return 'Instagram permite hasta 3 colaboradores.';
    }

    if (hasInstagramTarget && primaryVideoItem) {
      if (primaryVideoItem.mimeType && !INSTAGRAM_VIDEO_MIME_TYPES.has(primaryVideoItem.mimeType)) {
        return 'Instagram acepta reels y videos solo en formato MP4 o MOV. Vuelve a subir el archivo en uno de esos formatos.';
      }

      if (primaryVideoItem.sizeBytes > INSTAGRAM_VIDEO_MAX_BYTES) {
        return `Instagram permite videos de hasta 100 MB. El archivo actual pesa ${formatBytes(primaryVideoItem.sizeBytes)}.`;
      }
    }

    if (hasInstagramTarget && contentFormat === 'reel' && instagramCoverUpload.sizeBytes > INSTAGRAM_COVER_MAX_BYTES) {
      return `La portada del reel para Instagram no puede superar 8 MB. La portada actual pesa ${formatBytes(instagramCoverUpload.sizeBytes)}.`;
    }

    if (activeAccounts.some((account) => account.platform === 'pinterest') && !platformConfigs.pinterest?.boardId?.trim()) {
      return 'Completa el Board ID de Pinterest.';
    }

    return null;
  };

  const validationError = getValidationError();
  const canSubmit = !validationError && !isSubmitting;

  const handleSubmit = async () => {
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const accountsPayload = activeAccounts.map((account) => {
        const targetConfig = {
          ...(account.targetConfig || {}),
          ...(platformConfigs[account.platform] || {})
        };

        if (account.platform === 'instagram') {
          if (contentFormat === 'story') {
            targetConfig.mediaType = 'story';
          } else if (contentFormat === 'reel') {
            targetConfig.mediaType = 'reel';
          } else {
            delete targetConfig.mediaType;
          }

          if (uploadedVideoCount > 0) {
            delete targetConfig.altText;
          }

          if (targetConfig.shareToFeed !== true) {
            delete targetConfig.shareToFeed;
          }
        }

        if (account.platform === 'facebook') {
          if (contentFormat === 'reel') {
            targetConfig.mediaType = targetConfig.mediaType || 'reel';
          } else {
            delete targetConfig.mediaType;
          }
        }

        const selectedPageId = getSelectedPageId(account);
        if (selectedPageId) {
          targetConfig.pageId = selectedPageId;
          const selectedSubaccount = account.subaccounts?.find((subaccount) => subaccount.id === selectedPageId);
          if (selectedSubaccount?.name) {
            targetConfig.pageName = selectedSubaccount.name;
          }
        }

        return {
          id: account.id,
          platform: account.platform,
          targetConfig
        };
      });

      const result = await createPost({
        serviceId,
        projectId,
        contentText: content.trim(),
        mediaUrls: uploadedMediaUrls,
        accounts: accountsPayload,
        scheduling: getSchedulingPayload()
      });

      if (result.errors?.length) {
        const failedDetails = result.errors
          .map((item) => `${getPlatformName(item.platform)}: ${item.error}`)
          .join(' · ');
        setError(`Se creo la publicacion en ${result.posts.length} cuenta(s), pero hubo fallos. ${failedDetails}`);
        return;
      }

      onClose();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const instagramPanelOpen = openPlatformSections.instagram ?? true;
  const facebookPanelOpen = openPlatformSections.facebook ?? true;
  const linkedinPanelOpen = openPlatformSections.linkedin ?? true;
  const tiktokPanelOpen = openPlatformSections.tiktok ?? true;
  const pinterestPanelOpen = openPlatformSections.pinterest ?? true;
  const youtubePanelOpen = openPlatformSections.youtube ?? true;
  const storyExcludedAccounts = contentFormat === 'story'
    ? accounts.filter((account) => account.platform !== 'instagram')
    : [];

  const footerHint = error || validationError;

  if (!isOpen) return null;

  const modalContent = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[220] overflow-y-auto bg-black/45 backdrop-blur-sm"
        onClick={onClose}
      >
        <div className="flex min-h-full items-stretch justify-center p-0 md:items-center md:p-4">
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 16 }}
          transition={{ duration: 0.16 }}
          onClick={(event) => event.stopPropagation()}
          className="flex min-h-[100dvh] w-full max-w-3xl flex-col overflow-hidden rounded-none bg-neutral-50 shadow-2xl md:min-h-0 md:max-h-[92dvh] md:rounded-[28px]"
        >
          <div className="border-b border-neutral-200 bg-white px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold text-neutral-900">Crear publicacion</h2>
                <p className="text-sm text-neutral-500">
                  Define el formato, agrega el contenido y completa solo las opciones que cada plataforma necesita.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
            <section className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-5">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-neutral-800">Publicando en</label>
                <p className="text-xs text-neutral-500">
                  Estos son los destinos que se usaran en este proyecto.
                </p>
              </div>

              {accountsLoading ? (
                <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-500">
                  <Loader2 size={14} className="animate-spin" />
                  Cargando cuentas conectadas...
                </div>
              ) : activeAccounts.length === 0 ? (
                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  <Users size={16} className="mt-0.5 shrink-0" />
                  <p>
                    {hasAssignments
                      ? 'Las cuentas asignadas no estan disponibles todavia. Sincroniza Blotato y vuelve a intentarlo.'
                      : 'No hay cuentas asociadas a este proyecto todavia. Asignalas al proyecto antes de publicar.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                  {activeAccounts.map((account) => (
                    <div
                      key={`${account.id}-${account.targetConfig?.pageId || 'base'}`}
                      className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1.5"
                    >
                      <PlatformIcon platform={account.platform} size={14} />
                      <span className="text-xs font-medium text-neutral-700">
                        {getAccountDisplayName(account)}
                      </span>
                    </div>
                  ))}
                  </div>
                  {storyExcludedAccounts.length > 0 ? (
                    <p className="text-xs text-neutral-500">
                      En formato historia se publicará solo en Instagram. Los otros destinos quedan fuera de esta publicación.
                    </p>
                  ) : null}
                </div>
              )}
            </section>

            <section className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-neutral-800">Formato de publicacion</label>
                <p className="text-xs text-neutral-500">
                  Con una sola imagen se publica como post normal. Si subes varias imagenes, Blotato arma el carrusel automaticamente.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {availableFormats.map((format) => (
                  <button
                    key={format.id}
                    type="button"
                    onClick={() => setContentFormat(format.id)}
                    className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                      contentFormat === format.id
                        ? 'border-black bg-black text-white shadow-sm'
                        : 'border-neutral-200 bg-neutral-50 text-neutral-800 hover:border-neutral-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold">{format.label}</p>
                        <p className={`text-xs ${contentFormat === format.id ? 'text-white/75' : 'text-neutral-500'}`}>
                          {format.description}
                        </p>
                      </div>
                      {contentFormat === format.id ? <Check size={16} className="mt-0.5 shrink-0" /> : null}
                    </div>
                  </button>
                ))}
              </div>

              {contentFormat === 'reel' ? (
                <p className="rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-3 text-xs text-neutral-600">
                  Reel / Video usa exactamente 1 video. Si publicas tambien en Instagram, el archivo se enviara como reel.
                </p>
              ) : null}

              {contentFormat === 'carousel' ? (
                <p className="rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-3 text-xs text-neutral-600">
                  Carrusel requiere 2 o mas imagenes. Esta interfaz deja afuera videos para evitar errores entre plataformas.
                </p>
              ) : null}

              {contentFormat === 'story' ? (
                <p className="rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-3 text-xs text-neutral-600">
                  Historia esta disponible solo si el destino es Instagram y requiere exactamente 1 archivo.
                </p>
              ) : null}
            </section>

            <section className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-neutral-800">Contenido principal</label>
                <p className="text-xs text-neutral-500">
                  Escribe el mensaje y sube los archivos. Si eliges carrusel, usa varias imagenes.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-medium text-neutral-700">Mensaje</label>
                  <span className={`text-xs ${exceededPlatforms.length > 0 ? 'text-amber-600' : 'text-neutral-400'}`}>
                    {content.length} caracteres
                  </span>
                </div>
                <textarea
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  placeholder="Escribe aqui el texto principal de la publicacion..."
                  rows={6}
                  className={TEXTAREA_CLASSNAME}
                />
                <p className="text-xs text-neutral-500">
                  Limites actuales: {platforms.map((platform) => `${getPlatformName(platform)} ${getMaxChars(platform)}`).join(' · ') || 'sin cuentas seleccionadas'}
                </p>
                {exceededPlatforms.length > 0 ? (
                  <p className="text-xs text-amber-600">
                    El texto supera el limite de {exceededPlatforms.map((platform) => getPlatformName(platform)).join(', ')}.
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700">Archivos</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_MEDIA}
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-neutral-300 bg-neutral-50 px-4 py-5 text-sm font-medium text-neutral-600 transition-colors hover:border-neutral-400 hover:text-neutral-800"
                >
                  <Upload size={16} />
                  Subir imagenes o videos
                </button>

                <p className="text-xs text-neutral-500">
                  Acepta multiples imagenes y videos. Si subes varias imagenes, el carrusel se arma automaticamente en Blotato.
                </p>

                {mediaItems.length > 0 ? (
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
                    {mediaItems.map((item, index) => (
                      <div
                        key={`${item.name}-${index}`}
                        className={`relative overflow-hidden rounded-2xl border ${
                          item.error ? 'border-rose-200 bg-rose-50' : 'border-neutral-200 bg-neutral-100'
                        }`}
                      >
                        <div className="aspect-square">
                          {item.uploading ? (
                            <div className="flex h-full items-center justify-center">
                              <Loader2 size={18} className="animate-spin text-neutral-400" />
                            </div>
                          ) : item.error ? (
                            <div className="flex h-full flex-col items-center justify-center gap-2 px-2 text-center">
                              <AlertCircle size={16} className="text-rose-500" />
                              <span className="text-[10px] font-medium text-rose-600">Error al subir</span>
                            </div>
                          ) : item.isVideo || isVideoUrl(item.url) ? (
                            <div className="flex h-full items-center justify-center bg-neutral-900">
                              <Film size={24} className="text-white" />
                            </div>
                          ) : (
                            <img src={item.url} alt={item.name} className="h-full w-full object-cover" />
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveMedia(index)}
                          className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white transition-colors hover:bg-black"
                        >
                          <X size={10} />
                        </button>

                        {!item.uploading && !item.error ? (
                          <div className="border-t border-black/5 bg-white px-2 py-1.5">
                            <p className="truncate text-[10px] font-medium text-neutral-600">{item.name}</p>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </section>

            {activePlatforms.length > 0 ? (
              <section className="space-y-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-neutral-800">Opciones especificas por plataforma</label>
                  <p className="text-xs text-neutral-500">
                    Estas secciones aparecen solo cuando la publicacion incluye esa plataforma.
                  </p>
                </div>

                <div className="space-y-3">
                  {activePlatforms.includes('instagram') ? (
                    <PlatformPanel
                      platform="instagram"
                      title="Instagram"
                      subtitle="Alt text, colaboradores y portada del reel."
                      open={instagramPanelOpen}
                      onToggle={() => togglePlatformSection('instagram')}
                      badge={contentFormat === 'reel' ? 'Reel' : contentFormat === 'story' ? 'Historia' : uploadedImageCount > 1 ? 'Carrusel' : 'Opcional'}
                    >
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-neutral-700">Alt text</label>
                        <textarea
                          value={platformConfigs.instagram?.altText || ''}
                          onChange={(event) => setPlatformConfig('instagram', 'altText', event.target.value)}
                          rows={3}
                          maxLength={1000}
                          placeholder="Describe brevemente la imagen para accesibilidad."
                          className={TEXTAREA_CLASSNAME}
                        />
                        <p className="text-xs text-neutral-500">
                          Opcional. Maximo 1000 caracteres.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-neutral-700">Colaboradores</label>
                        <input
                          type="text"
                          value={platformConfigs.instagram?.collaborators || ''}
                          onChange={(event) => setPlatformConfig('instagram', 'collaborators', event.target.value)}
                          placeholder="Ej: cuenta1, cuenta2, cuenta3"
                          className={INPUT_CLASSNAME}
                        />
                        <p className="text-xs text-neutral-500">
                          Opcional. Separa hasta 3 cuentas con comas y sin necesidad de agregar @.
                        </p>
                      </div>

                      {contentFormat === 'reel' ? (
                        <>
                          <p className="rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-3 text-xs text-neutral-600">
                            Para Instagram, el reel conviene subirlo en MP4 o MOV y con un peso menor a 100 MB. Si Instagram rechaza sin detalle, normalmente viene por formato, tamaño o salud de la cuenta conectada.
                          </p>

                          <div className="space-y-2">
                            <label className="text-sm font-medium text-neutral-700">Portada del reel</label>
                            <input
                              ref={instagramCoverInputRef}
                              type="file"
                              accept={ACCEPTED_IMAGE_MEDIA}
                              className="hidden"
                              onChange={handleInstagramCoverFile}
                            />
                            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
                              {platformConfigs.instagram?.coverImageUrl ? (
                                <div className="flex items-center gap-3">
                                  <img
                                    src={platformConfigs.instagram.coverImageUrl}
                                    alt="Portada del reel"
                                    className="h-16 w-16 rounded-xl object-cover"
                                  />
                                  <div className="min-w-0 flex-1 space-y-1">
                                    <p className="truncate text-sm font-medium text-neutral-800">
                                      {instagramCoverUpload.fileName || 'Portada cargada'}
                                    </p>
                                    <p className="text-xs text-neutral-500">
                                      Se sube como archivo y luego se envia a Blotato como `coverImageUrl`.
                                    </p>
                                    {instagramCoverUpload.sizeBytes > 0 ? (
                                      <p className="text-[11px] text-neutral-400">
                                        {formatBytes(instagramCoverUpload.sizeBytes)} · maximo recomendado 8 MB
                                      </p>
                                    ) : null}
                                  </div>
                                  <div className="flex shrink-0 items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => instagramCoverInputRef.current?.click()}
                                      className="rounded-xl border border-neutral-200 px-3 py-2 text-xs font-medium text-neutral-700 transition-colors hover:border-neutral-300 hover:bg-white"
                                    >
                                      Cambiar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={clearInstagramCover}
                                      className="rounded-xl px-3 py-2 text-xs font-medium text-neutral-500 transition-colors hover:bg-white hover:text-neutral-700"
                                    >
                                      Quitar
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => instagramCoverInputRef.current?.click()}
                                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-300 bg-white px-4 py-4 text-sm font-medium text-neutral-600 transition-colors hover:border-neutral-400 hover:text-neutral-800"
                                >
                                  {instagramCoverUpload.uploading ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
                                  {instagramCoverUpload.uploading ? 'Subiendo portada...' : 'Subir portada'}
                                </button>
                              )}
                            </div>
                            {instagramCoverUpload.error ? (
                              <p className="text-xs text-rose-600">{instagramCoverUpload.error}</p>
                            ) : null}
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium text-neutral-700">Nombre del audio</label>
                            <input
                              type="text"
                              value={platformConfigs.instagram?.audioName || ''}
                              onChange={(event) => setPlatformConfig('instagram', 'audioName', event.target.value)}
                              placeholder="Opcional, por ejemplo: Audio original"
                              className={INPUT_CLASSNAME}
                            />
                          </div>

                          <ToggleField
                            label="Mostrar tambien en el feed"
                            description="Si esta activo, el reel tambien aparece en el feed principal de Instagram."
                            checked={platformConfigs.instagram?.shareToFeed ?? false}
                            onChange={(value) => setPlatformConfig('instagram', 'shareToFeed', value)}
                          />
                        </>
                      ) : (
                        <p className="rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-3 text-xs text-neutral-600">
                          {contentFormat === 'story'
                            ? 'En historias no se usa portada ni compartir al feed.'
                            : 'No hace falta activar ningun modo de carrusel: si subes varias imagenes, Blotato lo detecta automaticamente.'}
                        </p>
                      )}
                    </PlatformPanel>
                  ) : null}

                  {activePlatforms.includes('facebook') ? (
                    <PlatformPanel
                      platform="facebook"
                      title="Facebook"
                      subtitle="Seleccion de pagina y ajustes opcionales del destino."
                      open={facebookPanelOpen}
                      onToggle={() => togglePlatformSection('facebook')}
                      badge="Pagina"
                    >
                      {(accountsByPlatform.facebook || []).map((account) => {
                        const selectedPageId = getSelectedPageId(account);
                        const knownSubaccounts = account.subaccounts || [];
                        const selectedPageName = knownSubaccounts.find((subaccount) => subaccount.id === selectedPageId)?.name
                          || account.targetConfig?.pageName
                          || '';
                        const extraOptionNeeded = selectedPageId && !knownSubaccounts.some((subaccount) => subaccount.id === selectedPageId);

                        return (
                          <div key={account.id} className="space-y-2">
                            <label className="text-sm font-medium text-neutral-700">
                              Pagina para {account.username ? `@${account.username}` : getPlatformName(account.platform)}
                            </label>
                            <select
                              value={selectedPageId}
                              onChange={(event) => setSubaccountSelections((prev) => ({
                                ...prev,
                                [account.id]: event.target.value
                              }))}
                              className={INPUT_CLASSNAME}
                            >
                              <option value="">Selecciona una pagina</option>
                              {extraOptionNeeded ? (
                                <option value={selectedPageId}>{selectedPageName || selectedPageId}</option>
                              ) : null}
                              {knownSubaccounts.map((subaccount) => (
                                <option key={subaccount.id} value={subaccount.id}>
                                  {subaccount.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      })}

                      {contentFormat === 'reel' ? (
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-neutral-700">Publicar el video como</label>
                          <select
                            value={platformConfigs.facebook?.mediaType || 'reel'}
                            onChange={(event) => setPlatformConfig('facebook', 'mediaType', event.target.value)}
                            className={INPUT_CLASSNAME}
                          >
                            {FACEBOOK_MEDIA_TYPES.map((option) => (
                              <option key={option.id} value={option.id}>{option.label}</option>
                            ))}
                          </select>
                        </div>
                      ) : null}

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-neutral-700">Link adjunto</label>
                        <input
                          type="url"
                          value={platformConfigs.facebook?.link || ''}
                          onChange={(event) => setPlatformConfig('facebook', 'link', event.target.value)}
                          placeholder="Opcional, para enriquecer la vista previa"
                          className={INPUT_CLASSNAME}
                        />
                      </div>

                      <p className="rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-3 text-xs text-neutral-600">
                        La API de Blotato para Facebook necesita `pageId`. No expone una portada manual separada, asi que la vista previa sale del archivo principal.
                      </p>
                    </PlatformPanel>
                  ) : null}

                  {activePlatforms.includes('linkedin') ? (
                    <PlatformPanel
                      platform="linkedin"
                      title="LinkedIn"
                      subtitle="Configura la pagina si quieres publicar en una Company Page."
                      open={linkedinPanelOpen}
                      onToggle={() => togglePlatformSection('linkedin')}
                      badge="Pagina"
                    >
                      {(accountsByPlatform.linkedin || []).map((account) => {
                        const selectedPageId = getSelectedPageId(account);
                        const knownSubaccounts = account.subaccounts || [];
                        const selectedPageName = knownSubaccounts.find((subaccount) => subaccount.id === selectedPageId)?.name
                          || account.targetConfig?.pageName
                          || '';
                        const extraOptionNeeded = selectedPageId && !knownSubaccounts.some((subaccount) => subaccount.id === selectedPageId);

                        return (
                          <div key={account.id} className="space-y-2">
                            <label className="text-sm font-medium text-neutral-700">
                              Pagina para {account.username ? `@${account.username}` : getPlatformName(account.platform)}
                            </label>
                            <select
                              value={selectedPageId}
                              onChange={(event) => setSubaccountSelections((prev) => ({
                                ...prev,
                                [account.id]: event.target.value
                              }))}
                              className={INPUT_CLASSNAME}
                            >
                              <option value="">Perfil personal conectado</option>
                              {extraOptionNeeded ? (
                                <option value={selectedPageId}>{selectedPageName || selectedPageId}</option>
                              ) : null}
                              {knownSubaccounts.map((subaccount) => (
                                <option key={subaccount.id} value={subaccount.id}>
                                  {subaccount.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      })}

                      <p className="rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-3 text-xs text-neutral-600">
                        Si no eliges una pagina, la publicacion sale con el perfil personal conectado. La integracion no muestra una portada manual separada para LinkedIn.
                      </p>
                    </PlatformPanel>
                  ) : null}

                  {activePlatforms.includes('tiktok') ? (
                    <PlatformPanel
                      platform="tiktok"
                      title="TikTok"
                      subtitle="Privacidad y permisos de interaccion."
                      open={tiktokPanelOpen}
                      onToggle={() => togglePlatformSection('tiktok')}
                      badge="Privacidad"
                    >
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-neutral-700">Visibilidad</label>
                        <select
                          value={platformConfigs.tiktok?.privacyLevel || 'PUBLIC_TO_EVERYONE'}
                          onChange={(event) => setPlatformConfig('tiktok', 'privacyLevel', event.target.value)}
                          className={INPUT_CLASSNAME}
                        >
                          {TIKTOK_PRIVACY_LEVELS.map((level) => (
                            <option key={level.id} value={level.id}>{level.label}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-3">
                        <ToggleField
                          label="Permitir comentarios"
                          description="Desactivalo si quieres publicar sin respuestas."
                          checked={!(platformConfigs.tiktok?.disabledComments ?? false)}
                          onChange={(value) => setPlatformConfig('tiktok', 'disabledComments', !value)}
                        />
                        <ToggleField
                          label="Permitir duet"
                          description="Controla si otros usuarios pueden hacer duet con este video."
                          checked={!(platformConfigs.tiktok?.disabledDuet ?? false)}
                          onChange={(value) => setPlatformConfig('tiktok', 'disabledDuet', !value)}
                        />
                        <ToggleField
                          label="Permitir stitch"
                          description="Controla si otros usuarios pueden reutilizar fragmentos del video."
                          checked={!(platformConfigs.tiktok?.disabledStitch ?? false)}
                          onChange={(value) => setPlatformConfig('tiktok', 'disabledStitch', !value)}
                        />
                      </div>
                    </PlatformPanel>
                  ) : null}

                  {activePlatforms.includes('pinterest') ? (
                    <PlatformPanel
                      platform="pinterest"
                      title="Pinterest"
                      subtitle="Pinterest necesita un board de destino."
                      open={pinterestPanelOpen}
                      onToggle={() => togglePlatformSection('pinterest')}
                      badge="Requerido"
                    >
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-neutral-700">Board ID</label>
                        <input
                          type="text"
                          value={platformConfigs.pinterest?.boardId || ''}
                          onChange={(event) => setPlatformConfig('pinterest', 'boardId', event.target.value)}
                          placeholder="Ej: 123456789012345678"
                          className={INPUT_CLASSNAME}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-neutral-700">Titulo del pin</label>
                        <input
                          type="text"
                          value={platformConfigs.pinterest?.title || ''}
                          onChange={(event) => setPlatformConfig('pinterest', 'title', event.target.value)}
                          placeholder="Opcional"
                          className={INPUT_CLASSNAME}
                        />
                      </div>
                    </PlatformPanel>
                  ) : null}

                  {activePlatforms.includes('youtube') ? (
                    <PlatformPanel
                      platform="youtube"
                      title="YouTube"
                      subtitle="Titulo y privacidad para el video."
                      open={youtubePanelOpen}
                      onToggle={() => togglePlatformSection('youtube')}
                      badge="Video"
                    >
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-neutral-700">Titulo</label>
                        <input
                          type="text"
                          value={platformConfigs.youtube?.title || ''}
                          onChange={(event) => setPlatformConfig('youtube', 'title', event.target.value)}
                          placeholder="Opcional. Si lo dejas vacio, se usa 'Video'."
                          className={INPUT_CLASSNAME}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-neutral-700">Privacidad</label>
                        <select
                          value={platformConfigs.youtube?.privacyStatus || 'private'}
                          onChange={(event) => setPlatformConfig('youtube', 'privacyStatus', event.target.value)}
                          className={INPUT_CLASSNAME}
                        >
                          {YOUTUBE_PRIVACY.map((privacy) => (
                            <option key={privacy.id} value={privacy.id}>{privacy.label}</option>
                          ))}
                        </select>
                      </div>

                      <ToggleField
                        label="Notificar suscriptores"
                        description="Si esta activo, YouTube avisa a los suscriptores cuando se publique."
                        checked={platformConfigs.youtube?.shouldNotifySubscribers ?? true}
                        onChange={(value) => setPlatformConfig('youtube', 'shouldNotifySubscribers', value)}
                      />
                    </PlatformPanel>
                  ) : null}
                </div>
              </section>
            ) : null}

            <section className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-neutral-800">Programacion</label>
                <p className="text-xs text-neutral-500">
                  Este bloque se envia al nivel superior del payload de Blotato, separado del contenido.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                {SCHEDULING_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setSchedulingType(option.id)}
                    className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                      schedulingType === option.id
                        ? 'border-black bg-black text-white shadow-sm'
                        : 'border-neutral-200 bg-neutral-50 text-neutral-800 hover:border-neutral-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <option.icon size={15} />
                          <p className="text-sm font-semibold">{option.label}</p>
                        </div>
                        <p className={`text-xs ${schedulingType === option.id ? 'text-white/75' : 'text-neutral-500'}`}>
                          {option.description}
                        </p>
                      </div>
                      {schedulingType === option.id ? <Check size={16} className="mt-0.5 shrink-0" /> : null}
                    </div>
                  </button>
                ))}
              </div>

              <AnimatePresence initial={false}>
                {schedulingType === 'scheduled' ? (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="grid gap-3 pt-1 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-neutral-700">Fecha</label>
                        <input
                          type="date"
                          value={scheduledDate}
                          onChange={(event) => setScheduledDate(event.target.value)}
                          className={INPUT_CLASSNAME}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-neutral-700">Hora</label>
                        <input
                          type="time"
                          value={scheduledTime}
                          onChange={(event) => setScheduledTime(event.target.value)}
                          className={INPUT_CLASSNAME}
                        />
                      </div>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </section>
          </div>

          <div className="border-t border-neutral-200 bg-white px-6 py-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-neutral-800">
                  {activeAccounts.length > 0
                    ? `Se publicara en ${activeAccounts.length} cuenta${activeAccounts.length !== 1 ? 's' : ''}`
                    : 'Sin cuentas listas para publicar'}
                </p>
                {footerHint ? (
                  <p className={`flex items-center gap-2 text-xs ${error ? 'text-rose-600' : 'text-amber-600'}`}>
                    <AlertCircle size={14} />
                    {footerHint}
                  </p>
                ) : (
                  <p className="text-xs text-neutral-500">
                    Revisa formato, contenido y agenda antes de enviar.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl px-4 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-800"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className="inline-flex items-center gap-2 rounded-xl bg-black px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Procesando...
                    </>
                  ) : isBusyUploading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Subiendo...
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      {schedulingType === 'immediate' ? 'Publicar' : 'Programar'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}

export default CreatePostModal;
