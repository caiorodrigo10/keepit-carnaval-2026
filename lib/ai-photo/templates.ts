/**
 * Build variant prompts from a base template prompt.
 * Returns a single prompt — user can regenerate if they want a different result.
 */
export function buildVariantPrompts(basePrompt: string): [string] {
  return [basePrompt];
}
