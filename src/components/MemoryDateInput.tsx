import {
  MONTH_OPTIONS,
  SEASON_OPTIONS,
  formatMemoryDate,
  type MemoryDate,
  type MemorySeason,
} from "@/lib/memoryDate";

interface Props {
  value: MemoryDate;
  onChange: (next: MemoryDate) => void;
}

const fieldClass =
  "h-11 w-full rounded-md bg-[#E8E4D8] border-0 px-3 text-base font-jost text-foreground " +
  "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[hsl(var(--gold))] " +
  "focus:ring-offset-0 transition-shadow";

/**
 * Optional, progressively-revealed memory date.
 * Season + Year always visible. Month appears once Year is set.
 * Day appears once Month is set. Nothing is required.
 */
const MemoryDateInput = ({ value, onChange }: Props) => {
  const preview = formatMemoryDate(value);

  const setSeason = (season: MemorySeason | null) =>
    onChange({ ...value, season });

  const setYear = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 4);
    const year = digits ? parseInt(digits, 10) : null;
    // Clearing the year cascades — month and day no longer make sense.
    onChange(
      year === null
        ? { ...value, year: null, month: null, day: null }
        : { ...value, year }
    );
  };

  const setMonth = (raw: string) => {
    const month = raw ? parseInt(raw, 10) : null;
    // Clearing the month cascades — day no longer makes sense.
    onChange(
      month === null
        ? { ...value, month: null, day: null }
        : { ...value, month }
    );
  };

  const setDay = (raw: string) => {
    if (raw === "") {
      onChange({ ...value, day: null });
      return;
    }
    const digits = raw.replace(/\D/g, "").slice(0, 2);
    let day = parseInt(digits, 10);
    if (Number.isNaN(day)) {
      onChange({ ...value, day: null });
      return;
    }
    if (day < 1) day = 1;
    if (day > 31) day = 31;
    onChange({ ...value, day });
  };

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

      {value.year !== null && (
        <select
          aria-label="Month"
          value={value.month ?? ""}
          onChange={(e) => setMonth(e.target.value)}
          className={fieldClass}
        >
          <option value="">Month</option>
          {MONTH_OPTIONS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      )}

      {value.year !== null && value.month !== null && (
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          aria-label="Day"
          placeholder="Day"
          value={value.day ?? ""}
          onChange={(e) => setDay(e.target.value)}
          className={fieldClass}
        />
      )}
    </div>
  );
};

export default MemoryDateInput;
