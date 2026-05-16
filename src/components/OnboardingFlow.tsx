import { useEffect, useMemo, useState } from "react";

interface OnboardingFlowProps {
  initialFirstName?: string;
  initialBirthMonth?: number | null;
  initialBirthYear?: number | null;
  initialCity?: string;
  initialState?: string;
  onComplete: (data: {
    firstName: string;
    birthMonth: number | null;
    birthYear: number | null;
    city: string;
    state: string;
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

type Screen = 0 | 1 | 2 | 3 | 4 | 5;

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
  // Dot 1: screen 0, Dot 2: screen 1, Dot 3: screen 2, Dot 4: screens 3-5
  const activeDot = screen <= 2 ? screen : 3;
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
      {[0, 1, 2, 3].map((i) => {
        const active = i === activeDot;
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
}: {
  screen: Screen;
  children: React.ReactNode;
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
    <ProgressDots screen={screen} />
  </div>
);

const SLIDES: { img: string; copy: string; nextLabel: string }[] = [
  {
    img: "/images/constellations/orion-placeholder.png",
    copy: "Touchstone holds everything that made you who you are, and reveals why it still matters.",
    nextLabel: "Next →",
  },
  {
    img: "/images/constellations/big-dipper-placeholder.png",
    copy: "One tap saves it. Touchstone asks the question you didn't know you needed to answer.",
    nextLabel: "Next →",
  },
  {
    img: "/images/constellations/cassiopeia-placeholder.png",
    copy: "You don't need to remember everything. Just start with one thing.",
    nextLabel: "Let's go →",
  },
];

const Slide = ({
  index,
  screen,
  onNext,
}: {
  index: 0 | 1 | 2;
  screen: Screen;
  onNext: () => void;
}) => {
  const slide = SLIDES[index];
  return (
    <ScreenShell screen={screen}>
      <div
        style={{
          paddingTop: "3.2rem",
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
        }}
      >
        <div
          style={{
            width: "100%",
            height: 280,
            background: "#1A2535",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <img
            src={slide.img}
            alt=""
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
              opacity: 0.85,
            }}
          />
        </div>
        <div
          style={{
            padding: "2rem 2rem 0",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <p
            style={{
              fontFamily: '"Playfair Display", Georgia, serif',
              fontStyle: "italic",
              fontSize: "clamp(18px, 4vw, 22px)",
              color: INK,
              lineHeight: 1.5,
              maxWidth: 340,
              textAlign: "center",
              margin: 0,
            }}
          >
            {slide.copy}
          </p>
        </div>
        <div style={{ flex: 1 }} />
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            padding: "0 1.5rem 4rem",
          }}
        >
          <button
            onClick={onNext}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontFamily: '"Playfair Display", Georgia, serif',
              fontStyle: "italic",
              fontSize: 13,
              color: MUTED,
              opacity: 0.7,
              padding: 8,
            }}
          >
            {slide.nextLabel}
          </button>
        </div>
      </div>
    </ScreenShell>
  );
};

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
  color: MUTED,
  opacity: 0.45,
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
  fontSize: 12,
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

const OnboardingFlow = ({
  initialFirstName = "",
  initialBirthMonth = null,
  initialBirthYear = null,
  initialCity = "",
  initialState = "",
  onComplete,
}: OnboardingFlowProps) => {
  const [screen, setScreen] = useState<Screen>(0);
  const [firstName, setFirstName] = useState(initialFirstName);
  const [birthMonth, setBirthMonth] = useState<number | null>(initialBirthMonth);
  const [birthYear, setBirthYear] = useState<number | null>(initialBirthYear);
  const [city, setCity] = useState(initialCity);
  const [stateVal, setStateVal] = useState(initialState);
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

  const finish = (saveCityState: boolean) => {
    onComplete({
      firstName: firstName.trim(),
      birthMonth: birthMonth ?? null,
      birthYear: birthYear ?? null,
      city: saveCityState ? city.trim() : "",
      state: saveCityState ? stateVal : "",
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

      {screen === 0 && <Slide index={0} screen={0} onNext={() => advance(1)} />}
      {screen === 1 && <Slide index={1} screen={1} onNext={() => advance(2)} />}
      {screen === 2 && <Slide index={2} screen={2} onNext={() => advance(3)} />}

      {screen === 3 && (
        <ScreenShell screen={3}>
          <CenteredCard>
            <h2 style={{ ...headlineStyle, marginBottom: "2rem" }}>
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
              onClick={() => firstName.trim() && advance(4)}
              disabled={!firstName.trim()}
              style={continueBtnStyle(!!firstName.trim())}
            >
              Continue →
            </button>
          </CenteredCard>
        </ScreenShell>
      )}

      {screen === 4 && (
        <ScreenShell screen={4}>
          <CenteredCard>
            <h2 style={headlineStyle}>When were you born?</h2>
            <p style={subLineStyle}>Helps us understand your era.</p>
            <div style={{ display: "flex", gap: 12, width: "100%" }}>
              <select
                className="ts-onb-input ts-onb-select"
                value={birthMonth ?? ""}
                onChange={(e) =>
                  setBirthMonth(e.target.value ? Number(e.target.value) : null)
                }
                style={{ ...inputBaseStyle, fontSize: 15, width: "55%" }}
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
                style={{ ...inputBaseStyle, fontSize: 15, width: "40%" }}
              >
                <option value="">Year</option>
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <p style={privacyStyle}>
              Your information is yours. We will never share or sell it.
            </p>
            <button
              onClick={() => birthMonth && birthYear && advance(5)}
              disabled={!(birthMonth && birthYear)}
              style={continueBtnStyle(!!(birthMonth && birthYear))}
            >
              Continue →
            </button>
            <button
              onClick={() => {
                setBirthMonth(null);
                setBirthYear(null);
                advance(5);
              }}
              style={skipLinkStyle}
            >
              Skip for now
            </button>
          </CenteredCard>
        </ScreenShell>
      )}

      {screen === 5 && (
        <ScreenShell screen={5}>
          <CenteredCard>
            <h2 style={headlineStyle}>Where are you?</h2>
            <p style={subLineStyle}>
              For when Touchstone connects you with others who shared your world.
            </p>
            <div style={{ display: "flex", gap: 12, width: "100%" }}>
              <input
                className="ts-onb-input"
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="city"
                style={{ ...inputBaseStyle, fontSize: 15, width: "55%" }}
              />
              <select
                className="ts-onb-input ts-onb-select"
                value={stateVal}
                onChange={(e) => setStateVal(e.target.value)}
                style={{ ...inputBaseStyle, fontSize: 15, width: "40%" }}
              >
                <option value="">State</option>
                {US_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <p style={privacyStyle}>
              Your information is yours. We will never share or sell it.
            </p>
            <button
              onClick={() => city.trim() && stateVal && finish(true)}
              disabled={!(city.trim() && stateVal)}
              style={continueBtnStyle(!!(city.trim() && stateVal))}
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
