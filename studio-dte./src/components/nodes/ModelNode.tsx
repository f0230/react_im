import { useState } from 'react';
import {
  Play,
  Type,
  Image as ImageIcon,
  Video as VideoIcon,
  ChevronDown,
} from 'lucide-react';
import { useReactFlow } from '@xyflow/react';
import BaseNode, { cn } from './BaseNode';
import { Port } from './Port';
import MultiUseSelect from '../MultiUseSelect';
import {
  uploadImage,
  createMarketTask,
  pollMarketTask,
  createVeoTask,
  pollVeoTask,
} from '../../lib/kie';

// ---------------------------------------------------------------------------
// Model capabilities registry
// ---------------------------------------------------------------------------
interface ModelCaps {
  kind: 'image' | 'video';
  provider: 'market' | 'veo';
  supportsReferenceImage?: boolean;
  supportsReferenceVideo?: boolean;
  supportsAspectRatio?: boolean;
  supportsResolution?: boolean;
  supportsOutputFormat?: boolean;
  supportsGoogleSearch?: boolean;
  supportsDuration?: boolean;
  supportsSound?: boolean;
  supportsMode?: boolean;
  supportsSeeds?: boolean;
  supportsCallbacks?: boolean;
  supportsTranslation?: boolean;
  supportsFallback?: boolean;
  supportsFrameCount?: boolean;
  supportsRemoveWatermark?: boolean;
  supportsUploadMethod?: boolean;
  supportsCharacterIds?: boolean;
  supportsMultiPrompt?: boolean;
  supportsKlingElements?: boolean;
}

const MODEL_CAPS: Record<string, ModelCaps> = {
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
  'kling-2.6': {
    kind: 'video',
    provider: 'market',
    supportsReferenceImage: true,
    supportsAspectRatio: true,
    supportsDuration: true,
    supportsSound: true,
    supportsCallbacks: true,
  },
  'kling-3.0': {
    kind: 'video',
    provider: 'market',
    supportsReferenceImage: true,
    supportsAspectRatio: true,
    supportsDuration: true,
    supportsSound: true,
    supportsMode: true,
    supportsMultiPrompt: true,
    supportsKlingElements: true,
    supportsCallbacks: true,
  },
  'sora-2': {
    kind: 'video',
    provider: 'market',
    supportsReferenceImage: true,
    supportsAspectRatio: true,
    supportsFrameCount: true,
    supportsRemoveWatermark: true,
    supportsUploadMethod: true,
    supportsCharacterIds: true,
    supportsCallbacks: true,
  },
  veo3: {
    kind: 'video',
    provider: 'veo',
    supportsReferenceImage: true,
    supportsAspectRatio: true,
    supportsSeeds: true,
    supportsCallbacks: true,
    supportsTranslation: true,
    supportsFallback: true,
  },
  veo3_fast: {
    kind: 'video',
    provider: 'veo',
    supportsReferenceImage: true,
    supportsAspectRatio: true,
    supportsSeeds: true,
    supportsCallbacks: true,
    supportsTranslation: true,
    supportsFallback: true,
  },
};

function getCaps(model: string): ModelCaps {
  return MODEL_CAPS[model] ?? { kind: 'image', provider: 'market' };
}

