import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getPeople, getTouchstonesForPerson, type Person as PersonRecord } from "@/lib/people";
import MemoryCard from "@/components/MemoryCard";
import { Button } from "@/components/ui/button";

export default function Person() {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [person, setPerson] = useState<PersonRecord | null>(null);
  const [touchstones, setTouchstones] = useState<Awaited<ReturnType<typeof getTouchstonesForPerson>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!authLoading && !user) navigate("/auth", { replace: true });
    if (!user || !id) return;
    let active = true;
    setLoading(true);
    setError(false);
    Promise.all([getPeople(user.id), getTouchstonesForPerson(id)]).then(([people, memories]) => {
      if (!active) return;
      setPerson(people.find((p) => p.id === id) ?? null);
      setTouchstones(memories);
    }).catch(() => { if (active) setError(true); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user, authLoading, id, navigate]);
  return <main className="min-h-screen bg-background pb-28">
    <div className="mx-auto max-w-lg space-y-6 px-5 py-8">
      <Button asChild variant="ghost" className="px-0"><Link to="/archive"><ArrowLeft />Back</Link></Button>
      {loading || authLoading ? <p className="text-muted-foreground">Loading…</p> : error ? <p role="alert" className="text-destructive">Couldn't load this person's touchstones.</p> : !person ? <p className="text-muted-foreground">Person not found.</p> : <>
        <h1 className="font-playfair text-2xl text-foreground">{person.name}</h1>
        {touchstones.length ? <div className="grid grid-cols-2 gap-4">
          {touchstones.map((memory) => <MemoryCard key={memory.id} memory={memory} onClick={() => navigate(`/archive?memory=${memory.id}`)} />)}
        </div> : <p className="text-muted-foreground">No touchstones yet.</p>}
      </>}
    </div>
  </main>;
}