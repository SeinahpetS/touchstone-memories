import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CategoryKey } from "@/components/CategoryIcon";

export interface CategoryFieldValues {
  locationName: string;
  venueName: string;
  relationshipType: "personal" | "professional" | "";
  spotifyId: string;
  openlibraryId: string;
  imprintSource: "photo" | "spotify" | "book";
}

interface Props {
  category: CategoryKey;
  values: CategoryFieldValues;
  onChange: (next: Partial<CategoryFieldValues>) => void;
}

const inputClass = "h-11 text-base bg-card border-0";

/**
 * Renders the category-specific optional fields per the brief.
 * Place/People/Object/Food show a location input.
 * People adds a relationship-type toggle.
 * Food adds a restaurant name field.
 * Imprints show a source selector (photo / Spotify / Open Library).
 * Sound shows a disabled audio-upload placeholder.
 */
const CategoryFields = ({ category, values, onChange }: Props) => {
  const showLocation = ["moment", "person", "object", "place", "food"].includes(category);
  const locationLabel =
    category === "person"
      ? "Where did you meet?"
      : category === "object"
      ? "Where is this from?"
      : category === "place"
      ? "Place (venue or address)"
      : "Location (optional)";
  const locationRequired = category === "place";

  return (
    <div className="space-y-4">
      {category === "person" && (
        <div className="flex items-center gap-2">
          {(["personal", "professional"] as const).map((t) => {
            const active = values.relationshipType === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() =>
                  onChange({ relationshipType: active ? "" : t })
                }
                className={[
                  "flex-1 h-11 rounded-md text-sm capitalize transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-foreground hover:bg-muted",
                ].join(" ")}
                aria-pressed={active}
              >
                {t}
              </button>
            );
          })}
        </div>
      )}

      {category === "food" && (
        <Input
          type="text"
          placeholder="Restaurant name (optional)"
          value={values.venueName}
          onChange={(e) => onChange({ venueName: e.target.value })}
          className={inputClass}
        />
      )}

      {showLocation && (
        <div className="space-y-1.5">
          {locationRequired && (
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              {locationLabel}
            </Label>
          )}
          <Input
            type="text"
            placeholder={locationRequired ? "Venue or address" : locationLabel}
            value={values.locationName}
            onChange={(e) => onChange({ locationName: e.target.value })}
            className={inputClass}
          />
        </div>
      )}

      {category === "sound" && (
        <div className="rounded-md bg-card px-4 py-3 text-sm text-muted-foreground">
          Audio capture coming soon
        </div>
      )}

      {category === "imprint" && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { v: "photo", label: "Photo" },
                { v: "spotify", label: "Spotify" },
                { v: "book", label: "Book" },
              ] as const
            ).map((opt) => {
              const active = values.imprintSource === opt.v;
              return (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => onChange({ imprintSource: opt.v })}
                  className={[
                    "h-11 rounded-md text-sm transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-foreground hover:bg-muted",
                  ].join(" ")}
                  aria-pressed={active}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          {values.imprintSource === "spotify" && (
            <Input
              type="text"
              placeholder="Spotify search coming soon — paste track/album link"
              value={values.spotifyId}
              onChange={(e) => onChange({ spotifyId: e.target.value })}
              className={inputClass}
            />
          )}
          {values.imprintSource === "book" && (
            <Input
              type="text"
              placeholder="Book search coming soon — type a title"
              value={values.openlibraryId}
              onChange={(e) => onChange({ openlibraryId: e.target.value })}
              className={inputClass}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default CategoryFields;
