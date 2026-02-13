/**
 * Validation utilities for form inputs
 */

/**
 * Validates email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates Brazilian phone number format (with DDD)
 * Accepts: (11) 99999-9999, 11 99999-9999, 11999999999, etc.
 */
export function isValidPhone(phone: string): boolean {
  // Remove all non-numeric characters
  const digits = phone.replace(/\D/g, "");
  // Brazilian phone with DDD: 10 or 11 digits
  return digits.length >= 10 && digits.length <= 11;
}

/**
 * Formats phone number to standard format: (XX) XXXXX-XXXX
 */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");

  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  } else if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return phone;
}

/**
 * Phone input mask - formats as user types
 */
export function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, "");

  if (digits.length <= 2) {
    return `(${digits}`;
  } else if (digits.length <= 7) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  } else if (digits.length <= 11) {
    const phoneLength = digits.length === 11 ? 7 : 6;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, phoneLength)}-${digits.slice(phoneLength)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

/**
 * Validates name (at least 2 words)
 */
export function isValidName(name: string): boolean {
  const trimmed = name.trim();
  return trimmed.length >= 3;
}
