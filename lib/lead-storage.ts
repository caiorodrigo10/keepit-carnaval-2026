/**
 * Lead storage utilities for localStorage persistence
 */

const LEAD_STORAGE_KEY = "keepit_lead";

export interface StoredLead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  createdAt: string;
}

/**
 * Saves lead data to localStorage
 */
export function saveLead(lead: StoredLead): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(LEAD_STORAGE_KEY, JSON.stringify(lead));
  } catch {
    // localStorage might be full or disabled
  }
}

/**
 * Gets lead data from localStorage
 */
export function getStoredLead(): StoredLead | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(LEAD_STORAGE_KEY);
    if (!stored) return null;
    const data = JSON.parse(stored) as StoredLead;
    // Validate required fields
    if (!data.id || !data.name || !data.email) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

/**
 * Checks if user has already registered
 */
export function hasRegistered(): boolean {
  return getStoredLead() !== null;
}

/**
 * Clears lead data from localStorage (for testing)
 */
export function clearLead(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(LEAD_STORAGE_KEY);
  } catch {
    // Ignore errors
  }
}
