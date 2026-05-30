import { useState } from "react";
import { useNavigate } from "react-router-dom";

const TellStory = () => {
  const navigate = useNavigate();
  const [story, setStory] = useState("");
  const [loading, setLoading] = useState(false);

  const canSubmit = story.trim().length > 0 && !loading;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    // TODO: wire to Anthropic-powered extraction edge function
    // For now, simulate processing and bounce back.
    try {
      sessionStorage.setItem("ts_story_draft", story);
      await new Promise((r) => setTimeout(r, 1400));
      // Placeholder: return to archive until extraction screen is built.
      navigate("/archive");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "#F2EEE5" }}
    >
      <div className="mx-auto w-full max-w-lg px-5 pt-8 pb-6 flex-1 flex flex-col">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="text-sm"
            style={{ color: "#5B4A3F", fontFamily: "'Jost', sans-serif" }}
          >
            ← Back
          </button>
        </div>

        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontStyle: "italic",
            fontSize: 32,
            color: "#1E2E3E",
            lineHeight: 1.2,
            marginTop: 28,
            marginBottom: 24,
          }}
        >
          Tell me a memory.
        </h1>

        <textarea
          value={story}
          onChange={(e) => setStory(e.target.value)}
          placeholder="Start anywhere. Tell me about something you remember."
          autoFocus
          disabled={loading}
          className="flex-1 w-full bg-transparent resize-none outline-none border-0 focus:ring-0"
          style={{
            fontFamily: "'Jost', sans-serif",
            fontSize: 18,
            color: "#2C3E50",
            lineHeight: 1.6,
            minHeight: 240,
          }}
        />

        <style>{`
          textarea::placeholder {
            color: #9E9585;
            font-family: 'Jost', sans-serif;
            font-style: italic;
            opacity: 1;
          }
        `}</style>

        <div className="pt-6">
          {loading ? (
            <div
              className="w-full h-14 rounded-full flex items-center justify-center gap-3"
              style={{
                backgroundColor: "#1E2E3E",
                color: "#D4B36A",
                fontFamily: "'Jost', sans-serif",
                fontSize: 16,
                letterSpacing: "0.04em",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 14,
                  height: 14,
                  border: "2px solid rgba(212,179,106,0.35)",
                  borderTopColor: "#D4B36A",
                  borderRadius: "50%",
                  animation: "ts-spin 0.9s linear infinite",
                }}
              />
              Reading your story…
              <style>{`@keyframes ts-spin { to { transform: rotate(360deg) } }`}</style>
            </div>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="w-full h-14 rounded-full transition-opacity"
              style={{
                backgroundColor: "#1E2E3E",
                color: "#D4B36A",
                fontFamily: "'Jost', sans-serif",
                fontSize: 16,
                letterSpacing: "0.04em",
                opacity: canSubmit ? 1 : 0.5,
              }}
            >
              See What's There
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TellStory;
