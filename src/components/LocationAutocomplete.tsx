import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";
import { MapPin, Loader2 } from "lucide-react";

export interface LocationValue {
  name: string;
  lat: number | null;
  lng: number | null;
}

interface Prediction {
  place_id: string;
  description: string;
  main_text: string;
  secondary_text: string;
}

interface Props {
  value: string;
  onChange: (value: LocationValue) => void;
  placeholder: string;
  label?: string;
}

const inputClass = "h-11 text-base bg-card border-0 placeholder:italic";

/**
 * Google Places autocomplete input.
 * Calls the `places-search` edge function (which holds the API key).
 * Selecting a prediction fetches details and reports lat/lng to the parent.
 */
const LocationAutocomplete = ({ value, onChange, placeholder, label }: Props) => {
  const [query, setQuery] = useState(value);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [justSelected, setJustSelected] = useState(false);
  const debounced = useDebounce(query, 250);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    if (justSelected) {
      setJustSelected(false);
      return;
    }
    if (!debounced || debounced.length < 2) {
      setPredictions([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const session = (await supabase.auth.getSession()).data.session;
        if (!session) return;
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/places-search?mode=autocomplete&q=${encodeURIComponent(debounced)}`;
        const r = await fetch(url, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const d = await r.json();
        if (!cancelled) {
          setPredictions(d.predictions ?? []);
          setOpen(true);
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debounced, justSelected]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const select = async (p: Prediction) => {
    setJustSelected(true);
    setQuery(p.description);
    setOpen(false);
    setPredictions([]);
    onChange({ name: p.description, lat: null, lng: null });
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) return;
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/places-search?mode=details&place_id=${encodeURIComponent(p.place_id)}`;
      const r = await fetch(url, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const d = await r.json();
      onChange({
        name: d.formatted_address || p.description,
        lat: d.lat ?? null,
        lng: d.lng ?? null,
      });
      setQuery(d.formatted_address || p.description);
    } catch {
      /* ignore */
    }
  };

  const selectCustom = () => {
    const text = query.trim();
    if (!text) return;
    setJustSelected(true);
    setQuery(text);
    setOpen(false);
    setPredictions([]);
    onChange({ name: text, lat: null, lng: null });
  };

  const trimmedQuery = query.trim();
  const showCustom = trimmedQuery.length >= 2;
  const showDropdown = open && (predictions.length > 0 || showCustom);

  return (
    <div className="space-y-1.5" ref={containerRef}>
      {label && (
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </Label>
      )}
      <div className="relative">
        <Input
          type="text"
          value={query}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange({ name: e.target.value, lat: null, lng: null });
            if (e.target.value.trim().length >= 2) setOpen(true);
          }}
          onFocus={() => (predictions.length > 0 || trimmedQuery.length >= 2) && setOpen(true)}
          className={inputClass}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground" />
        )}
        {showDropdown && (
          <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover shadow-lg">
            {predictions.map((p) => (
              <button
                key={p.place_id}
                type="button"
                onClick={() => select(p)}
                className="flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm hover:bg-muted"
              >
                <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <div className="truncate font-medium text-foreground">
                    {p.main_text}
                  </div>
                  {p.secondary_text && (
                    <div className="truncate text-xs text-muted-foreground">
                      {p.secondary_text}
                    </div>
                  )}
                </div>
              </button>
            ))}
            {showCustom && (
              <button
                type="button"
                onClick={selectCustom}
                className={
                  "flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm hover:bg-muted " +
                  (predictions.length > 0 ? "border-t border-border" : "")
                }
              >
                <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <div className="truncate font-medium text-foreground">
                    Use “{trimmedQuery}” as a custom location
                  </div>
                </div>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LocationAutocomplete;
