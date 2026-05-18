import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import {
  Play,
  Square,
  Type,
  Image as ImageIcon,
  Video as VideoIcon,
  ChevronDown,
  Copy,
} from 'lucide-react';
import { useReactFlow, useNodes, useEdges } from '@xyflow/react';
import BaseNode, { cn } from './BaseNode';
import { Port } from './Port';
import MultiUseSelect from '../MultiUseSelect';
import {
  uploadFile,
  createMarketTask,
  pollMarketTask,
  createVeoTask,
  pollVeoTask,
} from '../../lib/kie';
import { persistMediaUrl } from '../../lib/mediaStorage';
import { recordGeneration } from '../../lib/studioHistory';
import { useGenerationQueue } from '../../lib/queueStore';
import toast from 'react-hot-toast';
import { ElasticSwitch } from '../ui/elastic-switch';

// ---------------------------------------------------------------------------
// Model capabilities registry
// ---------------------------------------------------------------------------
interface ModelCaps {
  kind: 'image' | 'video';
  provider: 'market' | 'veo';
  supportsReferenceImage?: boolean;
  requiresReferenceImage?: boolean;
  supportsReferenceVideo?: boolean;
  supportsAspectRatio?: boolean;
  supportsResolution?: boolean;
  supportsOutputFormat?: boolean;
  supportsGoogleSearch?: boolean;
  supportsDuration?: boolean;
  supportsSound?: boolean;
  supportsMode?: boolean;
  supportsSeeds?: boolean;
  supportsTranslation?: boolean;
  supportsFallback?: boolean;
  supportsFrameCount?: boolean;
  supportsRemoveWatermark?: boolean;
  supportsUploadMethod?: boolean;
  supportsCharacterIds?: boolean;
  supportsMultiPrompt?: boolean;
  supportsKlingElements?: boolean;
  supportsCharacterOrientation?: boolean;
  supportsBackgroundSource?: boolean;
  supportsNegativePrompt?: boolean;
  supportsSecondImage?: boolean;
  // Seedance 2.0 multimodal references
  supportsReferenceImages?: boolean;  // reference_image_urls array (up to 9)
  supportsReferenceVideos?: boolean;  // reference_video_urls array (up to 3), optional
  supportsReferenceAudios?: boolean;  // reference_audio_urls array (up to 3)
  supportsNsfwChecker?: boolean;
  supportsFixedLens?: boolean;    // Seedance 1.5 Pro: lock camera for static shots
  supportsInputUrls?: boolean;    // Seedance 1.5 Pro: input_urls array (up to 2 images)
}

const MODEL_CAPS: Record<string, ModelCaps> = {
  /* ---- Image models ---- */
  'google/nano-banana': {
    kind: 'image',
    provider: 'market',
    supportsAspectRatio: true,
    supportsOutputFormat: true,
  },
  'google/nano-banana-edit': {
    kind: 'image',
    provider: 'market',
    supportsReferenceImage: true,
    requiresReferenceImage: true,
    supportsAspectRatio: true,
    supportsOutputFormat: true,
  },
  'nano-banana-2': {
    kind: 'image',
    provider: 'market',
    supportsReferenceImage: true,
    supportsAspectRatio: true,
    supportsResolution: true,
    supportsOutputFormat: true,
    supportsGoogleSearch: true,
  },
  'nano-banana-pro': {
    kind: 'image',
    provider: 'market',
    supportsReferenceImage: true,
    supportsAspectRatio: true,
    supportsResolution: true,
    supportsOutputFormat: true,
  },

  /* ---- Kling 2.6 variants ---- */
  'kling-2.6/text-to-video': {
    kind: 'video',
    provider: 'market',
    supportsAspectRatio: true,
    supportsDuration: true,
    supportsSound: true,

  },
  'kling-2.6/image-to-video': {
    kind: 'video',
    provider: 'market',
    supportsReferenceImage: true,
    requiresReferenceImage: true,
    supportsDuration: true,
    supportsSound: true,
  },
  'kling-2.6/motion-control': {
    kind: 'video',
    provider: 'market',
    supportsReferenceImage: true,
    supportsReferenceVideo: true,
    supportsMode: true,
    supportsCharacterOrientation: true,

  },

  /* ---- Kling 3.0 variants ---- */
  'kling-3.0/video': {
    kind: 'video',
    provider: 'market',
    supportsReferenceImage: true,
    supportsSecondImage: true,
    supportsNegativePrompt: true,
    supportsAspectRatio: true,
    supportsDuration: true,
    supportsSound: true,
    supportsMode: true,
    supportsMultiPrompt: true,
    supportsKlingElements: true,

  },
  'kling-3.0/motion-control': {
    kind: 'video',
    provider: 'market',
    supportsReferenceImage: true,
    supportsReferenceVideo: true,
    supportsMode: true,
    supportsCharacterOrientation: true,
    supportsBackgroundSource: true,

  },

  /* ---- Sora 2 variants ---- */
  'sora-2-text-to-video': {
    kind: 'video',
    provider: 'market',
    supportsAspectRatio: true,
    supportsFrameCount: true,
    supportsRemoveWatermark: true,
    supportsUploadMethod: true,
    supportsCharacterIds: true,

  },
  'sora-2-image-to-video': {
    kind: 'video',
    provider: 'market',
    supportsReferenceImage: true,
    requiresReferenceImage: true,
    supportsAspectRatio: true,
    supportsFrameCount: true,
    supportsRemoveWatermark: true,
    supportsUploadMethod: true,
    supportsCharacterIds: true,
  },

  /* ---- Bytedance Seedance 2.0 ---- */
  'bytedance/seedance-2': {
    kind: 'video',
    provider: 'market',
    supportsReferenceImage: true,
    supportsSecondImage: true,
    supportsReferenceImages: true,
    supportsReferenceVideos: true,
    supportsReferenceAudios: true,
    supportsAspectRatio: true,
    supportsDuration: true,
    supportsSound: true,
    supportsResolution: true,
    supportsGoogleSearch: true,
    supportsNsfwChecker: true,
  },
  'bytedance/seedance-2-fast': {
    kind: 'video',
    provider: 'market',
    supportsReferenceImage: true,
    supportsSecondImage: true,
    supportsReferenceImages: true,
    supportsReferenceVideos: true,
    supportsReferenceAudios: true,
    supportsAspectRatio: true,
    supportsDuration: true,
    supportsSound: true,
    supportsResolution: true,
    supportsGoogleSearch: true,
    supportsNsfwChecker: true,
  },

  /* ---- Bytedance Seedance 1.5 Pro ---- */
  'bytedance/seedance-1.5-pro': {
    kind: 'video',
    provider: 'market',
    supportsReferenceImage: true,
    supportsSecondImage: true,
    supportsInputUrls: true,
    supportsAspectRatio: true,
    supportsDuration: true,
    supportsSound: true,
    supportsResolution: true,
    supportsFixedLens: true,
    supportsNsfwChecker: true,
  },

  /* ---- GPT Image-2 ---- */
  'gpt-image-2-text-to-image': {
    kind: 'image',
    provider: 'market',
    supportsAspectRatio: true,
    supportsResolution: true,
  },

  /* ---- Veo ---- */
  veo3: {
    kind: 'video',
    provider: 'veo',
    supportsReferenceImage: true,
    supportsSecondImage: true,
    supportsAspectRatio: true,
    supportsSeeds: true,
    supportsTranslation: true,
    supportsFallback: true,
  },
  veo3_fast: {
    kind: 'video',
    provider: 'veo',
    supportsReferenceImage: true,
    supportsSecondImage: true,
    supportsAspectRatio: true,
    supportsSeeds: true,
    supportsTranslation: true,
    supportsFallback: true,
  },
  veo3_lite: {
    kind: 'video',
    provider: 'veo',
    supportsReferenceImage: true,
    supportsSecondImage: true,
    supportsAspectRatio: true,
    supportsSeeds: true,
    supportsTranslation: true,
    supportsFallback: true,
  },
};

