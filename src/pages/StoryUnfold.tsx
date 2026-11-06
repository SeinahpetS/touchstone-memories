import { FilePen, ChevronRight, X, ArrowRight, Trash2, Mic, Pause, Play } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import OnboardingDotIndicator from "@/components/OnboardingDotIndicator";
import { transcribeEngine, startVoiceLevel, type TranscribeSession } from "@/lib/transcribe";

const BRAND_NAVY = "#1E2E3E";
const SOFT_IVORY = "#F2EEE5";
const OLD_GOLD = "#B8860B";
const AEGEAN = "#0E7C86";
const MUTED = "#8C8880";
const CARD_SURFACE = "#E8E4D8";
const DIVIDER = "#D4D0C4";
const DELETE_RED = "#C0392B";
/** How far a row must be dragged left before it asks to delete. */
const SWIPE_TRIGGER = 72;
/** How far the reveal layer is allowed to open. */
const SWIPE_MAX = 112;

interface StoryRow {
  id: string;
  title: string;
  date: string;
  progressText?: string;
  complete: boolean;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

const StoryUnfold = () => {
  const navigate = useNavigate();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [text, setText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [rows, setRows] = useState<StoryRow[]>([]);
  const [pendingDelete, setPendingDelete] = useState<StoryRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [swipe, setSwipe] = useState<{ id: string; x: number } | null>(null);
  const pointer = useRef<{ id: string; x: number; y: number; drag: boolean } | null>(null);
  const suppressClick = useRef(false);
  const [mode, setMode] = useState<"listening" | "typing">("listening");
  const [spoken, setSpoken] = useState("");
  const [paused, setPaused] = useState(false);
  const sessionRef = useRef<TranscribeSession | null>(null);
  const spokenRef = useRef<HTMLDivElement | null>(null);
  const [typingNote, setTypingNote] = useState("You can type your story instead.");
  const [finals, setFinals] = useState<string[]>([]);
  const [interim, setInterim] = useState("");
  const [voiceReactive, setVoiceReactive] = useState(false);
  const micRef = useRef<HTMLDivElement | null>(null);
  const voiceRef = useRef<{ stop: () => void } | null>(null);
  const smoothRef = useRef(0);

  const isOnboarding =
    typeof window !== "undefined" &&
    localStorage.getItem("ts_onboarding_complete") !== "1";

  const loadRows = async () => {
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes?.user;
    if (!user) {
      setRows([]);
      return;
    }
    const { data: sessions, error } = await supabase
      .from("story_sessions")
      .select("id, title, status, created_at, extracted_artifacts, confirmed_artifact_ids")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(8);
    if (error) {
      console.error("load sessions failed", error);
      return;
    }
    const mapped: StoryRow[] = (sessions ?? []).map((s: any) => {
      const total = Array.isArray(s.extracted_artifacts) ? s.extracted_artifacts.length : 0;
      const confirmed = Array.isArray(s.confirmed_artifact_ids)
        ? s.confirmed_artifact_ids.length
        : 0;
      const isComplete = s.status === "complete";
      return {
        id: s.id,
        title: s.title || "Untitled story",
        date: isComplete
          ? `${formatDate(s.created_at)} · ${confirmed} touchstone${confirmed === 1 ? "" : "s"} saved`
          : formatDate(s.created_at),
        progressText: isComplete ? undefined : `${confirmed} of ${total} saved`,
        complete: isComplete,
      };
    });
    setRows(mapped);
  };

  useEffect(() => {
    void loadRows();
  }, []);

  useEffect(() => {
    if (sheetOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [sheetOpen]);

  const handleDelete = async () => {
    const target = pendingDelete;
    if (!target || deleting) return;
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes?.user;
    if (!user) {
      toast("You need to be signed in to delete a story.");
      setPendingDelete(null);
      return;
    }
    setDeleting(true);
    const { error } = await supabase
      .from("story_sessions")
      .delete()
      .eq("id", target.id)
      .eq("user_id", user.id);
    setDeleting(false);
    if (error) {
      console.error("delete session failed", error);
      toast("Couldn't delete that story. Try again.");
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== target.id));
    setPendingDelete(null);
    toast("Story deleted.");
  };

  const handleExtract = async (input?: string) => {
    if (extracting) return;
    const transcript = (input ?? text).trim();
    if (!transcript) {
      toast("Tell a bit of a story first.");
      return;
    }
    setExtracting(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "extract-story-artifacts",
        { body: { transcript } },
      );
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const extracted = (data?.artifacts ?? []) as any[];
      if (extracted.length === 0) throw new Error("No artifacts extracted");
      setSheetOpen(false);
      setText("");
      setSpoken("");
      sessionRef.current?.stop();
      sessionRef.current = null;
      navigate("/story-unfold/review", {
        state: {
          sessionId: data.session_id,
          artifacts: extracted,
          transcript: transcript,
        },
      });
    } catch (e: any) {
      console.error("Extraction failed", e);
      toast(e?.message ?? "Something went wrong. Try again.");
    } finally {
      setExtracting(false);
    }
  };

  const stopListening = () => {
    voiceRef.current?.stop();
    voiceRef.current = null;
    setVoiceReactive(false);
    sessionRef.current?.stop();
    sessionRef.current = null;
  };

  // Started inside the tap handler so the browser may ask for mic permission here.
  const handleTellStory = () => {
    setExtracting(false);
    setPaused(false);
    setSpoken("");
    setFinals([]);
    setInterim("");
    setTypingNote("You can type your story instead.");
    setText("");
    if (!transcribeEngine.isSupported()) {
      setMode("typing");
      setSheetOpen(true);
      return;
    }
    setMode("listening");
    setSheetOpen(true);
    sessionRef.current = transcribeEngine.start({
      onUpdate: ({ transcript, finals: done, interim: live }) => {
        setSpoken(transcript);
        setFinals(done);
        setInterim(live.trim());
      },
      onError: (error) => {
        if (error === "unavailable") {
          stopListening();
          setTypingNote("Voice isn't available in this browser. You can type your story instead.");
          setMode("typing");
        }
      },
    });
    smoothRef.current = 0;
    void startVoiceLevel((level) => {
      const el = micRef.current;
      smoothRef.current += (level - smoothRef.current) * 0.15;
      const s = smoothRef.current;
      if (el) {
        el.style.transform = `scale(${1 + 0.35 * s})`;
        el.style.opacity = String(0.6 + 0.4 * s);
      }
    }).then((handle) => {
      if (!handle) return; // fall back to the timed pulse
      if (!sessionRef.current) {
        handle.stop();
        return;
      }
      voiceRef.current = handle;
      setVoiceReactive(true);
    });
  };

  const handleDone = () => {
    stopListening();
    const story = spoken.trim();
    if (!story) {
      setMode("typing");
      toast("Nothing came through yet. You can type your story instead.");
      return;
    }
    void handleExtract(story);
  };

  const handlePauseToggle = () => {
    const session = sessionRef.current;
    if (!session) return;
    if (session.isPaused()) {
      session.resume();
      setPaused(false);
    } else {
      session.pause();
      setPaused(true);
    }
  };

  useEffect(() => {
    return () => stopListening();
  }, []);

  useEffect(() => {
    const box = spokenRef.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [spoken, finals, interim]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: SOFT_IVORY }}>
      <OnboardingDotIndicator current={2} />
      <div className="mx-auto w-full max-w-lg px-5 pt-8 pb-6">
        {/* Header */}
        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 22,
            color: BRAND_NAVY,
            lineHeight: 1.2,
          }}
        >
          Story Unfold
        </h1>
        <p
          style={{
            fontFamily: "'Jost', sans-serif",
            fontSize: 13,
            color: MUTED,
            marginTop: 4,
          }}
        >
          Tell a story in your own words. See what's there.
        </p>

