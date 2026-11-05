export const MIN_CITY_CHARACTERS = 2;
export const MAX_CITY_SUGGESTIONS = 5;
export type Place = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  types?: string[];
  addressComponents?: { longText?: string; shortText?: string; types?: string[] }[];
};
export function cityFields(place: Place) {
  const component = (type: string) => place.addressComponents?.find(c => c.types?.includes(type));
  const city = component('locality') ?? component('postal_town') ?? component('administrative_area_level_3');
  return {
    city: city?.longText ?? place.displayName?.text ?? '',
    region: component('administrative_area_level_1')?.longText ?? null,
    country: component('country')?.longText ?? null,
    place_id: place.id ?? null,
    location_display: place.formattedAddress ?? place.displayName?.text ?? '',
  };
}
const normalize = (value: string) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
export function confidentCity(query: string, places: Place[]) {
  const parts = query.split(',').map(normalize).filter(Boolean);
  const matches = places.filter(place => {
    if (!place.types?.some(type => ['locality', 'postal_town', 'administrative_area_level_3'].includes(type))) return false;
    const fields = cityFields(place);
    if (!fields.place_id || normalize(fields.city) !== parts[0]) return false;
    const allowed = new Set((place.addressComponents ?? []).flatMap(c => [normalize(c.longText ?? ''), normalize(c.shortText ?? '')]));
    return parts.slice(1).every(part => allowed.has(part));
  });
  // Multiple identically named cities are ambiguous, even if Google ranks one first.
  return matches.length === 1 ? cityFields(matches[0]) : null;
}