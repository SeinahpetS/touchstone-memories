import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { loadOnboardingStoryDraft, saveOnboardingStoryDraft } from "@/lib/onboardingStoryDraft";
import type { StoryArtifact } from "@/lib/onboardingStoryDraft";
import OnboardingCardEditSheet from "@/components/OnboardingCardEditSheet";
import { Button } from "@/components/ui/button";
import { readOnboardingPhoto } from "@/lib/onboardingPhotos";
import MemoryArtifact from "@/components/MemoryArtifact";

const AEGEAN = "#0E7C86";

const BRAND_NAVY = "#1E2E3E";
const SOFT_IVORY = "#F2EEE5";
const MUTED = "#8C8880";
const DIVIDER = "#D4D0C4";

type Artifact = {
  id?: string;
  category: string;
  title: string;
  note: string;
  source_phrase?: string;
  photoKey?: string;
};

type LocationState = {
  sessionId?: string;
  artifacts?: Artifact[];
  transcript?: string;
  /** Pre-signup onboarding review: keep cards locally, no Supabase saves. */
  onboarding?: boolean;
};

// Soft chime using WebAudio — no asset needed
function playChime() {
  try {
    const AudioCtx =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(880, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.18);
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.65);
  } catch (_) {
    /* no-op */
  }
}

function hapticTap() {
  try {
    if (navigator.vibrate) navigator.vibrate(15);
  } catch (_) {
    /* no-op */
  }
}

