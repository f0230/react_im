import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bold,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Hash,
  Heart,
  ImagePlus,
  Italic,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Music,
  Send,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import { createPost, getPlatformName, PLATFORM_CONFIG, uploadMediaFile } from '@/services/blotatoService';
import { useBlotatoAccounts } from '@/hooks/useBlotatoAccounts';
import { PlatformIcon } from './PlatformIcon';

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCEPTED_MEDIA      = 'image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/webm';
const ACCEPTED_IMAGE_ONLY = 'image/jpeg,image/png,image/gif,image/webp';
const INSTAGRAM_VIDEO_MIME_TYPES = new Set(['video/mp4', 'video/quicktime']);
const MAX_FILE_BYTES      = 100 * 1024 * 1024;
const COVER_MAX_BYTES     = 8  * 1024 * 1024;
const PREVIEW_PLATFORMS   = ['instagram', 'facebook', 'twitter', 'linkedin', 'tiktok', 'threads', 'bluesky', 'youtube'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isVideoMime(mimeType = '') { return mimeType.startsWith('video/'); }
function isVideoUrl(url = '')  { return /\.(mp4|mov|webm)(\?.*)?$/i.test(url); }
function formatBytes(bytes = 0) { return `${(bytes / 1024 / 1024).toFixed(1)} MB`; }
function getAccountLabel(account) {
  return account?.fullname || (account?.username ? `@${account.username}` : getPlatformName(account?.platform || ''));
}

// ─── Shared account avatar ────────────────────────────────────────────────────

function AccountAvatar({ account, size = 36 }) {
  const initial = (account.fullname || account.username || '?')[0].toUpperCase();
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div className="w-full h-full rounded-full bg-[#2a2a2a] flex items-center justify-center overflow-hidden ring-2 ring-[#1c1c1e]">
        {account.profileImageUrl
          ? <img src={account.profileImageUrl} alt={getAccountLabel(account)} className="w-full h-full object-cover" />
          : <span className="text-xs font-bold text-white/70">{initial}</span>}
      </div>
      <div className="absolute -bottom-0.5 -right-0.5 w-[15px] h-[15px] rounded-full bg-[#1c1c1e] flex items-center justify-center">
        <PlatformIcon platform={account.platform} size={10} />
      </div>
    </div>
  );
}

// ─── Preview sub-components ───────────────────────────────────────────────────

// Shared account avatar for the white preview cards
function PreviewAvatar({ account }) {
  const initial = (account?.fullname || account?.username || 'u')[0].toUpperCase();
  return (
    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600 flex items-center justify-center text-white text-[10px] font-bold overflow-hidden shrink-0">
      {account?.profileImageUrl
        ? <img src={account.profileImageUrl} className="w-full h-full object-cover" alt="" />
        : initial}
    </div>
  );
}

