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
  touchstoneId?: string;
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
          .select("transcript, highlight_spans, extracted_artifacts")
          .eq("id", id)
          .maybeSingle(),
        userId
          ? supabase.rpc("has_active_vivid", { _user_id: userId })
          : Promise.resolve({ data: false }),
      ]);
      const { data: saved } = await supabase
        .from("touchstones")
        .select("id, title")
        .eq("source_session_id", id);

      if (cancelled) return;
      setTranscript((sess?.transcript as string) ?? "");
      const rawSpans = Array.isArray(sess?.highlight_spans)
        ? (sess!.highlight_spans as any[])
        : [];
      // Link the phrases behind saved touchstones so they can be tapped
      const text = ((sess?.transcript as string) ?? "");
      const lower = text.toLowerCase();
      const artifacts = Array.isArray((sess as any)?.extracted_artifacts)
        ? ((sess as any).extracted_artifacts as any[]) : [];
      const linked: Span[] = [];
      for (const t of (saved ?? []) as { id: string; title: string | null }[]) {
        const title = (t.title ?? "").trim().toLowerCase();
        const art = artifacts.find((a) => (a?.title ?? "").trim().toLowerCase() === title);
        const candidates = [art?.source_phrase, t.title].filter(
          (c): c is string => typeof c === "string" && c.trim().length > 1,
        );
        for (const c of candidates) {
          const at = lower.indexOf(c.trim().toLowerCase());
          if (at >= 0) { linked.push({ start: at, end: at + c.trim().length, touchstoneId: t.id }); break; }
        }
      }
      setSpans(
        [...linked, ...rawSpans]
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
        last.touchstoneId = last.touchstoneId ?? s.touchstoneId;
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
          role={s.touchstoneId ? "link" : undefined}
          tabIndex={s.touchstoneId ? 0 : undefined}
          onClick={s.touchstoneId ? () => navigate(`/archive?memory=${s.touchstoneId}`) : undefined}
          onKeyDown={s.touchstoneId ? (e) => { if (e.key === "Enter") navigate(`/archive?memory=${s.touchstoneId}`); } : undefined}
          style={{
            cursor: s.touchstoneId ? "pointer" : "default",
            fontWeight: s.touchstoneId ? 600 : undefined,
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
  }, [transcript, spans, highlightColor, navigate]);

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
