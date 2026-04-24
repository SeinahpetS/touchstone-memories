import { Input } from "@/components/ui/input";
import LocationAutocomplete from "@/components/LocationAutocomplete";
import SpotifySearch, { type SpotifyPick } from "@/components/SpotifySearch";
import BookSearch, { type BookPick } from "@/components/BookSearch";
import ImprintTypeSelector, { type ImprintType } from "@/components/ImprintTypeSelector";
import type { CategoryKey } from "@/components/CategoryIcon";

export interface CategoryFieldValues {
  locationName: string;
  locationLat: number | null;
  locationLng: number | null;
  venueName: string;
  relationshipType: "personal" | "professional" | "";
  spotifyPick: SpotifyPick | null;
  bookPick: BookPick | null;
  imprintSource: "photo" | "spotify" | "book";
  imprintType: ImprintType | null;
}

interface Props {
  category: CategoryKey;
  values: CategoryFieldValues;
  onChange: (next: Partial<CategoryFieldValues>) => void;
}

const inputClass = "h-11 text-base bg-card border-0";

/**
 * Category-specific optional fields.
 * Place / People / Object / Food / Moment → location autocomplete (Google Places).
 * People → relationship type toggle.
 * Food → restaurant name.
 * Imprint → source selector + Spotify or Open Library search.
 * Sound → audio upload placeholder (disabled).
 */
const CategoryFields = ({ category, values, onChange }: Props) => {
  const showLocation = ["moment", "person", "object", "place", "food"].includes(
    category
  );
  const locationPlaceholder =
    category === "person"
      ? "Where did you meet?"
      : category === "object"
      ? "Where is this from?"
      : category === "place"
      ? "Venue or address"
      : "Add a location";

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
        <div className="space-y-3">
          <label className="font-jost text-sm font-light text-muted-foreground">
            Where was this?
          </label>
          <LocationAutocomplete
            value={values.locationName}
            placeholder={locationPlaceholder}
            onChange={(loc) =>
              onChange({
                locationName: loc.name,
                locationLat: loc.lat,
                locationLng: loc.lng,
              })
            }
          />
        </div>
      )}

      {category === "sound" && (
        <div className="rounded-md bg-card px-4 py-3 text-sm text-muted-foreground">
          Audio capture coming soon
        </div>
      )}

      {category === "imprint" && (
        <div className="space-y-4">
          <ImprintTypeSelector
            value={values.imprintType}
            onChange={(t) => {
              // Map sub-type to the underlying capture source.
              const source: CategoryFieldValues["imprintSource"] =
                t === "music" ? "spotify" : t === "book" ? "book" : "photo";
              onChange({ imprintType: t, imprintSource: source });
            }}
          />
          {values.imprintType === "music" && (
            <SpotifySearch
              value={values.spotifyPick}
              onChange={(pick) => onChange({ spotifyPick: pick })}
            />
          )}
          {values.imprintType === "book" && (
            <BookSearch
              value={values.bookPick}
              onChange={(pick) => onChange({ bookPick: pick })}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default CategoryFields;
