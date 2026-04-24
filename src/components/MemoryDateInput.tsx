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
  "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[hsl(var(--gold))] " +
  "focus:ring-offset-0 transition-shadow";

/**
 * Optional, progressively-revealed memory date.
 * Season + Year always visible. When a season is picked, the three
 * months for that season appear inline as pills. Month is optional.
 */
const MemoryDateInput = ({ value, onChange }: Props) => {
  const preview = formatMemoryDate(value);

  const setSeason = (season: MemorySeason | null) => {
    // Changing/clearing the season clears any month/day selection.
    onChange({ ...value, season, month: null, day: null });
  };

  const setYear = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 4);
    const year = digits ? parseInt(digits, 10) : null;
    onChange(
      year === null
        ? { ...value, year: null, month: null, day: null }
        : { ...value, year }
    );
  };

  const toggleMonth = (month: number) => {
    const next = value.month === month ? null : month;
    onChange({ ...value, month: next, day: next === null ? null : value.day });
  };

  const months = value.season ? SEASON_MONTHS[value.season] : [];

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <label className="font-jost text-sm font-light text-muted-foreground">
          When was this?
        </label>
        {preview && (
          <span className="font-jost text-sm text-foreground/80">{preview}</span>
        )}
      </div>

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
          inputMode="numeric"
          pattern="[0-9]*"
          aria-label="Year"
          placeholder="Year"
          value={value.year ?? ""}
          onChange={(e) => setYear(e.target.value)}
          className={fieldClass}
        />
      </div>

      {value.season && (
        <div className="flex gap-2">
          {months.map((m) => {
            const selected = value.month === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => toggleMonth(m)}
                aria-pressed={selected}
                className={
                  "flex-1 h-10 rounded-full font-jost text-sm tracking-wide transition-colors " +
                  (selected
                    ? "bg-[#B8860B] text-[#FBF8F1]"
                    : "bg-[#E8E4D8] text-[#2C3E50] hover:bg-[#ddd6c4]")
                }
              >
                {MONTH_SHORT[m - 1]}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MemoryDateInput;
