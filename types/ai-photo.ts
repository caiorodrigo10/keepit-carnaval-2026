/**
 * Types for AI Photo Generation feature
 */

// =====================================================
// Database types
// =====================================================

export type AiGenerationStatus =
  | "uploading"
  | "queued"
  | "processing"
  | "copying"
  | "completed"
  | "failed"
  | "expired";

export type VariantStatus = "pending" | "processing" | "completed" | "failed";

export interface AiPhotoTemplate {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  preview_url: string;
  template_image_url: string;
  prompt: string;
  aspect_ratio: string;
  resolution: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface AiPhotoGeneration {
  id: string;
  lead_id: string;
  template_id: string;
  status: AiGenerationStatus;
  reference_photos: string[];
  variant_1_url: string | null;
  variant_1_fal_request_id: string | null;
  variant_1_status: VariantStatus;
  variant_2_url: string | null;
  variant_2_fal_request_id: string | null;
  variant_2_status: VariantStatus;
  variant_3_url: string | null;
  variant_3_fal_request_id: string | null;
  variant_3_status: VariantStatus;
  error_message: string | null;
  processing_time_ms: number | null;
  created_at: string;
  completed_at: string | null;
}

// =====================================================
// API Request/Response types
// =====================================================

// POST /api/ai-photo/generate
export interface GenerateRequest {
  lead_id: string;
  template_id: string;
  reference_photos: string[];
}

export interface GenerateResponse {
  success: true;
  generation_id: string;
}

// GET /api/ai-photo/status/[id]
export interface VariantInfo {
  status: VariantStatus;
  url: string | null;
}

export interface StatusResponse {
  success: true;
  generation: {
    id: string;
    status: AiGenerationStatus;
    variants: [VariantInfo, VariantInfo, VariantInfo];
    error_message: string | null;
    created_at: string;
    completed_at: string | null;
  };
}

// GET /api/ai-photo/templates
export interface TemplatesResponse {
  templates: Array<{
    id: string;
    slug: string;
    name: string;
    description: string | null;
    preview_url: string;
    aspect_ratio: string;
  }>;
}

// Error response (shared across all routes)
export interface AiPhotoErrorResponse {
  success: false;
  error: string;
  code: AiPhotoErrorCode;
}

export type AiPhotoErrorCode =
  | "LEAD_NOT_FOUND"
  | "TEMPLATE_NOT_FOUND"
  | "INVALID_PHOTOS"
  | "GENERATION_LIMIT"
  | "GENERATION_NOT_FOUND"
  | "AI_ERROR"
  | "INTERNAL_ERROR";

// =====================================================
// Constants
// =====================================================

export const AI_PHOTO_LIMITS = {
  MAX_GENERATIONS_PER_LEAD: 999,
  MAX_REFERENCE_PHOTOS: 10,
  MIN_REFERENCE_PHOTOS: 1,
  MAX_PHOTO_SIZE_MB: 10,
  POLL_INTERVAL_MS: 3000,
  POLL_TIMEOUT_MS: 120_000,
  VARIANT_COUNT: 3,
} as const;
