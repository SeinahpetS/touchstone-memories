import { FilePen, ChevronRight, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import OnboardingDotIndicator from "@/components/OnboardingDotIndicator";

const BRAND_NAVY = "#1E2E3E";
const SOFT_IVORY = "#F2EEE5";
const OLD_GOLD = "#B8860B";
const AEGEAN = "#0E7C86";
const MUTED = "#8C8880";
const CARD_SURFACE = "#E8E4D8";
const DIVIDER = "#D4D0C4";

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

  const handleExtract = async () => {
    if (extracting) return;
    const transcript = text.trim();
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
          onClick={() => setSheetOpen(true)}
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
            const tappable = row.complete;
            return (
              <div
                key={row.id}
                onClick={
                  tappable
                    ? () => navigate(`/story-unfold/session/${row.id}`)
                    : undefined
                }
                className="flex items-center gap-3 px-4 py-3"
                style={{
                  backgroundColor: CARD_SURFACE,
                  borderRadius: 10,
                  border: `0.5px solid ${DIVIDER}`,
                  cursor: tappable ? "pointer" : "default",
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

                {/* Chevron (only when tappable / complete) */}
                {tappable && (
                  <ChevronRight size={18} color={MUTED} strokeWidth={1.75} />
                )}
              </div>
            );
          })}
        </div>
      </div>


      {/* Tell Me A Story sheet */}
      {sheetOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col"
          style={{ backgroundColor: SOFT_IVORY }}
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
              onClick={() => setSheetOpen(false)}
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
          ) : (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Start typing, or use your keyboard's dictation button to speak your story."
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
          )}

          {/* Bottom CTA */}
          <div
            className="w-full"
            style={{
              padding: "12px 16px calc(env(safe-area-inset-bottom, 0px) + 12px)",
              backgroundColor: SOFT_IVORY,
            }}
          >
            <button
              type="button"
              onClick={handleExtract}
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
              {extracting ? "Finding what's there…" : "See What's There"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoryUnfold;