const StoryReview = () => {
  const navigate = useNavigate();
  const { state, pathname } = useLocation();
  const locState = (state ?? {}) as LocationState;
  const isOnboarding = !!locState.onboarding || pathname === "/onboarding/story-review";
  const [storedDraft] = useState(() => {
    if (!isOnboarding) return null;
    try { return loadOnboardingStoryDraft(); } catch { return null; }
  });

  const [sessionId, setSessionId] = useState<string | undefined>(locState.sessionId);
  const [artifacts, setArtifacts] = useState<Artifact[]>(storedDraft?.artifacts ?? locState.artifacts ?? []);
  const [index, setIndex] = useState(storedDraft?.reviewIndex ?? 0);
  const [confirmedIds, setConfirmedIds] = useState<string[]>([]);
  const [savedCount, setSavedCount] = useState(storedDraft?.kept?.length ?? 0);
  const [phase, setPhase] = useState<"cards" | "complete">(
    storedDraft && (storedDraft.reviewIndex ?? 0) >= storedDraft.artifacts.length ? "complete" : "cards",
  );
  const [continuing, setContinuing] = useState(false);
  const [savingOverlay, setSavingOverlay] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftNote, setDraftNote] = useState("");
  const overlayTimer = useRef<number | null>(null);
  const saveInFlight = useRef(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);

  // If nothing in state, kick back to /story-unfold
  useEffect(() => {
    if (phase === "cards" && (!artifacts || artifacts.length === 0)) {
      navigate(isOnboarding ? "/onboarding-story" : "/story-unfold", { replace: true });
    }
  }, [artifacts, navigate, isOnboarding, phase]);

  // When card changes, reset edits
  useEffect(() => {
    setEditingTitle(false);
    setEditingNote(false);
  }, [index]);

  useEffect(() => {
    return () => {
      if (overlayTimer.current) window.clearTimeout(overlayTimer.current);
    };
  }, []);

  const current = artifacts[index];
  useEffect(() => {
    let active = true;
    let url: string | undefined;
    setPhotoPreview(null);
    if (isOnboarding && current?.photoKey) void readOnboardingPhoto(current.photoKey).then(blob => {
      if (active && blob) { url = URL.createObjectURL(blob); setPhotoPreview(url); }
    }).catch(() => toast.error("Couldn't load your photo."));
    return () => { active = false; if (url) URL.revokeObjectURL(url); };
  }, [isOnboarding, current?.photoKey]);
  const total = artifacts.length;
  const done = index >= total;

  const advance = () => {
    if (isOnboarding) {
      try {
        const draft = loadOnboardingStoryDraft();
        if (!draft) throw new Error("Missing story draft");
        saveOnboardingStoryDraft({ ...draft, artifacts: artifacts as typeof draft.artifacts, reviewIndex: index + 1 });
      } catch {
        toast.error("Couldn't keep your progress on this device. Please try again.");
        return;
      }
    }
    if (index + 1 >= total) {
      // End of stack — mark session complete and show summary
      void markSessionComplete();
      setPhase("complete");
    } else {
      setIndex((i) => i + 1);
    }
  };

  const markSessionComplete = async () => {
    if (!sessionId) return;
    const { error } = await supabase
      .from("story_sessions")
      .update({ status: "complete" })
      .eq("id", sessionId);
    if (error) console.error("story_sessions complete update failed", error);
  };

  const persistArtifact = async (a: Artifact): Promise<string | null> => {
    if (isOnboarding) {
      // Pre-signup: stash kept cards in the onboarding draft; they are
      // persisted to the touchstones table after account creation.
      try {
        const draft = loadOnboardingStoryDraft();
        if (!draft) throw new Error("Missing story draft");
        const id = a.id ?? crypto.randomUUID();
        const updated = artifacts.map((card, i) => i === index ? { ...card, id } : card);
        const kept = [...(draft.kept ?? []).filter(card => card.id !== id), { ...a, id }];
        saveOnboardingStoryDraft({ ...draft, artifacts: updated as typeof draft.artifacts, kept: kept as typeof draft.kept, reviewIndex: index + 1 });
        setArtifacts(updated);
        return id;
      } catch {
        toast.error("Couldn't keep this card on your device. Please try again.");
        return null;
      }
    }
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) {
      toast("Please sign in to save.");
      return null;
    }
    const { data, error } = await supabase
      .from("touchstones")
      .insert({
        user_id: user.id,
        category: a.category as any,
        title: a.title,
        note: a.note,
        source_session_id: sessionId ?? null,
      })
      .select("id")
      .single();
    if (error) {
      console.error("touchstone insert failed", error);
      toast("Couldn't save that one.");
      return null;
    }
    return data.id as string;
  };

  const updateSessionConfirmed = async (newIds: string[]) => {
    if (!sessionId) return;
    const { error } = await supabase
      .from("story_sessions")
      .update({ confirmed_artifact_ids: newIds })
      .eq("id", sessionId);
    if (error) console.error("story_sessions update failed", error);
  };

  const handleTellMeMore = async () => {
    if (!sessionId || continuing) return;
    setContinuing(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "extract-story-artifacts",
        { body: { session_id: sessionId } },
      );
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const more = (data?.artifacts ?? []) as Artifact[];
      if (more.length === 0) {
        toast("Nothing else to surface.");
        return;
      }
      // Append new cards to the stack and continue
      setArtifacts((arr) => [...arr, ...more]);
      setIndex(total); // jump to first newly added card
      setPhase("cards");
      // Reset session back to incomplete since there are new cards to confirm
      await supabase
        .from("story_sessions")
        .update({ status: "incomplete" })
        .eq("id", sessionId);
    } catch (e: any) {
      console.error("Tell Me More failed", e);
      toast(e?.message ?? "Couldn't find more.");
    } finally {
      setContinuing(false);
    }
  };

  const handleSave = async () => {
    if (!current || savingOverlay || saveInFlight.current) return;
    saveInFlight.current = true;
    let newId: string | null;
    try { newId = await persistArtifact(current); }
    finally { saveInFlight.current = false; }
    if (!newId) return;
    const newIds = [...confirmedIds, newId];
    setConfirmedIds(newIds);
    setSavedCount((c) => c + 1);
    void updateSessionConfirmed(newIds);

    playChime();
    hapticTap();
    setSavingOverlay(true);
    overlayTimer.current = window.setTimeout(() => {
      setSavingOverlay(false);
      advance();
    }, 2000);
  };

  const handleDismiss = () => {
    if (isOnboarding) {
      const remaining = artifacts.filter((_, i) => i !== index);
      const draft = loadOnboardingStoryDraft();
      if (!draft) return;
      const next = Math.min(index, Math.max(0, remaining.length - 1));
      try { saveOnboardingStoryDraft({ ...draft, artifacts: remaining as StoryArtifact[], reviewIndex: remaining.length ? next : 0 }); }
      catch { toast.error("Couldn't keep your progress on this device."); return; }
      setArtifacts(remaining);
      setIndex(next);
      if (!remaining.length) setPhase("complete");
      return;
    }
    advance();
  };

  const handleEdit = () => {
    if (isOnboarding) { setSheetOpen(true); return; }
    setDraftTitle(current?.title ?? "");
    setDraftNote(current?.note ?? "");
    setEditingTitle(true);
    setEditingNote(true);
  };

  const commitTitle = () => {
    setArtifacts((arr) =>
      arr.map((a, i) => (i === index ? { ...a, title: draftTitle.trim() || a.title } : a)),
    );
    setEditingTitle(false);
  };

  const commitNote = () => {
    setArtifacts((arr) =>
      arr.map((a, i) => (i === index ? { ...a, note: draftNote.trim() || a.note } : a)),
    );
    setEditingNote(false);
  };

  const dots = useMemo(() => {
    return Array.from({ length: total }, (_, i) => i);
  }, [total]);

  if (phase === "complete") {
    return (
      <div
        className="fixed inset-0 z-40 flex flex-col items-center justify-center px-6"
        style={{ backgroundColor: SOFT_IVORY }}
      >
        <h2
          className="text-center"
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 22,
            color: BRAND_NAVY,
            lineHeight: 1.3,
          }}
        >
          {savedCount} {savedCount === 1 ? "touchstone" : "touchstones"} saved.
        </h2>
        {!isOnboarding && (
          <p
            className="text-center mt-3"
            style={{
              fontFamily: "'Jost', sans-serif",
              fontSize: 13,
              color: MUTED,
            }}
          >
            Feel like something's missing?
          </p>
        )}

        {!isOnboarding && (
          <button
            type="button"
            onClick={handleTellMeMore}
            disabled={continuing}
            className="mt-6"
            style={{
              background: "none",
              border: "none",
              color: AEGEAN,
              fontFamily: "'Jost', sans-serif",
              fontSize: 14,
              cursor: continuing ? "not-allowed" : "pointer",
              opacity: continuing ? 0.6 : 1,
              padding: 6,
            }}
          >
            {continuing ? "Looking again…" : "Tell Me More →"}
          </button>
        )}

        <button
          type="button"
          onClick={() => navigate(isOnboarding ? "/onboarding-name" : "/archive")}
          className="mt-3"
          style={{
            background: "none",
            border: "none",
            color: isOnboarding ? BRAND_NAVY : MUTED,
            fontFamily: "'Jost', sans-serif",
            fontSize: isOnboarding ? 15 : 13,
            cursor: "pointer",
            padding: 6,
          }}
        >
          {isOnboarding ? "Continue →" : "Back to your archive →"}
        </button>
      </div>
    );
  }

  if (done || !current) return null;

  if (isOnboarding) return <div className="onboarding-review-screen">
    <div className="flex items-center justify-center gap-2 pt-6 pb-4">
      {dots.map(i => <span key={i} className={`onboarding-review-dot${i === index ? " is-current" : ""}`} />)}
    </div>
    <div className="onboarding-review-carousel" aria-label="Extracted memories" aria-roledescription="carousel"
      onPointerDown={e => { if (savingOverlay) return; swipeStart.current = { x: e.clientX, y: e.clientY }; }}
      onPointerUp={e => {
        const start = swipeStart.current; swipeStart.current = null;
        if (!start || savingOverlay) return;
        const dx = e.clientX - start.x, dy = e.clientY - start.y;
        if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy)) return;
        setIndex(i => Math.max(0, Math.min(total - 1, i + (dx < 0 ? 1 : -1))));
      }} onPointerCancel={() => { swipeStart.current = null; }}>
      <div key={index} className="onboarding-shared-card">
        <MemoryArtifact photoUrl={photoPreview} photoFirst category={current.category} title={current.title} note={current.note}
          createdAt={new Date(storedDraft?.capturedAt || Date.now()).toISOString()} />
      </div>
    </div>
    <div className="onboarding-review-actions">
      <Button className="onboarding-keep-this" disabled={savingOverlay} onClick={handleSave}>Keep this</Button>
      <Button className="rounded-full bg-primary px-6 py-3 text-base text-primary-foreground hover:bg-primary/90 transition-colors h-auto" disabled={savingOverlay} onClick={handleEdit}>Edit</Button>
      <Button variant="ghost" className="onboarding-dismiss" disabled={savingOverlay} onClick={handleDismiss}>Dismiss</Button>
    </div>
    {sheetOpen && <OnboardingCardEditSheet artifact={current as StoryArtifact} onCancel={() => setSheetOpen(false)} onSave={edited => {
      const updated = artifacts.map((a, i) => i === index ? edited : a);
      const draft = loadOnboardingStoryDraft();
      if (!draft) throw new Error("Missing story draft");
      saveOnboardingStoryDraft({ ...draft, artifacts: updated as StoryArtifact[] });
      setArtifacts(updated); setSheetOpen(false);
    }} />}
    {savingOverlay && <div className="onboarding-saved-overlay"><p>Saved. Part of your story now.</p></div>}
  </div>;

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col"
      style={{ backgroundColor: SOFT_IVORY }}
    >
      {/* Progress dots */}
      <div className="flex items-center justify-center gap-2 pt-6 pb-4">
        {dots.map((i) => (
          <span
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              backgroundColor: i === index ? BRAND_NAVY : DIVIDER,
              opacity: i === index ? 1 : 0.7,
              transition: "background-color 200ms",
            }}
          />
        ))}
      </div>

      {/* Card body */}
      <div className={`flex-1 flex flex-col px-6 ${isOnboarding ? "onboarding-review-card" : ""}`}>
        {isOnboarding && <Button variant="ghost" className="onboarding-card-edit" onClick={handleEdit}>Edit</Button>}
        {isOnboarding && photoPreview && <img src={photoPreview} alt={current.title || "Touchstone photo"} className="onboarding-review-photo" />}
        <p
          className="uppercase"
          style={{
            fontFamily: "'Jost', sans-serif",
            fontSize: 11,
            letterSpacing: "0.18em",
            color: MUTED,
            marginTop: 8,
          }}
        >
          {current.category}
        </p>

        {/* Title */}
        {editingTitle ? (
          <input
            autoFocus
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitTitle();
            }}
            className="w-full mt-2 bg-transparent focus:outline-none"
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 18,
              color: BRAND_NAVY,
              borderBottom: `1px solid ${DIVIDER}`,
              paddingBottom: 4,
            }}
          />
        ) : (
          <h2
            onClick={isOnboarding ? handleEdit : () => {
              setDraftTitle(current.title);
              setEditingTitle(true);
            }}
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 18,
              color: BRAND_NAVY,
              marginTop: 6,
              lineHeight: 1.3,
              cursor: "text",
            }}
          >
            {current.title}
          </h2>
        )}

        {/* Note */}
        {editingNote ? (
          <textarea
            autoFocus={!editingTitle}
            value={draftNote}
            onChange={(e) => setDraftNote(e.target.value)}
            onBlur={commitNote}
            className="w-full mt-4 bg-transparent focus:outline-none resize-none"
            rows={5}
            style={{
              fontFamily: "'Jost', sans-serif",
              fontSize: 14,
              color: MUTED,
              borderBottom: `1px solid ${DIVIDER}`,
              lineHeight: 1.5,
            }}
          />
        ) : (
          <p
            onClick={isOnboarding ? handleEdit : () => {
              setDraftNote(current.note);
              setEditingNote(true);
            }}
            style={{
              fontFamily: "'Jost', sans-serif",
              fontSize: 14,
              color: MUTED,
              marginTop: 16,
              lineHeight: 1.55,
              cursor: "text",
            }}
          >
            {current.note}
          </p>
        )}

        {/* Add a photo */}
        {!isOnboarding && <button
          type="button"
          onClick={() => toast("Photo attachments coming soon.")}
          className="mt-6 self-start"
          style={{
            background: "none",
            border: "none",
            padding: 0,
            color: MUTED,
            fontFamily: "'Jost', sans-serif",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Add a photo →
        </button>}
      </div>

      {/* Bottom actions */}
      <div
        className="w-full px-5"
        style={{
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)",
          paddingTop: 12,
        }}
      >
        <button
          type="button"
          onClick={handleSave}
          className="w-full"
          style={{
            backgroundColor: BRAND_NAVY,
            color: SOFT_IVORY,
            fontFamily: "'Jost', sans-serif",
            fontSize: 15,
            padding: "0.95rem",
            borderRadius: 12,
            border: "none",
            cursor: "pointer",
          }}
        >
          Save
        </button>

        {!isOnboarding && <button
          type="button"
          onClick={handleEdit}
          className="w-full mt-3"
          style={{
            backgroundColor: "transparent",
            color: BRAND_NAVY,
            fontFamily: "'Jost', sans-serif",
            fontSize: 15,
            padding: "0.9rem",
            borderRadius: 12,
            border: `1px solid ${BRAND_NAVY}`,
            cursor: "pointer",
          }}
        >
          Edit
        </button>}

        <div className="flex justify-center mt-3">
          <button
            type="button"
            onClick={handleDismiss}
            style={{
              background: "none",
              border: "none",
              color: MUTED,
              fontFamily: "'Jost', sans-serif",
              fontSize: 14,
              cursor: "pointer",
              padding: 6,
            }}
          >
            Dismiss
          </button>
        </div>

        <div className="flex justify-center mt-2">
          <button
            type="button"
            onClick={() => toast("Manual entry coming soon.")}
            style={{
              background: "none",
              border: "none",
              color: MUTED,
              fontFamily: "'Jost', sans-serif",
              fontSize: 12,
              cursor: "pointer",
              padding: 4,
              opacity: 0.85,
            }}
          >
            Something's missing?
          </button>
        </div>
      </div>

      {/* Saved overlay */}
      {isOnboarding && sheetOpen && <OnboardingCardEditSheet artifact={current as StoryArtifact} onCancel={() => setSheetOpen(false)} onSave={edited => {
        const updated = artifacts.map((a, i) => i === index ? edited : a);
        const draft = loadOnboardingStoryDraft();
        if (!draft) throw new Error("Missing story draft");
        saveOnboardingStoryDraft({ ...draft, artifacts: updated as StoryArtifact[] });
        setArtifacts(updated);
        setSheetOpen(false);
      }} />}
      {savingOverlay && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-8"
          style={{
            backgroundColor: "rgba(242, 238, 229, 0.92)",
            backdropFilter: "blur(2px)",
          }}
        >
          <p
            className="text-center"
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 22,
              color: BRAND_NAVY,
              lineHeight: 1.3,
            }}
          >
            Saved. Part of your story now.
          </p>
        </div>
      )}
    </div>
  );
};

export default StoryReview;
