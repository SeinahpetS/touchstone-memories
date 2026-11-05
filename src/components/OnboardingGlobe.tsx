import { forwardRef, useEffect, useId, useImperativeHandle, useMemo, useRef, useState } from "react";
import { geoCentroid, geoContains, geoDistance, geoGraticule, geoOrthographic, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import type { Topology, GeometryCollection } from "topojson-specification";
import world from "@/assets/geography/countries-110m.json";
import { countryGlobeFocus, GLOBE_RADIUS, GLOBE_EXPANDED_SIZE, GLOBE_FOCUS_MS, SELECTION_RING_RADIUS, isGlobeTap, needsSelectionRing, REGIONAL_COUNTRIES, type GlobeSelection } from "@/lib/globeLocation";

type Place = Feature<Geometry, { name: string; country_code: string; region_code?: string }>;
function decode(data: unknown): Place[] {
  const topology = data as Topology<{ [name: string]: GeometryCollection }>;
  const object = Object.values(topology.objects)[0];
  if (!object) return [];
  return (feature(topology, object) as FeatureCollection<Geometry, Place["properties"]>).features;
}
const countries = decode(world);
const graticule = geoGraticule().step([20, 20]).extent([[-180, -70], [180, 70]])();
const regionFiles = import.meta.glob("../assets/geography/regions/*.json");
type View = { rotation: [number, number, number]; scale: number };
const INITIAL_VIEW: View = { rotation: [30, -15, 0], scale: GLOBE_RADIUS };

export interface GlobeHandle { worldView: () => void; }
export interface GlobeInfo { zoomed: boolean; countryName: string; selectedName: string; }
export default forwardRef<GlobeHandle, {
  selection: GlobeSelection;
  onSelect: (value: GlobeSelection) => void;
  onViewChange?: (info: GlobeInfo) => void;
  compact?: boolean;
  confirmation?: boolean;
}> (function OnboardingGlobe({ selection, onSelect, onViewChange, compact = false, confirmation = false }, ref) {
  const [view, setView] = useState<View>(INITIAL_VIEW);
  const [regions, setRegions] = useState<Place[]>([]);
  const [zoomed, setZoomed] = useState(false);
  const pointers = useRef(new Map<number, [number, number]>());
  const pinchDistance = useRef<number | null>(null);
  const selectedCountry = countries.find(c => c.properties.country_code === selection.country_code);
  const selectedRegion = regions.find(r => r.properties.region_code === selection.region_code);
  const selectedArea = selectedRegion ?? selectedCountry;
  const countryName = selectedCountry?.properties.name ?? "";
  useEffect(() => { onViewChange?.({ zoomed, countryName, selectedName: selectedRegion ? `${selectedRegion.properties.name}, ${countryName}` : countryName }); }, [zoomed, countryName, selectedRegion, onViewChange]);
  const clipId = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const frame = useRef(0);
  const loadVersion = useRef(0);
  const gesture = useRef<{ id: number; start: [number, number]; rotation: View["rotation"]; distance: number } | null>(null);
  const projection = useMemo(() => geoOrthographic().translate([150, 150]).scale(view.scale)
    .rotate(view.rotation).clipAngle(90).clipExtent([[0, 0], [300, 300]]), [view]);
  const path = geoPath(projection);
  // World view: a selection smaller than 24px across gets a findability ring at its centroid.
  const ring = useMemo(() => {
    if (!selection.country_code || zoomed) return null;
    const country = selectedArea;
    if (!country) return null;
    const center = geoCentroid(country);
    if (geoDistance(center, [-view.rotation[0], -view.rotation[1]]) > Math.PI / 2) return null;
    const projected = projection(center);
    if (!projected) return null;
    return needsSelectionRing(path.bounds(country)) ? { cx: projected[0], cy: projected[1] } : null;
  }, [selection.country_code, zoomed, selectedArea, projection, path]);

  useEffect(() => () => { cancelAnimationFrame(frame.current); loadVersion.current++; }, []);

  useEffect(() => {
    const code = selection.country_code;
    if (!code || !REGIONAL_COUNTRIES.has(code)) { setRegions([]); return; }
    const loader = regionFiles[`../assets/geography/regions/${code}.json`];
    if (!loader) return;
    let active = true;
    void loader().then(module => { if (active) setRegions(decode((module as { default: unknown }).default)); });
    return () => { active = false; };
  }, [selection.country_code]);

  function animateView(targetRotation: View["rotation"], targetScale: number) {
    cancelAnimationFrame(frame.current);
    const start = view;
    const longitudeDelta = ((targetRotation[0] - start.rotation[0] + 540) % 360) - 180;
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : GLOBE_FOCUS_MS;
    const began = performance.now();
    function animate(now: number) {
      const t = duration ? Math.min(1, (now - began) / duration) : 1;
      const eased = t * t * (3 - 2 * t);
      setView({ rotation: [start.rotation[0] + longitudeDelta * eased,
        start.rotation[1] + (targetRotation[1] - start.rotation[1]) * eased, 0],
      scale: start.scale + (targetScale - start.scale) * eased });
      if (t < 1) frame.current = requestAnimationFrame(animate);
    }
    frame.current = requestAnimationFrame(animate);
  }

  function focusCountry(country: Place) {
    if (!REGIONAL_COUNTRIES.has(country.properties.country_code)) return;
    setZoomed(true);
    const focus = countryGlobeFocus(country);
    animateView(focus.rotation, focus.scale);
  }

  function worldView() {
    setZoomed(false);
    const center = selectedArea ? geoCentroid(selectedArea) : [0, 0];
    animateView([-center[0], -center[1], 0], GLOBE_RADIUS);
  }
  useImperativeHandle(ref, () => ({ worldView }));
  useEffect(() => { if (confirmation) worldView(); }, [confirmation, selectedArea]);

  async function selectAt(point: [number, number]) {
    const lonLat = projection.invert?.(point);
    // Orthographic inversion outside the ocean disk is not a valid tap.
    if (!lonLat || !lonLat.every(Number.isFinite) || Math.hypot(point[0] - 150, point[1] - 150) > GLOBE_RADIUS) return;
    if (!zoomed && selectedCountry && ((ring && Math.hypot(point[0] - ring.cx, point[1] - ring.cy) <= SELECTION_RING_RADIUS) || (selectedArea && geoContains(selectedArea, lonLat)))) { focusCountry(selectedCountry); return; }
    const region = regions.find(item => geoContains(item, lonLat));
    if (region) {
      if (!zoomed && selectedCountry) { focusCountry(selectedCountry); return; }
      onSelect({ country_code: region.properties.country_code, region_code: region.properties.region_code ?? null });
      return;
    }
    const country = countries.find(item => geoContains(item, lonLat));
    if (!country?.properties.country_code) return;
    const code = country.properties.country_code;
    onSelect({ country_code: code, region_code: null });
    setRegions([]);
    const version = ++loadVersion.current;
    focusCountry(country);
    if (!REGIONAL_COUNTRIES.has(code)) return;
    const loader = regionFiles[`../assets/geography/regions/${code}.json`];
    if (!loader) return;
    try {
      const module = await loader() as { default: unknown };
      if (loadVersion.current === version) setRegions(decode(module.default));
    } catch { /* Country selection remains usable if its region chunk fails. */ }
  }

  const pointAt = (event: React.PointerEvent<SVGSVGElement>): [number, number] => {
    const rect = event.currentTarget.getBoundingClientRect();
    return [(event.clientX - rect.left) * 300 / rect.width, (event.clientY - rect.top) * 300 / rect.height];
  };

  return <svg ref={svgRef} width={confirmation ? 220 : compact ? 150 : zoomed ? GLOBE_EXPANDED_SIZE : 300} height={confirmation ? 220 : compact ? 150 : zoomed ? GLOBE_EXPANDED_SIZE : 300} viewBox="0 0 300 300"
    className={`onboarding-globe${zoomed ? " globe-expanded" : ""}${compact ? " globe-compact" : ""}${confirmation ? " globe-confirmation" : ""}`} role="application" aria-label="Select a country or region on the globe"
    aria-describedby="globe-selection" tabIndex={0}
    data-country-code={selection.country_code ?? ""} data-region-code={selection.region_code ?? ""}
    data-projection="orthographic" data-projection-scale={view.scale}
    onPointerDown={event => {
      pointers.current.set(event.pointerId, pointAt(event));
      if (pointers.current.size === 2) {
        const [a, b] = [...pointers.current.values()];
        pinchDistance.current = Math.hypot(a[0] - b[0], a[1] - b[1]);
        gesture.current = null;
        event.currentTarget.setPointerCapture(event.pointerId);
        return;
      }
      if (gesture.current || (event.pointerType === "mouse" && event.button !== 0)) return;
      cancelAnimationFrame(frame.current);
      gesture.current = { id: event.pointerId, start: pointAt(event), rotation: view.rotation, distance: 0 };
      event.currentTarget.setPointerCapture(event.pointerId);
    }}
    onPointerMove={event => {
      if (pointers.current.has(event.pointerId)) pointers.current.set(event.pointerId, pointAt(event));
      if (pointers.current.size === 2 && pinchDistance.current !== null) {
        const [a, b] = [...pointers.current.values()];
        if (Math.hypot(a[0] - b[0], a[1] - b[1]) < pinchDistance.current - 12 && zoomed) { worldView(); pinchDistance.current = null; }
        return;
      }
      const current = gesture.current;
      if (!current || current.id !== event.pointerId) return;
      const point = pointAt(event);
      const dx = point[0] - current.start[0], dy = point[1] - current.start[1];
      current.distance = Math.max(current.distance, Math.hypot(dx, dy));
      if (isGlobeTap(current.distance)) return;
      setView(v => ({ ...v, rotation: [current.rotation[0] + dx * 0.45,
        Math.max(-89, Math.min(89, current.rotation[1] - dy * 0.45)), 0] }));
    }}
    onPointerUp={event => {
      pointers.current.delete(event.pointerId);
      if (pointers.current.size < 2) pinchDistance.current = null;
      const current = gesture.current;
      if (!current || current.id !== event.pointerId) return;
      const point = pointAt(event);
      current.distance = Math.max(current.distance, Math.hypot(point[0] - current.start[0], point[1] - current.start[1]));
      gesture.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
      if (isGlobeTap(current.distance)) void selectAt(point);
    }}
    onPointerCancel={event => { pointers.current.delete(event.pointerId); gesture.current = null; pinchDistance.current = null; }}
    onKeyDown={event => {
      const moves: Record<string, [number, number]> = { ArrowLeft: [-10, 0], ArrowRight: [10, 0], ArrowUp: [0, 10], ArrowDown: [0, -10] };
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); void selectAt([150, 150]); }
      const move = moves[event.key];
      if (!move) return;
      event.preventDefault(); cancelAnimationFrame(frame.current);
      setView(v => ({ ...v, rotation: [v.rotation[0] + move[0], Math.max(-89, Math.min(89, v.rotation[1] + move[1])), 0] }));
    }}>
    <defs><clipPath id={clipId}><circle cx={150} cy={150} r={GLOBE_RADIUS} /></clipPath></defs>
    <circle className="globe-ocean" cx={150} cy={150} r={GLOBE_RADIUS} />
    <g clipPath={`url(#${clipId})`}>
    <path className="globe-graticule" d={path(graticule) ?? ""} />
    {countries.map((country, index) => <path key={country.id ?? index}
      data-country={country.properties.country_code}
      className={`globe-country${country.properties.country_code === selection.country_code ? (selection.region_code ? " globe-parent-selected" : " globe-selected") : ""}`}
      d={path(country) ?? ""}><title>{country.properties.name}</title></path>)}
    {regions.map((region, index) => <path key={`${region.properties.region_code}-${index}`}
      data-region={region.properties.region_code}
      className={`globe-region${!selection.region_code || region.properties.region_code === selection.region_code ? " globe-selected" : ""}`}
      d={path(region) ?? ""}><title>{region.properties.name}</title></path>)}
    {!zoomed && selection.region_code && selectedCountry && <path className="globe-parent-outline" d={path(selectedCountry) ?? ""} />}
    {ring && <circle className="globe-selection-ring" cx={ring.cx} cy={ring.cy} r={SELECTION_RING_RADIUS} aria-hidden="true" />}
    </g>
    <circle className="globe-edge" cx={150} cy={150} r={GLOBE_RADIUS} aria-hidden="true" />
  </svg>;
});