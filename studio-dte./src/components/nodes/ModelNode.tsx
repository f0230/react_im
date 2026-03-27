import { Play, Type, Image as ImageIcon, Video as VideoIcon } from 'lucide-react';
import { useReactFlow } from '@xyflow/react';
import BaseNode from './BaseNode';
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
// Model registry
// ---------------------------------------------------------------------------
const IMAGE_MODELS = [
  'google/nano-banana',
  'google/nano-banana-edit',
  'nano-banana-2',
  'nano-banana-pro',
];

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

function isImageModel(model: string) {
  return IMAGE_MODELS.includes(model);
}

function isVeoModel(model: string) {
  return model === 'veo3' || model === 'veo3_fast';
}

/** Models that support a separate resolution/quality setting */
function supportsResolution(model: string) {
  return model === 'nano-banana-2' || model === 'nano-banana-pro';
}

/** Models that support a duration setting */
function supportsDuration(model: string) {
  return model.startsWith('kling-');
}

// ---------------------------------------------------------------------------
// Build the correct request body for each model
// ---------------------------------------------------------------------------
function buildMarketInput(
  model: string,
  prompt: string,
  imageUrl: string | null,
  aspectRatio: string,
  resolution: string,
  duration: string,
): { apiModel: string; input: Record<string, any> } {
  switch (model) {
    // --- Google Nano Banana family ---
    case 'google/nano-banana':
      return {
        apiModel: 'google/nano-banana',
        input: { prompt, output_format: 'png', image_size: aspectRatio },
      };

    case 'google/nano-banana-edit':
      return {
        apiModel: 'google/nano-banana-edit',
        input: {
          prompt,
          image_urls: imageUrl ? [imageUrl] : [],
          output_format: 'png',
          image_size: aspectRatio,
        },
      };

    case 'nano-banana-2':
      return {
        apiModel: 'nano-banana-2',
        input: {
          prompt,
          aspect_ratio: aspectRatio,
          resolution,
          output_format: 'jpg',
          google_search: false,
          image_input: imageUrl ? [imageUrl] : [],
        },
      };

    case 'nano-banana-pro':
      return {
        apiModel: 'nano-banana-pro',
        input: {
          prompt,
          image_input: imageUrl ? [imageUrl] : [],
          aspect_ratio: aspectRatio,
          resolution,
          output_format: 'png',
        },
      };

    // --- Kling ---
    case 'kling-2.6':
      if (imageUrl) {
        return {
          apiModel: 'kling-2.6/image-to-video',
          input: { prompt, image_urls: [imageUrl], sound: false, duration },
        };
      }
      return {
        apiModel: 'kling-2.6/text-to-video',
        input: { prompt, sound: false, aspect_ratio: aspectRatio, duration },
      };

    case 'kling-3.0':
      return {
        apiModel: 'kling-3.0/video',
        input: {
          prompt,
          ...(imageUrl ? { image_urls: [imageUrl] } : {}),
          sound: false,
          duration,
          aspect_ratio: aspectRatio,
          mode: 'std',
        },
      };

    // --- Sora 2 ---
    case 'sora-2':
      if (imageUrl) {
        return {
          apiModel: 'sora-2-image-to-video',
          input: { prompt, image_urls: [imageUrl], aspect_ratio: aspectRatio },
        };
      }
      return {
        apiModel: 'sora-2-text-to-video',
        input: { prompt, aspect_ratio: aspectRatio },
      };

    default:
      throw new Error(`Unknown market model: ${model}`);
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function ModelNode({ id, data }: { id: string; data: any }) {
  const { updateNodeData, getNodes, getEdges, setNodes, setEdges } = useReactFlow();
  const isVideo = !isImageModel(data.model);

  const handleGenerate = async () => {
    const nodes = getNodes();
    const edges = getEdges();

    // Find connected output nodes
    const connectedEdges = edges.filter((e) => e.source === id);
    const targetNodeIds = connectedEdges.map((e) => e.target);

    // Gather inputs
    const inputEdges = edges.filter((e) => e.target === id);

    const promptEdge = inputEdges.find((e) => e.targetHandle === 'prompt');
    const promptNode = promptEdge ? nodes.find((n) => n.id === promptEdge.source) : null;
    const promptText = (promptNode?.data?.enhancedText || promptNode?.data?.text || '') as string;

    const refImageEdge = inputEdges.find((e) => e.targetHandle === 'ref-image');
    const refImageNode = refImageEdge ? nodes.find((n) => n.id === refImageEdge.source) : null;
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
      // If we have a ref image, convert remote URLs to base64 first
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

      // Upload ref image to KIE if we have one
      let uploadedImageUrl: string | null = null;
      if (refImageDataUrl) {
        uploadedImageUrl = await uploadImage(refImageDataUrl);
      }

      let resultUrl = '';
      const selectedModel = data.model as string;
      const aspectRatio = (data.aspectRatio || '1:1') as string;
      const resolution = (data.resolution || '1K') as string;
      const duration = (data.duration || '5') as string;

      if (isVeoModel(selectedModel)) {
        // ---- Veo 3 / 3.1 dedicated API ----
        const taskId = await createVeoTask({
          prompt: promptText,
          model: selectedModel,
          imageUrls: uploadedImageUrl ? [uploadedImageUrl] : undefined,
          aspectRatio:
            aspectRatio === '1:1' ? '16:9' : aspectRatio,
        });
        const result = await pollVeoTask(taskId);
        resultUrl = result.urls[0] || '';
      } else {
        // ---- Market API (Nano Banana, Kling, Sora 2) ----
        const { apiModel, input } = buildMarketInput(
          selectedModel,
          promptText,
          uploadedImageUrl,
          aspectRatio,
          resolution,
          duration,
        );
        const taskId = await createMarketTask(apiModel, input);
        const result = await pollMarketTask(taskId);
        resultUrl = result.urls[0] || '';
      }

      if (!resultUrl) throw new Error('No se generó ningún resultado');

      const resultType = isImageModel(selectedModel) ? 'image' : 'video';
      const actualAspectRatio =
        resultType === 'video' && aspectRatio === '1:1'
          ? '16:9'
          : aspectRatio;

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
            return { ...n, data: { ...n.data, status: 'error', error: String(error) } };
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

  return (
    <BaseNode id={id} title="AI Model" className="w-80 p-4">
      <div className="flex flex-col gap-4">
        {/* Input Ports */}
        <div className="flex flex-col gap-2 relative -ml-4">
          <Port type="target" id="prompt" color="pink" icon={<Type size={14} />} />
          <Port type="target" id="ref-image" color="green" icon={<ImageIcon size={14} />} />
          {isVideo && (
            <Port type="target" id="ref-video" color="green" icon={<VideoIcon size={14} />} />
          )}
        </div>

        <div className="w-full h-px bg-white/10" />

        {/* Model Selector */}
        <div className="flex flex-col gap-2">
          <label className="text-[11px] text-white/50 uppercase tracking-widest font-semibold">
            Model
          </label>
          <MultiUseSelect
            value={data.model}
            onChange={(val) => {
              const v = val as string;
              const type = isImageModel(v) ? 'image' : 'video';
              updateNodeData(id, { model: v, modelType: type });
            }}
            options={MODEL_OPTIONS}
          />
        </div>

        {/* Controls grid */}
        <div className="grid grid-cols-2 gap-4 mt-1">
          {!isVideo ? (
            <>
              {/* Image model controls */}
              {supportsResolution(data.model) && (
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] text-white/50 uppercase tracking-widest font-semibold">
                    Calidad
                  </label>
                  <MultiUseSelect
                    value={data.resolution || '1K'}
                    onChange={(val) => updateNodeData(id, { resolution: val as string })}
                    options={[
                      { label: '512px', value: '512px' },
                      { label: '1K', value: '1K' },
                      { label: '2K', value: '2K' },
                      { label: '4K', value: '4K' },
                    ]}
                  />
                </div>
              )}
              <div className="flex flex-col gap-2">
                <label className="text-[11px] text-white/50 uppercase tracking-widest font-semibold">
                  Proporción
                </label>
                <MultiUseSelect
                  value={data.aspectRatio || '1:1'}
                  onChange={(val) => updateNodeData(id, { aspectRatio: val as string })}
                  options={[
                    { label: '1:1', value: '1:1' },
                    { label: '16:9', value: '16:9' },
                    { label: '9:16', value: '9:16' },
                  ]}
                />
              </div>
            </>
          ) : (
            <>
              {/* Video model controls */}
              <div className="flex flex-col gap-2">
                <label className="text-[11px] text-white/50 uppercase tracking-widest font-semibold">
                  Proporción
                </label>
                <MultiUseSelect
                  value={
                    data.aspectRatio === '16:9' || data.aspectRatio === '9:16' || data.aspectRatio === '1:1'
                      ? data.aspectRatio
                      : '16:9'
                  }
                  onChange={(val) => updateNodeData(id, { aspectRatio: val as string })}
                  options={[
                    { label: '16:9', value: '16:9' },
                    { label: '9:16', value: '9:16' },
                    ...(data.model?.startsWith('kling-')
                      ? [{ label: '1:1', value: '1:1' }]
                      : []),
                  ]}
                />
              </div>

              {supportsDuration(data.model) ? (
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] text-white/50 uppercase tracking-widest font-semibold">
                    Duración
                  </label>
                  <MultiUseSelect
                    value={data.duration || '5'}
                    onChange={(val) => updateNodeData(id, { duration: val as string })}
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
              ) : (
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] text-white/50 uppercase tracking-widest font-semibold">
                    Cámara
                  </label>
                  <MultiUseSelect
                    value={data.camera || 'static'}
                    onChange={(val) => updateNodeData(id, { camera: val as string })}
                    options={[
                      { label: 'Pan', value: 'pan' },
                      { label: 'Zoom', value: 'zoom' },
                      { label: 'Static', value: 'static' },
                    ]}
                  />
                </div>
              )}
            </>
          )}
        </div>

        <button
          onClick={handleGenerate}
          className="w-full mt-2 py-3.5 bg-[#0A84FF] hover:bg-[#007AFF] text-white text-[15px] font-semibold rounded-[14px] shadow-[0_0_20px_rgba(10,132,255,0.3)] hover:shadow-[0_0_25px_rgba(10,132,255,0.5)] transition-all duration-300 flex items-center justify-center gap-2 active:scale-[0.98]"
        >
          <Play size={16} className="fill-white" /> Generate
        </button>
      </div>

      <div className="absolute right-0 top-1/2 -translate-y-1/2">
        <Port
          type="source"
          id="out"
          color="green"
          icon={isVideo ? <VideoIcon size={14} /> : <ImageIcon size={14} />}
        />
      </div>
    </BaseNode>
  );
}
