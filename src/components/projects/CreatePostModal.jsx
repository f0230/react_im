import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  Calendar,
  CalendarClock,
  Check,
  ChevronDown,
  Clapperboard,
  Clock,
  FileText,
  Film,
  ImagePlus,
  Images,
  LayoutPanelTop,
  Loader2,
  Paperclip,
  RectangleHorizontal,
  Send,
  SlidersHorizontal,
  Sparkles,
  Type,
  Upload,
  Users,
  X
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
    description: 'Sale enseguida',
    icon: Send
  },
  {
    id: 'scheduled',
    label: 'Fecha y hora',
    description: 'Lo eliges manualmente',
    icon: Calendar
  },
  {
    id: 'nextSlot',
    label: 'Siguiente hueco',
    description: 'Usa el proximo espacio',
    icon: Clock
  }
];

const PUBLICATION_FORMATS = [
  {
    id: 'post',
    label: 'Publicacion',
    description: '1+ imagenes o video',
    icon: RectangleHorizontal
  },
  {
    id: 'carousel',
    label: 'Carrusel',
    description: '2+ imagenes',
    icon: Images
  },
  {
    id: 'reel',
    label: 'Reel / Video',
    description: '1 video',
    icon: Clapperboard
  },
  {
    id: 'story',
    label: 'Historia',
    description: '1 archivo vertical',
    icon: FileText
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
const SECTION_CLASSNAME = 'rounded-[26px] border border-black/5 bg-white/88 p-3.5 shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_20px_48px_rgba(15,23,42,0.07)] backdrop-blur sm:p-4';
const SUBSECTION_CLASSNAME = 'rounded-[20px] border border-black/5 bg-neutral-50/80';
const INPUT_CLASSNAME = 'w-full rounded-[18px] border border-black/10 bg-neutral-50/80 px-3.5 py-2.5 text-sm text-neutral-700 outline-none transition-[border-color,box-shadow,background-color] placeholder:text-neutral-400 focus:border-neutral-900 focus:bg-white focus:shadow-[0_0_0_4px_rgba(15,23,42,0.05)]';
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

function StatPill({ icon: Icon, children, tone = 'default' }) {
  const toneClass = tone === 'warning'
    ? 'border-amber-200 bg-amber-50 text-amber-700'
    : tone === 'danger'
      ? 'border-rose-200 bg-rose-50 text-rose-700'
      : 'border-black/5 bg-white/85 text-neutral-600';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium shadow-[0_8px_24px_rgba(15,23,42,0.05)] ${toneClass}`}>
      <Icon size={11} />
      {children}
    </span>
  );
}

function SectionShell({ icon: Icon, title, subtitle, aside, children, className = '' }) {
  return (
    <section className={`${SECTION_CLASSNAME} ${className}`}>
      <div className="mb-3 flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[18px] border border-black/5 bg-neutral-100 text-neutral-700 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
            <Icon size={16} />
          </div>
          <div className="space-y-1">
            <h3 className="text-[15px] font-semibold tracking-[-0.02em] text-neutral-900">{title}</h3>
            {subtitle ? <p className="text-xs text-neutral-500">{subtitle}</p> : null}
          </div>
        </div>
        {aside ? <div className="flex flex-wrap items-center gap-2">{aside}</div> : null}
      </div>
      {children}
    </section>
  );
}

function ChoiceCard({ active, onClick, icon: Icon, label, detail }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group rounded-[20px] border px-3.5 py-3.5 text-left transition-all duration-200 ${
        active
          ? 'border-black bg-black text-white shadow-[0_18px_40px_rgba(17,24,39,0.2)]'
          : 'border-black/5 bg-white/92 text-neutral-800 hover:-translate-y-0.5 hover:border-black/15 hover:shadow-[0_12px_28px_rgba(15,23,42,0.07)]'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-2.5">
          <div className={`flex h-9 w-9 items-center justify-center rounded-[16px] border ${
            active ? 'border-white/15 bg-white/10 text-white' : 'border-black/5 bg-neutral-100 text-neutral-700'
          }`}>
            <Icon size={16} />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold tracking-[-0.02em]">{label}</p>
            <p className={`text-[11px] ${active ? 'text-white/70' : 'text-neutral-500'}`}>{detail}</p>
          </div>
        </div>
        <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
          active ? 'border-white/20 bg-white/10 text-white' : 'border-black/10 bg-white text-transparent'
        }`}>
          <Check size={11} />
        </span>
      </div>
    </button>
  );
}

