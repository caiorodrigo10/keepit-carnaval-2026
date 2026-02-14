/**
 * Prize wheel configuration.
 * Easy to update without touching logic — just change this array.
 */

export interface Prize {
  slug: string;
  name: string;
  probability: number; // 0-1, all must sum to 1
  color: string;       // Wheel segment color
  emoji: string;       // Display emoji
}

export const PRIZES: Prize[] = [
  { slug: "chaveiro",    name: "Chaveiro Keepit",     probability: 0.35, color: "#66FB95", emoji: "🔑" },
  { slug: "adesivo",     name: "Adesivo Keepit",      probability: 0.30, color: "#34BF58", emoji: "🏷️" },
  { slug: "copo",        name: "Copo Personalizado",  probability: 0.20, color: "#FFD700", emoji: "🥤" },
  { slug: "desconto-20", name: "Desconto 20% Keepit", probability: 0.10, color: "#FF6B6B", emoji: "💰" },
  { slug: "ecobag",      name: "Ecobag Keepit",       probability: 0.05, color: "#4ECDC4", emoji: "👜" },
];

/**
 * Pick a random prize based on weighted probabilities.
 * Server-side only — never expose this to the client.
 */
export function drawPrize(): Prize {
  const random = Math.random();
  let cumulative = 0;

  for (const prize of PRIZES) {
    cumulative += prize.probability;
    if (random <= cumulative) {
      return prize;
    }
  }

  // Fallback (should never happen if probabilities sum to 1)
  return PRIZES[0];
}
