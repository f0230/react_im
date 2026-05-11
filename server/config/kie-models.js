/**
 * KIE Video Models & Credit Pricing
 * Reference: https://kie.ai/pricing
 *
 * Credit consumption varies by model and quality level.
 * Estimated USD values are approximate and based on credit conversion.
 */

export const KIE_VIDEO_MODELS = [
  // Veo 3 Models
  {
    id: 'veo3-fast',
    name: 'Veo 3 Fast',
    category: 'veo3',
    credits: 80,
    estimatedUsd: 0.40,
    duration: '~8s',
    quality: 'Standard',
    description: 'Fast video generation with standard quality',
  },
  {
    id: 'veo3-quality',
    name: 'Veo 3 Quality',
    category: 'veo3',
    credits: 400,
    estimatedUsd: 2.00,
    duration: '~8s',
    quality: 'High',
    description: 'High-quality video generation (longer processing time)',
  },

  // Market Models (Template-based)
  {
    id: 'market-standard',
    name: 'Market Standard',
    category: 'market',
    credits: 30,
    estimatedUsd: 0.15,
    duration: '~3s',
    quality: 'Standard',
    description: 'Template-based video creation',
  },
  {
    id: 'market-hd',
    name: 'Market HD',
    category: 'market',
    credits: 60,
    estimatedUsd: 0.30,
    duration: '~3s',
    quality: 'HD',
    description: 'Template-based HD video creation',
  },
];

/**
 * Get model by ID
 */
export function getModelById(modelId) {
  return KIE_VIDEO_MODELS.find(m => m.id === modelId);
}

/**
 * Get all models in a category
 */
export function getModelsByCategory(category) {
  return KIE_VIDEO_MODELS.filter(m => m.category === category);
}

/**
 * Get credits required for a model
 */
export function getModelCredits(modelId) {
  const model = getModelById(modelId);
  return model ? model.credits : null;
}

/**
 * Check if user has enough credits for a model
 */
export function hasEnoughCredits(availableCredits, modelId) {
  const required = getModelCredits(modelId);
  return required !== null && availableCredits >= required;
}

/**
 * Get all unique categories
 */
export function getCategories() {
  return [...new Set(KIE_VIDEO_MODELS.map(m => m.category))];
}