function ToggleField({ label, description, checked, onChange }) {
  return (
    <label className="flex items-start justify-between gap-4 rounded-[18px] border border-black/5 bg-neutral-50/80 px-3.5 py-3">
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
          className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </label>
  );
}

function PlatformPanel({ platform, title, subtitle, open, onToggle, children, badge }) {
  return (
    <section className="overflow-hidden rounded-[22px] border border-black/5 bg-white/82 shadow-[0_10px_26px_rgba(15,23,42,0.045)]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
      >
        <div className="flex min-w-0 items-start gap-3">
          <div className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-[16px] border ${
            open ? 'border-black/10 bg-black text-white' : 'border-black/5 bg-neutral-100'
          }`}>
            <PlatformIcon platform={platform} size={15} className={open ? 'text-white' : ''} />
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-neutral-900">{title}</h3>
              {badge ? (
                <span className="rounded-full border border-black/5 bg-neutral-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-500">
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
            <div className="space-y-4 border-t border-black/5 px-4 pb-4 pt-4">
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

  const selectedFormat = availableFormats.find((format) => format.id === contentFormat) || PUBLICATION_FORMATS[0];
  const selectedScheduling = SCHEDULING_OPTIONS.find((option) => option.id === schedulingType) || SCHEDULING_OPTIONS[0];

  const formatHint = useMemo(() => {
    if (contentFormat === 'carousel') return 'Sube 2 o mas imagenes. Esta vista deja fuera videos para evitar errores.';
    if (contentFormat === 'reel') return 'Usa exactamente 1 video. Si va a Instagram, se envia como reel.';
    if (contentFormat === 'story') return 'Solo Instagram y exactamente 1 archivo.';
    return 'Con varias imagenes, Blotato arma el carrusel automaticamente.';
  }, [contentFormat]);

  const uploadHint = useMemo(() => {
    if (contentFormat === 'reel') return 'Video MP4 o MOV';
    if (contentFormat === 'carousel') return 'Solo imagenes';
    if (contentFormat === 'story') return '1 imagen o video';
    return 'Imagenes o videos';
  }, [contentFormat]);

  const storyExcludedAccounts = contentFormat === 'story'
    ? accounts.filter((account) => account.platform !== 'instagram')
    : [];

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

  const instagramPanelOpen = openPlatformSections.instagram ?? false;
  const facebookPanelOpen = openPlatformSections.facebook ?? false;
  const linkedinPanelOpen = openPlatformSections.linkedin ?? false;
  const tiktokPanelOpen = openPlatformSections.tiktok ?? false;
  const pinterestPanelOpen = openPlatformSections.pinterest ?? false;
  const youtubePanelOpen = openPlatformSections.youtube ?? false;
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
            initial={{ scale: 0.98, opacity: 0, y: 18 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.98, opacity: 0, y: 18 }}
            transition={{ duration: 0.18 }}
            onClick={(event) => event.stopPropagation()}
            className="relative flex min-h-[100dvh] w-full max-w-5xl flex-col overflow-hidden rounded-none bg-[#f4f3ef] shadow-[0_40px_120px_rgba(0,0,0,0.22)] md:min-h-0 md:max-h-[94dvh] md:rounded-[34px]"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.9),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(17,24,39,0.07),transparent_28%)]" />

            <div className="relative border-b border-black/5 bg-white/78 px-4 py-4 backdrop-blur-xl sm:px-5 sm:py-4.5">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-[24px] font-semibold tracking-[-0.03em] text-neutral-900">Crear publicacion</h2>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full border border-black/5 bg-white/85 p-2 text-neutral-400 shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition-all hover:border-black/10 hover:text-neutral-700"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <StatPill icon={selectedFormat.icon}>{selectedFormat.label}</StatPill>
                <StatPill icon={selectedScheduling.icon}>{selectedScheduling.label}</StatPill>
                <StatPill icon={Users}>
                  {activeAccounts.length} cuenta{activeAccounts.length !== 1 ? 's' : ''}
                </StatPill>
                <StatPill icon={Paperclip}>
                  {uploadedMediaCount} archivo{uploadedMediaCount !== 1 ? 's' : ''}
                </StatPill>
              </div>
            </div>

            <div className="relative flex-1 space-y-3 overflow-y-auto px-3 py-3 sm:px-4 sm:py-4">
              <SectionShell
                icon={LayoutPanelTop}
                title="Destino y formato"
                aside={accountsLoading ? <StatPill icon={Loader2}>Cargando cuentas</StatPill> : null}
              >
                <div className="grid gap-4 xl:grid-cols-[0.95fr,1.3fr]">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-neutral-900">Destinos</p>
                      {storyExcludedAccounts.length > 0 ? (
                        <StatPill icon={AlertCircle} tone="warning">Solo IG</StatPill>
                      ) : null}
                    </div>

                    {accountsLoading ? (
                      <div className={`flex items-center gap-2 px-3.5 py-3 text-sm text-neutral-500 ${SUBSECTION_CLASSNAME}`}>
                        <Loader2 size={15} className="animate-spin" />
                        Cargando...
                      </div>
                    ) : activeAccounts.length === 0 ? (
                      <div className="rounded-[20px] border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-700">
                        <div className="flex items-start gap-3">
                          <Users size={16} className="mt-0.5 shrink-0" />
                          <p>
                            {hasAssignments
                              ? 'Las cuentas asignadas no estan listas. Sincroniza Blotato y vuelve a intentar.'
                              : 'Todavia no hay cuentas asociadas a este proyecto.'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className={`p-2.5 ${SUBSECTION_CLASSNAME}`}>
                        <div className="flex flex-wrap gap-1.5">
                          {activeAccounts.map((account) => (
                            <div
                              key={`${account.id}-${account.targetConfig?.pageId || 'base'}`}
                              className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-white px-2.5 py-1.5 text-[11px] font-medium text-neutral-700 shadow-[0_8px_18px_rgba(15,23,42,0.05)]"
                            >
                              <PlatformIcon platform={account.platform} size={13} />
                              <span>{getAccountDisplayName(account)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-neutral-900">Formato</p>

                    <div className="grid gap-2 sm:grid-cols-2">
                      {availableFormats.map((format) => (
                        <ChoiceCard
                          key={format.id}
                          active={contentFormat === format.id}
                          onClick={() => setContentFormat(format.id)}
                          icon={format.icon}
                          label={format.label}
                          detail={format.description}
                        />
                      ))}
                    </div>

                    <div className={`flex items-center gap-2 rounded-full px-3 py-2 text-xs ${
                      contentFormat === 'story'
                        ? 'border border-amber-200 bg-amber-50 text-amber-700'
                        : 'border border-black/5 bg-neutral-100/90 text-neutral-600'
                    }`}>
                      <Sparkles size={13} />
                      <span>{formatHint}</span>
                    </div>
                  </div>
                </div>
              </SectionShell>

              <SectionShell
                icon={Type}
                title="Contenido"
                aside={[
                  <StatPill key="chars" icon={Type} tone={exceededPlatforms.length > 0 ? 'warning' : 'default'}>
                    {content.length}
                  </StatPill>,
                  <StatPill key="media" icon={Paperclip}>
                    {uploadedMediaCount}
                  </StatPill>
                ]}
              >
                <div className="grid gap-4 xl:grid-cols-[1.45fr,0.95fr]">
                  <div className="space-y-3">
                    <textarea
                      value={content}
                      onChange={(event) => setContent(event.target.value)}
                      placeholder="Mensaje..."
                      rows={6}
                      className={`${TEXTAREA_CLASSNAME} min-h-[180px] text-[15px] leading-6`}
                    />

                    {platforms.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {platforms.map((platform) => (
                          <span
                            key={platform}
                            className="inline-flex items-center gap-1.5 rounded-full border border-black/5 bg-neutral-100/90 px-2.5 py-1 text-[10px] font-medium text-neutral-500"
                          >
                            <PlatformIcon platform={platform} size={11} />
                            {getMaxChars(platform)}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    {exceededPlatforms.length > 0 ? (
                      <p className="text-xs text-amber-600">
                        El texto supera el limite de {exceededPlatforms.map((platform) => getPlatformName(platform)).join(', ')}.
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-3">
                    <div className={`p-3 ${SUBSECTION_CLASSNAME}`}>
                      <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
                        <Paperclip size={16} />
                        Archivos
                      </div>
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
                        className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-[18px] border border-dashed border-black/15 bg-white px-4 py-4 text-sm font-medium text-neutral-700 transition-all hover:border-black/25 hover:bg-neutral-50"
                      >
                        <Upload size={16} />
                        Subir archivos
                      </button>

                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        <StatPill icon={Upload}>{uploadHint}</StatPill>
                        {isUploadingMedia ? <StatPill icon={Loader2}>Subiendo...</StatPill> : null}
                      </div>
                    </div>

                    {mediaItems.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-2">
                        {mediaItems.map((item, index) => (
                          <div
                            key={`${item.name}-${index}`}
                            className={`group relative overflow-hidden rounded-[22px] border ${
                              item.error
                                ? 'border-rose-200 bg-rose-50'
                                : 'border-black/5 bg-white shadow-[0_14px_32px_rgba(15,23,42,0.06)]'
                            }`}
                          >
                            <div className="aspect-square">
                              {item.uploading ? (
                                <div className="flex h-full items-center justify-center bg-neutral-50">
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
                              className="absolute right-2 top-2 rounded-full border border-white/15 bg-black/65 p-1 text-white backdrop-blur transition-colors hover:bg-black"
                            >
                              <X size={10} />
                            </button>

                            {!item.uploading && !item.error ? (
                              <div className="border-t border-black/5 bg-white px-2.5 py-2">
                                <p className="truncate text-[10px] font-medium text-neutral-600">{item.name}</p>
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </SectionShell>

              {activePlatforms.length > 0 ? (
                <SectionShell
                  icon={SlidersHorizontal}
                  title="Ajustes por plataforma"
                >
                  <div className="space-y-3">
                    {activePlatforms.includes('instagram') ? (
                      <PlatformPanel
                        platform="instagram"
                        title="Instagram"
                        open={instagramPanelOpen}
                        onToggle={() => togglePlatformSection('instagram')}
                        badge={contentFormat === 'reel' ? 'Reel' : contentFormat === 'story' ? 'Historia' : uploadedImageCount > 1 ? 'Carrusel' : 'Opcional'}
                      >
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-neutral-700">Alt text</label>
                            <textarea
                              value={platformConfigs.instagram?.altText || ''}
                              onChange={(event) => setPlatformConfig('instagram', 'altText', event.target.value)}
                              rows={4}
                              maxLength={1000}
                              placeholder="Accesibilidad"
                              className={TEXTAREA_CLASSNAME}
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium text-neutral-700">Colaboradores</label>
                            <input
                              type="text"
                              value={platformConfigs.instagram?.collaborators || ''}
                              onChange={(event) => setPlatformConfig('instagram', 'collaborators', event.target.value)}
                              placeholder="cuenta1, cuenta2, cuenta3"
                              className={INPUT_CLASSNAME}
                            />
                          </div>
                        </div>

                        {contentFormat === 'reel' ? (
                          <>
                            <div className="flex flex-wrap gap-2">
                              <StatPill icon={Clapperboard}>MP4 o MOV</StatPill>
                              <StatPill icon={AlertCircle}>Hasta 100 MB</StatPill>
                              {instagramCoverUpload.sizeBytes > 0 ? (
                                <StatPill icon={ImagePlus}>{formatBytes(instagramCoverUpload.sizeBytes)}</StatPill>
                              ) : null}
                            </div>

                            <div className="grid gap-3 xl:grid-cols-[1.15fr,0.85fr]">
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-neutral-700">Portada del reel</label>
                                <input
                                  ref={instagramCoverInputRef}
                                  type="file"
                                  accept={ACCEPTED_IMAGE_MEDIA}
                                  className="hidden"
                                  onChange={handleInstagramCoverFile}
                                />

                                <div className={`p-3 ${SUBSECTION_CLASSNAME}`}>
                                  {platformConfigs.instagram?.coverImageUrl ? (
                                    <div className="flex items-center gap-3">
                                      <img
                                        src={platformConfigs.instagram.coverImageUrl}
                                        alt="Portada del reel"
                                        className="h-16 w-16 rounded-2xl object-cover"
                                      />
                                      <div className="min-w-0 flex-1 space-y-1">
                                        <p className="truncate text-sm font-medium text-neutral-800">
                                          {instagramCoverUpload.fileName || 'Portada cargada'}
                                        </p>
                                      </div>
                                      <div className="flex shrink-0 items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => instagramCoverInputRef.current?.click()}
                                          className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-medium text-neutral-700 transition-colors hover:border-black/20"
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
                                      className="flex w-full items-center justify-center gap-2 rounded-[20px] border border-dashed border-black/15 bg-white px-4 py-4 text-sm font-medium text-neutral-600 transition-colors hover:border-black/25 hover:text-neutral-800"
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

                              <div className="space-y-3">
                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-neutral-700">Nombre del audio</label>
                                  <input
                                    type="text"
                                    value={platformConfigs.instagram?.audioName || ''}
                                    onChange={(event) => setPlatformConfig('instagram', 'audioName', event.target.value)}
                                    placeholder="Audio original"
                                    className={INPUT_CLASSNAME}
                                  />
                                </div>

                                <ToggleField
                                  label="Mostrar tambien en el feed"
                                  description="Si esta activo, el reel tambien queda en el feed."
                                  checked={platformConfigs.instagram?.shareToFeed ?? false}
                                  onChange={(value) => setPlatformConfig('instagram', 'shareToFeed', value)}
                                />
                              </div>
                            </div>
                          </>
                        ) : null}
                      </PlatformPanel>
                    ) : null}

                    {activePlatforms.includes('facebook') ? (
                      <PlatformPanel
                        platform="facebook"
                        title="Facebook"
                        open={facebookPanelOpen}
                        onToggle={() => togglePlatformSection('facebook')}
                        badge="Pagina"
                      >
                        <div className="grid gap-3 md:grid-cols-2">
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
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          {contentFormat === 'reel' ? (
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-neutral-700">Publicar video como</label>
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
                              placeholder="Opcional"
                              className={INPUT_CLASSNAME}
                            />
                          </div>
                        </div>

                      </PlatformPanel>
                    ) : null}

                    {activePlatforms.includes('linkedin') ? (
                      <PlatformPanel
                        platform="linkedin"
                        title="LinkedIn"
                        open={linkedinPanelOpen}
                        onToggle={() => togglePlatformSection('linkedin')}
                        badge="Pagina"
                      >
                        <div className="grid gap-3 md:grid-cols-2">
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
                        </div>

                      </PlatformPanel>
                    ) : null}

                    {activePlatforms.includes('tiktok') ? (
                      <PlatformPanel
                        platform="tiktok"
                        title="TikTok"
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

                        <div className="grid gap-3 lg:grid-cols-2">
                          <ToggleField
                            label="Permitir comentarios"
                            checked={!(platformConfigs.tiktok?.disabledComments ?? false)}
                            onChange={(value) => setPlatformConfig('tiktok', 'disabledComments', !value)}
                          />
                          <ToggleField
                            label="Permitir duet"
                            checked={!(platformConfigs.tiktok?.disabledDuet ?? false)}
                            onChange={(value) => setPlatformConfig('tiktok', 'disabledDuet', !value)}
                          />
                          <ToggleField
                            label="Permitir stitch"
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
                        open={pinterestPanelOpen}
                        onToggle={() => togglePlatformSection('pinterest')}
                        badge="Requerido"
                      >
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-neutral-700">Board ID</label>
                            <input
                              type="text"
                              value={platformConfigs.pinterest?.boardId || ''}
                              onChange={(event) => setPlatformConfig('pinterest', 'boardId', event.target.value)}
                              placeholder="123456789012345678"
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
                        </div>
                      </PlatformPanel>
                    ) : null}

                    {activePlatforms.includes('youtube') ? (
                      <PlatformPanel
                        platform="youtube"
                        title="YouTube"
                        open={youtubePanelOpen}
                        onToggle={() => togglePlatformSection('youtube')}
                        badge="Video"
                      >
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-neutral-700">Titulo</label>
                            <input
                              type="text"
                              value={platformConfigs.youtube?.title || ''}
                              onChange={(event) => setPlatformConfig('youtube', 'title', event.target.value)}
                              placeholder="Video"
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
                        </div>

                        <ToggleField
                          label="Notificar suscriptores"
                          checked={platformConfigs.youtube?.shouldNotifySubscribers ?? true}
                          onChange={(value) => setPlatformConfig('youtube', 'shouldNotifySubscribers', value)}
                        />
                      </PlatformPanel>
                    ) : null}
                  </div>
                </SectionShell>
              ) : null}

              <SectionShell
                icon={CalendarClock}
                title="Programacion"
                aside={<StatPill icon={selectedScheduling.icon}>{selectedScheduling.description}</StatPill>}
              >
                <div className="grid gap-2 md:grid-cols-3">
                  {SCHEDULING_OPTIONS.map((option) => (
                    <ChoiceCard
                      key={option.id}
                      active={schedulingType === option.id}
                      onClick={() => setSchedulingType(option.id)}
                      icon={option.icon}
                      label={option.label}
                      detail={option.description}
                    />
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
                      <div className={`mt-3 grid gap-3 p-3 md:grid-cols-2 ${SUBSECTION_CLASSNAME}`}>
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
              </SectionShell>
            </div>

            <div className="relative border-t border-black/5 bg-white/82 px-4 py-4 backdrop-blur-xl sm:px-6">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-neutral-900">
                    {activeAccounts.length > 0
                      ? `Se publicara en ${activeAccounts.length} cuenta${activeAccounts.length !== 1 ? 's' : ''}`
                      : 'Sin cuentas listas para publicar'}
                  </p>
                  {footerHint ? (
                    <p className={`flex items-center gap-2 text-xs ${error ? 'text-rose-600' : 'text-amber-600'}`}>
                      <AlertCircle size={14} />
                      {footerHint}
                    </p>
                  ) : null}
                </div>

                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-2xl px-4 py-2.5 text-sm font-medium text-neutral-600 transition-colors hover:bg-black/5 hover:text-neutral-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    className="inline-flex items-center gap-2 rounded-2xl bg-black px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(17,24,39,0.22)] transition-all hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
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
