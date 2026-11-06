import type { CSSProperties } from "react";
import type { CategoryKey } from "@/components/CategoryIcon";

/**
 * Category highlight colors live as CSS custom properties in index.css
 * (`--cat-*`), with separate light- and dark-mode values. Card glows read
 * from the same variables so a touchstone's halo always matches the
 * highlight its category gets in the Archive filter grid.
 */
const CATEGORY_GLOW_VAR: Record<CategoryKey, string> = {
  moment: "--cat-moment",
  person: "--cat-person",
  object: "--cat-object",
  place: "--cat-place",
  food: "--cat-food",
  sound: "--cat-sound",
  imprint: "--cat-imprint",
  digital_traces: "--cat-digital-traces",
};

const FALLBACK_VAR = "--cat-all";

/** The category's highlight color, theme-aware via the `--cat-*` variables. */
export const categoryHighlightColor = (
  category: string | null | undefined,
): string => `hsl(var(${CATEGORY_GLOW_VAR[category as CategoryKey] ?? FALLBACK_VAR}))`;

const glowColor = (category: string | null | undefined, alpha: number) => {
  const varName = CATEGORY_GLOW_VAR[category as CategoryKey] ?? FALLBACK_VAR;
  return `hsl(var(${varName}) / ${alpha})`;
};

/** Box-shadow for the halo behind a saved touchstone card. */
export const categoryGlowShadow = (category: string | null | undefined): string =>
  `0 0 32px ${glowColor(category, 0.35)}, 0 0 64px ${glowColor(category, 0.18)}`;

/**
 * Same halo expressed as custom properties, for cards whose glow is defined
 * in a CSS class (`.onboarding-shared-card`).
 */
export const categoryGlowVars = (
  category: string | null | undefined,
): CSSProperties =>
  ({
    "--ts-glow-inner": glowColor(category, 0.35),
    "--ts-glow-outer": glowColor(category, 0.18),
  }) as CSSProperties;