function getCaps(model: string): ModelCaps {
  return MODEL_CAPS[model] ?? { kind: 'image', provider: 'market' };
}

// Max generations running at once. Prevents N parallel API calls (and credit
// spikes) when many output nodes are connected to a single model.
const MAX_CONCURRENT_GENERATIONS = 3;

/**
 * Runs `task` `count` times with at most `limit` concurrent executions.
 * Results are returned in index order, mirroring Promise.allSettled.
 */
async function runWithConcurrency<T>(
  count: number,
  limit: number,
  task: (index: number) => Promise<T>,
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(count);
  let cursor = 0;

  const worker = async (): Promise<void> => {
    while (true) {
      const index = cursor++;
      if (index >= count) return;
      try {
        results[index] = { status: 'fulfilled', value: await task(index) };
      } catch (reason) {
        results[index] = { status: 'rejected', reason };
      }
    }
  };

  const workerCount = Math.min(Math.max(limit, 1), count);
  await Promise.all(Array.from({ length: workerCount }, worker));
  return results;
}

// ---------------------------------------------------------------------------
// Credit costs per model (approximate, based on Kie.ai pricing)
// ---------------------------------------------------------------------------
const MODEL_CREDITS: Record<string, string> = {
  'google/nano-banana':         '4 cr / img',
  'google/nano-banana-edit':    '6 cr / img',
  'nano-banana-2':              '8 cr / img',
  'nano-banana-pro':            '12 cr / img',
  'gpt-image-2-text-to-image':  '~10 cr / img',
  'kling-2.6/text-to-video':    '70–140 cr',
  'kling-2.6/image-to-video':   '70–140 cr',
  'kling-2.6/motion-control':   '70 cr',
  'kling-3.0/video':            '140–280 cr',
  'kling-3.0/motion-control':   '140 cr',
  'sora-2-text-to-video':       '300 cr',
  'sora-2-image-to-video':      '300 cr',
  'bytedance/seedance-1.5-pro': '60–120 cr',
  'bytedance/seedance-2':       '100 cr',
  'bytedance/seedance-2-fast':  '50 cr',
  veo3:                         '500 cr',
  veo3_fast:                    '200 cr',
  veo3_lite:                    '100 cr',
};

