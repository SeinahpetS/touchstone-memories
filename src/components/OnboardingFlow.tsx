import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";
import ConstellationIntro from "@/pages/ConstellationIntro";

export interface OnboardingLocation {
  city: string;
  region: string;
  country: string;
  locationDisplay: string;
  lat: number | null;
  lng: number | null;
}

interface OnboardingFlowProps {
  initialFirstName?: string;
  initialBirthMonth?: number | null;
  initialBirthYear?: number | null;
  initialCity?: string;
  initialState?: string;
  initialLocation?: OnboardingLocation | null;
  onComplete: (data: {
    firstName: string;
    birthMonth: number | null;
    birthYear: number | null;
    city: string;
    state: string;
    location: OnboardingLocation | null;
  }) => void;
}

const IVORY = "#F2EEE5";
const INK = "#1E2E3E";
const GOLD = "#B8860B";
const MUTED = "#4A6B8A";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

type Screen = 0 | 1 | 2;

const Wordmark = () => (
  <div
    style={{
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      paddingTop: "1.2rem",
      textAlign: "center",
      fontFamily: '"Playfair Display", Georgia, serif',
      fontStyle: "italic",
      fontSize: 11,
      letterSpacing: "0.22em",
      textTransform: "uppercase",
      color: GOLD,
      opacity: 0.75,
      pointerEvents: "none",
      zIndex: 5,
    }}
  >
    Touchstone
  </div>
);

const ProgressDots = ({ screen }: { screen: Screen }) => {
  const total = 3;
  return (
    <div
      style={{
        position: "absolute",
        bottom: 72,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        gap: 8,
        zIndex: 5,
      }}
    >
      {Array.from({ length: total }).map((_, i) => {
        const active = i === screen;
        return (
          <div
            key={i}
            style={{
              width: active ? 24 : 6,
              height: 6,
              borderRadius: 999,
              background: MUTED,
              opacity: active ? 1 : 0.3,
              transition: "width 300ms ease, opacity 300ms ease",
            }}
          />
        );
      })}
    </div>
  );
};

const ScreenShell = ({
  screen,
  children,
  hideDots = false,
}: {
  screen: Screen;
  children: React.ReactNode;
  hideDots?: boolean;
}) => (
  <div
    style={{
      position: "relative",
      width: "100%",
      minHeight: "100vh",
      background: IVORY,
      fontFamily: '"Playfair Display", Georgia, serif',
      overflowX: "hidden",
    }}
  >
    <Wordmark />
    {children}
    {!hideDots && <ProgressDots screen={screen} />}
  </div>
);


const inputBaseStyle: React.CSSProperties = {
  width: "100%",
  fontFamily: '"Playfair Display", Georgia, serif',
  fontSize: 18,
  color: INK,
  background: "transparent",
  border: "none",
  borderBottom: `1px solid rgba(30,46,62,0.3)`,
  padding: "0.5rem 0",
  textAlign: "center",
  outline: "none",
  fontStyle: "italic",
};

const continueBtnStyle = (enabled: boolean): React.CSSProperties => ({
  marginTop: "2rem",
  fontFamily: '"Playfair Display", Georgia, serif',
  fontSize: 14,
  color: IVORY,
  background: INK,
  border: "none",
  borderRadius: 6,
  padding: "0.75rem 2rem",
  cursor: enabled ? "pointer" : "not-allowed",
  opacity: enabled ? 1 : 0.4,
  transition: "opacity 200ms ease",
});

const skipLinkStyle: React.CSSProperties = {
  marginTop: 16,
  background: "transparent",
  border: "none",
  cursor: "pointer",
  fontFamily: '"Playfair Display", Georgia, serif',
  fontStyle: "italic",
  fontSize: 12,
  color: GOLD,
  opacity: 0.9,
  textDecoration: "none",
};

const headlineStyle: React.CSSProperties = {
  fontFamily: '"Playfair Display", Georgia, serif',
  fontStyle: "italic",
  fontSize: "clamp(22px, 5vw, 28px)",
  color: INK,
  margin: 0,
  textAlign: "center",
};

const subLineStyle: React.CSSProperties = {
  fontFamily: '"Playfair Display", Georgia, serif',
  fontStyle: "italic",
  fontSize: 14,
  color: MUTED,
  margin: "0.5rem 0 2rem",
  textAlign: "center",
  lineHeight: 1.5,
};

 const privacyStyle: React.CSSProperties = {
   fontFamily: '"Playfair Display", Georgia, serif',
   fontStyle: "italic",
   color: MUTED,
   opacity: 0.7,
   textAlign: "center",
   marginTop: "1.5rem",
 };

