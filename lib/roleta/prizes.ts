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
  { slug: "carregador",      name: "Carregador Portátil",       probability: 0.345, color: "#34BF58", emoji: "🔋" },
  { slug: "capa-chuva",      name: "Capa de Chuva",             probability: 0.345, color: "#4ECDC4", emoji: "🌧️" },
  { slug: "energy-now",      name: "Energy Now",                probability: 0.083, color: "#FFD700", emoji: "⚡" },
  { slug: "kit-glitter",     name: "Kit Glitter",               probability: 0.069, color: "#FF69B4", emoji: "✨" },
  { slug: "alcool-gel",      name: "Álcool Gel",                probability: 0.041, color: "#66FB95", emoji: "🧴" },
  { slug: "rexona",          name: "Rexona Clinical",           probability: 0.028, color: "#5B9BD5", emoji: "🧊" },
  { slug: "kit-camisinha",   name: "Kit c/ Óculos",             probability: 0.021, color: "#FF6B6B", emoji: "🕶️" },
  { slug: "hype-glow",       name: "Hype Glow Rosto",          probability: 0.021, color: "#E040FB", emoji: "💎" },
  { slug: "hidratante-labial", name: "Hidratante Labial Nívea", probability: 0.014, color: "#1E88E5", emoji: "💋" },
  { slug: "glitter-corporal", name: "Glitter Corporal",         probability: 0.007, color: "#AB47BC", emoji: "🌟" },
  { slug: "arquinho",        name: "Arquinho Colorido",         probability: 0.007, color: "#FF7043", emoji: "🎀" },
  { slug: "prendedor",       name: "Prendedor de Cabelo",       probability: 0.007, color: "#8D6E63", emoji: "💇" },
  { slug: "orelha-brilhosa", name: "Orelha Brilhosa",          probability: 0.007, color: "#FFC107", emoji: "👂" },
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
