import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AEGEAN = "#0E7C86";

const BRAND_NAVY = "#1E2E3E";
const SOFT_IVORY = "#F2EEE5";
const MUTED = "#8C8880";
const DIVIDER = "#D4D0C4";

type Artifact = {
  category: string;
  title: string;
  note: string;
  source_phrase?: string;
};

type LocationState = {
  sessionId?: string;
  artifacts?: Artifact[];
  transcript?: string;
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
  const { state } = useLocation();
  const locState = (state ?? {}) as LocationState;

  const [sessionId, setSessionId] = useState<string | undefined>(locState.sessionId);
  const [artifacts, setArtifacts] = useState<Artifact[]>(locState.artifacts ?? []);
  const [index, setIndex] = useState(0);
  const [confirmedIds, setConfirmedIds] = useState<string[]>([]);
  const [savingOverlay, setSavingOverlay] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftNote, setDraftNote] = useState("");
  const overlayTimer = useRef<number | null>(null);

  // If nothing in state, kick back to /story-unfold
  useEffect(() => {
    if (!artifacts || artifacts.length === 0) {
      navigate("/story-unfold", { replace: true });
    }
  }, [artifacts, navigate]);

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
  const total = artifacts.length;
  const done = index >= total;

  const advance = () => {
    if (index + 1 >= total) {
      // Finished — return to Story Unfold
      navigate("/story-unfold", { replace: true });
    } else {
      setIndex((i) => i + 1);
    }
  };

  const persistArtifact = async (a: Artifact): Promise<string | null> => {
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
    const allConfirmed = newIds.length >= total;
    const { error } = await supabase
      .from("story_sessions")
      .update({
        confirmed_artifact_ids: newIds,
        status: allConfirmed ? "complete" : "incomplete",
      })
      .eq("id", sessionId);
    if (error) console.error("story_sessions update failed", error);
  };

  const handleSave = async () => {
    if (!current || savingOverlay) return;
    const newId = await persistArtifact(current);
    if (!newId) return;
    const newIds = [...confirmedIds, newId];
    setConfirmedIds(newIds);
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
    advance();
  };

  const handleEdit = () => {
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

  if (done || !current) return null;

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
      <div className="flex-1 flex flex-col px-6">
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
            onClick={() => {
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
            onClick={() => {
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
        <button
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
        </button>
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

        <button
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
        </button>

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