const CenteredCard = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "5rem 1.5rem 5rem",
    }}
  >
    <div
      style={{
        width: "100%",
        maxWidth: 320,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      {children}
    </div>
  </div>
);

const PlacesAutocomplete = ({
  value,
  onSelect,
  onClear,
}: {
  value: string;
  onSelect: (loc: OnboardingLocation) => void;
  onClear: () => void;
}) => {
  const [query, setQuery] = useState(value);
  const [preds, setPreds] = useState<
    { place_id: string; description: string; main_text: string; secondary_text: string }[]
  >([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounced = useDebounce(query, 250);
  const containerRef = useRef<HTMLDivElement>(null);
  const lockedRef = useRef<string>(value);

  useEffect(() => { setQuery(value); lockedRef.current = value; }, [value]);

  useEffect(() => {
    if (!debounced || debounced.length < 2 || debounced === lockedRef.current) {
      setPreds([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const session = (await supabase.auth.getSession()).data.session;
        const token = session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/places-search?mode=autocomplete&types=cities&q=${encodeURIComponent(debounced)}`;
        const r = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        });
        const d = await r.json();
        if (!cancelled) {
          setPreds((d.predictions ?? []).slice(0, 5));
          setOpen(true);
        }
      } catch { /* ignore */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [debounced]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const pick = async (p: { place_id: string; description: string }) => {
    setOpen(false);
    setPreds([]);
    setQuery(p.description);
    lockedRef.current = p.description;
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const token = session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/places-search?mode=details&place_id=${encodeURIComponent(p.place_id)}`;
      const r = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });
      const d = await r.json();
      const display = d.formatted_address || p.description;
      setQuery(display);
      lockedRef.current = display;
      onSelect({
        city: d.city ?? "",
        region: d.region ?? "",
        country: d.country ?? "",
        locationDisplay: display,
        lat: d.lat ?? null,
        lng: d.lng ?? null,
      });
    } catch { /* ignore */ }
  };

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
      <input
        className="ts-onb-input"
        type="text"
        value={query}
        placeholder="start typing your city…"
        onChange={(e) => {
          setQuery(e.target.value);
          if (lockedRef.current && e.target.value !== lockedRef.current) {
            lockedRef.current = "";
            onClear();
          }
        }}
        onFocus={() => preds.length > 0 && setOpen(true)}
        style={{ ...inputBaseStyle, fontSize: 18 }}
        autoComplete="off"
      />
      {loading && (
        <div style={{
          position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)",
          fontSize: 11, color: MUTED, fontStyle: "italic", opacity: 0.6,
        }}>…</div>
      )}
      {open && preds.length > 0 && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 4px)",
          left: 0, right: 0,
          background: IVORY,
          border: `1px solid rgba(30,46,62,0.12)`,
          borderRadius: 8,
          overflow: "hidden",
          zIndex: 10,
          boxShadow: "0 4px 16px rgba(30,46,62,0.08)",
        }}>
          {preds.map((p) => (
            <button
              key={p.place_id}
              type="button"
              onClick={() => pick(p)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "10px 14px",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                fontFamily: '"Playfair Display", Georgia, serif',
                fontSize: 14,
                color: INK,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(30,46,62,0.05)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <div>{p.main_text}</div>
              {p.secondary_text && (
                <div style={{ fontSize: 12, color: MUTED, opacity: 0.7, fontStyle: "italic" }}>
                  {p.secondary_text}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const OnboardingFlow = ({
  initialFirstName = "",
  initialBirthMonth = null,
  initialBirthYear = null,
  initialCity = "",
  initialState = "",
  initialLocation = null,
  onComplete,
}: OnboardingFlowProps) => {
  const [screen, setScreen] = useState<Screen>(0);
  const [firstName, setFirstName] = useState(initialFirstName);
  const [birthMonth, setBirthMonth] = useState<number | null>(initialBirthMonth);
  const [birthYear, setBirthYear] = useState<number | null>(initialBirthYear);
  const [location, setLocation] = useState<OnboardingLocation | null>(initialLocation);
  const [fadeKey, setFadeKey] = useState(0);

  const years = useMemo(() => {
    const cur = new Date().getFullYear();
    const arr: number[] = [];
    for (let y = cur; y >= 1900; y--) arr.push(y);
    return arr;
  }, []);

  const advance = (next: Screen) => {
    setScreen(next);
    setFadeKey((k) => k + 1);
  };

  const finish = (saveLocation: boolean) => {
    const loc = saveLocation ? location : null;
    onComplete({
      firstName: firstName.trim(),
      birthMonth: birthMonth ?? null,
      birthYear: birthYear ?? null,
      city: loc?.city ?? "",
      state: loc?.region ?? "",
      location: loc,
    });
  };

  // Crossfade wrapper
  return (
    <div
      key={fadeKey}
      style={{
        animation: "ts-onb-crossfade 500ms ease both",
      }}
    >
      <style>{`
        @keyframes ts-onb-crossfade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .ts-onb-input::placeholder {
          font-style: italic;
          color: rgba(30,46,62,0.35);
        }
        .ts-onb-input:focus {
          border-bottom-color: rgba(30,46,62,1) !important;
        }
        .ts-onb-select {
          appearance: none;
          -webkit-appearance: none;
        }
      `}</style>

      {screen === 0 && (
        <ScreenShell screen={0}>
          <CenteredCard>
            <p
              style={{
                fontFamily: '"Playfair Display", Georgia, serif',
                fontStyle: "italic",
                fontSize: 16,
                color: "#4A6B8A",
                marginBottom: "0.75rem",
                textAlign: "center",
              }}
            >
              Let's make this yours.
            </p>
            <h2
              style={{
                ...headlineStyle,
                fontStyle: "italic",
                fontSize: "clamp(22px, 5vw, 28px)",
                color: "#1E2E3E",
                marginBottom: "2rem",
              }}
            >
              What's your first name?
            </h2>
            <input
              className="ts-onb-input"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="your name"
              style={inputBaseStyle}
              autoFocus
            />
            <button
              onClick={() => firstName.trim() && advance(1)}
              disabled={!firstName.trim()}
              style={continueBtnStyle(!!firstName.trim())}
            >
              Continue →
            </button>
          </CenteredCard>
        </ScreenShell>
      )}

      {screen === 1 && (
        <ScreenShell screen={1}>
          <CenteredCard>
            <h2 style={headlineStyle}>When were you born?</h2>
            <p style={subLineStyle}>(Helps us understand your era.)</p>
            <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
              <select
                className="ts-onb-input ts-onb-select"
                value={birthMonth ?? ""}
                onChange={(e) =>
                  setBirthMonth(e.target.value ? Number(e.target.value) : null)
                }
                style={{ ...inputBaseStyle, fontSize: 14, width: 130, textAlign: "center", textAlignLast: "center" }}
              >
                <option value="">Month</option>
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
              <select
                className="ts-onb-input ts-onb-select"
                value={birthYear ?? ""}
                onChange={(e) =>
                  setBirthYear(e.target.value ? Number(e.target.value) : null)
                }
                style={{ ...inputBaseStyle, fontSize: 14, width: 80, textAlign: "center", textAlignLast: "center" }}
              >
                <option value="">Year</option>
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <p className="text-sm font-thin" style={{ ...privacyStyle, marginTop: "3rem" }}>
              Your information is yours.<br />We will never share or sell it.
            </p>
            <button
              onClick={() => birthMonth && birthYear && advance(2)}
              disabled={!(birthMonth && birthYear)}
              style={continueBtnStyle(!!(birthMonth && birthYear))}
            >
              Continue →
            </button>
            <button
              onClick={() => {
                setBirthMonth(null);
                setBirthYear(null);
                advance(2);
              }}
              style={skipLinkStyle}
            >
              Skip for now
            </button>
          </CenteredCard>
        </ScreenShell>
      )}

      {screen === 2 && (
        <ScreenShell screen={2}>
          <CenteredCard>
            <h2 style={headlineStyle}>Where are you?</h2>
            <p style={subLineStyle}>
              For when Touchstone connects you with others who shared your world.
            </p>
            <PlacesAutocomplete
              value={location?.locationDisplay ?? ""}
              onSelect={(loc) => setLocation(loc)}
              onClear={() => setLocation(null)}
            />
            <p
              style={{
                fontFamily: '"Playfair Display", Georgia, serif',
                fontStyle: "italic",
                fontSize: 14,
                color: "#4A6B8A",
                textAlign: "center",
                margin: "0.5rem 0 0",
              }}
            >
              We only use your city, never your precise location.
            </p>
            <p className="text-sm font-thin" style={privacyStyle}>
              Your information is yours.<br />We will never share or sell it.
            </p>
            <button
              onClick={() => location && finish(true)}
              disabled={!location}
              style={continueBtnStyle(!!location)}
            >
              Continue →
            </button>
            <button onClick={() => finish(false)} style={skipLinkStyle}>
              Skip for now
            </button>
          </CenteredCard>
        </ScreenShell>
      )}
    </div>
  );
};

export default OnboardingFlow;
