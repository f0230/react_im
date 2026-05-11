/**
 * KIE Models Service
 * Frontend utilities for handling KIE video models, pricing, and credit validation
 */

/**
 * Fetch KIE models from the API
 * @param {string} category - Optional: filter by category (veo3, market)
 * @returns {Promise<Object>} Models data
 */
export async function fetchKieModels(category = null) {
  try {
    const url = new URL(`${import.meta.env.VITE_APP_URL || ''}/api/kie-models`);
    if (category) {
      url.searchParams.append('category', category);
    }

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[kieModels] fetch error:', error);
    throw error;
  }
}

/**
 * Fetch available credits
 * @returns {Promise<number>} Available credits
 */
export async function fetchAvailableCredits() {
  try {
    const response = await fetch(`${import.meta.env.VITE_APP_URL || ''}/api/kie-credits`);

    if (!response.ok) {
      throw new Error(`Failed to fetch credits: ${response.status}`);
    }

    const data = await response.json();
    return data.credits || 0;
  } catch (error) {
    console.error('[kieModels] credits fetch error:', error);
    throw error;
  }
}

/**
 * Check if user has enough credits for a model
 * @param {number} availableCredits - User's available credits
 * @param {string} modelId - Model ID (e.g., 'veo3-fast')
 * @param {Object} models - Models data from API
 * @returns {boolean} True if user has enough credits
 */
export function hasEnoughCredits(availableCredits, modelId, models) {
  if (!models || !models.models) return false;

  const model = models.models.find(m => m.id === modelId);
  if (!model) return false;

  return availableCredits >= model.credits;
}

/**
 * Get model details by ID
 * @param {string} modelId - Model ID
 * @param {Object} models - Models data from API
 * @returns {Object|null} Model details or null if not found
 */
export function getModelById(modelId, models) {
  if (!models || !models.models) return null;
  return models.models.find(m => m.id === modelId) || null;
}

/**
 * Format credits display
 * @param {number} credits - Number of credits
 * @returns {string} Formatted credits (e.g., "80 créditos")
 */
export function formatCredits(credits) {
  return `${credits.toLocaleString()} créditos`;
}

/**
 * Format USD estimate
 * @param {number} usd - USD amount
 * @returns {string} Formatted USD (e.g., "$0.40")
 */
export function formatUsd(usd) {
  return `$${usd.toFixed(2)}`;
}

/**
 * Get quality badge color (for UI)
 * @param {string} quality - Quality level (Standard, HD, High)
 * @returns {string} Color class or style
 */
export function getQualityColor(quality) {
  const colors = {
    Standard: 'text-blue-500',
    HD: 'text-purple-500',
    High: 'text-green-500',
  };
  return colors[quality] || 'text-gray-500';
}

/**
 * Calculate credit usage summary
 * @param {Object} models - Models data
 * @returns {Object} Summary stats
 */
export function getCreditSummary(models) {
  if (!models || !models.models || models.models.length === 0) {
    return {
      minCredits: 0,
      maxCredits: 0,
      avgCredits: 0,
      totalModels: 0,
    };
  }

  const credits = models.models.map(m => m.credits);
  const minCredits = Math.min(...credits);
  const maxCredits = Math.max(...credits);
  const avgCredits = Math.round(credits.reduce((a, b) => a + b, 0) / credits.length);

  return {
    minCredits,
    maxCredits,
    avgCredits,
    totalModels: models.models.length,
  };
}
