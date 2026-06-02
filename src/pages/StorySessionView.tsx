import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft } from "lucide-react";

const BRAND_NAVY = "#1E2E3E";
const SOFT_IVORY = "#F2EEE5";
const MUTED = "#8C8880";
const CARD_SURFACE = "#E8E4D8";
const DIVIDER = "#D4D0C4";

type Touchstone = {
  id: string;
  category: string;
  title: string | null;
  note: string | null;
};

type Session = {
  id: string;
  title: string | null;
  status: string;
};

const StorySessionView = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [items, setItems] = useState<Touchstone[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id) return;
      const [{ data: sess }, { data: ts }] = await Promise.all([
        supabase
          .from("story_sessions")
          .select("id, title, status")
          .eq("id", id)
          .maybeSingle(),
        supabase
          .from("touchstones")
          .select("id, category, title, note")
          .eq("source_session_id", id)
          .order("created_at", { ascending: true }),
      ]);
      if (cancelled) return;
      setSession(sess as Session | null);
      setItems((ts ?? []) as Touchstone[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: SOFT_IVORY }}>
      <div className="mx-auto w-full max-w-lg px-5 pt-6 pb-10">
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

        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 22,
            color: BRAND_NAVY,
            lineHeight: 1.3,
          }}
        >
          {loading ? "…" : session?.title || "Untitled story"}
        </h1>

        {!loading && items.length === 0 && (
          <p
            className="mt-6"
            style={{
              fontFamily: "'Jost', sans-serif",
              fontSize: 14,
              color: MUTED,
            }}
          >
            No touchstones were saved from this story.
          </p>
        )}

        <div className="mt-6 space-y-3">
          {items.map((t) => (
            <div
              key={t.id}
              className="px-4 py-4"
              style={{
                backgroundColor: CARD_SURFACE,
                border: `0.5px solid ${DIVIDER}`,
                borderRadius: 10,
              }}
            >
              <p
                className="uppercase"
                style={{
                  fontFamily: "'Jost', sans-serif",
                  fontSize: 10,
                  letterSpacing: "0.18em",
                  color: MUTED,
                }}
              >
                {t.category}
              </p>
              <h3
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 17,
                  color: BRAND_NAVY,
                  marginTop: 4,
                  lineHeight: 1.3,
                }}
              >
                {t.title}
              </h3>
              {t.note && (
                <p
                  style={{
                    fontFamily: "'Jost', sans-serif",
                    fontSize: 13,
                    color: MUTED,
                    marginTop: 6,
                    lineHeight: 1.5,
                  }}
                >
                  {t.note}
                </p>
              )}
            </div>
          ))}
        </div>

        {!loading && (
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={() => navigate(`/story-unfold/session/${id}/transcript`)}
              style={{
                background: "none",
                border: "none",
                color: MUTED,
                fontFamily: "'Jost', sans-serif",
                fontSize: 13,
                cursor: "pointer",
                padding: 6,
              }}
            >
              Read the original story →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default StorySessionView;
