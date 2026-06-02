import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";

interface FaqItem {
  q: string;
  a: React.ReactNode;
}

interface FaqSection {
  label: string;
  items: FaqItem[];
}

const VividPill = () => (
  <span
    className="inline-flex items-center rounded-full px-2.5 py-0.5 mr-2 align-middle"
    style={{
      background: "#0E7C86",
      color: "#FFFFFF",
      fontFamily: "'Jost', sans-serif",
      fontSize: 11,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      fontWeight: 600,
    }}
  >
    Vivid
  </span>
);

const SourceBadge = ({
  label,
  provider,
}: {
  label: string;
  provider: React.ReactNode;
}) => (
  <div
    className="flex items-center justify-between rounded-full px-4 py-2"
    style={{
      background: "#F2EEE5",
      border: "1px solid rgba(91, 74, 63, 0.15)",
    }}
  >
    <span
      style={{
        fontFamily: "'Jost', sans-serif",
        fontSize: 11,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: "#8C8880",
      }}
    >
      {label}
    </span>
    <span style={{ fontFamily: "'Jost', sans-serif", fontSize: 13 }}>
      {provider}
    </span>
  </div>
);

const sections: FaqSection[] = [
  {
    label: "Privacy & Data",
    items: [
      {
        q: "Is my archive private?",
        a: "Yes. Your archive is private by default and only visible to you. Individual entries can also be marked private using the \"Keep this private\" toggle when saving.",
      },
      {
        q: "What does \"Keep this private\" mean?",
        a: "Private entries are only visible to you. They won't be included in your Touchstone book, and they won't be passed on when your archive is one day shared with someone you love.",
      },
      {
        q: "Does Touchstone use AI? Will my data train any models?",
        a: "Touchstone uses Anthropic's Claude to generate your Story Unfold narrative. Your archive data is sent to Claude securely and is not used to train any AI models. Your memories stay yours.",
      },
      {
        q: "Where is my data stored?",
        a: "Your archive is stored using Supabase, a trusted cloud infrastructure provider built on PostgreSQL. Supabase uses row-level security, meaning your data is architecturally isolated — not just hidden behind a setting. We don't sell or share your data with third parties, and only you can access your archive.",
      },
      {
        q: "Can I export or download my archive?",
        a: (
          <>
            <VividPill />
            members can export their full archive as a data file — just tap
            "Email my archive" in Settings and it'll be sent straight to you.
          </>
        ),
      },
    ],
  },
  {
    label: "Adding Entries",
    items: [
      {
        q: "What's the difference between entry types?",
        a: (
          <>
            Touchstone captures the things that shaped who you are, across eight categories:
            <ul className="mt-2 space-y-1 list-none pl-0">
              <li>— <strong>Moments</strong> — experiences and memories, big and small</li>
              <li>— <strong>People</strong> — the ones who made you who you are</li>
              <li>— <strong>Places</strong> — where you've been, where you belong</li>
              <li>— <strong>Objects</strong> — the things that carried meaning</li>
              <li>— <strong>Foods</strong> — the tastes tied to a time or a person</li>
              <li>— <strong>Sounds</strong> — music and audio that marked a moment</li>
              <li>— <strong>Imprints</strong> — cultural touchstones: books, films, TV, podcasts, art, quotes</li>
              <li>— <strong>Digital Traces</strong> — the corners of the internet that were yours: accounts, communities, usernames, sites you lived on, tabs you never closed, screenshots worth keeping, memes that were exactly right</li>
            </ul>
          </>
        ),
      },
      {
        q: "Can I add something from years ago?",
        a: "Absolutely. Touchstone is a living archive, not a journal. You can log anything from any point in your life — past, present, or ongoing.",
      },
      {
        q: "Can I edit or delete an entry?",
        a: "Yes. Tap any entry in your Archive to open it, then use the edit or delete options from the menu.",
      },
    ],
  },
  {
    label: "Story Unfold & Life Canvas",
    items: [
      {
        q: "How does Story Unfold work?",
        a: "Story Unfold is Touchstone's AI capture flow. Tap \"Tell Me A Story,\" then type or dictate a memory freely — Claude reads it and extracts the meaningful pieces: moments, people, objects, places, and more. Each one surfaces as a card you can review, edit, or approve before it's added to your archive. One story can become many touchstones.",
      },
      {
        q: "What is Life Canvas?",
        a: "Life Canvas is a visual overview of your archive — a constellation of your memories, people, and imprints laid out as an explorable map of your life so far.",
      },
    ],
  },
  {
    label: "Account & Sync",
    items: [
      {
        q: "Does Touchstone work offline?",
        a: "You can browse your existing archive offline. Adding new entries and search require an internet connection.",
      },
      {
        q: "Can I use Touchstone on multiple devices?",
        a: "Yes. Sign in with your account on any device and your archive syncs automatically.",
      },
    ],
  },
  {
    label: "Data Sources",
    items: [
      {
        q: "Where does search data come from?",
        a: (
          <>
            <p className="mb-3">
              Touchstone uses trusted third-party APIs to power search across different entry types.
            </p>
            <div className="space-y-2">
              <SourceBadge
                label="Podcasts"
                provider={
                  <span style={{ fontWeight: 700 }}>
                    LISTEN<span style={{ color: "#b94a1e" }}>NOTES</span>
                  </span>
                }
              />
              <SourceBadge
                label="Music"
                provider={<span style={{ color: "#1DB954", fontWeight: 600 }}>Spotify</span>}
              />
              <SourceBadge label="Books" provider="Google Books" />
              <SourceBadge label="AI Narrative" provider="Anthropic Claude" />
            </div>
          </>
        ),
      },
    ],
  },
];

