/**
 * Platform-specific media constraints (max size, duration, formats, aspect ratios).
 * Used to generate non-blocking warnings in CreatePostModal.
 *
 * Extends the basic PLATFORM_CONFIG in blotatoService.js with concrete media rules
 * that the API endpoints enforce on the Blotato side.
 */

export const PLATFORM_MEDIA_SPECS = {
  instagram: {
    image:  { maxMB: 8,    maxCount: 10, aspectRatios: ['1:1', '4:5', '16:9'] },
    video:  { maxMB: 100,  maxDuration: 60,  formats: ['mp4', 'mov'] },
    reel:   { maxMB: 1000, maxDuration: 90,  minDuration: 3, aspectRatio: '9:16', formats: ['mp4', 'mov'] },
    story:  { maxMB: 100,  maxDuration: 15,  aspectRatio: '9:16', formats: ['mp4', 'mov'] },
  },
  tiktok: {
    video:  { maxMB: 500,  maxDuration: 600, minDuration: 3, formats: ['mp4'] },
    image:  { maxMB: 8,    maxCount: 35 }, // photo carousel
  },
  facebook: {
    image:  { maxMB: 25,   maxCount: 10 },
    video:  { maxMB: 4096, maxDuration: 14400, formats: ['mp4', 'mov'] },
  },
  youtube: {
    video:  { maxMB: 128000, maxDuration: null, formats: ['mp4', 'mov', 'avi', 'mkv', 'webm'] },
  },
  twitter: {
    image:  { maxMB: 5,    maxCount: 4 },
    video:  { maxMB: 512,  maxDuration: 140, formats: ['mp4', 'mov'] },
  },
  linkedin: {
    image:  { maxMB: 10,   maxCount: 9 },
    video:  { maxMB: 200,  maxDuration: 600, formats: ['mp4', 'mov'] },
  },
  pinterest: {
    image:  { maxMB: 20 },
    video:  { maxMB: 2048, maxDuration: 900, formats: ['mp4', 'mov'] },
  },
  threads: {
    image:  { maxMB: 8,    maxCount: 10 },
    video:  { maxMB: 100,  maxDuration: 300, formats: ['mp4', 'mov'] },
  },
  bluesky: {
    image:  { maxMB: 1,    maxCount: 4 },
    video:  { maxMB: 50,   maxDuration: 60, formats: ['mp4'] },
  },
};

function getVideoSpec(platform, format) {
  const specs = PLATFORM_MEDIA_SPECS[platform];
  if (!specs) return null;
  if (platform === 'instagram') {
    if (format === 'reel')     return specs.reel;
    if (format === 'historia') return specs.story;
  }
  return specs.video || null;
}

function getImageSpec(platform, format) {
  const specs = PLATFORM_MEDIA_SPECS[platform];
  if (!specs) return null;
  if (platform === 'instagram' && format === 'historia') return specs.story;
  return specs.image || null;
}

function getExtension(mimeType = '') {
  return (mimeType.split('/')[1] || '').toLowerCase().replace('quicktime', 'mov');
}

/**
 * Generate non-blocking warning messages for a set of media items against selected platforms.
 * Returns an array of unique strings.
 *
 * @param {Array} mediaItems - { isVideo, sizeBytes, mimeType }
 * @param {Array<string>} selectedPlatforms - e.g. ['instagram', 'tiktok']
 * @param {string} format - 'reel' | 'carousel' | 'historia' | 'post'
 * @returns {string[]}
 */
export function getMediaWarnings(mediaItems, selectedPlatforms, format) {
  if (!mediaItems?.length || !selectedPlatforms?.length) return [];

  const warnings = new Set();
  const platformName = {
    instagram: 'Instagram', tiktok: 'TikTok', facebook: 'Facebook', youtube: 'YouTube',
    twitter: 'Twitter/X', linkedin: 'LinkedIn', pinterest: 'Pinterest',
    threads: 'Threads', bluesky: 'Bluesky',
  };

  const imageCount = mediaItems.filter((m) => !m.isVideo).length;
  const videoCount = mediaItems.filter((m) =>  m.isVideo).length;

  selectedPlatforms.forEach((platform) => {
    const label = platformName[platform] || platform;

    // Per-item checks
    mediaItems.forEach((item) => {
      const sizeMB = (item.sizeBytes || 0) / 1024 / 1024;

      if (item.isVideo) {
        const spec = getVideoSpec(platform, format);
        if (!spec) {
          warnings.add(`${label}: no soporta video en este formato`);
          return;
        }
        if (spec.maxMB && sizeMB > spec.maxMB) {
          warnings.add(`${label}: video supera ${spec.maxMB}MB (este pesa ${sizeMB.toFixed(1)}MB)`);
        }
        if (spec.formats && item.mimeType) {
          const ext = getExtension(item.mimeType);
          if (!spec.formats.some((f) => ext.includes(f))) {
            warnings.add(`${label}: formato de video no soportado (.${ext})`);
          }
        }
      } else {
        const spec = getImageSpec(platform, format);
        if (!spec) {
          warnings.add(`${label}: no soporta imágenes en este formato`);
          return;
        }
        if (spec.maxMB && sizeMB > spec.maxMB) {
          warnings.add(`${label}: imagen supera ${spec.maxMB}MB (esta pesa ${sizeMB.toFixed(1)}MB)`);
        }
      }
    });

    // Count checks
    const imgSpec = getImageSpec(platform, format);
    if (imgSpec?.maxCount && imageCount > imgSpec.maxCount) {
      warnings.add(`${label}: máximo ${imgSpec.maxCount} imágenes (tenés ${imageCount})`);
    }

    // Format-specific rules
    if (platform === 'instagram' && format === 'reel' && videoCount === 0) {
      warnings.add('Instagram: Reels requieren al menos un video');
    }
    if (platform === 'tiktok' && videoCount > 1) {
      warnings.add('TikTok: solo acepta un video por publicación');
    }
    if (platform === 'youtube' && videoCount === 0) {
      warnings.add('YouTube: requiere un video');
    }
  });

  return Array.from(warnings);
}

/**
 * Returns a short human-readable description of the constraints for a platform/format.
 */
export function getPlatformFormatDescription(platform, format) {
  const specs = PLATFORM_MEDIA_SPECS[platform];
  if (!specs) return null;

  if (platform === 'instagram') {
    if (format === 'reel')     return 'Reel · 3-90s · 9:16';
    if (format === 'historia') return 'Story · hasta 15s · 9:16';
    return 'Feed · hasta 10 imágenes';
  }
  if (platform === 'tiktok')   return 'Video · 3s-10min · mp4';
  if (platform === 'youtube')  return 'Video · sin límite de duración';
  return null;
}
