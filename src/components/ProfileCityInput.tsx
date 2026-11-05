import { useEffect, useRef, useState } from 'react';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { freeTextCity, type ProfileCity } from '@/lib/profileCity';

type Prediction = { place_id: string; description: string };
export default function ProfileCityInput({ value, onChange }: { value: ProfileCity; onChange: (value: ProfileCity) => void }) {
  const [suggestions, setSuggestions] = useState<Prediction[]>([]);
  const [error, setError] = useState('');
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(-1);
  const token = useRef<string | null>(null);
  const revision = useRef(0);
  const report = async (failure: unknown) => {
    const message = failure instanceof FunctionsHttpError ? await failure.context.text() : failure instanceof Error ? failure.message : 'City suggestions unavailable';
    console.error('City suggestions:', message);
    setError('City suggestions are unavailable. You can still save your text.');
  };
  useEffect(() => {
    const version = ++revision.current;
    setSuggestions([]);
    setActive(-1);
    if (!focused || value.place_id || value.city.trim().length < 2) return;
    const timer = window.setTimeout(async () => {
      token.current ??= crypto.randomUUID();
      const { data, error } = await supabase.functions.invoke('city-places', { body: { mode: 'autocomplete', input: value.city.trim(), sessionToken: token.current } });
      if (version !== revision.current) return;
      if (error) { await report(error); return; }
      setSuggestions((data?.predictions ?? []).slice(0, 5));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [value.city, value.place_id, focused]);
  const select = async (prediction: Prediction) => {
    const version = ++revision.current;
    const sessionToken = token.current;
    if (!sessionToken) return;
    setSuggestions([]);
    const { data, error } = await supabase.functions.invoke('city-places', { body: { mode: 'details', placeId: prediction.place_id, sessionToken } });
    token.current = null;
    if (version !== revision.current) return;
    if (error) { await report(error); return; }
    onChange(data as ProfileCity);
  };
  return <div className="relative">
    <Input id="profile-city" role="combobox" aria-autocomplete="list" aria-controls="profile-city-options" aria-expanded={suggestions.length > 0} aria-activedescendant={active >= 0 ? `city-option-${active}` : undefined} value={value.location_display || value.city} placeholder="City or town" autoComplete="off"
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      onChange={e => { ++revision.current; setError(''); if (!e.target.value.trim()) token.current = null; onChange(freeTextCity(e.target.value)); }}
      onKeyDown={e => {
        if (e.key === 'Escape') { ++revision.current; setSuggestions([]); }
        if (e.key === 'ArrowDown' && suggestions.length) { e.preventDefault(); setActive(i => (i + 1) % suggestions.length); }
        if (e.key === 'ArrowUp' && suggestions.length) { e.preventDefault(); setActive(i => (i <= 0 ? suggestions.length - 1 : i - 1)); }
        if (e.key === 'Enter' && suggestions[active]) { e.preventDefault(); void select(suggestions[active]); }
      }} />
    {suggestions.length > 0 && <div id="profile-city-options" role="listbox" className="absolute z-20 mt-1 w-full rounded-md border border-border bg-popover text-popover-foreground shadow-md">
      {suggestions.map((p, i) => <Button key={p.place_id} id={`city-option-${i}`} role="option" aria-selected={active === i} variant="ghost" className="h-auto min-h-11 w-full justify-start whitespace-normal text-left" onMouseDown={e => e.preventDefault()} onClick={() => void select(p)}>{p.description}</Button>)}
      <p className="px-3 pb-2 text-xs text-muted-foreground">Google Maps</p>
    </div>}
    {error && <p role="status" className="mt-2 text-sm text-muted-foreground">{error}</p>}
  </div>;
}