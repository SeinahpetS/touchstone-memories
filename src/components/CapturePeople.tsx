import { useEffect, useId, useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createPerson, getPeople, type Person } from "@/lib/people";

interface Props {
  userId: string;
  selected: Person[];
  onChange: (people: Person[]) => void;
}

export default function CapturePeople({ userId, selected, onChange }: Props) {
  const id = useId();
  const [expanded, setExpanded] = useState(false);
  const [name, setName] = useState("");
  const [people, setPeople] = useState<Person[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!expanded) return;
    let active = true;
    getPeople(userId).then((rows) => {
      if (active) { setPeople(rows); setLoaded(true); setError(null); }
    }).catch(() => { if (active) setError("Couldn't load names. You can still save."); });
    return () => { active = false; };
  }, [expanded, userId]);

  const query = name.trim();
  const normalized = query.toLowerCase();
  const matches = people.filter((p) => p.name.toLowerCase().includes(normalized) && !selected.some((s) => s.id === p.id));
  const exact = [...people, ...selected].some((p) => p.name.toLowerCase() === normalized);
  const select = (person: Person) => {
    if (!selected.some((p) => p.id === person.id)) onChange([...selected, person]);
    setName("");
    setError(null);
  };
  const add = async () => {
    if (!query || adding) return;
    setAdding(true);
    try {
      const person = await createPerson(userId, query);
      setPeople((prev) => prev.some((p) => p.id === person.id) ? prev : [...prev, person]);
      select(person);
    } catch { setError("Couldn't add that name. You can still save."); }
    finally { setAdding(false); }
  };

  return (
    <div className="capture-people">
      <Button type="button" variant="ghost" className="capture-people-toggle" aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded((v) => !v)}>
        With someone? <Plus aria-hidden="true" />
      </Button>
      {expanded && <div id={id} className="space-y-2">
        <Input autoFocus placeholder="Type a name" aria-label="Type a name" autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} className="bg-card border-0" />
        {query && loaded && <div className="flex flex-wrap gap-2">
          {matches.map((person) => <Button key={person.id} type="button" variant="ghost" className="capture-person-chip" onClick={() => select(person)}>{person.name}</Button>)}
          {!exact && <Button type="button" variant="ghost" className="capture-person-chip" disabled={adding} onClick={add}><Plus aria-hidden="true" />Add {query}</Button>}
        </div>}
        {error && <p role="status" className="text-sm text-destructive">{error}</p>}
      </div>}
      {selected.length > 0 && <div className="mt-2 flex flex-wrap gap-2">
        {selected.map((person) => <Button key={person.id} type="button" variant="ghost" className="capture-person-chip" aria-label={`Remove ${person.name}`} onClick={() => onChange(selected.filter((p) => p.id !== person.id))}><span className="truncate">{person.name}</span><X aria-hidden="true" className="!size-3" /></Button>)}
      </div>}
    </div>
  );
}