import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import OnboardingDotIndicator from "@/components/OnboardingDotIndicator";
import OnboardingGlobe from "@/components/OnboardingGlobe";
import { Button } from "@/components/ui/button";
import { rankLocalCities, type CityRow, type GlobeSelection } from "@/lib/globeLocation";
import {
  emptyOnboardingDraft,
  loadOnboardingDraft,
  saveOnboardingDraft,
} from "@/lib/onboardingDraft";

/**
 * Screen 6 — Location (dot 4, completes on Continue or Skip).
 */
const OnboardingLocation = () => {
  const navigate = useNavigate();
  const existing = loadOnboardingDraft() ?? emptyOnboardingDraft();
  const [city, setCity] = useState<string>(existing.city ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [selection, setSelection] = useState<GlobeSelection>({ country_code: null, region_code: null });
  const [cities, setCities] = useState<CityRow[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const suggestions = useMemo(() => rankLocalCities(cities, city, selection), [cities, city, selection]);

  useEffect(() => {
    let active = true;
    if (city.trim().length >= 2 && !cities.length) {
      void import("@/assets/geography/cities.json").then(module => {
        if (active) setCities(module.default as CityRow[]);
      });
    }
    return () => { active = false; };
  }, [city, cities.length]);

  const chooseCity = (row: CityRow) => {
    setCity(`${row[0]}, ${row[2] ? `${row[2]}, ` : ""}${row[1]}`);
    setShowSuggestions(false);
    setActiveSuggestion(-1);
  };

  const advance = () => navigate("/onboarding/ready");

  const handleContinue = async () => {
    setSubmitting(true);
    try {
      const trimmed = city.trim();
      if (trimmed) {
        saveOnboardingDraft({
          ...existing,
          city: trimmed,
          placeId: null,
          region: '',
          country: '',
          locationDisplay: trimmed,
        });
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user) {
          await (supabase as any)
            .from("profiles")
            .update({ city: trimmed, location_display: trimmed, region: null, country: null, place_id: null })
            .eq("id", session.user.id);
        }
      }
    } finally {
      advance();
    }
  };

  const handleSkip = () => advance();

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-8"
      style={{ backgroundColor: "#F2EEE5" }}
    >
      <OnboardingDotIndicator current={4} />

      <div className="w-full max-w-sm flex flex-col items-center">
        <p
          style={{
            fontFamily: "'Jost', sans-serif",
            fontSize: 12,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#9E9585",
            margin: 0,
            marginBottom: 28,
            textAlign: "center",
          }}
        >
          Where are you based
        </p>

        <OnboardingGlobe selection={selection} onSelect={setSelection} />
        <span id="globe-selection" className="sr-only" aria-live="polite">
          {selection.country_code ? `${selection.country_code}${selection.region_code ? `, ${selection.region_code}` : ""}` : "No country selected"}
        </span>

        <div className="relative w-full">
        <input
          type="text"
          value={city}
          aria-label="City or town"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showSuggestions && suggestions.length > 0}
          aria-controls="onboarding-city-suggestions"
          aria-activedescendant={activeSuggestion >= 0 ? `onboarding-city-${activeSuggestion}` : undefined}
          onChange={(e) => { setCity(e.target.value); setShowSuggestions(true); setActiveSuggestion(-1); }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setShowSuggestions(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") { setShowSuggestions(false); setActiveSuggestion(-1); }
            if ((e.key === "ArrowDown" || e.key === "ArrowUp") && suggestions.length) {
              e.preventDefault(); setShowSuggestions(true);
              setActiveSuggestion(index => (index + (e.key === "ArrowDown" ? 1 : -1) + suggestions.length) % suggestions.length);
            }
            if (e.key === "Enter") {
              if (showSuggestions && activeSuggestion >= 0 && suggestions[activeSuggestion]) chooseCity(suggestions[activeSuggestion]);
              else void handleContinue();
            }
          }}
          placeholder="City or town"
          autoFocus
          className="w-full text-center bg-transparent focus:outline-none"
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontStyle: "italic",
            fontSize: 24,
            color: "#1E2E3E",
            border: "none",
            borderBottom: "1px solid #B8860B",
            padding: "8px 0",
            borderRadius: 0,
          }}
        />
        {showSuggestions && suggestions.length > 0 && <div id="onboarding-city-suggestions" role="listbox"
          className="onboarding-city-results absolute top-full left-0 z-10 mt-1 w-full border rounded-md bg-background overflow-hidden">
          {suggestions.map((row, index) => <Button key={`${row[0]}-${row[1]}-${row[2]}`} variant="ghost"
            id={`onboarding-city-${index}`} role="option" aria-selected={activeSuggestion === index}
            className={`w-full h-auto min-h-11 rounded-none justify-start whitespace-normal text-left font-jost ${activeSuggestion === index ? "bg-accent" : ""}`}
            onMouseDown={e => e.preventDefault()} onClick={() => chooseCity(row)}>
            {row[0]}, {row[2] ? `${row[2]}, ` : ""}{row[1]}
          </Button>)}
        </div>}
        </div>

        <button
          type="button"
          onClick={handleContinue}
          disabled={submitting}
          className="w-full"
          style={{
            marginTop: 40,
            height: 52,
            backgroundColor: "#1E2E3E",
            color: "#F2EEE5",
            border: "none",
            borderRadius: 12,
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 16,
            cursor: submitting ? "not-allowed" : "pointer",
            opacity: submitting ? 0.7 : 1,
            transition: "opacity 200ms ease",
            animation: "ts-screen6-fade-in 400ms ease both",
          }}
        >
          Continue
        </button>

        <button
          type="button"
          onClick={handleSkip}
          className="mt-4"
          style={{
            fontFamily: "'Jost', sans-serif",
            fontSize: 12,
            color: "#9E9585",
            background: "none",
            border: "none",
            cursor: "pointer",
            textDecoration: "underline",
            textUnderlineOffset: 3,
            animation: "ts-screen6-fade-in 400ms ease both",
          }}
        >
          Skip for now
        </button>
      </div>

      <style>{`
        @keyframes ts-screen6-fade-in { from { opacity: 0 } to { opacity: 1 } }
        input::placeholder {
          color: rgba(30, 46, 62, 0.35);
          font-style: italic;
        }
      `}</style>
    </div>
  );
};

export default OnboardingLocation;
