/**
 * Configuration module
 * Centralizes all application configuration
 */

export { env, validateEnv, initializeEnv, logEnvInfo } from "./env";

// Event configuration
export const EVENT_CONFIG = {
  name: "Carnaval SP 2026",
  venue: "Sambódromo do Anhembi",
  dates: {
    day1: "2026-02-17",
    day2: "2026-02-18",
  },
  timezone: "America/Sao_Paulo",
} as const;

// Screen configuration
export const SCREEN_CONFIG = {
  displayDuration: 5000, // 5 seconds per photo
  photographerRatio: 0.7, // 70% photographer photos
  userRatio: 0.3, // 30% user photos
  refreshInterval: 5000, // 5 seconds between photo changes
  heartbeatInterval: 30000, // 30 seconds between pings
} as const;

// Photo configuration
export const PHOTO_CONFIG = {
  maxSizeMB: 10,
  acceptedFormats: ["image/jpeg", "image/png", "image/webp"],
  thumbnailWidth: 400,
  thumbnailHeight: 300,
  compressionQuality: 0.8,
} as const;

// Moderation configuration
export const MODERATION_CONFIG = {
  slaMinutes: 5, // 5 minute SLA during peak hours
  batchSize: 20, // Photos per page in moderation queue
  autoRefreshInterval: 10000, // 10 seconds
} as const;

// Lead configuration
export const LEAD_CONFIG = {
  phoneMinLength: 10,
  phoneMaxLength: 11,
  requiredFields: ["name", "phone", "email"] as const,
} as const;
