/** The only emotional tones a memory can be tagged with. Tagging must pick from this list — never free text. */
export const EMOTIONAL_TONES = [
  "joyful", "tender", "bittersweet", "proud", "nostalgic", "grieving", "peaceful", "funny",
] as const;

export type EmotionalTone = (typeof EMOTIONAL_TONES)[number];

export function isEmotionalTone(value: unknown): value is EmotionalTone {
  return typeof value === "string" && (EMOTIONAL_TONES as readonly string[]).includes(value);
}

/** Normalises any model/device output to a listed tone, or null. */
export function toEmotionalTone(value: unknown): EmotionalTone | null {
  const v = typeof value === "string" ? value.trim().toLowerCase() : value;
  return isEmotionalTone(v) ? v : null;
}
