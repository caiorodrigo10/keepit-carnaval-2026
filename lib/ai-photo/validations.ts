import { AI_PHOTO_LIMITS } from "@/types/ai-photo";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validate a UUID string.
 */
export function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}

/**
 * Validate reference photo URLs.
 * Returns error message or null if valid.
 */
export function validateReferencePhotos(photos: unknown): string | null {
  if (!Array.isArray(photos)) {
    return "reference_photos deve ser um array";
  }

  if (photos.length < AI_PHOTO_LIMITS.MIN_REFERENCE_PHOTOS) {
    return `Envie no minimo ${AI_PHOTO_LIMITS.MIN_REFERENCE_PHOTOS} fotos de referencia`;
  }

  if (photos.length > AI_PHOTO_LIMITS.MAX_REFERENCE_PHOTOS) {
    return `Envie no maximo ${AI_PHOTO_LIMITS.MAX_REFERENCE_PHOTOS} fotos de referencia`;
  }

  for (const url of photos) {
    if (typeof url !== "string" || !url.startsWith("http")) {
      return "Todas as fotos devem ter URLs validas";
    }
  }

  return null;
}

/**
 * Validate the generate request body.
 * Returns error message or null if valid.
 */
export function validateGenerateRequest(body: unknown): string | null {
  if (!body || typeof body !== "object") {
    return "Corpo da requisicao invalido";
  }

  const { lead_id, template_id, reference_photos } = body as Record<string, unknown>;

  if (!lead_id || typeof lead_id !== "string" || !isValidUUID(lead_id)) {
    return "lead_id invalido";
  }

  if (!template_id || typeof template_id !== "string" || !isValidUUID(template_id)) {
    return "template_id invalido";
  }

  const photosError = validateReferencePhotos(reference_photos);
  if (photosError) return photosError;

  return null;
}