// Reel (9:16 vertical, dark overlay)
function PreviewReel({ account, content, video }) {
  const username = account?.username || account?.fullname || 'usuario';
  return (
    <div className="flex justify-center py-4">
      <div className="relative overflow-hidden rounded-[18px] border border-white/10 shadow-xl bg-black" style={{ width: 156, height: 277 }}>
        {video ? (
          <video src={video.url} className="absolute inset-0 w-full h-full object-cover" autoPlay muted loop playsInline />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 to-neutral-950 flex items-center justify-center">
            <Upload size={20} className="text-white/20" />
          </div>
        )}

        {/* Bottom gradient */}
        <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />

        {/* Right actions */}
        <div className="absolute right-2 bottom-16 flex flex-col items-center gap-2.5 text-white">
          <div className="flex flex-col items-center gap-0.5">
            <Heart size={15} strokeWidth={2} />
            <span className="text-[7px] leading-none">0</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <MessageCircle size={15} strokeWidth={2} />
            <span className="text-[7px] leading-none">0</span>
          </div>
          <Send size={15} strokeWidth={2} />
          <MoreHorizontal size={15} strokeWidth={2} />
        </div>

        {/* Bottom info */}
        <div className="absolute bottom-3 left-2.5 right-10">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-5 h-5 rounded-full bg-white/20 border border-white/40 overflow-hidden">
              {account?.profileImageUrl && <img src={account.profileImageUrl} className="w-full h-full object-cover" alt="" />}
            </div>
            <span className="text-white text-[9px] font-bold">{username}</span>
          </div>
          <p className="text-white/75 text-[8px] leading-relaxed line-clamp-2">
            {content || 'Sin contenido aún...'}
          </p>
          <div className="flex items-center gap-1 mt-1.5">
            <Music size={8} className="text-white/60" />
            <span className="text-white/50 text-[7px]">Audio original</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Story (9:16 vertical, story UI)
function PreviewStory({ account, firstMedia }) {
  const username = account?.username || account?.fullname || 'usuario';
  return (
    <div className="flex justify-center py-4">
      <div className="relative overflow-hidden rounded-[18px] border border-white/10 shadow-xl bg-black" style={{ width: 156, height: 277 }}>
        {firstMedia ? (
          firstMedia.isVideo
            ? <video src={firstMedia.url} className="absolute inset-0 w-full h-full object-cover" autoPlay muted loop playsInline />
            : <img src={firstMedia.url} className="absolute inset-0 w-full h-full object-cover" alt="" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400" />
        )}

        {/* Top gradient */}
        <div className="absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />

        {/* Progress bar */}
        <div className="absolute top-2 left-2 right-2 h-0.5 rounded-full bg-white/30">
          <div className="h-full w-1/3 rounded-full bg-white" />
        </div>

        {/* Account info */}
        <div className="absolute top-4 left-2 right-2 flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full border border-white/60 overflow-hidden bg-white/20">
            {account?.profileImageUrl && <img src={account.profileImageUrl} className="w-full h-full object-cover" alt="" />}
          </div>
          <span className="text-white text-[9px] font-semibold">{username}</span>
          <span className="text-white/50 text-[8px]">Ahora</span>
        </div>

        {/* Reply bar */}
        <div className="absolute bottom-3 left-2 right-2">
          <div className="rounded-full border border-white/30 px-2.5 py-1.5 flex items-center gap-1.5">
            <span className="text-white/50 text-[8px] flex-1">Responder...</span>
            <Send size={9} className="text-white/40" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Carousel (1:1, swipeable with dots)
function PreviewCarousel({ account, content, images }) {
  const [idx, setIdx] = useState(0);
  const username = account?.username || account?.fullname || 'usuario';
  const current  = images[idx] || null;

  return (
    <div className="mx-3 my-3 rounded-2xl bg-white overflow-hidden text-black text-xs shadow-lg">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <PreviewAvatar account={account} />
        <span className="font-semibold text-[11px] flex-1">{username}</span>
        <MoreHorizontal size={14} className="text-black/40" />
      </div>

      {/* Image + nav */}
      <div className="aspect-square relative overflow-hidden bg-neutral-100">
        {current
          ? <img src={current.url} alt="" className="w-full h-full object-cover" />
          : <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-neutral-300"><ImagePlus size={20} /><span className="text-[9px]">Sin imágenes</span></div>}

        {/* Arrows */}
        {images.length > 1 && (
          <>
            {idx > 0 && (
              <button onClick={() => setIdx((i) => i - 1)} className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/40 flex items-center justify-center text-white">
                <ChevronLeft size={12} />
              </button>
            )}
            {idx < images.length - 1 && (
              <button onClick={() => setIdx((i) => i + 1)} className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/40 flex items-center justify-center text-white">
                <ChevronRight size={12} />
              </button>
            )}
          </>
        )}

        {/* Dots + counter */}
        {images.length > 1 && (
          <>
            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
              {images.slice(0, 8).map((_, i) => (
                <span key={i} className={`rounded-full transition-all ${i === idx ? 'w-2.5 h-1.5 bg-blue-500' : 'w-1.5 h-1.5 bg-black/20'}`} />
              ))}
            </div>
            <span className="absolute top-2 right-2 text-[9px] font-bold text-white bg-black/40 px-1.5 py-0.5 rounded-full">
              {idx + 1}/{images.length}
            </span>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-3">
          <Heart size={18} className="text-black/70" />
          <MessageCircle size={18} className="text-black/70" />
          <Send size={18} className="text-black/70" />
        </div>
        <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] fill-none stroke-black/70 stroke-[1.5]">
          <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
      </div>

      {/* Caption */}
      <div className="px-3 pb-3 space-y-1">
        <p className="text-[11px] leading-relaxed">
          <span className="font-semibold mr-1">{username}</span>
          <span className="text-black/70">{content ? content.slice(0, 120) + (content.length > 120 ? '...' : '') : <span className="text-black/25">Sin contenido aún...</span>}</span>
        </p>
        <p className="text-[9px] text-black/35 uppercase tracking-wide">Ahora mismo</p>
      </div>
    </div>
  );
}

// Standard post (1:1 square)
function PreviewPost({ account, content, firstMedia }) {
  const username = account?.username || account?.fullname || 'usuario';
  return (
    <div className="mx-3 my-3 rounded-2xl bg-white overflow-hidden text-black text-xs shadow-lg">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <PreviewAvatar account={account} />
        <span className="font-semibold text-[11px] flex-1">{username}</span>
        <MoreHorizontal size={14} className="text-black/40" />
      </div>

      {/* Media */}
      <div className="aspect-square bg-neutral-100 flex items-center justify-center overflow-hidden">
        {firstMedia ? (
          firstMedia.isVideo
            ? <video src={firstMedia.url} className="w-full h-full object-cover" autoPlay muted loop playsInline />
            : <img src={firstMedia.url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-1 text-neutral-300">
            <ImagePlus size={22} />
            <span className="text-[9px]">Sin media</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-3">
          <Heart size={18} className="text-black/70" />
          <MessageCircle size={18} className="text-black/70" />
          <Send size={18} className="text-black/70" />
        </div>
        <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] fill-none stroke-black/70 stroke-[1.5]">
          <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
      </div>

      {/* Caption */}
      <div className="px-3 pb-3 space-y-1">
        <p className="text-[11px] leading-relaxed">
          <span className="font-semibold mr-1">{username}</span>
          {content
            ? <span className="text-black/75">{content.slice(0, 120)}{content.length > 120 ? '...' : ''}</span>
            : <span className="text-black/25">Sin contenido aún...</span>}
        </p>
        <p className="text-[9px] text-black/35 uppercase tracking-wide">Ahora mismo</p>
      </div>
    </div>
  );
}

// Generic preview for non-Instagram platforms
function PreviewGeneric({ account, content, firstMedia }) {
  const username = account?.username || account?.fullname || 'usuario';
  const initial  = (account?.fullname || account?.username || 'u')[0].toUpperCase();
  return (
    <div className="mx-3 my-3 rounded-xl bg-[#242424] border border-white/[0.06] overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-3 border-b border-white/[0.06]">
        <div className="w-7 h-7 rounded-full bg-[#333] flex items-center justify-center text-[10px] font-bold text-white/70 overflow-hidden">
          {account?.profileImageUrl ? <img src={account.profileImageUrl} className="w-full h-full object-cover" alt="" /> : initial}
        </div>
        <p className="text-[11px] font-semibold text-white/80 truncate flex-1">{username}</p>
      </div>

      {firstMedia && (
        <div className="border-b border-white/[0.06] overflow-hidden">
          {firstMedia.isVideo
            ? <video src={firstMedia.url} className="w-full max-h-40 object-cover" autoPlay muted loop playsInline />
            : <img src={firstMedia.url} alt="" className="w-full max-h-40 object-cover" />}
        </div>
      )}

      <div className="px-3 py-2.5">
        {content
          ? <p className="text-[11px] text-white/60 leading-relaxed">{content.slice(0, 140)}{content.length > 140 ? '...' : ''}</p>
          : <p className="text-[11px] text-white/20">Sin contenido aún...</p>}
        <p className="text-[9px] text-white/25 mt-1.5 uppercase tracking-wide">Ahora mismo</p>
      </div>
    </div>
  );
}

// ─── Top-level preview dispatcher ─────────────────────────────────────────────

function PostPreview({ platform, accounts, content, mediaItems, format }) {
  const previewAccount = accounts.find((a) => a.platform === platform) || accounts[0];
  const videos  = mediaItems.filter((item) => item.isVideo || isVideoUrl(item.url));
  const images  = mediaItems.filter((item) => !item.isVideo && !isVideoUrl(item.url));
  const firstMedia = videos[0] || images[0] || null;

  if (!previewAccount) {
    return <div className="flex-1 flex items-center justify-center text-white/20 text-xs p-6 text-center">Sin cuentas conectadas</div>;
  }

  // Reel/video format
  if (format === 'reel') {
    return <PreviewReel account={previewAccount} content={content} video={videos[0] || null} />;
  }

  // Story format
  if (format === 'historia') {
    return <PreviewStory account={previewAccount} firstMedia={firstMedia} />;
  }

  // Carousel (2+ images)
  if (format === 'carousel' && images.length >= 2) {
    return <PreviewCarousel account={previewAccount} content={content} images={images} />;
  }

  // Instagram standard post
  if (platform === 'instagram') {
    return <PreviewPost account={previewAccount} content={content} firstMedia={firstMedia} />;
  }

  // Other platforms
  return <PreviewGeneric account={previewAccount} content={content} firstMedia={firstMedia} />;
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export function CreatePostModal({
  isOpen,
  onClose,
  projectId,
  serviceId,
  initialContent = '',
  initialDate = '',
}) {
  const { accountsForPosting: accounts, loading: accountsLoading } = useBlotatoAccounts(projectId);

  // Content
  const [content, setContent]       = useState(initialContent);
  const [mediaItems, setMediaItems]  = useState([]);
  const [isDragging, setIsDragging]  = useState(false);

  // Instagram reel cover image
  const [coverImageUrl, setCoverImageUrl]       = useState('');
  const [isCoverUploading, setIsCoverUploading] = useState(false);

  // Image-only posts can be sent as feed/carousel or as stories.
  const [formatOverride, setFormatOverride] = useState(null); // null | 'historia'

  // Facebook page selections
  const [pageSelections, setPageSelections] = useState({});

  // Scheduling
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [scheduledDate, setScheduledDate]   = useState(initialDate || '');
  const [scheduledTime, setScheduledTime]   = useState(initialDate ? '10:00' : '');

  // Preview
  const [previewPlatform, setPreviewPlatform] = useState('instagram');

  // Submit
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError]               = useState(null);

  const fileInputRef  = useRef(null);
  const coverInputRef = useRef(null);
  const textareaRef   = useRef(null);

  // Reset on open
  useEffect(() => {
    if (!isOpen) return;
    setContent(initialContent);
    setMediaItems([]);
    setCoverImageUrl('');
    setIsCoverUploading(false);
    setFormatOverride(null);
    setPageSelections({});
    setShowDatePicker(false);
    setScheduledDate(initialDate || '');
    setScheduledTime(initialDate ? '10:00' : '');
    setError(null);
  }, [isOpen, initialContent, initialDate]);

  // Auto-set preview platform to first account's platform
  useEffect(() => {
    if (accounts.length > 0) {
      const platforms = [...new Set(accounts.map((a) => a.platform))];
      if (PREVIEW_PLATFORMS.includes(platforms[0])) setPreviewPlatform(platforms[0]);
    }
  }, [accounts]);

  useEffect(() => { setError(null); }, [content, mediaItems, scheduledDate, scheduledTime]);

  // ── Derived ──────────────────────────────────────────────────────────────

  const uploadedMediaItems = mediaItems.filter((item) => item.url && !item.uploading && !item.error);
  const uploadedMediaUrls  = uploadedMediaItems.map((item) => item.url);
  const uploadedVideos     = uploadedMediaItems.filter((item) => item.isVideo || isVideoUrl(item.url));
  const uploadedImages     = uploadedMediaItems.filter((item) => !item.isVideo && !isVideoUrl(item.url));
  const isUploadingMedia   = mediaItems.some((item) => item.uploading);

  // Base format inferred from media
  const inferredFormat = useMemo(() => {
    if (uploadedVideos.length >= 1) return 'reel';
    if (uploadedImages.length >= 2) return 'carousel';
    return 'post';
  }, [uploadedVideos.length, uploadedImages.length]);

  const hasInstagram = accounts.some((a) => a.platform === 'instagram');
  const hasStoryCapableAccount = accounts.some((a) => PLATFORM_CONFIG[a.platform]?.mediaTypes?.includes('story'));
  const canChooseStory = uploadedVideos.length === 0 && uploadedImages.length >= 1 && hasStoryCapableAccount;
  const effectiveFormat = canChooseStory && formatOverride === 'historia' ? 'historia' : inferredFormat;
  const storyFormatLabel = uploadedImages.length > 1 ? 'Historias' : 'Historia';
  const showCoverUpload = effectiveFormat === 'reel' && hasInstagram;
  const showHistoriaToggle = canChooseStory;

  // Facebook accounts needing page selection
  const facebookAccountsNeedingPage = accounts.filter(
    (a) => a.platform === 'facebook' && a.subaccounts?.length > 0 && !pageSelections[a.id] && !a.targetConfig?.pageId
  );

  useEffect(() => {
    if (!canChooseStory && formatOverride) {
      setFormatOverride(null);
    }
  }, [canChooseStory, formatOverride]);

  // ── Validation ────────────────────────────────────────────────────────────

  const validationError = useMemo(() => {
    if (accountsLoading) return 'Cargando cuentas...';
    if (!accounts.length) return 'Sin cuentas conectadas. Agrega una en Configuración.';
    if (!content.trim()) return 'Escribe algo antes de publicar.';
    if (isUploadingMedia) return 'Espera a que terminen de subir los archivos.';
    if (isCoverUploading) return 'Espera a que termine de subir la portada.';
    if (mediaItems.some((item) => item.error)) return 'Elimina o vuelve a subir los archivos con error.';
    if (facebookAccountsNeedingPage.length > 0) return 'Selecciona una página para la cuenta de Facebook.';
    if (showDatePicker && (!scheduledDate || !scheduledTime)) return 'Completa fecha y hora.';
    if (hasInstagram && uploadedVideos[0]) {
      const v = uploadedVideos[0];
      if (v.mimeType && !INSTAGRAM_VIDEO_MIME_TYPES.has(v.mimeType)) return 'Instagram solo acepta MP4 o MOV.';
      if (v.sizeBytes > MAX_FILE_BYTES) return `El video supera 100 MB (${formatBytes(v.sizeBytes)}).`;
    }
    return null;
  }, [accountsLoading, accounts, content, isUploadingMedia, isCoverUploading, mediaItems,
      facebookAccountsNeedingPage, showDatePicker, scheduledDate, scheduledTime, hasInstagram, uploadedVideos]);

  // ── File handling ─────────────────────────────────────────────────────────

  const handleFiles = useCallback(async (files) => {
    if (!files.length) return;
    const startIndex = mediaItems.length;
    const placeholders = files.map((file) => ({
      name: file.name, url: null, uploading: true, error: null,
      isVideo: isVideoMime(file.type), mimeType: file.type || '', sizeBytes: Number(file.size || 0),
    }));
    setMediaItems((prev) => [...prev, ...placeholders]);
    await Promise.all(files.map(async (file, offset) => {
      const idx = startIndex + offset;
      try {
        const url = await uploadMediaFile(file);
        setMediaItems((prev) => { const next = [...prev]; next[idx] = { ...next[idx], url, uploading: false }; return next; });
      } catch (err) {
        setMediaItems((prev) => { const next = [...prev]; next[idx] = { ...next[idx], uploading: false, error: err.message }; return next; });
      }
    }));
  }, [mediaItems.length]);

  const handleFileSelect = (e) => { handleFiles(Array.from(e.target.files || [])); e.target.value = ''; };
  const handleDragOver  = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop      = (e) => { e.preventDefault(); setIsDragging(false); handleFiles(Array.from(e.dataTransfer.files || [])); };
  const removeMedia     = (index) => setMediaItems((prev) => prev.filter((_, i) => i !== index));

  const handleCoverImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > COVER_MAX_BYTES) { setError(`La portada supera 8 MB (${formatBytes(file.size)}).`); e.target.value = ''; return; }
    setIsCoverUploading(true);
    try {
      const url = await uploadMediaFile(file);
      setCoverImageUrl(url);
    } catch (err) {
      setError(`Error al subir portada: ${err.message}`);
    } finally {
      setIsCoverUploading(false);
      e.target.value = '';
    }
  };

  // ── Cursor insertion ──────────────────────────────────────────────────────

  const insertAtCursor = (text) => {
    const el = textareaRef.current;
    if (!el) { setContent((prev) => prev + text); return; }
    const s = el.selectionStart, e = el.selectionEnd;
    const next = content.slice(0, s) + text + content.slice(e);
    setContent(next);
    requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = s + text.length; el.focus(); });
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const buildScheduling = () => {
    if (showDatePicker && scheduledDate && scheduledTime) {
      return { type: 'scheduled', time: new Date(`${scheduledDate}T${scheduledTime}`).toISOString() };
    }
    return { type: 'immediate' };
  };

  const buildAccountsPayload = () => accounts.map((account) => {
    const tc = { ...(account.targetConfig || {}) };

    if (account.platform === 'instagram') {
      if (effectiveFormat === 'reel')    { tc.mediaType = 'reel'; if (coverImageUrl) tc.coverImageUrl = coverImageUrl; }
      else if (effectiveFormat === 'historia') tc.mediaType = 'story';
      else delete tc.mediaType;
      if (uploadedVideos.length > 0) delete tc.altText;
    }

    if (account.platform === 'facebook') {
      if (effectiveFormat === 'reel') tc.mediaType = 'reel';
      else delete tc.mediaType;
    }

    if (account.platform === 'tiktok') {
      Object.assign(tc, {
        privacyLevel: tc.privacyLevel || 'PUBLIC_TO_EVERYONE',
        disabledComments: tc.disabledComments ?? false,
        disabledDuet: tc.disabledDuet ?? false,
        disabledStitch: tc.disabledStitch ?? false,
        isBrandedContent: tc.isBrandedContent ?? false,
        isYourBrand: tc.isYourBrand ?? false,
        isAiGenerated: tc.isAiGenerated ?? false,
      });
    }

    if (account.platform === 'youtube') {
      Object.assign(tc, {
        title: tc.title || content.slice(0, 90) || 'Video',
        privacyStatus: tc.privacyStatus || 'public',
        shouldNotifySubscribers: tc.shouldNotifySubscribers ?? true,
      });
    }

    const pageId = pageSelections[account.id] || account.targetConfig?.pageId;
    if (pageId) {
      tc.pageId = pageId;
      const sub = account.subaccounts?.find((s) => s.id === pageId);
      if (sub?.name) tc.pageName = sub.name;
    }

    return { id: account.id, platform: account.platform, targetConfig: tc };
  });

  const handleSubmit = async () => {
    if (validationError) { setError(validationError); return; }
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await createPost({
        serviceId, projectId,
        contentText: content.trim(),
        mediaUrls:   uploadedMediaUrls,
        accounts:    buildAccountsPayload(),
        scheduling:  buildScheduling(),
      });
      if (result.errors?.length) {
        const detail = result.errors.map((i) => `${getPlatformName(i.platform)}: ${i.error}`).join(' · ');
        setError(result.posts.length > 0 ? `Publicado en ${result.posts.length} cuenta(s), con fallos: ${detail}` : `Falló: ${detail}`);
        if (result.posts.length > 0) onClose();
        return;
      }
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const availablePreviewPlatforms = [...new Set(accounts.map((a) => a.platform).filter((p) => PREVIEW_PLATFORMS.includes(p)))];

  const modalContent = (
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-[220] flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          key="modal"
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ duration: 0.18 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-5xl bg-[#1c1c1e] rounded-t-[28px] sm:rounded-[20px] flex flex-col overflow-hidden"
          style={{ maxHeight: 'calc(100dvh - 2rem)', minHeight: 'min(600px, 90dvh)' }}
        >

          {/* ── Header ─────────────────────────────── */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.07] shrink-0">
            <div className="flex items-center">
              {accountsLoading ? <Loader2 size={16} className="animate-spin text-white/30" /> : accounts.length === 0 ? (
                <span className="text-xs text-white/30">Sin cuentas</span>
              ) : (
                <div className="flex items-center -space-x-2">
                  {accounts.slice(0, 6).map((a) => <AccountAvatar key={a.id} account={a} size={34} />)}
                  {accounts.length > 6 && <div className="w-8 h-8 rounded-full bg-[#333] flex items-center justify-center text-[10px] text-white/50 ring-2 ring-[#1c1c1e]">+{accounts.length - 6}</div>}
                </div>
              )}
            </div>

            {/* Format badge */}
            {uploadedMediaItems.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-white/[0.07] text-[10px] text-white/40 border border-white/[0.08]">
                {effectiveFormat === 'reel' ? 'Reel / Video' : effectiveFormat === 'carousel' ? 'Carrusel' : effectiveFormat === 'historia' ? storyFormatLabel : 'Publicación'}
              </span>
            )}

            <div className="flex-1" />
            <button onClick={onClose} className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-colors">
              <X size={17} />
            </button>
          </div>

          {/* ── Body ───────────────────────────────── */}
          <div className="flex flex-1 overflow-hidden min-h-0">

            {/* ── Editor (left) ───────────────────── */}
            <div className="flex-1 flex flex-col overflow-y-auto min-w-0 no-scrollbar">

              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Escribe algo..."
                className="flex-1 w-full bg-transparent text-[15px] text-white/85 placeholder:text-white/20 leading-relaxed resize-none outline-none px-5 pt-4 pb-2 min-h-[140px]"
              />

              {/* Toolbar */}
              <div className="flex items-center gap-1 px-4 pb-3">
                <button onClick={() => insertAtCursor('#')} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-white/40 hover:text-white/75 hover:bg-white/[0.06] transition-colors">
                  <Hash size={13} /> Hashtags
                </button>
                <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-white/40 hover:text-white/75 hover:bg-white/[0.06] transition-colors">
                  <Sparkles size={13} /> IA
                </button>
                <div className="w-px h-4 bg-white/[0.08] mx-1" />
                <button onClick={() => insertAtCursor('**texto**')} className="p-1.5 rounded-lg text-white/40 hover:text-white/75 hover:bg-white/[0.06] transition-colors" title="Negrita"><Bold size={14} /></button>
                <button onClick={() => insertAtCursor('*texto*')} className="p-1.5 rounded-lg text-white/40 hover:text-white/75 hover:bg-white/[0.06] transition-colors" title="Cursiva"><Italic size={14} /></button>
              </div>

              {/* Media */}
              <div className="px-4 pb-3 space-y-3">
                {/* Drop zone */}
                <div
                  onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full rounded-xl border-2 border-dashed cursor-pointer transition-all flex items-center justify-center gap-2 py-3 text-sm ${
                    isDragging ? 'border-teal-500/60 bg-teal-500/5 text-teal-400' : 'border-white/[0.1] hover:border-white/[0.2] text-white/35 hover:text-white/55 hover:bg-white/[0.02]'
                  }`}
                >
                  <Upload size={15} /><span>Haz clic o arrastra aquí media</span>
                  <input ref={fileInputRef} type="file" accept={ACCEPTED_MEDIA} multiple className="hidden" onChange={handleFileSelect} />
                </div>

                {/* Thumbnails */}
                {mediaItems.length > 0 && (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {mediaItems.map((item, index) => (
                      <div key={`${item.name}-${index}`} className={`relative aspect-square rounded-lg overflow-hidden border ${item.error ? 'border-rose-500/40 bg-rose-500/10' : 'border-white/[0.08] bg-[#2a2a2a]'}`}>
                        {item.uploading ? (
                          <div className="w-full h-full flex items-center justify-center"><Loader2 size={16} className="animate-spin text-white/30" /></div>
                        ) : item.error ? (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-1 px-1"><X size={14} className="text-rose-400" /><span className="text-[8px] text-rose-400">Error</span></div>
                        ) : item.isVideo || isVideoUrl(item.url) ? (
                          <video src={item.url} className="w-full h-full object-cover" autoPlay muted playsInline onCanPlay={(e) => e.currentTarget.pause()} style={{ pointerEvents: 'none' }} />
                        ) : (
                          <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                        )}
                        <button onClick={() => removeMedia(index)} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center text-white/80 hover:bg-black"><X size={9} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Story toggle for image-only posts on story-capable accounts */}
              {showHistoriaToggle && (
                <div className="px-4 pb-3 flex items-center gap-2">
                  <span className="text-xs text-white/35">Publicar como</span>
                  <button
                    onClick={() => setFormatOverride(null)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border ${!formatOverride ? 'border-white/20 bg-white/10 text-white/80' : 'border-white/[0.08] text-white/35 hover:text-white/60'}`}
                  >Post</button>
                  <button
                    onClick={() => setFormatOverride('historia')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border ${formatOverride === 'historia' ? 'border-white/20 bg-white/10 text-white/80' : 'border-white/[0.08] text-white/35 hover:text-white/60'}`}
                  >{storyFormatLabel}</button>
                </div>
              )}

              {/* Instagram Reel cover image */}
              {showCoverUpload && (
                <div className="px-4 pb-4">
                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 space-y-2">
                    <p className="text-[11px] font-medium text-white/50">Portada del reel <span className="text-white/25 font-normal">(opcional · max 8 MB)</span></p>
                    <div className="flex items-center gap-3">
                      {isCoverUploading ? (
                        <div className="w-14 h-14 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center">
                          <Loader2 size={16} className="animate-spin text-white/30" />
                        </div>
                      ) : coverImageUrl ? (
                        <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-white/[0.08]">
                          <img src={coverImageUrl} className="w-full h-full object-cover" alt="Portada" />
                          <button onClick={() => setCoverImageUrl('')} className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity">
                            <X size={14} className="text-white" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => coverInputRef.current?.click()}
                          className="w-14 h-14 rounded-lg border-2 border-dashed border-white/[0.12] bg-white/[0.03] flex items-center justify-center text-white/25 hover:text-white/50 hover:border-white/20 transition-colors"
                        >
                          <ImagePlus size={18} />
                        </button>
                      )}
                      <div className="flex-1 min-w-0">
                        {coverImageUrl ? (
                          <button onClick={() => setCoverImageUrl('')} className="text-xs text-rose-400 hover:text-rose-300 transition-colors">Quitar portada</button>
                        ) : (
                          <button onClick={() => coverInputRef.current?.click()} className="text-xs text-white/40 hover:text-white/70 transition-colors">
                            Subir imagen de portada
                          </button>
                        )}
                        <p className="text-[10px] text-white/20 mt-0.5">JPG, PNG, WebP</p>
                      </div>
                    </div>
                    <input ref={coverInputRef} type="file" accept={ACCEPTED_IMAGE_ONLY} className="hidden" onChange={handleCoverImage} />
                  </div>
                </div>
              )}

              {/* Facebook page selector */}
              {facebookAccountsNeedingPage.length > 0 && (
                <div className="px-4 pb-3 space-y-2">
                  <p className="text-[10px] text-white/30 uppercase tracking-wider font-medium">Página de Facebook</p>
                  {facebookAccountsNeedingPage.map((account) => (
                    <div key={account.id} className="flex items-center gap-2">
                      <AccountAvatar account={account} size={24} />
                      <select value={pageSelections[account.id] || ''} onChange={(e) => setPageSelections((prev) => ({ ...prev, [account.id]: e.target.value }))} className="flex-1 bg-[#2a2a2a] border border-white/[0.1] rounded-lg px-3 py-1.5 text-xs text-white/70 outline-none">
                        <option value="">Selecciona una página...</option>
                        {(account.subaccounts || []).map((sub) => <option key={sub.id} value={sub.id}>{sub.name}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Preview (right) ──────────────────── */}
            <div className="w-64 xl:w-72 shrink-0 border-l border-white/[0.07] flex flex-col overflow-hidden">
              <div className="px-4 py-3 border-b border-white/[0.07] shrink-0">
                <p className="text-[11px] font-semibold text-white/50 mb-2.5">Vista Previa</p>
                <div className="relative">
                  <select value={previewPlatform} onChange={(e) => setPreviewPlatform(e.target.value)} className="w-full appearance-none bg-[#2a2a2a] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white/70 outline-none pr-7">
                    {(availablePreviewPlatforms.length > 0 ? availablePreviewPlatforms : PREVIEW_PLATFORMS).map((p) => (
                      <option key={p} value={p}>{getPlatformName(p)}</option>
                    ))}
                  </select>
                  <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar">
                <PostPreview
                  platform={previewPlatform}
                  accounts={accounts}
                  content={content}
                  mediaItems={uploadedMediaItems}
                  format={effectiveFormat}
                />
              </div>
            </div>
          </div>

          {/* ── Footer ─────────────────────────────── */}
          <div className="shrink-0 border-t border-white/[0.07] px-4 py-3 space-y-3">
            <AnimatePresence>
              {showDatePicker && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }} className="overflow-hidden">
                  <div className="flex items-center gap-2 pb-1">
                    <Clock size={13} className="text-white/30 shrink-0" />
                    <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} className="bg-[#2a2a2a] border border-white/[0.1] rounded-lg px-2.5 py-1.5 text-xs text-white/70 outline-none" />
                    <input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} className="bg-[#2a2a2a] border border-white/[0.1] rounded-lg px-2.5 py-1.5 text-xs text-white/70 outline-none" />
                    <button onClick={() => { setShowDatePicker(false); setScheduledDate(''); setScheduledTime(''); }} className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.05] transition-colors"><X size={13} /></button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {error && <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2 leading-relaxed">{error}</p>}

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDatePicker((v) => !v)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors border ${
                  showDatePicker && scheduledDate ? 'border-teal-500/40 bg-teal-500/10 text-teal-400' : 'border-white/[0.1] text-white/45 hover:text-white/70 hover:bg-white/[0.05]'
                }`}
              >
                <Calendar size={13} />
                {showDatePicker && scheduledDate && scheduledTime ? format(new Date(`${scheduledDate}T${scheduledTime}`), 'd MMM · HH:mm') : 'Programar'}
              </button>

              <div className="flex-1" />
              {validationError && !error && <span className="text-[11px] text-white/25 truncate max-w-[200px]">{validationError}</span>}

              <button
                onClick={handleSubmit}
                disabled={!!validationError || isSubmitting}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
                  validationError || isSubmitting ? 'bg-white/[0.06] text-white/25 cursor-not-allowed'
                  : showDatePicker && scheduledDate && scheduledTime ? 'bg-teal-500 hover:bg-teal-400 text-white shadow-lg shadow-teal-500/20'
                  : 'bg-white hover:bg-white/90 text-black shadow-md'
                }`}
              >
                {isSubmitting ? <><Loader2 size={14} className="animate-spin" /> Publicando...</>
                  : showDatePicker && scheduledDate && scheduledTime ? <><Calendar size={14} /> Programar</>
                  : <><Send size={14} /> Publicar ahora</>}
              </button>
            </div>
          </div>

        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}

export default CreatePostModal;
