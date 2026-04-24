// Helpers for the optional, partially-fillable memory date.

export type MemorySeason = "spring" | "summer" | "autumn" | "winter";

export interface MemoryDate {
  season: MemorySeason | null;
  year: number | null;
  month: number | null; // 1-12
  day: number | null;   // 1-31
}

export const emptyMemoryDate = (): MemoryDate => ({
  season: null,
  year: null,
  month: null,
  day: null,
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
  { value: "spring", label: "Spring" },
  { value: "summer", label: "Summer" },
  { value: "autumn", label: "Autumn" },
  { value: "winter", label: "Winter" },
];

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Render the human-readable date string from whatever subset of fields
 * the user provided. If both season and month are present, month wins
 * (it's more specific). Returns null when nothing meaningful is set.
 */
export const formatMemoryDate = (d: MemoryDate): string | null => {
  const { season, year, month, day } = d;

  if (year && month && day) {
    return `${MONTH_NAMES[month - 1]} ${day}, ${year}`;
  }
  if (year && month) {
    return `${MONTH_NAMES[month - 1]} ${year}`;
  }
  if (year && season) {
    return `${capitalize(season)} ${year}`;
  }
  if (year) {
    return String(year);
  }
  if (season) {
    return capitalize(season);
  }
  return null;
};
