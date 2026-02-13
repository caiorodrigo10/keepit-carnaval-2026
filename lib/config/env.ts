/**
 * Environment configuration and validation
 * Validates required environment variables at build/runtime
 */

// Required environment variables
const requiredEnvVars = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

// Server-only required variables (validated on demand, not at build time)
const serverRequiredEnvVars = [
  "GEMINI_API_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

// Optional environment variables with defaults
const optionalEnvVars = {
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  NEXT_PUBLIC_ENV: "development",
  NEXT_PUBLIC_DEBUG_MODE: "false",
  NEXT_PUBLIC_DEMO_MODE: "false",
} as const;

type RequiredEnvVar = (typeof requiredEnvVars)[number];
type ServerRequiredEnvVar = (typeof serverRequiredEnvVars)[number];
type OptionalEnvVar = keyof typeof optionalEnvVars;

/**
 * Validates that all required environment variables are set
 * @throws Error if any required variable is missing
 */
export function validateEnv(): void {
  const missing: string[] = [];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.map((v) => `  - ${v}`).join("\n")}\n\n` +
        "Please check your .env.local file or Vercel environment settings."
    );
  }
}

/**
 * Gets a required environment variable value
 * @throws Error if the variable is not set
 */
export function getRequiredEnv(key: RequiredEnvVar): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Required environment variable ${key} is not set. ` +
        "Check your .env.local file or Vercel environment settings."
    );
  }
  return value;
}

/**
 * Gets a server-only required environment variable value.
 * Only call this from server-side code (API Routes, Server Actions).
 * @throws Error if the variable is not set
 */
export function getServerEnv(key: ServerRequiredEnvVar): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Server environment variable ${key} is not set. ` +
        "Check your .env.local file or Vercel environment settings."
    );
  }
  return value;
}

/**
 * Gets an optional environment variable with fallback to default
 */
export function getOptionalEnv(key: OptionalEnvVar): string {
  return process.env[key] || optionalEnvVars[key];
}

/**
 * Environment configuration object
 * Access validated environment variables through this object
 */
export const env = {
  // Supabase
  supabase: {
    url: () => getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    anonKey: () => getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  },

  // Application
  app: {
    url: () => getOptionalEnv("NEXT_PUBLIC_APP_URL"),
    env: () =>
      getOptionalEnv("NEXT_PUBLIC_ENV") as
        | "development"
        | "preview"
        | "production",
    isProduction: () => getOptionalEnv("NEXT_PUBLIC_ENV") === "production",
    isDevelopment: () => getOptionalEnv("NEXT_PUBLIC_ENV") === "development",
    isPreview: () => getOptionalEnv("NEXT_PUBLIC_ENV") === "preview",
  },

  // Feature flags
  features: {
    debugMode: () => getOptionalEnv("NEXT_PUBLIC_DEBUG_MODE") === "true",
    demoMode: () => getOptionalEnv("NEXT_PUBLIC_DEMO_MODE") === "true",
  },

  // AI Photo (server-only)
  aiPhoto: {
    geminiApiKey: () => getServerEnv("GEMINI_API_KEY"),
    serviceRoleKey: () => getServerEnv("SUPABASE_SERVICE_ROLE_KEY"),
  },
} as const;

/**
 * Logs environment info (safe for production - no secrets)
 */
export function logEnvInfo(): void {
  if (typeof window === "undefined") {
    // Server-side only
    console.log("=".repeat(60));
    console.log("Keepit Carnaval 2026 - Environment Configuration");
    console.log("=".repeat(60));
    console.log(`Environment: ${env.app.env()}`);
    console.log(`App URL: ${env.app.url()}`);
    console.log(`Supabase URL: ${env.supabase.url()}`);
    console.log(`Debug Mode: ${env.features.debugMode()}`);
    console.log(`Demo Mode: ${env.features.demoMode()}`);
    console.log("=".repeat(60));
  }
}

// Export a function to run validation
export function initializeEnv(): void {
  validateEnv();
  if (env.features.debugMode()) {
    logEnvInfo();
  }
}
