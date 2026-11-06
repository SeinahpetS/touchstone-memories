import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { saveOnboardingAnswersToProfile } from "@/lib/onboardingProfile";
import { getPendingKeepRoute } from "@/lib/postSignInRoute";
import OnboardingDotIndicator from "@/components/OnboardingDotIndicator";
import { ChevronLeft, Globe2 } from "lucide-react";
import world from "@/assets/geography/countries-110m.json";
import { offlineCityDraft, searchOfflineCities } from "@/lib/offlineCities";
import OnboardingGlobe, { type GlobeHandle, type GlobeInfo } from "@/components/OnboardingGlobe";
import { Button } from "@/components/ui/button";
import { type CityRow, type GlobeSelection } from "@/lib/globeLocation";
import {
  emptyOnboardingDraft,
  loadOnboardingDraft,
  saveOnboardingDraft,
} from "@/lib/onboardingDraft";

/**
 * Screen 6 — Location (dot 4, completes on Continue or Skip).
 */
const countryNames = Object.fromEntries(world.objects.countries.geometries.map(c => [c.properties.country_code, c.properties.name]));
const OnboardingLocation = () => {
  const navigate = useNavigate();
  const existing = loadOnboardingDraft() ?? emptyOnboardingDraft();
  const [city, setCity] = useState<string>(existing.city ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [selection, setSelection] = useState<GlobeSelection>({ country_code: existing.country_code ?? null, region_code: existing.region_code ?? null });
  const [suggestions, setSuggestions] = useState<CityRow[]>([]);
  const [chosenCity, setChosenCity] = useState<CityRow | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [compact, setCompact] = useState(false);
  const globeRef = useRef<GlobeHandle>(null);
  const [globeInfo, setGlobeInfo] = useState<GlobeInfo>({ zoomed: false, countryName: "", selectedName: "" });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  useEffect(() => {
    let active = true;
    void searchOfflineCities(city, selection).then(rows => { if (active) setSuggestions(rows); });
    return () => { active = false; };
  }, [city, selection]);

  const chooseCity = (row: CityRow) => {
    setCity(row[0]);
    setChosenCity(row);
    setSelection({ country_code: row[1], region_code: row[3] });
    setConfirmed(true);
    setCompact(false);
    setShowSuggestions(false);
    setActiveSuggestion(-1);
  };
  // A signed-in visitor never needs the ready or create-account screens: the
  // answers go straight to the profile and the flow is finished.
  const advance = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      try {
        await saveOnboardingAnswersToProfile(session.user.id);
      } catch {
        toast.error("Couldn't save your details. We'll try again in your archive.");
      }
      navigate(getPendingKeepRoute() ?? '/archive');
      return;
    }
    navigate('/onboarding/ready');
  };
  const handleSkip = () => { void advance(); };
  const handleContinue = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const text = city.trim();
      if (text || chosenCity) {
        saveOnboardingDraft({ ...existing, ...offlineCityDraft(chosenCity, text) });
      } else if (selection.country_code) {
        // No city typed: keep the country/region the globe picked so the
        // flow still moves on with what the user actually chose.
        saveOnboardingDraft({
          ...existing,
          country_code: selection.country_code,
          region_code: selection.region_code,
          country: countryNames[selection.country_code] ?? selection.country_code,
        });
      }
    } finally {
      await advance();
    }
  };

    return (
    <div className="location-screen">
      <OnboardingDotIndicator current={4} />
      <div className="location-content">
        <header className="location-topbar">
          <Button variant="ghost" size="icon" aria-label="Back" className="location-back" onClick={() => navigate('/onboarding/birth')}><ChevronLeft size={24} /></Button>
          <Button variant="ghost" className="location-skip" onClick={handleSkip}>Skip for now</Button>
        </header>
        <h1 className="location-heading">{globeInfo.zoomed && !confirmed ? `Where in ${globeInfo.countryName}?` : 'Where are you based?'}</h1>
        <p className="location-subline">{globeInfo.zoomed && !confirmed ? 'Tap your state, or just type your city.' : selection.country_code ? 'Tap the gold to zoom back in.' : 'Tap the globe, or just type.'}</p>
        <div className="location-globe-wrap">
          <OnboardingGlobe ref={globeRef} selection={selection} onSelect={setSelection} onViewChange={setGlobeInfo} compact={compact && !selection.country_code} confirmation={confirmed} />
        </div>
        <span id="globe-selection" className="sr-only" aria-live="polite">{globeInfo.selectedName || 'No country selected'}</span>
        {confirmed && chosenCity ? <div className="location-confirm">
          <p className="location-label">YOU’RE BASED IN</p>
          <h2>{chosenCity[0]}{chosenCity[2] ? `, ${chosenCity[2]}` : ''}</h2>
          <Button variant="link" className="location-change" onClick={() => setConfirmed(false)}>Not quite? Change it</Button>
        </div> : <>
          {selection.country_code ? <div className="location-selection-row">
            <div className="location-selected-name"><span className="location-gold-dot" />{globeInfo.selectedName}</div>
            {globeInfo.zoomed && <Button variant="outline" className="location-world" onClick={() => globeRef.current?.worldView()}><Globe2 size={18} />World view</Button>}
          </div> : <p className="location-globe-hint">Drag to turn · tap to choose</p>}
          <label htmlFor="location-city" className="location-label location-input-label">{globeInfo.zoomed ? 'WHICH CITY?' : 'OR TYPE YOUR CITY'}</label>
          <div className="relative w-full">
            <input id="location-city" type="text" value={city} aria-label="City or town" role="combobox" aria-autocomplete="list"
              aria-expanded={showSuggestions && suggestions.length > 0} aria-controls="onboarding-city-suggestions"
              aria-activedescendant={activeSuggestion >= 0 ? `onboarding-city-${activeSuggestion}` : undefined}
              onChange={e => { setCity(e.target.value); setChosenCity(null); setShowSuggestions(true); setActiveSuggestion(-1); }}
              onFocus={() => { setShowSuggestions(true); if (!selection.country_code) setCompact(true); }}
              onBlur={() => { setShowSuggestions(false); if (!city.trim()) setCompact(false); }}
              onKeyDown={e => {
                if (e.key === 'Escape') { setShowSuggestions(false); setActiveSuggestion(-1); }
                if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && suggestions.length) {
                  e.preventDefault(); setShowSuggestions(true);
                  setActiveSuggestion(index => (index + (e.key === 'ArrowDown' ? 1 : -1) + suggestions.length) % suggestions.length);
                }
                if (e.key === 'Enter') {
                  if (showSuggestions && activeSuggestion >= 0 && suggestions[activeSuggestion]) chooseCity(suggestions[activeSuggestion]);
                  else if (city.trim()) void handleContinue();
                }
              }} placeholder="City or town" className="location-city-input" />
            {showSuggestions && suggestions.length > 0 && <div id="onboarding-city-suggestions" role="listbox" className="location-city-results">
              {suggestions.map((row, index) => <Button key={`${row[0]}-${row[1]}-${row[2]}`} variant="ghost" id={`onboarding-city-${index}`} role="option"
                aria-selected={activeSuggestion === index} className="location-city-option" onMouseDown={e => e.preventDefault()} onClick={() => chooseCity(row)}>
                <span>{row[0]}</span><small>{row[2] ? `${row[2]}, ` : ''}{countryNames[row[1]] ?? row[1]}</small>
              </Button>)}
            </div>}
          </div>
        </>}
      </div>
      <footer className="location-footer"><Button className="location-continue" disabled={submitting} onClick={handleContinue}>Continue</Button></footer>
    </div>
  );
};

export default OnboardingLocation;
