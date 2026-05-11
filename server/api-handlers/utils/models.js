/**
 * /api/kie-models — Get KIE video models and pricing
 * GET /api/kie-models
 */

import { KIE_VIDEO_MODELS, getCategories } from '../../config/kie-models.js';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET.' });
  }

  try {
    const category = req.query?.category || req.query?.type;

    if (category) {
      // Filter by category
      const models = KIE_VIDEO_MODELS.filter(m => m.category === category);
      if (models.length === 0) {
        return res.status(404).json({
          error: 'Category not found',
          availableCategories: getCategories(),
        });
      }
      return res.status(200).json({ models, category });
    }

    // Return all models grouped by category
    const grouped = {};
    getCategories().forEach(cat => {
      grouped[cat] = KIE_VIDEO_MODELS.filter(m => m.category === cat);
    });

    return res.status(200).json({
      models: KIE_VIDEO_MODELS,
      grouped,
      categories: getCategories(),
    });
  } catch (error) {
    console.error('[kie-models]', error);
    return res.status(500).json({ error: error.message });
  }
}
