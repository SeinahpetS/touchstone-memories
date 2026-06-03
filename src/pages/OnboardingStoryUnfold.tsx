import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import OnboardingDotIndicator from "@/components/OnboardingDotIndicator";

/**
 * Onboarding Screen — Story Unfold (dot 2).
 * Pre-signup screen that captures the user's first story and runs it
 * through the same extraction logic as the Tell Me A Story flow.
 */
const OnboardingStoryUnfold = () => {
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const advance = () => navigate("/onboarding/name");

  const handleSubmit = async () => {
    if (loading) return;
    const trimmed = text.trim();
    if (!trimmed) {
      advance();
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "extract-story-artifacts",
        { body: { story: trimmed } },
      );
      const artifacts = (data as any)?.artifacts;
      const payload = {
        story: trimmed,
        artifacts: Array.isArray(artifacts) ? artifacts : [],
        capturedAt: Date.now(),
      };
      try {
        localStorage.setItem("ts_onboarding_draft", JSON.stringify(payload));
      } catch {
        /* ignore */
      }
      if (error) {
        // Pre-signup users won't have a session; still advance with raw text saved.
        console.warn("extract-story-artifacts unavailable:", error.message);
      }
    } catch (e) {
      console.warn("extract-story-artifacts failed", e);
      try {
        localStorage.setItem(
          "ts_onboarding_draft",
          JSON.stringify({ story: trimmed, artifacts: [], capturedAt: Date.now() }),
        );
      } catch {
        /* ignore */
      }
    } finally {
      setLoading(false);
      advance();
    }
  };

  return (
    <div
      className="min-h-screen w-full"
      style={{ backgroundColor: "#F2EEE5", padding: "40px 24px" }}
    >
      <OnboardingDotIndicator current={2} />

      <div
        style={{
          maxWidth: 552,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <h1
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontStyle: "italic",
            fontSize: 28,
            color: "#2C3E50",
            margin: 0,
            marginTop: 48,
            lineHeight: 1.25,
          }}
        >
          Share something worth keeping.
        </h1>

        <p
          style={{
            fontFamily: "'Jost', sans-serif",
            fontSize: 15,
            color: "#9E9585",
            lineHeight: 1.6,
            margin: 0,
            marginTop: 12,
          }}
        >
          Just write what comes to mind. We'll find the pieces worth keeping.
        </p>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="A memory, a person, a place, a moment…"
          disabled={loading}
          style={{
            marginTop: 32,
            width: "100%",
            minHeight: 180,
            backgroundColor: "#E8E4D8",
            borderRadius: 12,
            padding: 16,
            border: "none",
            outline: "none",
            fontFamily: "'Source Sans 3', sans-serif",
            fontSize: 16,
            color: "#2C3E50",
            lineHeight: 1.6,
            resize: "vertical",
          }}
        />

        <p
          style={{
            fontFamily: "'Jost', sans-serif",
            fontSize: 12,
            color: "#9E9585",
            margin: 0,
            marginTop: 8,
            textAlign: "left",
          }}
        >
          Type, paste, or use your phone's microphone to speak-to-text.
        </p>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          style={{
            marginTop: 32,
            width: "100%",
            height: 52,
            borderRadius: 12,
            backgroundColor: "#1E2E3E",
            color: "#F2EEE5",
            border: "none",
            fontFamily: "'Jost', sans-serif",
            fontSize: 16,
            letterSpacing: "0.04em",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
            transition: "opacity 200ms ease",
          }}
        >
          {loading ? "Reading…" : "See What's There"}
        </button>

        <button
          type="button"
          onClick={advance}
          disabled={loading}
          style={{
            marginTop: 16,
            alignSelf: "center",
            background: "transparent",
            border: "none",
            padding: 0,
            fontFamily: "'Jost', sans-serif",
            fontSize: 13,
            color: "#9E9585",
            textDecoration: "underline",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          Skip for now
        </button>
      </div>

      <style>{`
        textarea::placeholder {
          color: #9E9585;
          font-style: italic;
          opacity: 1;
        }
      `}</style>
    </div>
  );
};

export default OnboardingStoryUnfold;
