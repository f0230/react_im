import { useCallback } from 'react';
import imageCompression from 'browser-image-compression';

const COMPRESSION_OPTIONS = {
  maxSizeMB: 2,
  maxWidthOrHeight: 2048,
  useWebWorker: true,
  initialQuality: 0.85,
};

const COMPRESSION_THRESHOLD_BYTES = 1.5 * 1024 * 1024; // skip compression under 1.5MB

function isImageMime(mimeType = '') {
  return mimeType.startsWith('image/');
}

/**
 * Hook that exposes a `compress(file)` function.
 * - Skips non-image files (returns original).
 * - Skips small images (< 1.5MB).
 * - Compresses larger images using a Web Worker to avoid blocking the UI.
 * - Falls back to the original file if compression fails for any reason.
 */
export function useImageCompression() {
  const compress = useCallback(async (file) => {
    if (!file || !isImageMime(file.type)) return file;
    if (file.size <= COMPRESSION_THRESHOLD_BYTES) return file;

    try {
      const compressed = await imageCompression(file, COMPRESSION_OPTIONS);
      // browser-image-compression sometimes returns a Blob; ensure we have a File for the name
      if (compressed instanceof File) return compressed;
      return new File([compressed], file.name, { type: compressed.type || file.type });
    } catch (err) {
      console.warn('[useImageCompression] failed, using original file', err);
      return file;
    }
  }, []);

  return { compress };
}
