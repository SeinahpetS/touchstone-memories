import {
  SEASON_MONTHS,
  SEASON_OPTIONS,
  formatMemoryDate,
  type MemoryDate,
  type MemorySeason,
} from "@/lib/memoryDate";

interface Props {
  value: MemoryDate;
  onChange: (next: MemoryDate) => void;
}

const MONTH_SHORT = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const fieldClass =
  "h-11 w-full rounded-md bg-[#E8E4D8] border-0 px-3 text-base font-jost text-foreground " +
  "placeholder:text-muted-foreground placeholder:italic focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] " +
  "focus:ring-offset-0 transition-shadow";

/**
 * Optional, progressively-revealed memory date.
 * Season + Year always visible. Year accepts ANY freeform text
 * (e.g. "1987", "late 80s") and is saved as when_text.
 * When a season is picked, the three months for that season + a
 * "Not Sure" pill appear inline.
 */
const MemoryDateInput = ({ value, onChange }: Props) => {
  const preview = formatMemoryDate(value);

  const setSeason = (season: MemorySeason | null) => {
    // Changing/clearing the season clears any month/day selection.
    onChange({ ...value, season, month: null, day: null });
  };

  const setYearText = (raw: string) => {
    // Try to parse a 4-digit numeric year as a fallback for backward-compat,
    // but the freeform string is the source of truth.
    const numericMatch = raw.match(/\b(\d{4})\b/);
    onChange({
      ...value,
      yearText: raw,
      year: numericMatch ? parseInt(numericMatch[1], 10) : null,
    });
  };

  const toggleMonth = (month: number) => {
    const next = value.month === month ? null : month;
    onChange({ ...value, month: next, day: next === null ? null : value.day });
  };

  const months = value.season ? SEASON_MONTHS[value.season] : [];
  const yearValue = value.yearText ?? (value.year ? String(value.year) : "");

  return (
    <div className="space-y-3">
      {preview && (
        <div className="flex justify-end">
          <span className="font-jost text-sm text-foreground/80">{preview}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <select
          aria-label="Season"
          value={value.season ?? ""}
          onChange={(e) =>
            setSeason((e.target.value || null) as MemorySeason | null)
          }
          className={fieldClass}
        >
          <option value="">Season</option>
          {SEASON_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <input
          type="text"
          aria-label="Year"
          placeholder="Year"
          value={yearValue}
          onChange={(e) => setYearText(e.target.value)}
          className={fieldClass}
        />
      </div>

      {value.season && (
        <div className="flex flex-wrap gap-2">
          {months.map((m) => {
            const selected = value.month === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => toggleMonth(m)}
                aria-pressed={selected}
                className={
                  "flex-1 min-w-[80px] h-10 rounded-[18px] font-jost text-sm tracking-wide transition-colors " +
                  (selected
                    ? "bg-[#4A6B8A] text-[#F2EEE5]"
                    : "bg-[#4A6B8A]/15 text-[#4A6B8A] hover:bg-[#4A6B8A]/25")
                }
              >
                {MONTH_SHORT[m - 1]}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => onChange({ ...value, month: null, day: null })}
            aria-pressed={value.month === null}
            className={
              "flex-1 min-w-[80px] h-10 rounded-[18px] font-jost text-sm tracking-wide transition-colors " +
              (value.month === null
                ? "bg-[#4A6B8A] text-[#F2EEE5]"
                : "bg-[#4A6B8A]/15 text-[#4A6B8A] hover:bg-[#4A6B8A]/25")
            }
          >
            Not Sure
          </button>
        </div>
      )}
    </div>
  );
};

export default MemoryDateInput;
