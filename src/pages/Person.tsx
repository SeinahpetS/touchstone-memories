import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getPeople, getTouchstonesForPerson, getPersonTouchstone, type Person as PersonRecord } from "@/lib/people";
import MemoryCard from "@/components/MemoryCard";
import MemoryPhoto from "@/components/MemoryPhoto";
import QuickCaptureSheet from "@/components/QuickCaptureSheet";
import { Button } from "@/components/ui/button";

export default function Person() {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [person, setPerson] = useState<PersonRecord | null>(null);
  const [touchstones, setTouchstones] = useState<Awaited<ReturnType<typeof getTouchstonesForPerson>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    if (!authLoading && !user) navigate("/auth", { replace: true });
    if (!user || !id) return;
    let active = true;
    setLoading(true);
    setError(false);
    Promise.all([getPeople(user.id), getTouchstonesForPerson(id)]).then(async ([people, memories]) => {
      const current = people.find((p) => p.id === id) ?? null;
      const portrait = current?.people_touchstone_id ? await getPersonTouchstone(user.id, current.people_touchstone_id) : null;
      if (!active) return;
      setPerson(current);
      setPhotoUrl(portrait?.photo_url ?? null);
      setTouchstones(memories);
    }).catch(() => { if (active) setError(true); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user, authLoading, id, navigate, refresh]);
  return <main className="person-page min-h-screen pb-28">
    <div className="mx-auto max-w-lg space-y-6 px-5 py-8">
      <Button asChild variant="ghost" className="px-0"><Link to="/archive"><ArrowLeft />Back</Link></Button>
      {loading || authLoading ? <p className="text-muted-foreground">Loading…</p> : error ? <p role="alert" className="text-destructive">Couldn't load this person's touchstones.</p> : !person ? <p className="text-muted-foreground">Person not found.</p> : <>
        <header className="flex items-center gap-4">
          {person.people_touchstone_id && photoUrl && <MemoryPhoto src={photoUrl} alt={person.name} className="h-24 w-24 shrink-0 rounded-full object-cover" />}
          <div className="min-w-0">
            <h1 className="person-name font-playfair text-[32px] leading-tight break-words">{person.name}</h1>
            {!person.people_touchstone_id && <Button type="button" variant="link" className="mt-2 h-auto max-w-full whitespace-normal p-0 text-left text-sm text-muted-foreground font-normal" onClick={() => setCaptureOpen(true)}>Capture {person.name} as a Person</Button>}
          </div>
        </header>
        {touchstones.length ? <div className="grid grid-cols-2 gap-4">
          {touchstones.map((memory) => <MemoryCard key={memory.id} memory={memory} onClick={() => navigate(`/archive?memory=${memory.id}`)} />)}
        </div> : <p className="text-muted-foreground">No touchstones yet.</p>}
      </>}
    </div>
    <QuickCaptureSheet open={captureOpen} onClose={() => setCaptureOpen(false)} initialCategory="person" capturePersonId={person?.id} onPersonLinked={() => setRefresh((v) => v + 1)} />
  </main>;
}