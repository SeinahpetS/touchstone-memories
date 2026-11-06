import { useEffect, useId, useRef, useState } from "react";
import { MapPin, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CityRow } from "@/lib/globeLocation";
import { loadCities, matchCity, rankCities, whereModeFor, type CaptureCity } from "@/lib/captureLocation";
import { cityFromGoogle, googleLabel, readGoogleConsent, searchGooglePlaces, writeGoogleConsent, type GooglePlace } from "@/lib/wherePlaces";

interface Props {
  category: string | null;
  value: CaptureCity | null;
  fromPhoto: boolean;
  onChange: (value: CaptureCity | null, fromPhoto: boolean) => void;
}

/** Optional "Where?" row: city-level only, never blocks save. GeoNames first; Google only as an opted-in fallback. */
export default function CaptureWhere({ category, value, fromPhoto, onChange }: Props) {
  const id = useId();
  const mode = whereModeFor(category);
  const [expanded, setExpanded] = useState(mode === "open");
  const [text, setText] = useState("");
  const [rows, setRows] = useState<CityRow[] | null>(null);
  const [consent, setConsent] = useState(readGoogleConsent);
  const [forced, setForced] = useState(false);
  const [google, setGoogle] = useState<GooglePlace[] | null>(null);
  const [googleError, setGoogleError] = useState(false);
  const session = useRef<string | null>(null);
  useEffect(() => { setExpanded(mode === "open"); }, [mode]);
  useEffect(() => {
    if (!expanded || rows) return;
    let active = true;
    loadCities().then(r => { if (active) setRows(r); }).catch(() => {});
    return () => { active = false; };
  }, [expanded, rows]);

  const query = text.trim();
  const suggestions = rows && query.length >= 2 ? rankCities(rows, query) : [];
  const exact = suggestions.some(s => s.name.toLowerCase() === query.toLowerCase());
  const needsMore = query.length >= 2 && rows !== null && suggestions.length === 0;
  const wantGoogle = query.length >= 2 && (forced || needsMore);
  const runGoogle = wantGoogle && consent === "yes";

  // Debounced Google fallback; stale responses are ignored.
  useEffect(() => {
    if (!runGoogle) { setGoogle(null); return; }
    let active = true;
    session.current ??= crypto.randomUUID();
    const t = setTimeout(() => {
      searchGooglePlaces(query, session.current!).then(p => { if (active) { setGoogle(p); setGoogleError(false); } })
        .catch(() => { if (active) { setGoogle([]); setGoogleError(true); } });
    }, 350);
    return () => { active = false; clearTimeout(t); };
  }, [runGoogle, query]);

  if (mode === "hidden") return null;
  const label = mode === "met" ? "Where did you meet?" : "Where?";
  const reset = () => { setText(""); setForced(false); setGoogle(null); session.current = null; };
  const pick = (city: CaptureCity) => { onChange(city, false); reset(); setExpanded(false); };
  const useText = () => { if (query) pick(rows ? matchCity(rows, query) : { name: query, lat: null, lng: null }); };
  const decide = (v: "yes" | "no") => { writeGoogleConsent(v); setConsent(v); if (v === "no") setForced(false); };

  if (value && !expanded) {
    return (
      <div className="capture-people capture-where">
        <div className="flex items-center gap-2">
          <button type="button" className="capture-where-value" onClick={() => { reset(); setExpanded(true); }} aria-label={`Change location, ${value.name}`}>
            <MapPin size={14} aria-hidden="true" />
            <span>{fromPhoto ? `Photo taken in ${value.name}` : mode === "met" ? `Met at ${value.name}` : value.name}</span>
          </button>
          <button type="button" className="capture-where-remove" aria-label="Remove location" onClick={() => onChange(null, false)}><X size={14} /></button>
        </div>
      </div>
    );
  }

  const showPrompt = wantGoogle && consent === null;
  return (
    <div className="capture-people capture-where">
      <Button type="button" variant="ghost" className="capture-people-toggle" aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded(v => !v)}>
        {label} <Plus aria-hidden="true" />
      </Button>
      {expanded && <div id={id} className="space-y-2">
        <Input autoFocus={mode !== "open"} placeholder="Type a city or place" aria-label="Type a city or place" autoComplete="off" value={text}
          onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); useText(); } }} className="bg-card border-0" />
        {query.length >= 2 && <div className="flex flex-wrap gap-2">
          {suggestions.map(s => <Button key={s.name} type="button" variant="ghost" className="capture-person-chip" onClick={() => pick(s)}>{s.name}</Button>)}
          {!exact && <Button type="button" variant="ghost" className="capture-person-chip" onClick={useText}>Use “{query}”</Button>}
        </div>}
        {runGoogle && google && google.length > 0 && <div className="where-google" role="group" aria-label="Results from Google Maps">
          <div className="flex flex-wrap gap-2">
            {google.map(p => <Button key={p.placeId} type="button" variant="ghost" className="capture-person-chip" onClick={() => pick({ ...cityFromGoogle(rows, p), name: cityFromGoogle(rows, p).lat != null ? cityFromGoogle(rows, p).name : googleLabel(p) })}>{googleLabel(p)}</Button>)}
          </div>
          <p className="where-google-logo" aria-label="Results from Google Maps">Google Maps</p>
        </div>}
        {runGoogle && google?.length === 0 && <p className="where-google-note">{googleError ? "Couldn't search Google right now." : "No more places found."}</p>}
        {showPrompt && <div className="where-google-consent" role="dialog" aria-label="Search more places with Google">
          <p>Search more places with Google? Google sees what you type, not who you are.</p>
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={() => decide("yes")}>Search with Google</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => decide("no")}>Keep it private</Button>
          </div>
        </div>}
        {query.length >= 2 && !wantGoogle && !showPrompt && <button type="button" className="where-google-more" onClick={() => { setForced(true); if (consent === "no") decide("yes"); }}>Search more places</button>}
        {query.length >= 2 && needsMore && consent === "no" && !forced && <button type="button" className="where-google-more" onClick={() => { setForced(true); decide("yes"); }}>Search more places</button>}
      </div>}
    </div>
  );
}
