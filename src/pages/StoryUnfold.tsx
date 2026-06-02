import { FilePen, ChevronRight, X } from "lucide-react";
import { useState, useEffect } from "react";

const BRAND_NAVY = "#1E2E3E";
const SOFT_IVORY = "#F2EEE5";
const OLD_GOLD = "#B8860B";
const AEGEAN = "#0E7C86";
const MUTED = "#8C8880";
const CARD_SURFACE = "#E8E4D8";
const DIVIDER = "#D4D0C4";

interface StoryRow {
  title: string;
  date: string;
  progressText?: string;
  complete: boolean;
}

const PLACEHOLDER_ROWS: StoryRow[] = [
  {
    title: "My grandmother's Sunday visits",
    date: "June 1",
    progressText: "3 of 7 saved",
    complete: false,
  },
  {
    title: "The summer we drove to Montana",
    date: "May 30",
    progressText: "5 of 7 saved",
    complete: false,
  },
  {
    title: "The record player in the front room",
    date: "May 24 · 7 touchstones saved",
    complete: true,
  },
];

const StoryUnfold = () => {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [text, setText] = useState("");

  useEffect(() => {
    if (sheetOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [sheetOpen]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: SOFT_IVORY }}>
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
          {PLACEHOLDER_ROWS.map((row, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-4 py-3"
              style={{
                backgroundColor: CARD_SURFACE,
                borderRadius: 10,
                border: `0.5px solid ${DIVIDER}`,
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

              {/* Chevron (only for incomplete) */}
              {!row.complete && (
                <ChevronRight size={18} color={MUTED} strokeWidth={1.75} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StoryUnfold;