const FAQ = () => {
  const [openKey, setOpenKey] = useState<string | null>(null);

  return (
    <div className="min-h-screen" style={{ background: "#F2EEE5", color: "#2C3E50" }}>
      <div className="mx-auto max-w-md px-6 py-8">
        {/* Header */}
        <div className="relative mb-8 flex items-center justify-center">
          <Link
            to="/profile"
            className="absolute left-0 top-1/2 -translate-y-1/2"
            style={{
              fontFamily: "'Jost', sans-serif",
              fontSize: 14,
              color: "#5B4A3F",
              textDecoration: "none",
            }}
          >
            ← Settings
          </Link>
          <h1
            className="font-playfair"
            style={{ fontSize: 22, color: "#2C3E50" }}
          >
            Help & FAQ
          </h1>
        </div>

        {/* Sections */}
        <div className="space-y-8">
          {sections.map((section) => (
            <section key={section.label}>
              <p
                className="mb-3 uppercase"
                style={{
                  fontFamily: "'Jost', sans-serif",
                  fontSize: 11,
                  letterSpacing: "0.18em",
                  color: "#8C8880",
                }}
              >
                {section.label}
              </p>
              <div className="space-y-2">
                {section.items.map((item, idx) => {
                  const key = `${section.label}-${idx}`;
                  const isOpen = openKey === key;
                  return (
                    <div
                      key={key}
                      className="rounded-lg overflow-hidden"
                      style={{ background: "#E8E4D8" }}
                    >
                      <button
                        type="button"
                        onClick={() => setOpenKey(isOpen ? null : key)}
                        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                      >
                        <span
                          style={{
                            fontFamily: "'Jost', sans-serif",
                            fontSize: 15,
                            color: "#2C3E50",
                            fontWeight: 500,
                          }}
                        >
                          {item.q}
                        </span>
                        <ChevronDown
                          className="h-4 w-4 flex-shrink-0 transition-transform"
                          style={{
                            color: "#5B4A3F",
                            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                          }}
                        />
                      </button>
                      {isOpen && (
                        <div
                          className="px-4 pb-4 pt-1"
                          style={{
                            fontFamily: "'Jost', sans-serif",
                            fontSize: 14,
                            lineHeight: 1.6,
                            color: "#5B4A3F",
                          }}
                        >
                          {item.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        {/* Still need help */}
        <div className="pt-12 pb-8 text-center">
          <p
            style={{
              fontFamily: "'Jost', sans-serif",
              fontSize: 14,
              color: "#5B4A3F",
            }}
          >
            Still need help? Email us at{" "}
            <a
              href="mailto:hello@usetouchstone.app"
              style={{ color: "#B8860B", textDecoration: "none" }}
            >
              hello@usetouchstone.app
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default FAQ;