const MODEL_OPTIONS = [
  {
    label: 'Image Models',
    options: [
      { label: 'Nano Banana', value: 'google/nano-banana' },
      { label: 'Nano Banana Edit', value: 'google/nano-banana-edit' },
      { label: 'Nano Banana 2', value: 'nano-banana-2' },
      { label: 'Nano Banana Pro', value: 'nano-banana-pro' },
      { label: 'GPT Image 2', value: 'gpt-image-2-text-to-image' },
    ],
  },
  {
    label: 'Video Models',
    options: [
      { label: 'Kling 2.6 Text', value: 'kling-2.6/text-to-video' },
      { label: 'Kling 2.6 Image', value: 'kling-2.6/image-to-video' },
      { label: 'Kling 2.6 Motion', value: 'kling-2.6/motion-control' },
      { label: 'Kling 3.0 Video', value: 'kling-3.0/video' },
      { label: 'Kling 3.0 Motion', value: 'kling-3.0/motion-control' },
      { label: 'Sora 2 Text', value: 'sora-2-text-to-video' },
      { label: 'Sora 2 Image', value: 'sora-2-image-to-video' },
      { label: 'Seedance 1.5 Pro', value: 'bytedance/seedance-1.5-pro' },
      { label: 'Seedance 2', value: 'bytedance/seedance-2' },
      { label: 'Seedance 2 Fast', value: 'bytedance/seedance-2-fast' },
      { label: 'Veo 3', value: 'veo3' },
      { label: 'Veo 3 Fast', value: 'veo3_fast' },
      { label: 'Veo 3 Lite', value: 'veo3_lite' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Parse helpers
// ---------------------------------------------------------------------------
function parseCsv(val: string | undefined): string[] {
  if (!val) return [];
  return val
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseSeed(val: string | undefined): number | undefined {
  if (!val) return undefined;
  return val
    .split(',')
    .map((s) => Number(s.trim()))
    .find((n) => !isNaN(n) && isFinite(n));
}

function mapSoraAspectRatio(aspectRatio: string): 'landscape' | 'portrait' {
  return aspectRatio === '9:16' ? 'portrait' : 'landscape';
}

function normalizeSoraUploadMethod(_uploadMethod: string | undefined): 's3' {
  return 's3';
}

// ---------------------------------------------------------------------------
// Build Market request input per model
// ---------------------------------------------------------------------------
function buildMarketInput(
  model: string,
  prompt: string,
  negativePrompt: string,
  imageUrl: string | null,
  imageUrl2: string | null,
  videoUrl: string | null,
  data: Record<string, any>,
  extras?: {
    multiPrompt?: Array<{ prompt: string; duration: number }>;
    klingElements?: Array<{ name: string; description: string; element_input_urls: string[] }>;
    referenceImageUrls?: string[];
    referenceVideoUrls?: string[];
    referenceAudioUrls?: string[];
  },
): { apiModel: string; input: Record<string, any> } {
  const aspectRatio = (data.aspectRatio || '1:1') as string;
  const resolution = (data.resolution || '1K') as string;
  const outputFormat = (data.outputFormat || 'png') as string;
  const duration = (data.duration || '5') as string;
  const sound = !!data.sound;
  const mode = (data.mode || 'std') as string;
  const googleSearch = !!data.googleSearch;
  const nFrames = (data.nFrames as string) || undefined;
  const removeWatermark = !!data.removeWatermark;
  const uploadMethod = normalizeSoraUploadMethod(data.uploadMethod);

  switch (model) {
    /* ---- Nano Banana family ---- */
    case 'google/nano-banana':
      return {
        apiModel: 'google/nano-banana',
        input: { prompt, output_format: outputFormat, image_size: aspectRatio },
      };

    case 'google/nano-banana-edit':
      return {
        apiModel: 'google/nano-banana-edit',
        input: {
          prompt,
          image_urls: imageUrl ? [imageUrl] : [],
          output_format: outputFormat,
          image_size: aspectRatio,
        },
      };

    case 'nano-banana-2': {
      const input: Record<string, any> = {
        prompt,
        aspect_ratio: aspectRatio,
        resolution,
        output_format: outputFormat,
        google_search: googleSearch,
      };
      if (imageUrl) input.image_input = [imageUrl];
      return { apiModel: 'nano-banana-2', input };
    }

    case 'nano-banana-pro': {
      const input: Record<string, any> = {
        prompt,
        aspect_ratio: aspectRatio,
        resolution,
        output_format: outputFormat,
      };
      if (imageUrl) input.image_input = [imageUrl];
      return { apiModel: 'nano-banana-pro', input };
    }

    /* ---- Kling 2.6 ---- */
    case 'kling-2.6/text-to-video':
      return {
        apiModel: 'kling-2.6/text-to-video',
        input: { prompt, sound, aspect_ratio: aspectRatio, duration },
      };

    case 'kling-2.6/image-to-video':
      return {
        apiModel: 'kling-2.6/image-to-video',
        input: {
          prompt,
          image_urls: imageUrl ? [imageUrl] : [],
          sound,
          duration,
        },
      };

    case 'kling-2.6/motion-control': {
      const input: Record<string, any> = { prompt, mode };
      if (imageUrl) input.input_urls = [imageUrl];
      if (videoUrl) input.video_urls = [videoUrl];
      if (data.characterOrientation)
        input.character_orientation = data.characterOrientation;
      return { apiModel: 'kling-2.6/motion-control', input };
    }

    /* ---- Kling 3.0 ---- */
    case 'kling-3.0/video': {
      // KIE requires multi_shots as a non-empty array; it's the primary prompt carrier
      const durationNum = parseInt(duration) || 5;
      const shots = extras?.multiPrompt?.length
        ? extras.multiPrompt.map((seg) => ({ prompt: seg.prompt, duration: seg.duration }))
        : [{ prompt, duration: durationNum }];

      const input: Record<string, any> = {
        multi_shots: shots,
        sound,
        aspect_ratio: aspectRatio,
        mode,
      };
      if (imageUrl && imageUrl2) {
        input.image_urls = [imageUrl, imageUrl2];
      } else if (imageUrl) {
        input.image_urls = [imageUrl];
      }
      if (negativePrompt) {
        input.negative_prompt = negativePrompt;
      }
      if (extras?.klingElements?.length) {
        input.kling_elements = extras.klingElements;
      }

      return { apiModel: 'kling-3.0/video', input };
    }

    case 'kling-3.0/motion-control': {
      const input: Record<string, any> = { prompt, mode };
      if (imageUrl) input.input_urls = [imageUrl];
      if (videoUrl) input.video_urls = [videoUrl];
      if (data.characterOrientation)
        input.character_orientation = data.characterOrientation;
      if (data.backgroundSource)
        input.background_source = data.backgroundSource;
      return { apiModel: 'kling-3.0/motion-control', input };
    }

    /* ---- Sora 2 ---- */
    case 'sora-2-text-to-video': {
      const input: Record<string, any> = {
        prompt,
        aspect_ratio: mapSoraAspectRatio(aspectRatio),
        remove_watermark: removeWatermark,
        upload_method: uploadMethod,
      };
      if (nFrames) input.n_frames = String(nFrames);
      const charIds = parseCsv(data.characterIdList);
      if (charIds.length) input.character_id_list = charIds;
      return { apiModel: 'sora-2-text-to-video', input };
    }

    case 'sora-2-image-to-video': {
      const input: Record<string, any> = {
        prompt,
        image_urls: imageUrl ? [imageUrl] : [],
        aspect_ratio: mapSoraAspectRatio(aspectRatio),
        remove_watermark: removeWatermark,
        upload_method: uploadMethod,
      };
      if (nFrames) input.n_frames = String(nFrames);
      const charIds = parseCsv(data.characterIdList);
      if (charIds.length) input.character_id_list = charIds;
      return { apiModel: 'sora-2-image-to-video', input };
    }

    /* ---- Bytedance Seedance 1.5 Pro ---- */
    case 'bytedance/seedance-1.5-pro': {
      const validResolutions = ['480p', '720p', '1080p'];
      const s15Resolution = validResolutions.includes(data.resolution)
        ? data.resolution
        : '720p';
      const validDurations = ['4', '8', '12'];
      const s15Duration = validDurations.includes(String(duration)) ? String(duration) : '8';
      const input: Record<string, any> = {
        prompt,
        aspect_ratio: aspectRatio,
        resolution: s15Resolution,
        duration: s15Duration,
        generate_audio: sound,
        fixed_lens: !!data.fixedLens,
      };
      const inputUrls = [imageUrl, imageUrl2].filter(Boolean) as string[];
      if (inputUrls.length) input.input_urls = inputUrls;
      if (data.nsfwChecker) input.nsfw_checker = true;
      return { apiModel: 'bytedance/seedance-1.5-pro', input };
    }

    /* ---- Bytedance Seedance 2.0 ---- */
    case 'bytedance/seedance-2':
    case 'bytedance/seedance-2-fast': {
      const validResolutions = ['480p', '720p', '1080p'];
      const seedanceResolution = validResolutions.includes(data.resolution)
        ? data.resolution
        : '720p';
      const durationVal = parseInt(duration) || 5;
      const clampedDuration = Math.min(15, Math.max(4, durationVal));
      const input: Record<string, any> = {
        prompt,
        aspect_ratio: aspectRatio,
        duration: clampedDuration,
        generate_audio: sound,
        resolution: seedanceResolution,
        web_search: googleSearch,
      };
      if (imageUrl) input.first_frame_url = imageUrl;
      if (imageUrl2) input.last_frame_url = imageUrl2;
      if (extras?.referenceImageUrls?.length)
        input.reference_image_urls = extras.referenceImageUrls.slice(0, 9);
      if (extras?.referenceVideoUrls?.length)
        input.reference_video_urls = extras.referenceVideoUrls.slice(0, 3);
      if (extras?.referenceAudioUrls?.length)
        input.reference_audio_urls = extras.referenceAudioUrls.slice(0, 3);
      if (data.nsfwChecker) input.nsfw_checker = true;
      return { apiModel: model, input };
    }

    /* ---- GPT Image-2 ---- */
    case 'gpt-image-2-text-to-image': {
      const input: Record<string, any> = { prompt };
      if (aspectRatio && aspectRatio !== 'auto') input.aspect_ratio = aspectRatio;
      else if (aspectRatio === 'auto') input.aspect_ratio = 'auto';
      if (resolution) input.resolution = resolution;
      return { apiModel: 'gpt-image-2-text-to-image', input };
    }

    default:
      throw new Error(`Unknown market model: ${model}`);
  }
}

// ---------------------------------------------------------------------------
// Tiny UI primitives (node-scoped, match dark theme)
// ---------------------------------------------------------------------------
// ElasticSwitch wrapper for backward compatibility
function Toggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <ElasticSwitch
      isOn={value}
      onChange={onChange}
      size="sm"
    />
  );
}
function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[11px] text-white/50 uppercase tracking-widest font-semibold">
      {children}
    </label>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 px-0.5">
      <FieldLabel>{label}</FieldLabel>
      <Toggle value={value} onChange={onChange} />
    </div>
  );
}

function SmallInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="nodrag w-full rounded-[10px] bg-white/5 border border-white/10 px-3 py-2 text-[13px] text-white placeholder:text-white/25 focus:outline-none focus:border-[#0A84FF] focus:ring-1 focus:ring-[#0A84FF] transition-all"
    />
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function ModelNode({ id, data }: { id: string; data: any }) {
  const { updateNodeData, getNodes, getEdges, setNodes, setEdges } =
    useReactFlow();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const abortRef = useRef(false);

  const caps = useMemo(() => getCaps(data.model), [data.model]);
  const isVideo = caps.kind === 'video';
  const isMotionControl = !!caps.supportsReferenceVideo;

  // Reactive snapshot of all nodes/edges — used to show reference image previews
  const allNodes = useNodes();
  const allEdges = useEdges();

  // Build the list of connected reference images with their prompt tokens
  const connectedRefImages = useMemo(() => {
    const inputEdges = allEdges.filter((e) => e.target === id);
    const refs: Array<{ token: string; label: string; imageUrl: string | null }> = [];

    // input_urls style (Seedance 1.5 Pro): label as [img1] / [img2]
    const useInputUrls = caps.supportsInputUrls;

    if (caps.supportsReferenceImage) {
      const edge = inputEdges.find((e) => e.targetHandle === 'ref-image');
      if (edge) {
        const n = allNodes.find((nd) => nd.id === edge.source);
        refs.push({
          token: useInputUrls ? '[img1]' : caps.supportsSecondImage ? '[first_frame]' : '[img]',
          label: useInputUrls ? 'Img 1' : caps.supportsSecondImage ? '1st Frame' : 'Img',
          imageUrl: ((n?.data?.imageUrl || n?.data?.resultUrl) as string) || null,
        });
      }
    }

    if (caps.supportsSecondImage) {
      const edge = inputEdges.find((e) => e.targetHandle === 'ref-image-2');
      if (edge) {
        const n = allNodes.find((nd) => nd.id === edge.source);
        refs.push({
          token: useInputUrls ? '[img2]' : '[last_frame]',
          label: useInputUrls ? 'Img 2' : 'Last Frame',
          imageUrl: ((n?.data?.imageUrl || n?.data?.resultUrl) as string) || null,
        });
      }
    }

    if (caps.supportsReferenceImages) {
      const edges = inputEdges.filter((e) => e.targetHandle === 'ref-images');
      edges.forEach((edge, i) => {
        const n = allNodes.find((nd) => nd.id === edge.source);
        refs.push({
          token: `[ref${i + 1}]`,
          label: `Ref ${i + 1}`,
          imageUrl: ((n?.data?.imageUrl || n?.data?.resultUrl) as string) || null,
        });
      });
    }

    if (caps.supportsReferenceVideo) {
      const edge = inputEdges.find((e) => e.targetHandle === 'ref-video');
      if (edge) {
        const n = allNodes.find((nd) => nd.id === edge.source);
        refs.push({
          token: '[video]',
          label: 'Video',
          imageUrl: ((n?.data?.imageUrl || n?.data?.resultUrl) as string) || null,
        });
      }
    }

    if (caps.supportsReferenceVideos) {
      const edges = inputEdges.filter((e) => e.targetHandle === 'ref-videos');
      edges.forEach((edge, i) => {
        const n = allNodes.find((nd) => nd.id === edge.source);
        refs.push({
          token: `[video${i + 1}]`,
          label: `Video ${i + 1}`,
          imageUrl: ((n?.data?.imageUrl || n?.data?.resultUrl) as string) || null,
        });
      });
    }

    return refs;
  }, [allNodes, allEdges, id, caps]);

  const hasAdvanced =
    caps.supportsSeeds ||
    caps.supportsTranslation ||
    caps.supportsFallback ||
    caps.supportsFrameCount ||
    caps.supportsRemoveWatermark ||
    caps.supportsUploadMethod ||
    caps.supportsCharacterIds ||
    caps.supportsBackgroundSource ||
    caps.supportsNsfwChecker ||
    caps.provider === 'veo'; // generationType

  // Shorthand updater
  const set = useCallback(
    (patch: Record<string, any>) => updateNodeData(id, patch),
    [updateNodeData, id],
  );

  // -----------------------------------------------------------------------
  // Generate handler
  // -----------------------------------------------------------------------
  const handleCancel = () => {
    abortRef.current = true;
    setIsGenerating(false);
    // Reset output nodes back to idle
    const edges = getEdges();
    const connectedEdges = edges.filter((e) => e.source === id);
    const targetNodeIds = connectedEdges.map((e) => e.target);
    setNodes((nds) =>
      nds.map((n) => {
        if (targetNodeIds.includes(n.id) && n.type === 'output') {
          return { ...n, data: { ...n.data, status: 'idle', error: null } };
        }
        return n;
      }),
    );
    setEdges((eds) =>
      eds.map((e) => {
        if (e.source === id && targetNodeIds.includes(e.target)) {
          return { ...e, data: { ...e.data, status: 'idle' } };
        }
        return e;
      }),
    );
    toast('Generation cancelled', { icon: '⏹' });
  };

  const handleGenerate = async () => {
    if (isGenerating) return;
    abortRef.current = false;

    const nodes = getNodes();
    const edges = getEdges();

    const connectedEdges = edges.filter((e) => e.source === id);
    const targetNodeIds = connectedEdges.map((e) => e.target);

    const inputEdges = edges.filter((e) => e.target === id);

    // -- Prompt --
    const promptEdge = inputEdges.find((e) => e.targetHandle === 'prompt');
    const promptNode = promptEdge
      ? nodes.find((n) => n.id === promptEdge.source)
      : null;
    const promptText = (promptNode?.data?.enhancedText ||
      promptNode?.data?.text ||
      '') as string;

    // -- Negative prompt --
    const negPromptEdge = inputEdges.find(
      (e) => e.targetHandle === 'negative-prompt',
    );
    const negPromptNode = negPromptEdge
      ? nodes.find((n) => n.id === negPromptEdge.source)
      : null;
    const negativePromptText = (negPromptNode?.data?.enhancedText ||
      negPromptNode?.data?.text ||
      '') as string;

    // -- Reference image --
    const refImageEdge = inputEdges.find(
      (e) => e.targetHandle === 'ref-image',
    );
    const refImageNode = refImageEdge
      ? nodes.find((n) => n.id === refImageEdge.source)
      : null;
    let refImageDataUrl: string | null =
      (refImageNode?.data?.imageUrl as string) ||
      (refImageNode?.data?.resultUrl as string) ||
      null;

    // -- Reference image 2 (last frame) --
    const refImage2Edge = inputEdges.find(
      (e) => e.targetHandle === 'ref-image-2',
    );
    const refImage2Node = refImage2Edge
      ? nodes.find((n) => n.id === refImage2Edge.source)
      : null;
    let refImage2DataUrl: string | null =
      (refImage2Node?.data?.imageUrl as string) ||
      (refImage2Node?.data?.resultUrl as string) ||
      null;

    // -- Reference video --
    const refVideoEdge = inputEdges.find(
      (e) => e.targetHandle === 'ref-video',
    );
    const refVideoNode = refVideoEdge
      ? nodes.find((n) => n.id === refVideoEdge.source)
      : null;
    let refVideoDataUrl: string | null =
      (refVideoNode?.data?.resultUrl as string) ||
      (refVideoNode?.data?.videoUrl as string) ||
      (refVideoNode?.data?.imageUrl as string) ||
      null;

    // -- Multi Prompt (from MultiPromptNode) --
    const multiPromptEdge = inputEdges.find(
      (e) => e.targetHandle === 'multi-prompt',
    );
    const multiPromptNode = multiPromptEdge
      ? nodes.find((n) => n.id === multiPromptEdge.source)
      : null;
    const multiPromptData = multiPromptNode?.data?.segments as
      | Array<{ prompt: string; duration: number }>
      | undefined;

    // -- Kling Elements (from ElementNodes) --
    const elementEdges = inputEdges.filter(
      (e) => e.targetHandle === 'elements',
    );
    const klingElementsData = elementEdges
      .map((ee) => {
        const elNode = nodes.find((n) => n.id === ee.source);
        if (!elNode?.data?.name) return null;
        const elImageEdges = edges.filter(
          (e) => e.target === elNode.id && e.targetHandle === 'ref-images',
        );
        const imageUrls = elImageEdges
          .map((ie) => {
            const src = nodes.find((n) => n.id === ie.source);
            return (src?.data?.imageUrl || src?.data?.resultUrl) as string | undefined;
          })
          .filter(Boolean) as string[];
        return {
          name: elNode.data.name as string,
          description: (elNode.data.description || '') as string,
          element_input_urls: imageUrls,
        };
      })
      .filter(Boolean) as Array<{
      name: string;
      description: string;
      element_input_urls: string[];
    }>;

    // -- Seedance: multiple reference images --
    const refImagesEdges = inputEdges.filter((e) => e.targetHandle === 'ref-images');
    const refImageDataUrls: string[] = refImagesEdges
      .map((e) => {
        const n = nodes.find((nd) => nd.id === e.source);
        return (n?.data?.imageUrl || n?.data?.resultUrl) as string | undefined;
      })
      .filter(Boolean) as string[];

    // -- Seedance: multiple reference videos --
    const refVideosEdges = inputEdges.filter((e) => e.targetHandle === 'ref-videos');
    const refVideoDataUrls: string[] = refVideosEdges
      .map((e) => {
        const n = nodes.find((nd) => nd.id === e.source);
        return (n?.data?.resultUrl || n?.data?.videoUrl || n?.data?.imageUrl) as string | undefined;
      })
      .filter(Boolean) as string[];

    // -- Seedance: reference audio --
    const refAudioEdges = inputEdges.filter((e) => e.targetHandle === 'ref-audio');
    const refAudioDataUrls: string[] = refAudioEdges
      .map((e) => {
        const n = nodes.find((nd) => nd.id === e.source);
        return (n?.data?.audioUrl || n?.data?.resultUrl) as string | undefined;
      })
      .filter(Boolean) as string[];

    const selectedModel = data.model as string;
    const selectedCaps = getCaps(selectedModel);

    // -- Validations --
    if (!promptText) {
      toast.error('Conecta un nodo de Prompt con texto antes de generar.');
      return;
    }

    if (selectedCaps.requiresReferenceImage && !refImageDataUrl) {
      toast.error('Este modelo requiere una imagen de referencia. Conecta un nodo Image al puerto Image.');
      return;
    }

    if (selectedCaps.supportsReferenceVideo) {
      if (!refImageDataUrl) {
        toast.error('Motion Control requiere una imagen de referencia (ref-image).');
        return;
      }
      if (!refVideoDataUrl) {
        toast.error('Motion Control requiere un video de referencia (ref-video).');
        return;
      }
    }

    setIsGenerating(true);

    // Set output nodes to loading
    setNodes((nds) =>
      nds.map((n) => {
        if (targetNodeIds.includes(n.id) && n.type === 'output') {
          return { ...n, data: { ...n.data, status: 'loading', error: null } };
        }
        return n;
      }),
    );
    setEdges((eds) =>
      eds.map((e) => {
        if (e.source === id && targetNodeIds.includes(e.target)) {
          return { ...e, data: { ...e.data, status: 'processing' } };
        }
        return e;
      }),
    );

    try {
      // -- Upload reference image (shared across all generations) --
      // uploadFile handles blob:, data:, and https: URLs via the server proxy
      let uploadedImageUrl: string | null = null;
      if (refImageDataUrl) {
        uploadedImageUrl = await uploadFile(refImageDataUrl, 'images/studio-dte');
      }

      // -- Upload reference image 2 (last frame, shared) --
      let uploadedImage2Url: string | null = null;
      if (refImage2DataUrl && selectedCaps.supportsSecondImage) {
        uploadedImage2Url = await uploadFile(refImage2DataUrl, 'images/studio-dte');
      }

      // -- Upload reference video (shared across all generations) --
      let uploadedVideoUrl: string | null = null;
      if (refVideoDataUrl && selectedCaps.supportsReferenceVideo) {
        uploadedVideoUrl = await uploadFile(refVideoDataUrl, 'videos/studio-dte');
      }

      // -- Upload Seedance multi reference images --
      const uploadedRefImageUrls: string[] = [];
      if (selectedCaps.supportsReferenceImages && refImageDataUrls.length) {
        for (const url of refImageDataUrls) {
          uploadedRefImageUrls.push(await uploadFile(url, 'images/studio-dte'));
        }
      }

      // -- Upload Seedance multi reference videos --
      const uploadedRefVideoUrls: string[] = [];
      if (selectedCaps.supportsReferenceVideos && refVideoDataUrls.length) {
        for (const url of refVideoDataUrls) {
          uploadedRefVideoUrls.push(await uploadFile(url, 'videos/studio-dte'));
        }
      }

      // -- Upload Seedance reference audio --
      const uploadedRefAudioUrls: string[] = [];
      if (selectedCaps.supportsReferenceAudios && refAudioDataUrls.length) {
        for (const url of refAudioDataUrls) {
          uploadedRefAudioUrls.push(await uploadFile(url, 'audio/studio-dte'));
        }
      }

      // -- Generate one result per connected output node --
      let outputNodeIds = targetNodeIds.filter((tid) => {
        const n = nodes.find((nd) => nd.id === tid);
        return n?.type === 'output';
      });

      // Auto-create an output node if none is connected
      if (outputNodeIds.length === 0) {
        const modelNode = nodes.find((n) => n.id === id);
        const pos = modelNode
          ? { x: modelNode.position.x + 380, y: modelNode.position.y }
          : { x: 1100, y: 300 };

        const autoOutputId = `output-${Date.now()}`;
        setNodes((nds) => [
          ...nds,
          {
            id: autoOutputId,
            type: 'output',
            position: pos,
            data: { status: 'idle', resultUrl: null, resultType: null, taskId: null, provider: null },
          },
        ]);
        setEdges((eds) => [
          ...eds,
          {
            id: `e-${id}-${autoOutputId}`,
            source: id,
            sourceHandle: 'out',
            target: autoOutputId,
            targetHandle: 'in',
            type: 'default',
            animated: true,
            data: { color: 'green' },
          },
        ]);
        outputNodeIds = [autoOutputId];
        targetNodeIds.push(autoOutputId);
        toast('Output creado automáticamente', { icon: '✨' });
      }

      const genCount = Math.max(outputNodeIds.length, 1);

      const resultType = selectedCaps.kind;
      const actualAspectRatio =
        resultType === 'video' && (data.aspectRatio || '1:1') === '1:1'
          ? '16:9'
          : (data.aspectRatio || '1:1');

      const generateOne = async (): Promise<{
        resultUrl: string;
        taskId: string;
        storagePath: string | null;
      }> => {
        if (abortRef.current) throw new Error('Cancelled');

        let resultUrl = '';
        let taskId = '';

        if (selectedCaps.provider === 'veo') {
          const aspectRatio = (data.aspectRatio || '16:9') as string;
          const seed = parseSeed(data.seeds);
          const genType = (data.generationType || 'auto') as string;

          // Build imageUrls — Veo 3.1 supports first+last frame with 2 images
          const veoImageUrls = uploadedImageUrl
            ? (uploadedImage2Url
                ? [uploadedImageUrl, uploadedImage2Url]
                : [uploadedImageUrl])
            : undefined;

          // Auto-select generationType when 2 images are connected
          const resolvedGenType =
            genType !== 'auto'
              ? genType
              : veoImageUrls?.length === 2
              ? 'FIRST_AND_LAST_FRAMES_2_VIDEO'
              : undefined;

          taskId = await createVeoTask({
            prompt: promptText,
            model: selectedModel,
            imageUrls: veoImageUrls,
            aspectRatio: aspectRatio === '1:1' ? '16:9' : aspectRatio,
            seed,
            enableTranslation: data.enableTranslation ?? false,
            enableFallback: data.enableFallback ?? true,
            generationType: resolvedGenType,
          });
          const result = await pollVeoTask(taskId);
          resultUrl = result.urls[0] || '';
        } else {
          const { apiModel, input } = buildMarketInput(
            selectedModel,
            promptText,
            negativePromptText,
            uploadedImageUrl,
            uploadedImage2Url,
            uploadedVideoUrl,
            data,
            {
              multiPrompt: multiPromptData,
              klingElements: klingElementsData.length ? klingElementsData : undefined,
              referenceImageUrls: uploadedRefImageUrls.length ? uploadedRefImageUrls : undefined,
              referenceVideoUrls: uploadedRefVideoUrls.length ? uploadedRefVideoUrls : undefined,
              referenceAudioUrls: uploadedRefAudioUrls.length ? uploadedRefAudioUrls : undefined,
            },
          );
          taskId = await createMarketTask(apiModel, input);
          const result = await pollMarketTask(taskId);
          resultUrl = result.urls[0] || '';
        }

        if (!resultUrl) throw new Error('No se generó ningún resultado');

        let persistedUrl = resultUrl;
        let storagePath: string | null = null;

        try {
          const persisted = await persistMediaUrl(
            resultUrl,
            taskId || `result-${Date.now()}`,
          );
          persistedUrl = persisted.signedUrl;
          storagePath = persisted.storagePath;
        } catch (persistError) {
          console.warn('[model-node] Could not persist output media:', persistError);
        }

        return { resultUrl: persistedUrl, taskId, storagePath };
      };

      // Launch generations with a concurrency cap so connecting many output
      // nodes doesn't fire all API calls (and credit spend) at once.
      const modelLabel =
        MODEL_OPTIONS.flatMap((g) => g.options).find(
          (o) => o.value === selectedModel,
        )?.label ?? selectedModel;

      const results = await runWithConcurrency(
        genCount,
        MAX_CONCURRENT_GENERATIONS,
        async (index) => {
          const jobId = `${id}-${Date.now()}-${index}`;
          useGenerationQueue.getState().addJob({
            id: jobId,
            modelNodeId: id,
            model: selectedModel,
            label: genCount > 1 ? `${modelLabel} #${index + 1}` : modelLabel,
            status: 'running',
            startedAt: Date.now(),
          });
          try {
            const value = await generateOne();
            useGenerationQueue
              .getState()
              .updateJob(jobId, { status: 'done', finishedAt: Date.now() });
            return value;
          } catch (e) {
            useGenerationQueue.getState().updateJob(jobId, {
              status: 'error',
              finishedAt: Date.now(),
              error: e instanceof Error ? e.message : String(e),
            });
            throw e;
          }
        },
      );

      if (abortRef.current) return;

      // Append every successful result to the project generation history.
      results.forEach((r) => {
        if (r.status === 'fulfilled' && r.value.resultUrl) {
          void recordGeneration({
            model: selectedModel,
            prompt: promptText,
            resultUrl: r.value.resultUrl,
            storagePath: r.value.storagePath,
            resultType,
            aspectRatio: actualAspectRatio,
            taskId: r.value.taskId,
            provider: selectedCaps.provider,
          });
        }
      });

      // Update each output node with its own result
      let successCount = 0;
      let failCount = 0;

      setNodes((nds) =>
        nds.map((n) => {
          const idx = outputNodeIds.indexOf(n.id);
          if (idx === -1 || n.type !== 'output') return n;

          const result = results[idx];
          if (result.status === 'fulfilled') {
            successCount++;
            return {
              ...n,
              data: {
                ...n.data,
                status: 'success',
                resultUrl: result.value.resultUrl,
                resultType,
                resultAspectRatio: actualAspectRatio,
                taskId: result.value.taskId,
                provider: selectedCaps.provider,
                storagePath: result.value.storagePath,
              },
            };
          } else {
            failCount++;
            return {
              ...n,
              data: {
                ...n.data,
                status: 'error',
                error: String(result.reason),
              },
            };
          }
        }),
      );

      if (failCount === 0) {
        toast.success(
          genCount > 1
            ? `${genCount} generations complete!`
            : 'Generation complete!',
        );
      } else if (successCount > 0) {
        toast.success(`${successCount}/${genCount} generated, ${failCount} failed`);
      } else {
        toast.error('All generations failed');
      }
    } catch (error) {
      if (abortRef.current) return;
      console.error('Error de generación:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      toast.error(errorMsg.length > 80 ? errorMsg.slice(0, 80) + '...' : errorMsg);
      setNodes((nds) =>
        nds.map((n) => {
          if (targetNodeIds.includes(n.id) && n.type === 'output') {
            return {
              ...n,
              data: { ...n.data, status: 'error', error: String(error) },
            };
          }
          return n;
        }),
      );
    } finally {
      setIsGenerating(false);
      setEdges((eds) =>
        eds.map((e) => {
          if (e.source === id && targetNodeIds.includes(e.target)) {
            return { ...e, data: { ...e.data, status: 'idle' } };
          }
          return e;
        }),
      );
    }
  };

  // -----------------------------------------------------------------------
  // External trigger — lets Output "Retry" and the global "Run All" action
  // start this model's generation by bumping `data.runToken`.
  // -----------------------------------------------------------------------
  const handleGenerateRef = useRef(handleGenerate);
  handleGenerateRef.current = handleGenerate;
  const lastRunTokenRef = useRef(data.runToken);

  useEffect(() => {
    if (data.runToken && data.runToken !== lastRunTokenRef.current) {
      lastRunTokenRef.current = data.runToken;
      void handleGenerateRef.current();
    }
  }, [data.runToken]);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <BaseNode id={id} title="AI Model" className="w-80 p-4">
      <div className="flex flex-col gap-4">
        {/* ---------- Input Ports ---------- */}
        <div className="flex flex-col gap-2 relative -ml-4">
          <Port type="target" id="prompt" color="pink" label="Prompt" />
          {caps.supportsNegativePrompt && (
            <Port type="target" id="negative-prompt" color="pink" label="Neg. Prompt" />
          )}
          {caps.supportsReferenceImage && (
            <Port
              type="target"
              id="ref-image"
              color="green"
              label={caps.supportsSecondImage ? '1st Frame' : 'Image'}
            />
          )}
          {caps.supportsSecondImage && (
            <Port type="target" id="ref-image-2" color="green" label="Last Frame" />
          )}
          {caps.supportsReferenceImages && (
            <Port type="target" id="ref-images" color="green" label="Ref Images ×9" />
          )}
          {caps.supportsReferenceVideo && (
            <Port type="target" id="ref-video" color="green" label="Video" />
          )}
          {caps.supportsReferenceVideos && (
            <Port type="target" id="ref-videos" color="green" label="Ref Videos ×3" />
          )}
          {caps.supportsReferenceAudios && (
            <Port type="target" id="ref-audio" color="pink" label="Ref Audio ×3" />
          )}
          {caps.supportsMultiPrompt && (
            <Port type="target" id="multi-prompt" color="pink" label="Multi Prompt" />
          )}
          {caps.supportsKlingElements && (
            <Port type="target" id="elements" color="green" label="Elements" />
          )}
        </div>

        {/* ---------- Reference Image Tokens ---------- */}
        {connectedRefImages.length > 0 && (
          <div className="flex flex-col gap-2 px-0.5">
            <FieldLabel>Referencias en prompt</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {connectedRefImages.map((ref, i) => (
                <button
                  key={i}
                  type="button"
                  title={`Copiar token: ${ref.token}`}
                  onClick={() => {
                    navigator.clipboard.writeText(ref.token);
                    toast.success(`Copiado: ${ref.token}`, { duration: 1500 });
                  }}
                  className="nodrag group relative flex flex-col items-center gap-1 focus:outline-none"
                >
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-white/10 bg-white/5 group-hover:border-[#0A84FF]/60 transition-colors">
                    {ref.imageUrl ? (
                      <img
                        src={ref.imageUrl}
                        alt={ref.label}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon size={18} className="text-white/20" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Copy size={14} className="text-white" />
                    </div>
                  </div>
                  <span className="text-[9px] font-mono text-white/40 group-hover:text-[#0A84FF] transition-colors max-w-[56px] truncate">
                    {ref.token}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-[9px] text-white/25 leading-snug">
              Click para copiar token → pégalo en tu prompt
            </p>
          </div>
        )}

        <div className="w-full h-px bg-white/10" />

        {/* ---------- Model Selector ---------- */}
        <div className="flex flex-col gap-2">
          <FieldLabel>Model</FieldLabel>
          <MultiUseSelect
            value={data.model}
            onChange={(val) => {
              const v = val as string;
              const newCaps = getCaps(v);
              const patch: Record<string, any> = { model: v, modelType: newCaps.kind };

              // Reset aspect ratio when switching model families to avoid stale values
              if (v === 'bytedance/seedance-1.5-pro') {
                patch.aspectRatio = '16:9';
                patch.resolution = '720p';
                patch.duration = '8';
              } else if (v.startsWith('bytedance/')) {
                patch.aspectRatio = '16:9';
                patch.resolution = '720p';
              } else if (v === 'gpt-image-2-text-to-image') {
                patch.aspectRatio = 'auto';
                patch.resolution = '1K';
              } else if (newCaps.kind === 'image') {
                patch.aspectRatio = '1:1';
              } else {
                patch.aspectRatio = '16:9';
              }

              if (v === 'kling-2.6/motion-control') {
                patch.mode = '720p';
              } else if (data.model === 'kling-2.6/motion-control') {
                patch.mode = 'std';
              }
              if (newCaps.supportsCharacterOrientation) {
                patch.characterOrientation = 'video';
              }
              if (newCaps.supportsUploadMethod) {
                patch.uploadMethod = 's3';
              }
              set(patch);
            }}
            options={MODEL_OPTIONS}
          />
        </div>

        {/* ---------- Credit Cost Badge ---------- */}
        {data.model && MODEL_CREDITS[data.model] && (
          <div className="flex items-center gap-1.5 -mt-1">
            <span className="text-[10px] text-white/30 uppercase tracking-widest">Costo</span>
            <span className="rounded-full bg-[#0A84FF]/15 border border-[#0A84FF]/25 px-2.5 py-0.5 text-[11px] text-[#0A84FF] font-medium tabular-nums">
              ~{MODEL_CREDITS[data.model]}
            </span>
          </div>
        )}

        {/* ---------- Basic Controls ---------- */}
        <div className="grid grid-cols-2 gap-4 mt-1">
          {/* Aspect Ratio / Image Size */}
          {caps.supportsAspectRatio && (
            <div className="flex flex-col gap-2">
              <FieldLabel>Proporción</FieldLabel>
              <MultiUseSelect
                value={data.aspectRatio || '1:1'}
                onChange={(val) => set({ aspectRatio: val as string })}
                options={
                  caps.kind === 'image'
                    ? data.model === 'gpt-image-2-text-to-image'
                      ? [
                          { label: 'Auto', value: 'auto' },
                          { label: '1:1', value: '1:1' },
                          { label: '16:9', value: '16:9' },
                          { label: '9:16', value: '9:16' },
                          { label: '4:3', value: '4:3' },
                          { label: '3:4', value: '3:4' },
                        ]
                      : [
                          { label: '1:1', value: '1:1' },
                          { label: '16:9', value: '16:9' },
                          { label: '9:16', value: '9:16' },
                        ]
                    : data.model === 'bytedance/seedance-2' || data.model === 'bytedance/seedance-2-fast'
                    ? [
                        { label: '16:9', value: '16:9' },
                        { label: '9:16', value: '9:16' },
                        { label: '1:1', value: '1:1' },
                        { label: '4:3', value: '4:3' },
                        { label: '3:4', value: '3:4' },
                        { label: '21:9', value: '21:9' },
                        { label: 'Adaptive', value: 'adaptive' },
                      ]
                    : data.model === 'bytedance/seedance-1.5-pro'
                    ? [
                        { label: '16:9', value: '16:9' },
                        { label: '9:16', value: '9:16' },
                        { label: '1:1', value: '1:1' },
                        { label: '4:3', value: '4:3' },
                        { label: '3:4', value: '3:4' },
                        { label: '21:9', value: '21:9' },
                      ]
                    : [
                        { label: '16:9', value: '16:9' },
                        { label: '9:16', value: '9:16' },
                        ...(data.model?.startsWith('kling-')
                          ? [{ label: '1:1', value: '1:1' }]
                          : []),
                      ]
                }
              />
            </div>
          )}

          {/* Resolution */}
          {caps.supportsResolution && (
            <div className="flex flex-col gap-2">
              <FieldLabel>Calidad</FieldLabel>
              <MultiUseSelect
                value={
                  data.model?.startsWith('bytedance/')
                    ? (data.resolution || '720p')
                    : (data.resolution || '1K')
                }
                onChange={(val) => set({ resolution: val as string })}
                options={
                  data.model?.startsWith('bytedance/')
                    ? [
                        { label: '480p — Fast', value: '480p' },
                        { label: '720p — Balance', value: '720p' },
                        { label: '1080p — HQ', value: '1080p' },
                      ]
                    : data.model === 'gpt-image-2-text-to-image'
                    ? [
                        { label: '1K', value: '1K' },
                        { label: '2K', value: '2K' },
                        { label: '4K (no 1:1)', value: '4K' },
                      ]
                    : [
                        { label: '512px', value: '512px' },
                        { label: '1K', value: '1K' },
                        { label: '2K', value: '2K' },
                        { label: '4K', value: '4K' },
                      ]
                }
              />
            </div>
          )}

          {/* Output Format */}
          {caps.supportsOutputFormat && (
            <div className="flex flex-col gap-2">
              <FieldLabel>Formato</FieldLabel>
              <MultiUseSelect
                value={data.outputFormat || 'png'}
                onChange={(val) => set({ outputFormat: val as string })}
                options={[
                  { label: 'PNG', value: 'png' },
                  { label: 'JPG', value: 'jpg' },
                ]}
              />
            </div>
          )}

          {/* Duration (Kling video, not motion-control) */}
          {caps.supportsDuration && (
            <div className="flex flex-col gap-2">
              <FieldLabel>Duración</FieldLabel>
              <MultiUseSelect
                value={data.duration || '5'}
                onChange={(val) => set({ duration: val as string })}
                options={
                  data.model === 'bytedance/seedance-1.5-pro'
                    ? [
                        { label: '4s', value: '4' },
                        { label: '8s', value: '8' },
                        { label: '12s', value: '12' },
                      ]
                    : data.model?.startsWith('kling-3.0')
                    ? [
                        { label: '3s', value: '3' },
                        { label: '5s', value: '5' },
                        { label: '10s', value: '10' },
                        { label: '15s', value: '15' },
                      ]
                    : data.model === 'bytedance/seedance-2' || data.model === 'bytedance/seedance-2-fast'
                    ? [
                        { label: '4s', value: '4' },
                        { label: '5s', value: '5' },
                        { label: '8s', value: '8' },
                        { label: '10s', value: '10' },
                        { label: '12s', value: '12' },
                        { label: '15s', value: '15' },
                      ]
                    : [
                        { label: '5s', value: '5' },
                        { label: '10s', value: '10' },
                      ]
                }
              />
            </div>
          )}

          {/* Mode (Kling 3.0 video + all motion-control) */}
          {caps.supportsMode && (
            <div className="flex flex-col gap-2">
              <FieldLabel>Modo</FieldLabel>
              <MultiUseSelect
                value={data.mode || (data.model === 'kling-2.6/motion-control' ? '720p' : 'std')}
                onChange={(val) => set({ mode: val as string })}
                options={
                  data.model === 'kling-2.6/motion-control'
                    ? [
                        { label: '720p', value: '720p' },
                        { label: '1080p', value: '1080p' },
                      ]
                    : [
                        { label: 'Standard', value: 'std' },
                        { label: 'Pro', value: 'pro' },
                      ]
                }
              />
            </div>
          )}

          {/* Character Orientation (motion-control) */}
          {caps.supportsCharacterOrientation && (
            <div className="flex flex-col gap-2">
              <FieldLabel>Orientación</FieldLabel>
              <MultiUseSelect
                value={data.characterOrientation || 'video'}
                onChange={(val) =>
                  set({ characterOrientation: val as string })
                }
                options={[
                  { label: 'Video', value: 'video' },
                  { label: 'Image', value: 'image' },
                ]}
              />
            </div>
          )}
        </div>

        {/* Toggle rows (basic) */}
        <div className="flex flex-col gap-3">
          {caps.supportsGoogleSearch && (
            <ToggleRow
              label="Google Search"
              value={!!data.googleSearch}
              onChange={(v) => set({ googleSearch: v })}
            />
          )}
          {caps.supportsSound && (
            <ToggleRow
              label="Sound"
              value={!!data.sound}
              onChange={(v) => set({ sound: v })}
            />
          )}
          {caps.supportsFixedLens && (
            <ToggleRow
              label="Fixed Lens (cámara estática)"
              value={!!data.fixedLens}
              onChange={(v) => set({ fixedLens: v })}
            />
          )}
        </div>

        {/* ---------- Advanced Controls ---------- */}
        {hasAdvanced && (
          <>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="nodrag w-full flex items-center gap-2 text-[11px] text-white/40 hover:text-white/60 uppercase tracking-widest font-semibold transition-colors mt-1"
            >
              <span className="flex-1 h-px bg-white/10" />
              Advanced
              <ChevronDown
                size={12}
                className={cn(
                  'transition-transform duration-200',
                  showAdvanced && 'rotate-180',
                )}
              />
              <span className="flex-1 h-px bg-white/10" />
            </button>

            {showAdvanced && (
              <div className="flex flex-col gap-3">
                {/* -- Veo-specific -- */}
                {caps.provider === 'veo' && (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <FieldLabel>Generation Type</FieldLabel>
                      <MultiUseSelect
                        value={data.generationType || 'auto'}
                        onChange={(val) =>
                          set({ generationType: val as string })
                        }
                        options={[
                          { label: 'Auto', value: 'auto' },
                          { label: 'Text to Video', value: 'TEXT_2_VIDEO' },
                          {
                            label: 'First/Last Frames',
                            value: 'FIRST_AND_LAST_FRAMES_2_VIDEO',
                          },
                          {
                            label: 'Reference to Video (Fast)',
                            value: 'REFERENCE_2_VIDEO',
                          },
                        ]}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <FieldLabel>Seed</FieldLabel>
                      <SmallInput
                        value={data.seeds || ''}
                        onChange={(v) => set({ seeds: v })}
                        placeholder="e.g. 42"
                      />
                    </div>
                    <ToggleRow
                      label="Translation"
                      value={!!data.enableTranslation}
                      onChange={(v) => set({ enableTranslation: v })}
                    />
                    <ToggleRow
                      label="Fallback"
                      value={data.enableFallback ?? true}
                      onChange={(v) => set({ enableFallback: v })}
                    />
                  </>
                )}

                {/* -- Sora-2 specific -- */}
                {caps.supportsFrameCount && (
                  <div className="flex flex-col gap-1.5">
                    <FieldLabel>N Frames</FieldLabel>
                    <MultiUseSelect
                      value={data.nFrames || '10'}
                      onChange={(val) => set({ nFrames: val as string })}
                      options={[
                        { label: '10 frames (~5s)', value: '10' },
                        { label: '15 frames (~8s)', value: '15' },
                      ]}
                    />
                  </div>
                )}
                {caps.supportsRemoveWatermark && (
                  <ToggleRow
                    label="Remove Watermark"
                    value={!!data.removeWatermark}
                    onChange={(v) => set({ removeWatermark: v })}
                  />
                )}
                {caps.supportsUploadMethod && (
                  <div className="flex flex-col gap-1.5">
                    <FieldLabel>Upload Method</FieldLabel>
                    <MultiUseSelect
                      value={data.uploadMethod || 's3'}
                      onChange={(val) => set({ uploadMethod: val as string })}
                      options={[
                        { label: 'S3', value: 's3' },
                      ]}
                    />
                  </div>
                )}
                {caps.supportsCharacterIds && (
                  <div className="flex flex-col gap-1.5">
                    <FieldLabel>Character IDs (CSV)</FieldLabel>
                    <SmallInput
                      value={data.characterIdList || ''}
                      onChange={(v) => set({ characterIdList: v })}
                      placeholder="id1, id2"
                    />
                  </div>
                )}

                {/* -- Kling motion-control: background source (3.0 only) -- */}
                {caps.supportsBackgroundSource && (
                  <div className="flex flex-col gap-1.5">
                    <FieldLabel>Background Source</FieldLabel>
                    <MultiUseSelect
                      value={data.backgroundSource || 'input_video'}
                      onChange={(val) => set({ backgroundSource: val as string })}
                      options={[
                        { label: 'Input Video', value: 'input_video' },
                        { label: 'Input Image', value: 'input_image' },
                      ]}
                    />
                  </div>
                )}

                {/* -- Seedance: NSFW filter -- */}
                {caps.supportsNsfwChecker && (
                  <ToggleRow
                    label="NSFW Filter"
                    value={!!data.nsfwChecker}
                    onChange={(v) => set({ nsfwChecker: v })}
                  />
                )}

              </div>
            )}
          </>
        )}

        {/* ---------- Generate / Cancel ---------- */}
        {isGenerating ? (
          <button
            onClick={handleCancel}
            className="w-full mt-2 py-3.5 bg-[#FF3B30] hover:bg-[#FF2D20] text-white text-[15px] font-semibold rounded-[14px] shadow-[0_0_20px_rgba(255,59,48,0.3)] hover:shadow-[0_0_25px_rgba(255,59,48,0.5)] transition-all duration-300 flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <Square size={16} className="fill-white" /> Cancel
          </button>
        ) : (
          <button
            onClick={handleGenerate}
            className="w-full mt-2 py-3.5 bg-[#0A84FF] hover:bg-[#007AFF] text-white text-[15px] font-semibold rounded-[14px] shadow-[0_0_20px_rgba(10,132,255,0.3)] hover:shadow-[0_0_25px_rgba(10,132,255,0.5)] transition-all duration-300 flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <Play size={16} className="fill-white" /> Generate
          </button>
        )}
      </div>

      {/* ---------- Output Port ---------- */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2">
        <Port
          type="source"
          id="out"
          color="green"
          icon={
            isVideo ? <VideoIcon size={14} /> : <ImageIcon size={14} />
          }
        />
      </div>
    </BaseNode>
  );
}