        {/* CTA Button */}
        <button
          type="button"
          onClick={handleTellStory}
          className="w-full flex items-center justify-center gap-3 mt-6"
          style={{
            backgroundColor: BRAND_NAVY,
            borderRadius: 12,
            padding: "1.1rem",
            cursor: "pointer",
            border: "none",
          }}
        >
          <FilePen size={20} color={OLD_GOLD} strokeWidth={1.75} />
          <span
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 16,
              color: SOFT_IVORY,
            }}
          >
            Tell Me A Story
          </span>
        </button>

        {/* Divider */}
        <div
          className="mt-6"
          style={{ height: 0.5, backgroundColor: DIVIDER }}
        />

        {/* Recent stories label */}
        <p
          className="mt-5 uppercase"
          style={{
            fontFamily: "'Jost', sans-serif",
            fontSize: 11,
            letterSpacing: "0.18em",
            color: MUTED,
          }}
        >
          Recent stories
        </p>
        {rows.length > 0 && (
          <p
            style={{
              fontFamily: "'Jost', sans-serif",
              fontSize: 11,
              color: MUTED,
              marginTop: 4,
            }}
          >
            Swipe a story left to delete it.
          </p>
        )}

        {/* Story rows */}
        <div className="mt-3 space-y-3">
          {rows.length === 0 && (
            <p
              style={{
                fontFamily: "'Jost', sans-serif",
                fontSize: 13,
                color: MUTED,
              }}
            >
              No stories yet. Tell your first one above.
            </p>
          )}
          {rows.map((row) => {
            const offset = swipe?.id === row.id ? swipe.x : 0;
            const dragging = swipe?.id === row.id;
            return (
              <div
                key={row.id}
                className="relative"
                style={{ borderRadius: 10, overflow: "hidden" }}
              >
                {/* Delete reveal behind the row */}
                <div
                  className="absolute inset-0 flex items-center justify-end"
                  style={{ backgroundColor: DELETE_RED, borderRadius: 10 }}
                >
                  <div
                    className="flex items-center gap-2 pr-4 uppercase"
                    style={{
                      fontFamily: "'Jost', sans-serif",
                      fontSize: 11,
                      letterSpacing: "0.14em",
                      color: "#FFFFFF",
                    }}
                  >
                    <Trash2 size={15} strokeWidth={1.75} />
                    Delete
                  </div>
                </div>

                <div
                  onClick={() => {
                    if (suppressClick.current) return;
                    navigate(row.complete ? `/story-unfold/session/${row.id}` : `/story-unfold/session/${row.id}/transcript`);
                  }}
                  onPointerDown={(e) => {
                    if (e.pointerType === "mouse" && e.button !== 0) return;
                    pointer.current = { id: row.id, x: e.clientX, y: e.clientY, drag: false };
                  }}
                  onPointerMove={(e) => {
                    const p = pointer.current;
                    if (!p || p.id !== row.id) return;
                    const dx = e.clientX - p.x;
                    const dy = e.clientY - p.y;
                    if (!p.drag) {
                      if (Math.abs(dx) < 6) return;
                      if (Math.abs(dx) <= Math.abs(dy)) {
                        pointer.current = null;
                        return;
                      }
                      p.drag = true;
                      e.currentTarget.setPointerCapture?.(e.pointerId);
                    }
                    setSwipe({ id: row.id, x: Math.max(-SWIPE_MAX, Math.min(0, dx)) });
                  }}
                  onPointerUp={(e) => {
                    const p = pointer.current;
                    pointer.current = null;
                    if (!p || p.id !== row.id) return;
                    const dx = e.clientX - p.x;
                    setSwipe(null);
                    if (p.drag) {
                      suppressClick.current = true;
                      setTimeout(() => {
                        suppressClick.current = false;
                      }, 350);
                      if (dx <= -SWIPE_TRIGGER) setPendingDelete(row);
                    }
                  }}
                  onPointerCancel={() => {
                    pointer.current = null;
                    setSwipe(null);
                  }}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{
                    backgroundColor: CARD_SURFACE,
                    borderRadius: 10,
                    border: `0.5px solid ${DIVIDER}`,
                    cursor: "pointer",
                    transform: `translateX(${offset}px)`,
                    transition: dragging ? "none" : "transform 220ms ease-out",
                    touchAction: "pan-y",
                    userSelect: "none",
                  }}
                >
                {/* Status dot */}
                <div
                  className="flex-shrink-0 rounded-full"
                  style={{
                    width: 8,
                    height: 8,
                    backgroundColor: row.complete ? MUTED : AEGEAN,
                  }}
                />

                {/* Text content */}
                <div className="flex-1 min-w-0">
                  <p
                    style={{
                      fontFamily: "'Jost', sans-serif",
                      fontSize: 14,
                      color: row.complete ? MUTED : BRAND_NAVY,
                      fontWeight: row.complete ? 400 : 700,
                      lineHeight: 1.3,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {row.title}
                  </p>
                  {row.progressText ? (
                    <p
                      style={{
                        fontFamily: "'Jost', sans-serif",
                        fontSize: 11,
                        color: AEGEAN,
                        marginTop: 2,
                        lineHeight: 1.3,
                      }}
                    >
                      {row.progressText}
                    </p>
                  ) : (
                    <p
                      style={{
                        fontFamily: "'Jost', sans-serif",
                        fontSize: 11,
                        color: MUTED,
                        marginTop: 2,
                        lineHeight: 1.3,
                      }}
                    >
                      {row.date}
                    </p>
                  )}
                </div>

                {/* Chevron */}
                <ChevronRight size={18} color={MUTED} strokeWidth={1.75} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Onboarding: continue to next step */}
        {isOnboarding && (
          <button
            type="button"
            onClick={() => navigate("/onboarding/name")}
            className="w-full flex items-center justify-center gap-2 mt-6"
            style={{
              backgroundColor: "transparent",
              border: `1.5px solid ${BRAND_NAVY}`,
              borderRadius: 12,
              padding: "0.85rem",
              cursor: "pointer",
            }}
          >
            <span
              style={{
                fontFamily: "'Jost', sans-serif",
                fontSize: 14,
                color: BRAND_NAVY,
                fontWeight: 500,
              }}
            >
              Continue
            </span>
            <ArrowRight size={16} color={BRAND_NAVY} strokeWidth={1.75} />
          </button>
        )}
      </div>


      {/* Tell Me A Story sheet */}
      {sheetOpen && (
        <div
          className="fixed inset-0 flex flex-col"
          style={{ backgroundColor: SOFT_IVORY, zIndex: 60 }}
        >
          {/* Header */}
          <div className="relative flex items-center justify-center px-5 pt-6 pb-4">
            <h2
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 20,
                color: BRAND_NAVY,
              }}
            >
              Tell Me A Story
            </h2>
            <button
              type="button"
              onClick={() => {
                stopListening();
                setSheetOpen(false);
              }}
              aria-label="Close"
              className="absolute right-4 top-5 p-2"
              style={{ background: "none", border: "none", cursor: "pointer" }}
            >
              <X size={22} color={MUTED} strokeWidth={1.75} />
            </button>
          </div>

          {/* Textarea or loading state */}
          {extracting ? (
            <div className="flex-1 w-full flex items-center justify-center px-5">
              <p
                style={{
                  fontFamily: "'Jost', sans-serif",
                  fontSize: 14,
                  color: MUTED,
                }}
              >
                Finding what's there…
              </p>
            </div>
          ) : mode === "listening" && !extracting ? (
            <div className="flex-1 w-full flex flex-col items-center px-6 pt-6 min-h-0">
              <div
                ref={micRef}
                className={`${voiceReactive ? "" : "ts-mic-pulse "}flex items-center justify-center flex-shrink-0`}
                style={{
                  ...(voiceReactive ? { transform: "scale(1)", opacity: 0.6 } : {}),
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  backgroundColor: OLD_GOLD,
                }}
              >
                <Mic size={26} color={SOFT_IVORY} strokeWidth={1.75} />
              </div>
              <p
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 28,
                  color: BRAND_NAVY,
                  marginTop: 22,
                  textAlign: "center",
                }}
              >
                I’m listening.
              </p>
              <div
                ref={spokenRef}
                className="w-full flex-1 min-h-0 overflow-y-auto"
                style={{ marginTop: 18 }}
              >
                <p
                  style={{
                    fontFamily: "'Jost', sans-serif",
                    fontSize: 18,
                    lineHeight: 1.5,
                    whiteSpace: "pre-wrap",
                    paddingBottom: 120,
                  }}
                >
                  {finals.length === 0 && !interim ? (
                    <span style={{ color: "#4A6B8A", opacity: 0.7 }}>
                      Start talking. Pauses are fine — I’ll keep going.
                    </span>
                  ) : (
                    <>
                      {finals.map((phrase, i) => (
                        <span key={i} className="ts-final-phrase" style={{ color: BRAND_NAVY }}>
                          {phrase.trim()}{" "}
                        </span>
                      ))}
                      {interim && (
                        <span style={{ color: "#4A6B8A", opacity: 0.7 }}>{interim}</span>
                      )}
                    </>
                  )}
                </p>
              </div>
            </div>
          ) : (
            <>
              <p
                style={{
                  fontFamily: "'Jost', sans-serif",
                  fontSize: 13,
                  color: MUTED,
                  padding: "0 20px",
                }}
              >
                {typingNote}
              </p>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Start typing your story here."
                className="flex-1 w-full px-5 py-4 resize-none focus:outline-none"
                style={{
                  backgroundColor: SOFT_IVORY,
                  border: "none",
                  fontFamily: "'Jost', sans-serif",
                  fontSize: 14,
                  color: BRAND_NAVY,
                  lineHeight: 1.5,
                }}
              />
            </>
          )}

          {/* Bottom CTA */}
          <div
            className="w-full"
            style={{
              padding: "12px 16px calc(env(safe-area-inset-bottom, 0px) + 12px)",
              backgroundColor: SOFT_IVORY,
            }}
          >
            {mode === "listening" && !extracting ? (
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={handleDone}
                  className="w-full"
                  style={{
                    height: 56,
                    backgroundColor: BRAND_NAVY,
                    color: SOFT_IVORY,
                    fontFamily: "'Jost', sans-serif",
                    fontSize: 16,
                    borderRadius: 12,
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Done
                </button>
                <button
                  type="button"
                  onClick={handlePauseToggle}
                  className="flex items-center gap-2"
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    marginTop: 10,
                    fontFamily: "'Jost', sans-serif",
                    fontSize: 14,
                    color: BRAND_NAVY,
                  }}
                >
                  {paused ? (
                    <Play size={14} color={BRAND_NAVY} strokeWidth={1.75} />
                  ) : (
                    <Pause size={14} color={BRAND_NAVY} strokeWidth={1.75} />
                  )}
                  {paused ? "Resume" : "Pause"}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => void handleExtract()}
                disabled={extracting}
                className="w-full"
                style={{
                  backgroundColor: AEGEAN,
                  color: "#FFFFFF",
                  fontFamily: "'Jost', sans-serif",
                  fontSize: 15,
                  padding: "0.95rem",
                  borderRadius: 12,
                  border: "none",
                  cursor: extracting ? "not-allowed" : "pointer",
                  opacity: extracting ? 0.7 : 1,
                }}
              >
                {extracting ? "Finding what’s there…" : "See What’s There"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {pendingDelete && (
        <div
          className="fixed inset-0 flex items-center justify-center px-4"
          style={{ backgroundColor: "rgba(0,0,0,0.6)", zIndex: 60 }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md"
            style={{
              backgroundColor: CARD_SURFACE,
              borderRadius: 12,
              padding: 32,
            }}
          >
            <h2
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 24,
                color: BRAND_NAVY,
                marginBottom: 12,
              }}
            >
              Delete this story?
            </h2>
            <p
              style={{
                fontFamily: "'Jost', sans-serif",
                fontSize: 14,
                color: BRAND_NAVY,
                lineHeight: 1.5,
                marginBottom: 14,
              }}
            >
              “{pendingDelete.title}” will be removed from your stories. This
              can’t be undone.
            </p>
            <p
              style={{
                fontFamily: "'Jost', sans-serif",
                fontSize: 13,
                color: AEGEAN,
                lineHeight: 1.5,
                marginBottom: 24,
              }}
            >
              Any touchstones you saved from it stay in your Archive — deleting
              this story doesn’t remove them.
            </p>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="flex w-full items-center justify-center gap-2"
              style={{
                backgroundColor: DELETE_RED,
                color: "#FFFFFF",
                fontFamily: "'Jost', sans-serif",
                fontSize: 14,
                letterSpacing: "0.08em",
                fontWeight: 500,
                padding: "12px 20px",
                borderRadius: 8,
                border: "none",
                cursor: deleting ? "not-allowed" : "pointer",
                opacity: deleting ? 0.7 : 1,
                marginBottom: 10,
              }}
            >
              <Trash2 size={15} strokeWidth={1.75} />
              {deleting ? "DELETING…" : "DELETE STORY"}
            </button>
            <button
              type="button"
              onClick={() => setPendingDelete(null)}
              disabled={deleting}
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                color: BRAND_NAVY,
                fontFamily: "'Jost', sans-serif",
                fontSize: 14,
                padding: "8px",
                cursor: deleting ? "not-allowed" : "pointer",
                textAlign: "center",
              }}
            >
              Whoops. Nevermind.
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoryUnfold;
