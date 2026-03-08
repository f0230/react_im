export type AspectRatio = 
  | '1:1' | '1:4' | '1:8' | '2:3' | '3:2' | '3:4' | '4:1' | '4:3' | '4:5' | '5:4' | '8:1' | '9:16' | '16:9' | '21:9' | 'auto';

export type ImageSize = '1K' | '2K' | '4K';
export type ModelType = 'nano-banana-2' | 'nano-banana' | 'nano-banana-pro';

export interface GenerationTask {
  id: string;
  prompt: string;
  model: ModelType;
  aspectRatio: AspectRatio;
  imageSize: ImageSize;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  imageUrl?: string;
  error?: string;
  createdAt: number;
  referenceImage?: string;
}

export interface ModelConfig {
  id: ModelType;
  name: string;
  fullName: string;
  description: string;
}

export const MODELS: ModelConfig[] = [
  {
    id: 'nano-banana-2',
    name: 'Nano Banana 2',
    fullName: 'nano-banana-2',
    description: 'Next-gen Google Nano Banana 2 on KIE AI'
  },
  {
    id: 'nano-banana',
    name: 'Nano Banana',
    fullName: 'gemini-2.5-flash-image',
    description: 'Fast and efficient image generation'
  },
  {
    id: 'nano-banana-pro',
    name: 'Nano Banana Pro',
    fullName: 'gemini-3-pro-image-preview',
    description: 'High-quality generation with advanced controls'
  }
];

export const ASPECT_RATIOS: { label: string; value: AspectRatio }[] = [
  { label: 'Auto', value: 'auto' },
  { label: '1:1', value: '1:1' },
  { label: '3:4', value: '3:4' },
  { label: '4:3', value: '4:3' },
  { label: '16:9', value: '16:9' },
  { label: '9:16', value: '9:16' },
  { label: '21:9', value: '21:9' },
];

export const PRO_ASPECT_RATIOS: { label: string; value: AspectRatio }[] = [
  ...ASPECT_RATIOS,
  { label: '2:3', value: '2:3' },
  { label: '3:2', value: '3:2' },
  { label: '4:5', value: '4:5' },
  { label: '5:4', value: '5:4' },
  { label: '1:4', value: '1:4' },
  { label: '1:8', value: '1:8' },
  { label: '4:1', value: '4:1' },
  { label: '8:1', value: '8:1' }
];

export const IMAGE_SIZES: { label: string; value: ImageSize }[] = [
  { label: '1K', value: '1K' },
  { label: '2K', value: '2K' },
  { label: '4K', value: '4K' }
];

