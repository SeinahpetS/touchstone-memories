import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { getSharePreview, keepTouchstoneShare, KeepError, isTerminalKeepError, keepErrorMessage, clearPendingKeep, type SharePreview, type KeepErrorCode } from '@/lib/keep';
import { PENDING_KEEP_KEY } from '@/lib/postSignInRoute';
import { playSaveFeedback } from '@/lib/saveFeedback';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import MemoryArtifact from '@/components/MemoryArtifact';
import ReceivedRecollection from '@/components/ReceivedRecollection';
import QuickCaptureSheet from '@/components/QuickCaptureSheet';
import type { MemorySeason } from '@/lib/memoryDate';

export default function Keep() {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [preview, setPreview] = useState<SharePreview | null>(null);
  const [terminal, setTerminal] = useState<KeepErrorCode | null>(null);
  const [failure, setFailure] = useState('');
  const [busy, setBusy] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [artifact, setArtifact] = useState<Tables<'touchstones'> | null>(null);
  const [note, setNote] = useState('');
  const [captureOpen, setCaptureOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saving = useRef(false);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const handleFailure = (error: unknown) => {
    const code = error instanceof KeepError ? error.code : 'failed';
    if (isTerminalKeepError(code)) { clearPendingKeep(); setTerminal(code); }
    else setFailure("Couldn't keep this memory. Try again.");
  };
  useEffect(() => {
    let active = true;
    setPreview(null); setTerminal(null); setFailure(''); setArtifact(null); setSavedId(null);
    if (!/^[a-fA-F0-9]{48}$/.test(token)) { clearPendingKeep(); setTerminal('not_found'); return; }
    getSharePreview(token).then(data => {
      if (!active) return;
      setPreview(data);
      if (data.status !== 'sent') { clearPendingKeep(); setTerminal(data.status); }
    }).catch(error => { if (active) handleFailure(error); });
    return () => { active = false; if (timer.current) clearTimeout(timer.current); };
  }, [token]);

  const loadArtifact = async (id: string) => {
    if (!user) return;
    const { data, error } = await supabase.from('touchstones').select('*').eq('id', id).eq('user_id', user.id).single();
    if (error || !data) { setFailure("Couldn't open this memory. Try again."); return; }
    setArtifact(data); setNote(data.note ?? ''); setFailure('');
  };
  const keep = async () => {
    if (!user || saving.current) return;
    saving.current = true; setBusy(true); setFailure('');
    try {
      const result = await keepTouchstoneShare(token);
      clearPendingKeep(); setSavedId(result.touchstone_id); setConfirming(true); playSaveFeedback();
      timer.current = setTimeout(() => { setConfirming(false); void loadArtifact(result.touchstone_id); }, 2000);
    } catch (error) { handleFailure(error); }
    finally { saving.current = false; setBusy(false); }
  };
  const saveNote = async () => {
    if (!user || !artifact || busy) return;
    setBusy(true); setFailure('');
    const { data, error } = await supabase.from('touchstones').update({ note }).eq('id', artifact.id).eq('user_id', user.id).select('id').single();
    setBusy(false);
    if (error || !data) setFailure("Couldn't save your note. Try again.");
    else navigate('/archive');
  };

  return <main className="keep-page">
    {confirming ? <div className="keep-confirmation" role="status" aria-live="polite"><p>Saved. Part of your story now.</p></div> :
      artifact ? <div className="keep-artifact mx-auto w-full max-w-md">
        <MemoryArtifact touchstoneId={artifact.id} category={artifact.category} photoUrl={artifact.photo_url} title={artifact.title} createdAt={artifact.created_at}
          receivedFromName={artifact.received_from_name}
          memoryDate={{ year: artifact.memory_year, month: artifact.memory_month, day: artifact.memory_day, season: artifact.memory_season as MemorySeason | null }} />
        <div className="mt-6 space-y-3">
          <Textarea aria-label="Your memory note" placeholder="What do you remember?" value={note} onChange={e => setNote(e.target.value)} autoFocus className="keep-note min-h-28" />
          <ReceivedRecollection name={artifact.received_from_name} note={artifact.received_note} />
          <Button variant="ghost" className="send-copy-text" onClick={() => setCaptureOpen(true)}>Capture something of your own</Button>
          {failure && <p role="alert" className="keep-body">{failure}</p>}
          <Button className="w-full" disabled={busy} onClick={saveNote}>{busy ? 'Saving…' : 'Save note'}</Button>
        </div>
        <QuickCaptureSheet open={captureOpen} onClose={() => setCaptureOpen(false)} onSaved={() => setCaptureOpen(false)} />
      </div> : <div className="keep-preview mx-auto w-full max-w-md space-y-6 text-center">
        {terminal ? <><p className="keep-body" role="alert">{keepErrorMessage(terminal, preview?.sender_first_name ?? '')}</p><Button onClick={() => navigate('/archive')}>Archive</Button></> :
          savedId ? <>{failure && <p role="alert" className="keep-body">{failure}</p>}<Button onClick={() => void loadArtifact(savedId)}>Open memory</Button></> :
          preview ? <><h1 className="keep-heading">{preview.sender_first_name || 'Someone'} sent you a memory.</h1><p className="keep-body">{preview.title}</p>
            {failure && <p role="alert" className="keep-body">{failure}</p>}
            <Button disabled={loading || busy} onClick={() => {
              if (user) void keep();
              else { try { localStorage.setItem(PENDING_KEEP_KEY, token); navigate('/auth'); } catch { setFailure("Couldn't continue. Please try again."); } }
            }}>{busy ? 'Keeping…' : user ? 'Keep it' : 'Sign in to keep it'}</Button>
          </> : <p className="keep-body">{failure || 'Loading…'}</p>}
      </div>}
  </main>;
}