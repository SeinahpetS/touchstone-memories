import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { getMentionsForTouchstone, type Person } from '@/lib/people';
import { createShare } from '@/lib/shares';
import { canSendCopy, deliverCopyLink } from '@/lib/sendCopy';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';

export default function SendCopy({ touchstoneId, mentionedPeople }: { touchstoneId: string; mentionedPeople?: Person[] }) {
  const { user } = useAuth();
  const [details, setDetails] = useState<{ id: string; userId: string; ownerId: string; received: string | null; note: string | null; hasLocation: boolean } | null>(null);
  const [open, setOpen] = useState(false);
  const [people, setPeople] = useState<Person[]>([]);
  const [personId, setPersonId] = useState<string | null>(null);
  const [includeNote, setIncludeNote] = useState(false);
  const [includeLocation, setIncludeLocation] = useState(false);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const creating = useRef(false);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => {
    if (!user) return;
    let active = true;
    supabase.from('touchstones').select('user_id,received_from_user_id,note,location_lat,location_lng')
      .eq('id', touchstoneId).eq('user_id', user.id).maybeSingle().then(({ data, error }) => {
        if (active && !error && data) setDetails({ id: touchstoneId, userId: user.id, ownerId: data.user_id, received: data.received_from_user_id, note: data.note, hasLocation: data.location_lat != null && data.location_lng != null });
      });
    return () => { active = false; };
  }, [touchstoneId, user?.id]);

  useEffect(() => {
    if (!open || !user) return;
    let active = true;
    setFirstName(null);
    supabase.from('profiles').select('first_name,name').eq('id', user.id).single().then(({ data, error }) => {
      if (!active) return;
      if (error || !data) { setError("Couldn't create a link. Try again."); return; }
      setFirstName((data.first_name?.trim() || data.name?.trim() || '').split(/\s+/)[0]);
    });
    if (mentionedPeople) setPeople(mentionedPeople);
    else getMentionsForTouchstone(touchstoneId).then(rows => { if (active) setPeople(rows); }).catch(() => { if (active) setPeople([]); });
    return () => { active = false; };
  }, [open, touchstoneId, user?.id, mentionedPeople]);

  if (!user || details?.id !== touchstoneId || details.userId !== user.id || !canSendCopy(details.ownerId, details.received, user.id)) return null;

  const changeOpen = (next: boolean) => {
    if (busy) return;
    setOpen(next);
    if (next) { setPersonId(null); setIncludeNote(false); setIncludeLocation(false); setError(''); setPeople(mentionedPeople ?? []); }
  };
  const create = async () => {
    if (creating.current || firstName === null) return;
    creating.current = true; setBusy(true); setError('');
    try {
      const token = await createShare(touchstoneId, personId, Boolean(details.note?.trim()) && includeNote, details.hasLocation && includeLocation);
      const result = await deliverCopyLink(firstName, token);
      if (result === 'cancelled') return;
      setOpen(false);
      if (result === 'copied') {
        setCopied(true);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), 2000);
      }
    } catch { setError("Couldn't create a link. Try again."); }
    finally { creating.current = false; setBusy(false); }
  };

  return <div className="send-copy-row">
    <Button variant="ghost" className="send-copy-text" onClick={() => changeOpen(true)}>Send a copy</Button>
    <Sheet open={open} onOpenChange={changeOpen}>
      <SheetContent side="bottom" className="send-copy-sheet">
        <div className="mx-auto max-w-md space-y-5">
          <SheetTitle className="send-copy-title">Send a copy</SheetTitle>
          {people.length > 0 && <div className="capture-people flex flex-wrap gap-2" aria-label="Choose a person">
            {people.map(person => <Button key={person.id} variant="ghost" className="capture-person-chip send-copy-chip"
              aria-pressed={personId === person.id} onClick={() => setPersonId(personId === person.id ? null : person.id)} disabled={busy}>{person.name}</Button>)}
          </div>}
          {details.note?.trim() && <div className="send-copy-note flex items-center justify-between gap-4">
            <label htmlFor={`send-note-${touchstoneId}`}>Include my note</label>
            <Switch id={`send-note-${touchstoneId}`} checked={includeNote} onCheckedChange={setIncludeNote} disabled={busy} />
          </div>}
          {details.hasLocation && <div className="send-copy-note flex items-center justify-between gap-4">
            <label htmlFor={`send-location-${touchstoneId}`}>Include location</label>
            <Switch id={`send-location-${touchstoneId}`} checked={includeLocation} onCheckedChange={setIncludeLocation} disabled={busy} />
          </div>}
          <SheetDescription className="send-copy-helper">They'll get their own copy to keep. Link works for 14 days.</SheetDescription>
          {error && <p role="alert" className="send-copy-error">{error}</p>}
          <Button className="w-full" disabled={busy || firstName === null} onClick={create}>{busy ? 'Creating…' : 'Create link'}</Button>
        </div>
      </SheetContent>
    </Sheet>
    {copied && createPortal(<div role="status" className="send-copy-feedback">Link copied.</div>, document.body)}
  </div>;
}