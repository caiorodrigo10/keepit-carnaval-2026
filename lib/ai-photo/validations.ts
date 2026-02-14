const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validate a UUID string.
 */
export function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}

/**
 * Validate the generate request body (v2 — single photo, no template).
 * Returns error message or null if valid.
 */
export function validateGenerateRequest(body: unknown): string | null {
  if (!body || typeof body !== "object") {
    return "Corpo da requisicao invalido";
  }

  const { lead_id, photo_url } = body as Record<string, unknown>;

  if (!lead_id || typeof lead_id !== "string" || !isValidUUID(lead_id)) {
    return "lead_id invalido";
  }

  if (!photo_url || typeof photo_url !== "string" || !photo_url.startsWith("http")) {
    return "photo_url invalida";
  }

  return null;
}
