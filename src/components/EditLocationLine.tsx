import { useState } from "react";
import { MapPin } from "lucide-react";
import LocationAutocomplete, { type LocationValue } from "@/components/LocationAutocomplete";
import { Button } from "@/components/ui/button";

interface Props { name: string; lat: number | null; lng: number | null; onChange: (v: LocationValue) => void }

/** Edit-mode location line: tap to change the city or remove the location. */
const EditLocationLine = ({ name, lat, lng, onChange }: Props) => {
  const [open, setOpen] = useState(false);
  if (!name.trim() && lat == null) return null;
  return (
    <div className="space-y-2">
      <button type="button" className="artifact-location-line" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <MapPin size={14} color="#B8860B" aria-hidden="true" /> <span>{name.trim() || "Pinned location"}</span>
      </button>
      {open && <div className="space-y-2">
        <LocationAutocomplete value="" placeholder="Change the city" onChange={v => { if (v.lat != null) { onChange(v); setOpen(false); } }} />
        <Button type="button" variant="ghost" className="w-full" onClick={() => { onChange({ name: "", lat: null, lng: null }); setOpen(false); }}>Remove location</Button>
      </div>}
    </div>
  );
};
export default EditLocationLine;
