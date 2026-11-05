import { describe, expect, it } from 'vitest';
import { cityFields, confidentCity, MAX_CITY_SUGGESTIONS, MIN_CITY_CHARACTERS } from '../../supabase/functions/city-places/city';
import { freeTextCity } from './profileCity';
const seattle = {
  id: 'seattle-id', types: ['locality'], displayName: { text: 'Seattle' },
  addressComponents: [
    { longText: 'Seattle', types: ['locality'] },
    { longText: 'Washington', shortText: 'WA', types: ['administrative_area_level_1'] },
    { longText: 'United States', shortText: 'USA', types: ['country'] },
  ],
};
describe('city privacy rules', () => {
  it('starts suggestions after 2 characters', () => expect(MIN_CITY_CHARACTERS).toBe(2));
  it('offers at most 5 suggestions', () => expect(MAX_CITY_SUGGESTIONS).toBe(5));
  it('preserves free text with a null place ID', () => expect(freeTextCity('My hometown')).toEqual({ city: 'My hometown', region: null, country: null, place_id: null, location_display: 'My hometown' }));
  it('matches a city and supplied region confidently', () => expect(confidentCity('Seattle, WA, USA', [seattle])).toMatchObject({ city: 'Seattle', region: 'Washington', country: 'United States', place_id: 'seattle-id' }));
  it('leaves ambiguous cities unresolved', () => expect(confidentCity('Seattle', [seattle, { ...seattle, id: 'another-seattle' }])).toBeNull());
  it('rejects mismatched regions and approximate names', () => { expect(confidentCity('Seattle, Oregon', [seattle])).toBeNull(); expect(confidentCity('Seatle', [seattle])).toBeNull(); });
  it('does not accept a non-city result', () => expect(confidentCity('Seattle', [{ ...seattle, types: ['restaurant'] }])).toBeNull());
  it('does not request coordinates in saved city fields', () => { expect(cityFields(seattle)).not.toHaveProperty('lat'); expect(cityFields(seattle)).not.toHaveProperty('lng'); expect(cityFields(seattle)).not.toHaveProperty('location'); });
});