import { useEffect, useId, useState } from "react";
import { MapPin, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CityRow } from "@/lib/globeLocation";
import { loadCities, matchCity, rankCities, whereModeFor, type CaptureCity } from "@/lib/captureLocation";

interface Props {
  category: string | null;
  value: CaptureCity | null;
  fromPhoto: boolean;
  onChange: (value: CaptureCity | null, fromPhoto: boolean) => void;
}

/** Optional "Where?" row: city-level only, never blocks save. */
export default function CaptureWhere({ category, value, fromPhoto, onChange }: Props) {
  const id = useId();
  const mode = whereModeFor(category);
  const [expanded, setExpanded] = useState(mode === "open");
  const [text, setText] = useState("");
  const [rows, setRows] = useState<CityRow[] | null>(null);
  useEffect(() => { setExpanded(mode === "open"); }, [mode]);
  useEffect(() => {
    if (!expanded || rows) return;
    let active = true;
    loadCities().then(r => { if (active) setRows(r); }).catch(() => {});
    return () => { active = false; };
  }, [expanded, rows]);
  if (mode === "hidden") return null;

  const label = mode === "met" ? "Where did you meet?" : "Where?";
  const query = text.trim();
  const suggestions = rows && query.length >= 2 ? rankCities(rows, query) : [];
  const exact = suggestions.some(s => s.name.toLowerCase() === query.toLowerCase());
  const pick = (city: CaptureCity) => { onChange(city, false); setText(""); setExpanded(false); };
  const useText = () => { if (query) pick(rows ? matchCity(rows, query) : { name: query, lat: null, lng: null }); };

  if (value && !expanded) {
    return (
      <div className="capture-people capture-where">
        <div className="flex items-center gap-2">
          <button type="button" className="capture-where-value" onClick={() => { setText(""); setExpanded(true); }} aria-label={`Change location, ${value.name}`}>
            <MapPin size={14} aria-hidden="true" />
            <span>{fromPhoto ? `Photo taken in ${value.name}` : mode === "met" ? `Met at ${value.name}` : value.name}</span>
          </button>
          <button type="button" className="capture-where-remove" aria-label="Remove location" onClick={() => onChange(null, false)}><X size={14} /></button>
        </div>
      </div>
    );
  }

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
      </div>}
    </div>
  );
}
