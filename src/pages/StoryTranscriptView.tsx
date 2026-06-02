import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft } from "lucide-react";

const BRAND_NAVY = "#1E2E3E";
const SOFT_IVORY = "#F2EEE5";
const MUTED = "#8C8880";
const OLD_GOLD = "#B8860B";
const AEGEAN = "#0E7C86";

type Span = {
  start: number;
  end: number;
  phrase?: string;
  artifact_index?: number;
};

const StoryTranscriptView = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [transcript, setTranscript] = useState("");
  const [spans, setSpans] = useState<Span[]>([]);
  const [isVivid, setIsVivid] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id) return;

      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes?.user?.id;

      const [{ data: sess }, vividRes] = await Promise.all([
        supabase
          .from("story_sessions")
          .select("transcript, highlight_spans")
          .eq("id", id)
          .maybeSingle(),
        userId
          ? supabase.rpc("has_active_vivid", { _user_id: userId })
          : Promise.resolve({ data: false }),
      ]);

      if (cancelled) return;
      setTranscript((sess?.transcript as string) ?? "");
      const rawSpans = Array.isArray(sess?.highlight_spans)
        ? (sess!.highlight_spans as any[])
        : [];
      setSpans(
        rawSpans
          .filter(
            (s) =>
              s &&
              typeof s.start === "number" &&
              typeof s.end === "number" &&
              s.end > s.start,
          )
          .sort((a, b) => a.start - b.start),
      );
      setIsVivid(Boolean(vividRes?.data));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const highlightColor = isVivid ? AEGEAN : OLD_GOLD;

  const rendered = useMemo(() => {
    if (!transcript) return null;

    // Merge overlapping spans
    const merged: Span[] = [];
    for (const s of spans) {
      const last = merged[merged.length - 1];
      if (last && s.start <= last.end) {
        last.end = Math.max(last.end, s.end);
      } else {
        merged.push({ ...s });
      }
    }

    const out: React.ReactNode[] = [];
    let cursor = 0;
    merged.forEach((s, i) => {
      if (s.start > cursor) {
        out.push(transcript.slice(cursor, s.start));
      }
      out.push(
        <mark
          key={`h-${i}`}
          style={{
            backgroundColor: `${highlightColor}26`, // ~15% alpha
            color: BRAND_NAVY,
            padding: "0 2px",
            borderRadius: 2,
            boxShadow: `inset 0 -2px 0 ${highlightColor}`,
          }}
        >
          {transcript.slice(s.start, s.end)}
        </mark>,
      );
      cursor = s.end;
    });
    if (cursor < transcript.length) out.push(transcript.slice(cursor));
    return out;
  }, [transcript, spans, highlightColor]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: SOFT_IVORY }}>
      <div className="mx-auto w-full max-w-lg px-5 pt-6 pb-12">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 mb-4"
          style={{
            background: "none",
            border: "none",
            color: MUTED,
            fontFamily: "'Jost', sans-serif",
            fontSize: 13,
            cursor: "pointer",
            padding: 0,
          }}
        >
          <ChevronLeft size={16} strokeWidth={1.75} />
          Back
        </button>

        {loading ? (
          <p
            style={{
              fontFamily: "'Jost', sans-serif",
              fontSize: 14,
              color: MUTED,
            }}
          >
            Loading…
          </p>
        ) : (
          <article
            style={{
              fontFamily: "'Jost', sans-serif",
              fontSize: 14,
              color: BRAND_NAVY,
              lineHeight: 1.7,
              whiteSpace: "pre-wrap",
            }}
          >
            {rendered}
          </article>
        )}
      </div>
    </div>
  );
};

export default StoryTranscriptView;
