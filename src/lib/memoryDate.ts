// Helpers for the optional, partially-fillable memory date.

export type MemorySeason = "spring" | "summer" | "autumn" | "winter";

export interface MemoryDate {
  season: MemorySeason | null;
  year: number | null;
  month: number | null; // 1-12
  day: number | null;   // 1-31
  /** Freeform year text — accepts any string ("1987", "late 80s"). */
  yearText?: string | null;
}

export const emptyMemoryDate = (): MemoryDate => ({
  season: null,
  year: null,
  month: null,
  day: null,
  yearText: null,
});

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const MONTH_OPTIONS = MONTH_NAMES.map((name, i) => ({
  value: i + 1,
  label: name,
}));

export const SEASON_OPTIONS: { value: MemorySeason; label: string }[] = [
  { value: "spring", label: "Spring (Mar – May)" },
  { value: "summer", label: "Summer (Jun – Aug)" },
  { value: "autumn", label: "Autumn (Sep – Nov)" },
  { value: "winter", label: "Winter (Dec – Feb)" },
];

export const SEASON_LABELS: Record<MemorySeason, string> = {
  spring: "Spring",
  summer: "Summer",
  autumn: "Autumn",
  winter: "Winter",
};

// Months belonging to each season, in display order (1-12).
export const SEASON_MONTHS: Record<MemorySeason, number[]> = {
  spring: [3, 4, 5],
  summer: [6, 7, 8],
  autumn: [9, 10, 11],
  winter: [12, 1, 2],
};

/**
 * Render the human-readable date string from whatever subset of fields
 * the user provided. If both season and month are present, month wins
 * (it's more specific). Returns null when nothing meaningful is set.
 *
 * yearText (freeform) takes precedence over numeric year for display.
 */
export const formatMemoryDate = (d: MemoryDate): string | null => {
  const { season, year, month, day, yearText } = d;
  const yearStr = (yearText && yearText.trim()) || (year ? String(year) : "");

  if (yearStr && month && day) {
    return `${MONTH_NAMES[month - 1]} ${day}, ${yearStr}`;
  }
  if (yearStr && month) {
    return `${MONTH_NAMES[month - 1]} ${yearStr}`;
  }
  if (yearStr && season) {
    return `${SEASON_LABELS[season]} ${yearStr}`;
  }
  if (yearStr) {
    return yearStr;
  }
  if (season && month) {
    return MONTH_NAMES[month - 1];
  }
  if (season) {
    return SEASON_LABELS[season];
  }
  if (month) {
    return MONTH_NAMES[month - 1];
  }
  return null;
};
