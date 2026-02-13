import imageCompression, { type Options } from "browser-image-compression";

/**
 * Compression options for different use cases
 */

// Full size photos for storage and display
export const fullSizeCompressionOptions: Options = {
  maxSizeMB: 1.5,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  fileType: "image/jpeg",
  initialQuality: 0.85,
};

// Thumbnails for grid display (smaller, faster loading)
export const thumbnailCompressionOptions: Options = {
  maxSizeMB: 0.15,
  maxWidthOrHeight: 400,
  useWebWorker: true,
  fileType: "image/jpeg",
  initialQuality: 0.7,
};

// Photographer uploads (slightly higher quality)
export const photographerCompressionOptions: Options = {
  maxSizeMB: 2,
  maxWidthOrHeight: 2048,
  useWebWorker: true,
  fileType: "image/jpeg",
  initialQuality: 0.88,
};

/**
 * Compress image with fallback to original on error
 */
export async function compressImage(
  file: File,
  options: Options = fullSizeCompressionOptions
): Promise<Blob> {
  try {
    const compressedFile = await imageCompression(file, options);
    return compressedFile;
  } catch (error) {
    console.warn("Image compression failed, using original:", error);
    return file;
  }
}

/**
 * Compress image to both full size and thumbnail
 */
export async function compressImageWithThumbnail(
  file: File,
  fullOptions: Options = fullSizeCompressionOptions,
  thumbOptions: Options = thumbnailCompressionOptions
): Promise<{ full: Blob; thumbnail: Blob }> {
  const [full, thumbnail] = await Promise.all([
    compressImage(file, fullOptions),
    compressImage(file, thumbOptions),
  ]);

  return { full, thumbnail };
}

/**
 * Validate image file before processing
 */
export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

export const MAX_FILE_SIZE_MB = 50;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export function validateImageFile(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return "Tipo de arquivo nao suportado. Use JPG, PNG, WebP ou HEIC.";
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `Arquivo muito grande. O tamanho maximo e ${MAX_FILE_SIZE_MB}MB.`;
  }
  return null;
}
