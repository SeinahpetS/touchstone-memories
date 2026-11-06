import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { loadOnboardingStoryDraft, saveOnboardingStoryDraft } from "@/lib/onboardingStoryDraft";
import type { StoryArtifact } from "@/lib/onboardingStoryDraft";
import OnboardingCardEditSheet from "@/components/OnboardingCardEditSheet";
import { Button } from "@/components/ui/button";
import { readOnboardingPhoto } from "@/lib/onboardingPhotos";
import MemoryArtifact from "@/components/MemoryArtifact";
import { dismissReviewCard } from "@/lib/onboardingReview";

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
  photoFile?: File;
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
import GoldLeafBurst from "@/components/GoldLeafBurst";

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
  const photoInput = useRef<HTMLInputElement>(null);
  const [livePhotoUrl, setLivePhotoUrl] = useState<string | null>(null);

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
  useEffect(() => {
    if (isOnboarding || !current?.photoFile) { setLivePhotoUrl(null); return; }
    const url = URL.createObjectURL(current.photoFile);
    setLivePhotoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [isOnboarding, current?.photoFile]);
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
    let photo_url: string | null = null;
    if (a.photoFile) {
      const ext = a.photoFile.name.split(".").pop() || "jpg";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("memory-photos").upload(path, a.photoFile);
      if (upErr) { console.error("photo upload failed", upErr); toast("Couldn't upload that photo."); return null; }
      photo_url = supabase.storage.from("memory-photos").getPublicUrl(path).data.publicUrl;
    }
    const { data, error } = await supabase
      .from("touchstones")
      .insert({
        user_id: user.id,
        photo_url,
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
      const { remaining, nextIndex: next, finished } = dismissReviewCard(artifacts, index);
      const draft = loadOnboardingStoryDraft();
      if (!draft) return;
      try { saveOnboardingStoryDraft({ ...draft, artifacts: remaining as StoryArtifact[], reviewIndex: next }); }
      catch { toast.error("Couldn't keep your progress on this device."); return; }
      setArtifacts(remaining);
      setIndex(next);
      if (finished) setPhase("complete");
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

  const [slideDir, setSlideDir] = useState<"next" | "prev" | null>(null);
  const [savingAll, setSavingAll] = useState(false);
  const saveAllInFlight = useRef(false);

  const goTo = (next: number) => {
    if (next < 0 || next >= artifacts.length || next === index) return;
    setSlideDir(next > index ? "next" : "prev");
    setIndex(next);
  };

  useEffect(() => {
    if (phase !== "cards") return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (sheetOpen || (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable))) return;
      if (e.key === "ArrowRight") goTo(index + 1);
      if (e.key === "ArrowLeft") goTo(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const persistOnboardingArtifacts = (list: Artifact[]) => {
    const draft = loadOnboardingStoryDraft();
    if (!draft) throw new Error("Missing story draft");
    saveOnboardingStoryDraft({ ...draft, artifacts: list as StoryArtifact[], reviewIndex: 0 });
  };

  const handleLeaveOut = () => {
    if (savingAll) return;
    const removed = artifacts[index];
    const removedAt = index;
    const remaining = artifacts.filter((_, i) => i !== index);
    if (isOnboarding) {
      try { persistOnboardingArtifacts(remaining); }
      catch { toast.error("Couldn't keep your progress on this device."); return; }
    }
    const wasLast = index >= remaining.length;
    setSlideDir(wasLast ? "prev" : "next");
    setArtifacts(remaining);
    setIndex(Math.max(0, wasLast ? remaining.length - 1 : index));
    toast("Card left out.", {
      duration: 4000,
      action: {
        label: "Undo",
        onClick: () => {
          setArtifacts((arr) => {
            const restored = [...arr.slice(0, removedAt), removed, ...arr.slice(removedAt)];
            if (isOnboarding) { try { persistOnboardingArtifacts(restored); } catch { /* keep in memory */ } }
            return restored;
          });
          setSlideDir(null);
          setIndex(removedAt);
        },
      },
    });
  };

  const handleSaveAll = async () => {
    if (saveAllInFlight.current || artifacts.length === 0) return;
    saveAllInFlight.current = true;
    setSavingAll(true);
    try {
      if (isOnboarding) {
        const draft = loadOnboardingStoryDraft();
        if (!draft) throw new Error("Missing story draft");
        const withIds = artifacts.map((a) => ({ ...a, id: a.id ?? crypto.randomUUID() }));
        const keptIds = new Set(withIds.map((a) => a.id));
        const kept = [...(draft.kept ?? []).filter((c) => !keptIds.has(c.id)), ...withIds];
        saveOnboardingStoryDraft({ ...draft, artifacts: withIds as StoryArtifact[], kept: kept as typeof draft.kept, reviewIndex: withIds.length });
        setArtifacts(withIds);
        setSavedCount(kept.length);
        setPhase("complete");
        return;
      }
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) { toast("Please sign in to save."); return; }
      const rows = [];
      for (const a of artifacts) {
        let photo_url: string | null = null;
        if (a.photoFile) {
          const ext = a.photoFile.name.split(".").pop() || "jpg";
          const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
          const { error: upErr } = await supabase.storage.from("memory-photos").upload(path, a.photoFile);
          if (upErr) throw upErr;
          photo_url = supabase.storage.from("memory-photos").getPublicUrl(path).data.publicUrl;
        }
        rows.push({ user_id: user.id, photo_url, category: a.category as any, title: a.title, note: a.note, source_session_id: sessionId ?? null });
      }
      const { data, error } = await supabase.from("touchstones").insert(rows).select("id");
      if (error) throw error;
      const newIds = [...confirmedIds, ...(data ?? []).map((r) => r.id as string)];
      setConfirmedIds(newIds);
      setSavedCount((c) => c + rows.length);
      void updateSessionConfirmed(newIds);
      void markSessionComplete();
      setPhase("complete");
    } catch (e) {
      console.error("save all failed", e);
      toast.error("Couldn't save your cards. Please try again.");
    } finally {
      saveAllInFlight.current = false;
      setSavingAll(false);
    }
  };


  if (phase === "complete") {
    const reducedMotion = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    return (
      <div
        className="fixed inset-0 z-40 flex flex-col items-center justify-center px-6"
        style={{ backgroundColor: SOFT_IVORY }}
      >
        {!reducedMotion && <GoldLeafBurst onStart={() => { playChime(); hapticTap(); }} />}
        <h2
          className="text-center saved-fade-heading"
          style={{
            position: "relative",
            zIndex: 1,
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
          className={isOnboarding ? "mt-3 saved-fade-continue" : "mt-3"}
          style={{
            position: "relative",
            zIndex: 1,
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

  const cardBody = isOnboarding ? (
    <div className="onboarding-shared-card">
      <MemoryArtifact photoUrl={photoPreview} photoFirst category={current.category} title={current.title} note={current.note}
        createdAt={new Date(storedDraft?.capturedAt || Date.now()).toISOString()} />
      <div className="flex justify-center mt-4">
        <Button className="onboarding-edit-this" onClick={handleEdit}>Edit</Button>
      </div>
    </div>
  ) : (
    <div className="flex flex-col">
      {!editingTitle && !editingNote ? (
        <div role="button" tabIndex={0} aria-label="Edit this Touchstone" onClick={handleEdit} onKeyDown={(e) => { if (e.key === "Enter") handleEdit(); }}
          className="w-full cursor-text overflow-hidden px-5 pb-6" style={{ borderRadius: 18, boxShadow: "0 0 32px rgba(184,134,11,0.35), 0 0 64px rgba(224,122,95,0.18)" }}>
          <MemoryArtifact photoUrl={livePhotoUrl} category={current.category} title={current.title} note={current.note} createdAt={new Date().toISOString()} />
        </div>
      ) : (<>
        <p className="uppercase" style={{ fontFamily: "'Jost', sans-serif", fontSize: 11, letterSpacing: "0.18em", color: MUTED, marginTop: 8 }}>
          {current.category}
        </p>
        {editingTitle ? (
          <input autoFocus value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} onBlur={commitTitle}
            onKeyDown={(e) => { if (e.key === "Enter") commitTitle(); }}
            className="w-full mt-2 bg-transparent focus:outline-none"
            style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: BRAND_NAVY, borderBottom: `1px solid ${DIVIDER}`, paddingBottom: 4 }} />
        ) : (
          <h2 onClick={() => { setDraftTitle(current.title); setEditingTitle(true); }}
            style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: BRAND_NAVY, marginTop: 6, lineHeight: 1.3, cursor: "text" }}>
            {current.title}
          </h2>
        )}
        {editingNote ? (
          <textarea autoFocus={!editingTitle} value={draftNote} onChange={(e) => setDraftNote(e.target.value)} onBlur={commitNote}
            className="w-full mt-4 bg-transparent focus:outline-none resize-none" rows={5}
            style={{ fontFamily: "'Jost', sans-serif", fontSize: 14, color: MUTED, borderBottom: `1px solid ${DIVIDER}`, lineHeight: 1.5 }} />
        ) : (
          <p onClick={() => { setDraftNote(current.note); setEditingNote(true); }}
            style={{ fontFamily: "'Jost', sans-serif", fontSize: 14, color: MUTED, marginTop: 16, lineHeight: 1.55, cursor: "text" }}>
            {current.note}
          </p>
        )}
      </>)}
      <input ref={photoInput} type="file" accept="image/*" className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          setArtifacts((arr) => arr.map((a, i) => (i === index ? { ...a, photoFile: file } : a)));
        }} />
      <button type="button" onClick={() => photoInput.current?.click()} className="mt-6 self-center"
        style={{ background: "none", border: "none", padding: 0, color: MUTED, fontFamily: "'Jost', sans-serif", fontSize: 13, cursor: "pointer" }}>
        {current.photoFile ? "Change photo →" : "Add a photo →"}
      </button>
    </div>
  );

  const remainingCount = artifacts.length;
  const navBtn: React.CSSProperties = { width: 44, height: 44, display: "grid", placeItems: "center", background: "none", border: "none", cursor: "pointer" };

  return (
    <div className="fixed inset-0 z-40 flex flex-col" style={{ backgroundColor: SOFT_IVORY }}>
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
        <div className="my-auto w-full px-6 py-6">
          <div className="mx-auto w-full max-w-sm">
            <div key={index} className={`review-carousel-card ${slideDir === "next" ? "from-right" : slideDir === "prev" ? "from-left" : ""}`}>
              {cardBody}
              {!isOnboarding && !editingTitle && !editingNote && (
                <div className="flex justify-center mt-4">
                  <Button className="onboarding-edit-this" onClick={handleEdit}>Edit</Button>
                </div>
              )}
              <div className="flex justify-center mt-3">
                <button type="button" onClick={handleLeaveOut} disabled={savingAll}
                  style={{ background: "none", border: "none", padding: 8, color: "#2C3E50", fontFamily: "'Jost', sans-serif", fontSize: 15, cursor: "pointer" }}>
                  Leave out
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between" style={{ marginTop: 20 }}>
              <button type="button" aria-label="Previous card" onClick={() => goTo(index - 1)} style={{ ...navBtn, visibility: index > 0 ? "visible" : "hidden" }}>
                <ChevronLeft size={24} color={BRAND_NAVY} strokeWidth={1.75} />
              </button>
              <span style={{ fontFamily: "'Jost', sans-serif", fontSize: 14, color: "#4A6B8A" }}>{index + 1} of {total}</span>
              <button type="button" aria-label="Next card" onClick={() => goTo(index + 1)} style={{ ...navBtn, visibility: index < total - 1 ? "visible" : "hidden" }}>
                <ChevronRight size={24} color={BRAND_NAVY} strokeWidth={1.75} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-6" style={{ paddingTop: 12, paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}>
        <div className="mx-auto w-full max-w-sm">
          <button type="button" onClick={handleSaveAll} disabled={remainingCount === 0 || savingAll} aria-busy={savingAll}
            className="w-full flex items-center justify-center gap-2"
            style={{
              height: 56, borderRadius: 14, border: "none",
              backgroundColor: remainingCount === 0 ? "#E8E4D8" : BRAND_NAVY,
              color: remainingCount === 0 ? "#2C3E50" : SOFT_IVORY,
              fontFamily: "'Jost', sans-serif", fontSize: 17, fontWeight: 500,
              cursor: remainingCount === 0 || savingAll ? "default" : "pointer",
            }}>
            {savingAll && <Loader2 size={18} className="animate-spin" />}
            Save all {remainingCount}
          </button>
        </div>
      </div>

      {isOnboarding && sheetOpen && <OnboardingCardEditSheet artifact={current as StoryArtifact} onCancel={() => setSheetOpen(false)} onSave={edited => {
        const updated = artifacts.map((a, i) => i === index ? edited : a);
        const draft = loadOnboardingStoryDraft();
        if (!draft) throw new Error("Missing story draft");
        saveOnboardingStoryDraft({ ...draft, artifacts: updated as StoryArtifact[] });
        setArtifacts(updated);
        setSheetOpen(false);
      }} />}
    </div>
  );
};

export default StoryReview;