const MODEL_OPTIONS = [
  {
    label: 'Image Models',
    options: [
      { label: 'Nano Banana', value: 'google/nano-banana' },
      { label: 'Nano Banana Edit', value: 'google/nano-banana-edit' },
      { label: 'Nano Banana 2', value: 'nano-banana-2' },
      { label: 'Nano Banana Pro', value: 'nano-banana-pro' },
    ],
  },
  {
    label: 'Video Models',
    options: [
      { label: 'Kling 2.6', value: 'kling-2.6' },
      { label: 'Kling 3.0', value: 'kling-3.0' },
      { label: 'Sora 2', value: 'sora-2' },
      { label: 'Veo 3', value: 'veo3' },
      { label: 'Veo 3 Fast', value: 'veo3_fast' },
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

function parseSeeds(val: string | undefined): number[] {
  if (!val) return [];
  return val
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => !isNaN(n) && isFinite(n));
}

function parseJsonSafe(val: string | undefined): unknown | undefined {
  if (!val || !val.trim()) return undefined;
  try {
    return JSON.parse(val);
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// Build Market request input per model
// ---------------------------------------------------------------------------
function buildMarketInput(
  model: string,
  prompt: string,
  imageUrl: string | null,
  data: Record<string, any>,
): { apiModel: string; input: Record<string, any> } {
  const aspectRatio = (data.aspectRatio || '1:1') as string;
  const resolution = (data.resolution || '1K') as string;
  const outputFormat = (data.outputFormat || 'png') as string;
  const duration = (data.duration || '5') as string;
  const sound = !!data.sound;
  const mode = (data.mode || 'std') as string;
  const googleSearch = !!data.googleSearch;
  const nFrames = data.nFrames ? Number(data.nFrames) : undefined;
  const removeWatermark = !!data.removeWatermark;
  const uploadMethod = (data.uploadMethod || 'url') as string;

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

    /* ---- Kling ---- */
    case 'kling-2.6':
      if (imageUrl) {
        return {
          apiModel: 'kling-2.6/image-to-video',
          input: { prompt, image_urls: [imageUrl], sound, duration },
        };
      }
      return {
        apiModel: 'kling-2.6/text-to-video',
        input: { prompt, sound, aspect_ratio: aspectRatio, duration },
      };

    case 'kling-3.0': {
      const input: Record<string, any> = {
        prompt,
        sound,
        duration,
        aspect_ratio: aspectRatio,
        mode,
      };
      if (imageUrl) input.image_urls = [imageUrl];

      const multiPrompt = parseJsonSafe(data.multiPrompt);
      if (multiPrompt) input.multi_prompt = multiPrompt;
      const multiShots = parseJsonSafe(data.multiShots);
      if (multiShots) input.multi_shots = multiShots;
      const klingElements = parseJsonSafe(data.klingElements);
      if (klingElements) input.kling_elements = klingElements;

      return { apiModel: 'kling-3.0/video', input };
    }

    /* ---- Sora 2 ---- */
    case 'sora-2': {
      const input: Record<string, any> = {
        prompt,
        aspect_ratio: aspectRatio,
        remove_watermark: removeWatermark,
        upload_method: uploadMethod,
      };
      if (nFrames) input.n_frames = nFrames;

      const charIds = parseCsv(data.characterIdList);
      if (charIds.length) input.character_id_list = charIds;

      if (imageUrl) {
        input.image_urls = [imageUrl];
        return { apiModel: 'sora-2-image-to-video', input };
      }
      return { apiModel: 'sora-2-text-to-video', input };
    }

    default:
      throw new Error(`Unknown market model: ${model}`);
  }
}

// ---------------------------------------------------------------------------
// Tiny UI primitives (node-scoped, match dark theme)
// ---------------------------------------------------------------------------
function Toggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={cn(
        'nodrag relative w-8 h-[18px] rounded-full transition-colors duration-200 shrink-0',
        value ? 'bg-[#0A84FF]' : 'bg-white/15',
      )}
    >
      <span
        className={cn(
          'absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow transition-transform duration-200',
          value ? 'translate-x-[16px]' : 'translate-x-[2px]',
        )}
      />
    </button>
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
// Component
// ---------------------------------------------------------------------------
export default function ModelNode({ id, data }: { id: string; data: any }) {
  const { updateNodeData, getNodes, getEdges, setNodes, setEdges } =
    useReactFlow();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const caps = getCaps(data.model);
  const isVideo = caps.kind === 'video';

  const hasAdvanced =
    caps.supportsCallbacks ||
    caps.supportsSeeds ||
    caps.supportsTranslation ||
    caps.supportsFallback ||
    caps.supportsFrameCount ||
    caps.supportsRemoveWatermark ||
    caps.supportsUploadMethod ||
    caps.supportsCharacterIds ||
    caps.supportsMultiPrompt ||
    caps.supportsKlingElements ||
    caps.provider === 'veo'; // generationType

  // Shorthand updater
  const set = (patch: Record<string, any>) => updateNodeData(id, patch);

  // -----------------------------------------------------------------------
  // Generate handler
  // -----------------------------------------------------------------------
  const handleGenerate = async () => {
    const nodes = getNodes();
    const edges = getEdges();

    const connectedEdges = edges.filter((e) => e.source === id);
    const targetNodeIds = connectedEdges.map((e) => e.target);

    const inputEdges = edges.filter((e) => e.target === id);

    const promptEdge = inputEdges.find((e) => e.targetHandle === 'prompt');
    const promptNode = promptEdge
      ? nodes.find((n) => n.id === promptEdge.source)
      : null;
    const promptText = (promptNode?.data?.enhancedText ||
      promptNode?.data?.text ||
      '') as string;

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

    if (!promptText) {
      alert('Por favor, conecta un nodo de Prompt con texto antes de generar.');
      return;
    }

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
      // Convert remote URL ref images to base64
      if (refImageDataUrl && refImageDataUrl.startsWith('http')) {
        try {
          const response = await fetch(refImageDataUrl);
          const blob = await response.blob();
          const reader = new FileReader();
          refImageDataUrl = await new Promise<string>((resolve) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        } catch (e) {
          console.error('Error fetching reference image:', e);
        }
      }

      // Upload ref image to KIE
      let uploadedImageUrl: string | null = null;
      if (refImageDataUrl) {
        uploadedImageUrl = await uploadImage(refImageDataUrl);
      }

      let resultUrl = '';
      const selectedModel = data.model as string;
      const selectedCaps = getCaps(selectedModel);

      if (selectedCaps.provider === 'veo') {
        // ---- Veo dedicated API ----
        const aspectRatio = (data.aspectRatio || '16:9') as string;
        const seeds = parseSeeds(data.seeds);
        const genType = (data.generationType || 'auto') as string;

        const taskId = await createVeoTask({
          prompt: promptText,
          model: selectedModel,
          imageUrls: uploadedImageUrl ? [uploadedImageUrl] : undefined,
          aspectRatio: aspectRatio === '1:1' ? '16:9' : aspectRatio,
          seeds: seeds.length ? seeds : undefined,
          enableTranslation: data.enableTranslation ?? false,
          enableFallback: data.enableFallback ?? true,
          generationType:
            genType !== 'auto' ? genType : undefined,
          callBackUrl: data.callBackUrl || undefined,
        });
        const result = await pollVeoTask(taskId);
        resultUrl = result.urls[0] || '';
      } else {
        // ---- Market API ----
        const { apiModel, input } = buildMarketInput(
          selectedModel,
          promptText,
          uploadedImageUrl,
          data,
        );
        const taskId = await createMarketTask(apiModel, input, {
          callBackUrl: data.callBackUrl || undefined,
          progressCallBackUrl: data.progressCallBackUrl || undefined,
        });
        const result = await pollMarketTask(taskId);
        resultUrl = result.urls[0] || '';
      }

      if (!resultUrl) throw new Error('No se generó ningún resultado');

      const resultType = selectedCaps.kind;
      const actualAspectRatio =
        resultType === 'video' && (data.aspectRatio || '1:1') === '1:1'
          ? '16:9'
          : (data.aspectRatio || '1:1');

      setNodes((nds) =>
        nds.map((n) => {
          if (targetNodeIds.includes(n.id) && n.type === 'output') {
            return {
              ...n,
              data: {
                ...n.data,
                status: 'success',
                resultUrl,
                resultType,
                resultAspectRatio: actualAspectRatio,
              },
            };
          }
          return n;
        }),
      );
    } catch (error) {
      console.error('Error de generación:', error);
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
  // Render
  // -----------------------------------------------------------------------
  return (
    <BaseNode id={id} title="AI Model" className="w-80 p-4">
      <div className="flex flex-col gap-4">
        {/* ---------- Input Ports ---------- */}
        <div className="flex flex-col gap-2 relative -ml-4">
          <Port type="target" id="prompt" color="pink" icon={<Type size={14} />} />
          <Port
            type="target"
            id="ref-image"
            color="green"
            icon={<ImageIcon size={14} />}
          />
          {isVideo && (
            <Port
              type="target"
              id="ref-video"
              color="green"
              icon={<VideoIcon size={14} />}
            />
          )}
        </div>

        <div className="w-full h-px bg-white/10" />

        {/* ---------- Model Selector ---------- */}
        <div className="flex flex-col gap-2">
          <FieldLabel>Model</FieldLabel>
          <MultiUseSelect
            value={data.model}
            onChange={(val) => {
              const v = val as string;
              const newCaps = getCaps(v);
              set({ model: v, modelType: newCaps.kind });
            }}
            options={MODEL_OPTIONS}
          />
        </div>

        {/* ---------- Basic Controls ---------- */}
        <div className="grid grid-cols-2 gap-4 mt-1">
          {/* Aspect Ratio / Image Size — virtually all models */}
          {caps.supportsAspectRatio && (
            <div className="flex flex-col gap-2">
              <FieldLabel>
                {caps.kind === 'image' ? 'Proporción' : 'Proporción'}
              </FieldLabel>
              <MultiUseSelect
                value={data.aspectRatio || '1:1'}
                onChange={(val) => set({ aspectRatio: val as string })}
                options={
                  caps.kind === 'image'
                    ? [
                        { label: '1:1', value: '1:1' },
                        { label: '16:9', value: '16:9' },
                        { label: '9:16', value: '9:16' },
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
                value={data.resolution || '1K'}
                onChange={(val) => set({ resolution: val as string })}
                options={[
                  { label: '512px', value: '512px' },
                  { label: '1K', value: '1K' },
                  { label: '2K', value: '2K' },
                  { label: '4K', value: '4K' },
                ]}
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

          {/* Duration (Kling) */}
          {caps.supportsDuration && (
            <div className="flex flex-col gap-2">
              <FieldLabel>Duración</FieldLabel>
              <MultiUseSelect
                value={data.duration || '5'}
                onChange={(val) => set({ duration: val as string })}
                options={
                  data.model === 'kling-3.0'
                    ? [
                        { label: '3s', value: '3' },
                        { label: '5s', value: '5' },
                        { label: '10s', value: '10' },
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

          {/* Mode (Kling 3.0) */}
          {caps.supportsMode && (
            <div className="flex flex-col gap-2">
              <FieldLabel>Modo</FieldLabel>
              <MultiUseSelect
                value={data.mode || 'std'}
                onChange={(val) => set({ mode: val as string })}
                options={[
                  { label: 'Standard', value: 'std' },
                  { label: 'Pro', value: 'pro' },
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
                            label: 'Reference to Video',
                            value: 'REFERENCE_2_VIDEO',
                          },
                        ]}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <FieldLabel>Seeds (comma-separated)</FieldLabel>
                      <SmallInput
                        value={data.seeds || ''}
                        onChange={(v) => set({ seeds: v })}
                        placeholder="e.g. 42, 123"
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
                    <SmallInput
                      value={data.nFrames || ''}
                      onChange={(v) => set({ nFrames: v })}
                      placeholder="e.g. 48"
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
                      value={data.uploadMethod || 'url'}
                      onChange={(val) => set({ uploadMethod: val as string })}
                      options={[
                        { label: 'URL', value: 'url' },
                        { label: 'Base64', value: 'base64' },
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

                {/* -- Kling 3.0 specific -- */}
                {caps.supportsMultiPrompt && (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <FieldLabel>Multi Prompt (JSON)</FieldLabel>
                      <SmallInput
                        value={data.multiPrompt || ''}
                        onChange={(v) => set({ multiPrompt: v })}
                        placeholder='[{"prompt":"..."}]'
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <FieldLabel>Multi Shots (JSON)</FieldLabel>
                      <SmallInput
                        value={data.multiShots || ''}
                        onChange={(v) => set({ multiShots: v })}
                        placeholder='[{"shot":"..."}]'
                      />
                    </div>
                  </>
                )}
                {caps.supportsKlingElements && (
                  <div className="flex flex-col gap-1.5">
                    <FieldLabel>Kling Elements (JSON)</FieldLabel>
                    <SmallInput
                      value={data.klingElements || ''}
                      onChange={(v) => set({ klingElements: v })}
                      placeholder='[{"element":"..."}]'
                    />
                  </div>
                )}

                {/* -- Callbacks (shared) -- */}
                {caps.supportsCallbacks && (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <FieldLabel>Callback URL</FieldLabel>
                      <SmallInput
                        value={data.callBackUrl || ''}
                        onChange={(v) => set({ callBackUrl: v })}
                        placeholder="https://..."
                      />
                    </div>
                    {caps.provider === 'market' && (
                      <div className="flex flex-col gap-1.5">
                        <FieldLabel>Progress Callback URL</FieldLabel>
                        <SmallInput
                          value={data.progressCallBackUrl || ''}
                          onChange={(v) => set({ progressCallBackUrl: v })}
                          placeholder="https://..."
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}

        {/* ---------- Generate ---------- */}
        <button
          onClick={handleGenerate}
          className="w-full mt-2 py-3.5 bg-[#0A84FF] hover:bg-[#007AFF] text-white text-[15px] font-semibold rounded-[14px] shadow-[0_0_20px_rgba(10,132,255,0.3)] hover:shadow-[0_0_25px_rgba(10,132,255,0.5)] transition-all duration-300 flex items-center justify-center gap-2 active:scale-[0.98]"
        >
          <Play size={16} className="fill-white" /> Generate
        </button>
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
