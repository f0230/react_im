import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  Bold,
  Calendar,
  Check,
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
  RotateCcw,
  Save,
  Send,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import { createPost, deleteDraftGroup, getPlatformName, PLATFORM_CONFIG, saveDraftPost, uploadMediaFile } from '@/services/blotatoService';
import { generateProjectPostCopy } from '@/services/aiCopyService';
import { useBlotatoAccounts } from '@/hooks/useBlotatoAccounts';
import { useImageCompression } from '@/hooks/useImageCompression';
import { useMediaDraft } from '@/hooks/useMediaDraft';
import { getMediaWarnings } from '@/utils/platformMediaSpecs';
import { PlatformIcon } from './PlatformIcon';
import { SortableMediaGrid } from './SortableMediaGrid';

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCEPTED_MEDIA      = 'image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/webm';
const ACCEPTED_IMAGE_ONLY = 'image/jpeg,image/png,image/gif,image/webp';
const INSTAGRAM_VIDEO_MIME_TYPES = new Set(['video/mp4', 'video/quicktime']);
const MAX_FILE_BYTES      = 100 * 1024 * 1024;
const COVER_MAX_BYTES     = 8  * 1024 * 1024;
const PREVIEW_PLATFORMS   = ['instagram', 'facebook', 'twitter', 'linkedin', 'tiktok', 'threads', 'bluesky', 'youtube'];
const ACCOUNT_DESTINATION_KEYS = ['pageId', 'page_id', 'boardId', 'board_id', 'channelId', 'channel_id'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isVideoMime(mimeType = '') { return mimeType.startsWith('video/'); }
function isVideoUrl(url = '')  { return /\.(mp4|mov|webm)(\?.*)?$/i.test(url); }
function formatBytes(bytes = 0) { return `${(bytes / 1024 / 1024).toFixed(1)} MB`; }
function getDestinationId(targetConfig) {
  if (!targetConfig || typeof targetConfig !== 'object') return '';
  const entry = ACCOUNT_DESTINATION_KEYS.find((key) => targetConfig[key]);
  return entry ? String(targetConfig[entry]) : '';
}
function getAccountSelectionKey(account) {
  const destinationId = getDestinationId(account?.targetConfig || account?.target_config);
  return [account?.platform || 'unknown', account?.id || 'unknown', destinationId || 'default'].join('::');
}
function getAccountLabel(account) {
  const targetConfig = account?.targetConfig || account?.target_config;
  const destinationLabel = targetConfig?.pageName || targetConfig?.page_name || targetConfig?.boardName || targetConfig?.board_name;
  if (destinationLabel) return destinationLabel;
  return account?.fullname || (account?.username ? `@${account.username}` : getPlatformName(account?.platform || ''));
}
function getAccountHelperLabel(account) {
  if (account?.username) return `@${account.username}`;
  return getPlatformName(account?.platform || '');
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

function AccountToggleChip({ account, selected, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      className={`group flex min-w-[180px] max-w-full items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition-all ${
        selected
          ? 'border-white/20 bg-white/[0.09] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]'
          : 'border-white/[0.08] bg-white/[0.03] text-white/45 hover:border-white/[0.14] hover:bg-white/[0.05] hover:text-white/70'
      }`}
    >
      <AccountAvatar account={account} size={28} />
      <div className="min-w-0 flex-1">
        <p className={`truncate text-xs font-semibold ${selected ? 'text-white/85' : 'text-white/55'}`}>
          {getAccountLabel(account)}
        </p>
        <p className="truncate text-[10px] text-white/30">
          {getAccountHelperLabel(account)}
        </p>
      </div>
      <div
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
          selected ? 'border-emerald-400 bg-emerald-500 text-white' : 'border-white/10 bg-transparent text-transparent'
        }`}
      >
        <Check size={11} strokeWidth={3} />
      </div>
    </button>
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
  initialMediaUrls = [],
  draftGroupId = null,
  aiPlanning = null,
}) {
  const { accountsForPosting: accounts, loading: accountsLoading } = useBlotatoAccounts(projectId);
  const { compress } = useImageCompression();
  const { saveDraft, loadDraft, clearDraft } = useMediaDraft(projectId);

  // Content
  const [content, setContent]       = useState(initialContent);
  const [mediaItems, setMediaItems]  = useState([]);
  const [isDragging, setIsDragging]  = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const mediaIdCounter = useRef(0);

  // Instagram reel cover image
  const [coverImageUrl, setCoverImageUrl]       = useState('');
  const [isCoverUploading, setIsCoverUploading] = useState(false);

  // Instagram collaborators (max 3 handles, without @)
  const [collaborators, setCollaborators]           = useState([]);
  const [collaboratorInput, setCollaboratorInput]   = useState('');
  const collaboratorInputRef                        = useRef(null);

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
  const [selectedAccountKeys, setSelectedAccountKeys] = useState(new Set());

  // Submit
  const [isGeneratingCopy, setIsGeneratingCopy] = useState(false);
  const [isSubmitting, setIsSubmitting]         = useState(false);
  const [isSavingDraft, setIsSavingDraft]       = useState(false);
  const [error, setError]                       = useState(null);

  const fileInputRef  = useRef(null);
  const coverInputRef = useRef(null);
  const textareaRef   = useRef(null);

  // Capture initial values in refs so they don't trigger resets when the parent re-renders
  const initialContentRef    = useRef(initialContent);
  const initialDateRef       = useRef(initialDate);
  const initialMediaUrlsRef  = useRef(initialMediaUrls);
  const draftGroupIdRef      = useRef(draftGroupId);
  const loadDraftRef         = useRef(loadDraft);
  const wasOpenRef           = useRef(false);

  // Keep refs up to date without triggering the reset effect
  useEffect(() => { initialContentRef.current = initialContent; }, [initialContent]);
  useEffect(() => { initialDateRef.current = initialDate; }, [initialDate]);
  useEffect(() => { initialMediaUrlsRef.current = initialMediaUrls; }, [initialMediaUrls]);
  useEffect(() => { draftGroupIdRef.current = draftGroupId; }, [draftGroupId]);
  useEffect(() => { loadDraftRef.current = loadDraft; }, [loadDraft]);

  // Reset only when isOpen transitions from false → true (not on parent re-renders)
  useEffect(() => {
    if (!isOpen) {
      wasOpenRef.current = false;
      return;
    }
    if (wasOpenRef.current) return; // already initialized in this open session
    wasOpenRef.current = true;

    const currentInitialContent   = initialContentRef.current;
    const currentInitialDate      = initialDateRef.current;
    const currentInitialMediaUrls = initialMediaUrlsRef.current;
    const currentDraftGroupId     = draftGroupIdRef.current;

    // Try to recover draft (only when not editing an existing draft and no initial content was passed)
    const savedDraft = !currentDraftGroupId && !currentInitialContent ? loadDraftRef.current() : null;

    const restoredContent     = savedDraft?.content ?? currentInitialContent;
    const restoredDate        = savedDraft?.scheduledDate ?? (currentInitialDate || '');
    const restoredTime        = savedDraft?.scheduledTime ?? (currentInitialDate ? '10:00' : '');
    const restoredCollabs     = savedDraft?.collaborators ?? [];
    const restoredShowPicker  = !!(savedDraft?.scheduledDate && savedDraft?.scheduledTime);

    setContent(restoredContent);
    setMediaItems(
      (currentInitialMediaUrls || []).map((url) => ({
        id: `init-${++mediaIdCounter.current}`,
        name: url.split('/').pop() || 'media',
        file: null,
        previewUrl: url,
        url,
        uploading: false,
        compressing: false,
        error: null,
        isVideo: isVideoUrl(url),
        mimeType: '',
        sizeBytes: 0,
      }))
    );
    setCoverImageUrl('');
    setIsCoverUploading(false);
    setCollaborators(restoredCollabs);
    setCollaboratorInput('');
    setFormatOverride(null);
    setPageSelections({});
    setSelectedAccountKeys(new Set());
    setShowDatePicker(restoredShowPicker);
    setScheduledDate(restoredDate);
    setScheduledTime(restoredTime);
    setIsGeneratingCopy(false);
    setIsSavingDraft(false);
    setError(null);
    setDraftRestored(!!savedDraft);
  }, [isOpen]);

  // Autosave draft (text-only) while modal is open
  useEffect(() => {
    if (!isOpen || draftGroupId) return; // don't autosave when editing a server draft

    const id = setInterval(() => {
      saveDraft({ content, scheduledDate, scheduledTime, collaborators });
    }, 30_000);

    return () => clearInterval(id);
  }, [isOpen, draftGroupId, content, scheduledDate, scheduledTime, collaborators, saveDraft]);

  const allAccountSelectionKeys = useMemo(
    () => accounts.map((account) => getAccountSelectionKey(account)),
    [accounts]
  );

  const effectiveSelectedAccountKeys = useMemo(() => {
    if (selectedAccountKeys.size > 0) return selectedAccountKeys;
    return new Set(allAccountSelectionKeys);
  }, [selectedAccountKeys, allAccountSelectionKeys]);

  const selectedAccounts = useMemo(
    () => accounts.filter((account) => effectiveSelectedAccountKeys.has(getAccountSelectionKey(account))),
    [accounts, effectiveSelectedAccountKeys]
  );

  const selectedPlatforms = useMemo(
    () => [...new Set(selectedAccounts.map((account) => account.platform).filter(Boolean))],
    [selectedAccounts]
  );

  const toggleSelectedAccount = useCallback((account) => {
    const accountKey = getAccountSelectionKey(account);
    setSelectedAccountKeys((prev) => {
      const next = prev.size > 0 ? new Set(prev) : new Set(allAccountSelectionKeys);
      if (next.has(accountKey)) {
        if (next.size === 1) return next;
        next.delete(accountKey);
      } else {
        next.add(accountKey);
      }

      if (next.size === allAccountSelectionKeys.length) {
        return new Set();
      }

      return next;
    });
  }, [allAccountSelectionKeys]);

  // Auto-set preview platform to first selected account platform
  useEffect(() => {
    if (selectedAccounts.length === 0) return;
    const platforms = [...new Set(selectedAccounts.map((a) => a.platform).filter((platform) => PREVIEW_PLATFORMS.includes(platform)))];
    if (platforms.length === 0) return;
    setPreviewPlatform((current) => (platforms.includes(current) ? current : platforms[0]));
  }, [selectedAccounts]);

  useEffect(() => { setError(null); }, [content, mediaItems]);

  // ── Derived ──────────────────────────────────────────────────────────────

  // "Ready" = compression done, no error. Either has a `file` (local) or `url` (already uploaded from initial draft).
  const uploadedMediaItems = mediaItems.filter((item) => !item.compressing && !item.uploading && !item.error && (item.file || item.url));
  const uploadedMediaUrls  = uploadedMediaItems.map((item) => item.url).filter(Boolean);
  const uploadedVideos     = uploadedMediaItems.filter((item) => item.isVideo || isVideoUrl(item.previewUrl || item.url || ''));
  const uploadedImages     = uploadedMediaItems.filter((item) => !item.isVideo && !isVideoUrl(item.previewUrl || item.url || ''));
  const isUploadingMedia   = mediaItems.some((item) => item.uploading || item.compressing);

  // Base format inferred from media
  const inferredFormat = useMemo(() => {
    if (uploadedVideos.length >= 1) return 'reel';
    if (uploadedImages.length >= 2) return 'carousel';
    return 'post';
  }, [uploadedVideos.length, uploadedImages.length]);

  const hasInstagram = selectedAccounts.some((a) => a.platform === 'instagram');
  const hasStoryCapableAccount = selectedAccounts.some((a) => PLATFORM_CONFIG[a.platform]?.mediaTypes?.includes('story'));
  const canChooseStory = (uploadedImages.length >= 1 || uploadedVideos.length === 1) && hasStoryCapableAccount;
  const effectiveFormat = canChooseStory && formatOverride === 'historia' ? 'historia' : inferredFormat;
  const storyFormatLabel = uploadedImages.length > 1 ? 'Historias' : 'Historia';
  const isStory = effectiveFormat === 'historia';
  const showCoverUpload = effectiveFormat === 'reel' && hasInstagram;
  const showHistoriaToggle = canChooseStory;

  // Facebook accounts needing page selection
  const facebookAccountsNeedingPage = selectedAccounts.filter(
    (a) => a.platform === 'facebook'
      && a.subaccounts?.length > 0
      && !pageSelections[getAccountSelectionKey(a)]
      && !a.targetConfig?.pageId
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
    if (!selectedAccounts.length) return 'Selecciona al menos una cuenta para publicar.';
    if (!content.trim() && !isStory) return 'Escribe algo antes de publicar.';
    if (isUploadingMedia) return 'Espera a que terminen de procesarse los archivos.';
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
  }, [accountsLoading, accounts, selectedAccounts.length, content, isUploadingMedia, isCoverUploading, mediaItems,
      facebookAccountsNeedingPage, showDatePicker, scheduledDate, scheduledTime, hasInstagram, uploadedVideos]);

  const draftValidationError = useMemo(() => {
    if (accountsLoading) return 'Cargando cuentas...';
    if (!accounts.length) return 'Sin cuentas conectadas.';
    if (!selectedAccounts.length) return 'Selecciona al menos una cuenta.';
    if (!content.trim() && !isStory) return 'Escribe algo antes de guardar el borrador.';
    if (isUploadingMedia) return 'Espera a que terminen de procesarse los archivos.';
    if (isCoverUploading) return 'Espera a que termine de subir la portada.';
    if (mediaItems.some((item) => item.error)) return 'Elimina o vuelve a subir los archivos con error.';
    return null;
  }, [accountsLoading, accounts.length, selectedAccounts.length, content, isUploadingMedia, isCoverUploading, mediaItems]);

  // Non-blocking platform-specific warnings
  const mediaWarnings = useMemo(
    () => getMediaWarnings(uploadedMediaItems, selectedPlatforms, effectiveFormat),
    [uploadedMediaItems, selectedPlatforms, effectiveFormat]
  );

  // ── File handling ─────────────────────────────────────────────────────────

  // Add files: compress images locally and keep File + blob URL in state. No upload yet.
  const handleFiles = useCallback(async (files) => {
    if (!files.length) return;

    // Insert compressing placeholders immediately
    const placeholders = files.map((file) => {
      const id = `local-${++mediaIdCounter.current}`;
      return {
        id,
        name: file.name,
        file: null,
        previewUrl: null,
        url: null,
        uploading: false,
        compressing: true,
        error: null,
        isVideo: isVideoMime(file.type),
        mimeType: file.type || '',
        sizeBytes: Number(file.size || 0),
      };
    });
    setMediaItems((prev) => [...prev, ...placeholders]);

    // Process each file in parallel
    await Promise.all(files.map(async (file, offset) => {
      const id = placeholders[offset].id;
      try {
        const processedFile = await compress(file);
        const previewUrl = URL.createObjectURL(processedFile);
        setMediaItems((prev) => prev.map((item) =>
          item.id === id
            ? {
                ...item,
                file: processedFile,
                previewUrl,
                compressing: false,
                sizeBytes: processedFile.size,
                mimeType: processedFile.type || item.mimeType,
              }
            : item
        ));
      } catch (err) {
        setMediaItems((prev) => prev.map((item) =>
          item.id === id ? { ...item, compressing: false, error: err?.message || 'Error' } : item
        ));
      }
    }));
  }, [compress]);

  const handleFileSelect = (e) => { handleFiles(Array.from(e.target.files || [])); e.target.value = ''; };
  const handleDragOver  = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop      = (e) => { e.preventDefault(); setIsDragging(false); handleFiles(Array.from(e.dataTransfer.files || [])); };

  // Revoke blob URL when an item is removed to avoid leaks
  const removeMedia = useCallback((index) => {
    setMediaItems((prev) => {
      const target = prev[index];
      if (target?.previewUrl?.startsWith('blob:')) {
        try { URL.revokeObjectURL(target.previewUrl); } catch { /* noop */ }
      }
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const reorderMedia = useCallback((nextItems) => {
    setMediaItems(nextItems);
  }, []);

  // Cleanup all blob URLs when the modal closes / unmounts
  useEffect(() => {
    if (isOpen) return;
    setMediaItems((prev) => {
      prev.forEach((item) => {
        if (item.previewUrl?.startsWith('blob:')) {
          try { URL.revokeObjectURL(item.previewUrl); } catch { /* noop */ }
        }
      });
      return prev;
    });
  }, [isOpen]);

  useEffect(() => {
    return () => {
      // Final unmount cleanup
      setMediaItems((prev) => {
        prev.forEach((item) => {
          if (item.previewUrl?.startsWith('blob:')) {
            try { URL.revokeObjectURL(item.previewUrl); } catch { /* noop */ }
          }
        });
        return prev;
      });
    };
  }, []);

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

  const handleGenerateCopy = useCallback(async () => {
    const brief = content.trim();
    if (!brief) {
      setError('Escribe una idea base o un brief antes de usar IA.');
      requestAnimationFrame(() => textareaRef.current?.focus());
      return;
    }

    if (!projectId) {
      setError('No encontramos el proyecto de esta publicación.');
      return;
    }

    setIsGeneratingCopy(true);
    setError(null);

    try {
      const output = await generateProjectPostCopy({
        projectId,
        serviceId,
        brief,
        selectedPlatforms,
        format: effectiveFormat,
        mediaContext: {
          totalAssets: uploadedMediaItems.length,
          imageCount: uploadedImages.length,
          videoCount: uploadedVideos.length,
          hasMedia: uploadedMediaItems.length > 0,
          hasVideo: uploadedVideos.length > 0,
        },
        selectedAccounts,
        aiPlanning,
      });

      setContent(output.copy);
      requestAnimationFrame(() => textareaRef.current?.focus());
    } catch (err) {
      setError(`No se pudo generar el copy con IA: ${err.message}`);
    } finally {
      setIsGeneratingCopy(false);
    }
  }, [
    aiPlanning,
    content,
    effectiveFormat,
    projectId,
    selectedAccounts,
    selectedPlatforms,
    serviceId,
    uploadedImages.length,
    uploadedMediaItems.length,
    uploadedVideos.length,
  ]);

  // ── Submit ────────────────────────────────────────────────────────────────

  const buildScheduling = () => {
    if (showDatePicker && scheduledDate && scheduledTime) {
      return { type: 'scheduled', time: new Date(`${scheduledDate}T${scheduledTime}`).toISOString() };
    }
    return { type: 'immediate' };
  };

  const buildAccountsPayload = () => selectedAccounts.map((account) => {
    const tc = { ...(account.targetConfig || {}) };

    if (account.platform === 'instagram') {
      if (effectiveFormat === 'reel')    { tc.mediaType = 'reel'; if (coverImageUrl) tc.coverImageUrl = coverImageUrl; }
      else if (effectiveFormat === 'historia') tc.mediaType = 'story';
      else delete tc.mediaType;
      if (uploadedVideos.length > 0) delete tc.altText;
      if (collaborators.length > 0) tc.collaborators = collaborators;
      else delete tc.collaborators;
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

    const accountSelectionKey = getAccountSelectionKey(account);
    const pageId = pageSelections[accountSelectionKey] || account.targetConfig?.pageId;
    if (pageId) {
      tc.pageId = pageId;
      const sub = account.subaccounts?.find((s) => s.id === pageId);
      if (sub?.name) tc.pageName = sub.name;
    }

    return { id: account.id, platform: account.platform, targetConfig: tc };
  });

  // Upload media files to Supabase in order, returning the resulting URLs.
  // Items that already have a `url` (loaded from initial draft) skip the upload.
  // The `url` on each item is also updated in state so reusing handleSubmit after
  // a partial failure does not re-upload already-uploaded files.
  const uploadPendingMedia = useCallback(async () => {
    const ready = mediaItems.filter((item) => !item.compressing && !item.uploading && !item.error && (item.file || item.url));

    // Optimistically mark items that need uploading
    setMediaItems((prev) => prev.map((item) =>
      ready.find((r) => r.id === item.id && !item.url) ? { ...item, uploading: true } : item
    ));

    const urls = [];
    for (const item of ready) {
      if (item.url) { urls.push(item.url); continue; }
      try {
        const url = await uploadMediaFile(item.file);
        urls.push(url);
        setMediaItems((prev) => prev.map((it) => it.id === item.id ? { ...it, url, uploading: false } : it));
      } catch (err) {
        setMediaItems((prev) => prev.map((it) => it.id === item.id ? { ...it, uploading: false, error: err?.message || 'Error de subida' } : it));
        throw new Error(`No se pudo subir "${item.name}": ${err?.message || 'error desconocido'}`);
      }
    }
    return urls;
  }, [mediaItems]);

  const handleSubmit = async () => {
    if (validationError) { setError(validationError); return; }
    if (isSubmitting) return; // hard guard against double-submit
    setIsSubmitting(true);
    setError(null);
    try {
      const uploadedUrls = await uploadPendingMedia();
      const result = await createPost({
        serviceId, projectId,
        contentText: content.trim(),
        mediaUrls:   uploadedUrls,
        accounts:    buildAccountsPayload(),
        scheduling:  buildScheduling(),
      });
      if (result.errors?.length) {
        const detail = result.errors.map((i) => `${getPlatformName(i.platform)}: ${i.error}`).join(' · ');
        setError(result.posts.length > 0 ? `Publicado en ${result.posts.length} cuenta(s), con fallos: ${detail}` : `Falló: ${detail}`);
        if (result.posts.length > 0) {
          if (draftGroupId) await deleteDraftGroup(draftGroupId).catch(() => {});
          clearDraft();
          onClose();
        }
        return;
      }
      if (draftGroupId) await deleteDraftGroup(draftGroupId).catch(() => {});
      clearDraft();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    if (draftValidationError) { setError(draftValidationError); return; }
    if (isSavingDraft) return;
    setIsSavingDraft(true);
    setError(null);
    try {
      const uploadedUrls = await uploadPendingMedia();
      await saveDraftPost({
        serviceId,
        projectId,
        contentText: content.trim(),
        mediaUrls: uploadedUrls,
        accounts: buildAccountsPayload(),
      });
      if (draftGroupId) await deleteDraftGroup(draftGroupId).catch(() => {});
      clearDraft();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleDiscardDraft = () => {
    clearDraft();
    setContent('');
    setScheduledDate('');
    setScheduledTime('');
    setCollaborators([]);
    setShowDatePicker(false);
    setDraftRestored(false);
  };

  if (!isOpen) return null;

  const availablePreviewPlatforms = [...new Set(selectedAccounts.map((a) => a.platform).filter((p) => PREVIEW_PLATFORMS.includes(p)))];

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
          <div className="flex items-start gap-3 px-4 py-3.5 border-b border-white/[0.07] shrink-0">
            <div className="min-w-0 flex-1 space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-white/35">
                  Publicar en
                </p>
                {!accountsLoading && accounts.length > 0 && (
                  <span className="text-[11px] text-white/25">
                    {selectedAccounts.length}/{accounts.length} seleccionadas
                  </span>
                )}
                {uploadedMediaItems.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-white/[0.07] text-[10px] text-white/40 border border-white/[0.08]">
                    {effectiveFormat === 'reel' ? 'Reel / Video' : effectiveFormat === 'carousel' ? 'Carrusel' : effectiveFormat === 'historia' ? storyFormatLabel : 'Publicación'}
                  </span>
                )}
              </div>

              {accountsLoading ? <Loader2 size={16} className="animate-spin text-white/30" /> : accounts.length === 0 ? (
                <span className="text-xs text-white/30">Sin cuentas</span>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {accounts.map((account) => (
                    <AccountToggleChip
                      key={getAccountSelectionKey(account)}
                      account={account}
                      selected={effectiveSelectedAccountKeys.has(getAccountSelectionKey(account))}
                      onToggle={() => toggleSelectedAccount(account)}
                    />
                  ))}
                </div>
              )}
              {!accountsLoading && accounts.length > 0 && (
                <p className="text-[10px] text-white/25">
                  Tocá una cuenta para incluirla o excluirla de esta publicación.
                </p>
              )}

              {draftRestored && (
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-teal-500/10 border border-teal-500/20 w-fit">
                  <RotateCcw size={11} className="text-teal-400" />
                  <span className="text-[10px] text-teal-400 font-medium">Borrador recuperado</span>
                  <button
                    onClick={handleDiscardDraft}
                    className="text-[10px] text-teal-400/60 hover:text-teal-400 underline underline-offset-2"
                  >
                    Descartar
                  </button>
                </div>
              )}
            </div>

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
                <button
                  onClick={handleGenerateCopy}
                  disabled={isGeneratingCopy}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-white/40 hover:text-white/75 hover:bg-white/[0.06] transition-colors disabled:cursor-wait disabled:opacity-70"
                  title="Generar copy con IA usando el texto actual como brief"
                >
                  {isGeneratingCopy ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />} {isGeneratingCopy ? 'Generando...' : 'IA'}
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

                {/* Thumbnails (sortable) */}
                {mediaItems.length > 0 && (
                  <SortableMediaGrid
                    items={mediaItems}
                    onReorder={reorderMedia}
                    onRemove={removeMedia}
                    showCarouselBadges={effectiveFormat === 'carousel' || uploadedImages.length >= 2}
                  />
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

              {/* Instagram collaborators */}
              {hasInstagram && (
                <div className="px-4 pb-3 space-y-2">
                  <p className="text-[10px] text-white/30 uppercase tracking-wider font-medium">
                    Colaboradores Instagram <span className="text-white/20 normal-case font-normal">(máx. 3)</span>
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {collaborators.map((handle, i) => (
                      <span key={i} className="flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full bg-white/[0.07] text-[11px] text-white/65 border border-white/[0.1]">
                        @{handle}
                        <button
                          type="button"
                          onClick={() => setCollaborators((prev) => prev.filter((_, idx) => idx !== i))}
                          className="p-0.5 rounded-full text-white/30 hover:text-white/70 transition-colors"
                        >
                          <X size={9} />
                        </button>
                      </span>
                    ))}
                    {collaborators.length < 3 && (
                      <input
                        ref={collaboratorInputRef}
                        type="text"
                        value={collaboratorInput}
                        onChange={(e) => setCollaboratorInput(e.target.value.replace(/^@+/, ''))}
                        onKeyDown={(e) => {
                          if (['Enter', ',', ' ', 'Tab'].includes(e.key)) {
                            e.preventDefault();
                            const val = collaboratorInput.trim();
                            if (val && !collaborators.includes(val)) {
                              setCollaborators((prev) => [...prev, val]);
                            }
                            setCollaboratorInput('');
                          } else if (e.key === 'Backspace' && !collaboratorInput && collaborators.length > 0) {
                            setCollaborators((prev) => prev.slice(0, -1));
                          }
                        }}
                        onBlur={() => {
                          const val = collaboratorInput.trim();
                          if (val && !collaborators.includes(val)) {
                            setCollaborators((prev) => [...prev, val]);
                          }
                          setCollaboratorInput('');
                        }}
                        placeholder={collaborators.length === 0 ? '@usuario' : '+'}
                        className="bg-transparent text-[11px] text-white/70 placeholder:text-white/25 outline-none min-w-[80px] max-w-[140px]"
                      />
                    )}
                  </div>
                  <p className="text-[9px] text-white/20">Enter, coma o espacio para confirmar cada usuario</p>
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
                    <div key={getAccountSelectionKey(account)} className="flex items-center gap-2">
                      <AccountAvatar account={account} size={24} />
                      <select
                        value={pageSelections[getAccountSelectionKey(account)] || ''}
                        onChange={(e) => setPageSelections((prev) => ({ ...prev, [getAccountSelectionKey(account)]: e.target.value }))}
                        className="flex-1 bg-[#2a2a2a] border border-white/[0.1] rounded-lg px-3 py-1.5 text-xs text-white/70 outline-none"
                      >
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
                  accounts={selectedAccounts}
                  content={content}
                  mediaItems={uploadedMediaItems.map((m) => ({ ...m, url: m.url || m.previewUrl }))}
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

            {mediaWarnings.length > 0 && !error && (
              <div className="flex items-start gap-2 text-xs text-amber-400/90 bg-amber-500/[0.06] border border-amber-500/15 rounded-xl px-3 py-2">
                <AlertTriangle size={13} className="shrink-0 mt-0.5 text-amber-400/80" />
                <ul className="space-y-0.5 leading-relaxed">
                  {mediaWarnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            )}

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
                onClick={handleSaveDraft}
                disabled={!!draftValidationError || isSavingDraft || isSubmitting}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors border border-white/[0.1] text-white/45 hover:text-white/70 hover:bg-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed"
                title={draftValidationError || 'Guardar como borrador'}
              >
                {isSavingDraft ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                {isSavingDraft
                  ? (mediaItems.some((m) => m.uploading) ? 'Subiendo...' : 'Guardando...')
                  : 'Borrador'}
              </button>

              <button
                onClick={handleSubmit}
                disabled={!!validationError || isSubmitting}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
                  validationError || isSubmitting ? 'bg-white/[0.06] text-white/25 cursor-not-allowed'
                  : showDatePicker && scheduledDate && scheduledTime ? 'bg-teal-500 hover:bg-teal-400 text-white shadow-lg shadow-teal-500/20'
                  : 'bg-white hover:bg-white/90 text-black shadow-md'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    {mediaItems.some((m) => m.uploading) ? 'Subiendo...' : 'Publicando...'}
                  </>
                ) : showDatePicker && scheduledDate && scheduledTime ? (
                  <><Calendar size={14} /> Programar</>
                ) : (
                  <><Send size={14} /> Publicar ahora</>
                )}
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
