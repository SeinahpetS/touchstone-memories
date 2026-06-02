import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

type Artifact = {
  category: string;
  title: string;
  note: string;
};

const TellStoryResults = () => {
  const navigate = useNavigate();
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [story, setStory] = useState("");

  useEffect(() => {
    const raw = sessionStorage.getItem("ts_story_artifacts");
    const storyRaw = sessionStorage.getItem("ts_story_draft") ?? "";
    setStory(storyRaw);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setArtifacts(parsed);
      } catch {
        // ignore
      }
    }
  }, []);

  if (artifacts.length === 0) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6"
        style={{ backgroundColor: "#F2EEE5" }}
      >
        <p
          style={{
            fontFamily: "'Playfair Display', serif",
            fontStyle: "italic",
            color: "#2C3E50",
            fontSize: 20,
            textAlign: "center",
          }}
        >
          No story found. Tell me one first.
        </p>
        <button
          onClick={() => navigate("/tell-a-story")}
          style={{
            marginTop: 20,
            background: "#1E2E3E",
            color: "#B8860B",
            borderRadius: 9999,
            padding: "12px 28px",
            fontFamily: "'Jost', sans-serif",
            border: "none",
          }}
        >
          Tell a story
        </button>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "#F2EEE5" }}
    >
      <div className="mx-auto w-full max-w-lg px-5 pt-8 pb-10 flex-1 flex flex-col">
        <button
          onClick={() => navigate("/tell-a-story")}
          className="text-sm self-start"
          style={{ color: "#5B4A3F", fontFamily: "'Jost', sans-serif" }}
        >
          ← Back
        </button>

        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            color: "#1E2E3E",
            fontSize: 32,
            lineHeight: 1.15,
            margin: "20px 0 8px",
          }}
        >
          Here's what I found.
        </h1>
        <p
          style={{
            fontFamily: "'Jost', sans-serif",
            color: "#5B4A3F",
            fontSize: 15,
            margin: "0 0 24px",
          }}
        >
          {artifacts.length} {artifacts.length === 1 ? "memory" : "memories"} worth keeping.
        </p>

        <div className="flex flex-col gap-3">
          {artifacts.map((a, i) => (
            <div
              key={i}
              style={{
                backgroundColor: "#E8E4D8",
                borderRadius: 12,
                padding: 18,
              }}
            >
              <p
                style={{
                  fontFamily: "'Jost', sans-serif",
                  fontSize: 11,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: "#1E2E3E",
                  margin: 0,
                }}
              >
                {a.category}
              </p>
              <h2
                style={{
                  fontFamily: "'Playfair Display', serif",
                  color: "#1E2E3E",
                  fontSize: 20,
                  margin: "6px 0 6px",
                }}
              >
                {a.title}
              </h2>
              <p
                style={{
                  fontFamily: "'Jost', sans-serif",
                  color: "#2C3E50",
                  fontSize: 15,
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                {a.note}
              </p>
            </div>
          ))}
        </div>

        <button
          onClick={() => {
            sessionStorage.removeItem("ts_story_draft");
            sessionStorage.removeItem("ts_story_artifacts");
            navigate("/archive");
          }}
          style={{
            marginTop: 28,
            background: "#1E2E3E",
            color: "#B8860B",
            borderRadius: 9999,
            padding: "14px 28px",
            fontFamily: "'Jost', sans-serif",
            fontSize: 16,
            border: "none",
            alignSelf: "center",
          }}
        >
          Back to archive
        </button>
      </div>
    </div>
  );
};

export default TellStoryResults;
