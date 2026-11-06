import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMentionsForTouchstone, type Person } from "@/lib/people";
import { Button } from "@/components/ui/button";

export default function ArtifactMentions({ touchstoneId, people }: { touchstoneId?: string; people?: Person[] }) {
  const [loaded, setLoaded] = useState<{ id: string; people: Person[] } | null>(null);
  useEffect(() => {
    if (!touchstoneId || people) return;
    let active = true;
    getMentionsForTouchstone(touchstoneId).then((rows) => {
      if (active) setLoaded({ id: touchstoneId, people: rows });
    }).catch(() => { if (active) setLoaded({ id: touchstoneId, people: [] }); });
    return () => { active = false; };
  }, [touchstoneId, people]);
  const mentions = people ?? (loaded?.id === touchstoneId ? loaded.people : []);
  if (!mentions.length) return null;
  return <div className="capture-people flex items-center gap-2 text-sm text-foreground" aria-label="People mentioned">
    <span className="shrink-0">With</span>
    <div className="flex min-w-0 items-center gap-2 overflow-x-auto">
      {mentions.map((person) => <Button key={person.id} asChild variant="ghost" className="capture-person-chip shrink-0">
        <Link to={`/person/${person.id}`}>{person.name}</Link>
      </Button>)}
    </div>
  </div>;
}