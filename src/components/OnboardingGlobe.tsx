import { useEffect, useMemo, useRef, useState } from "react";
import { geoCentroid, geoContains, geoGraticule10, geoOrthographic, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import type { Topology, GeometryCollection } from "topojson-specification";
import world from "@/assets/geography/countries-110m.json";
import { GLOBE_FOCUS_MS, isGlobeTap, REGIONAL_COUNTRIES, type GlobeSelection } from "@/lib/globeLocation";

type Place = Feature<Geometry, { name: string; country_code: string; region_code?: string }>;
function decode(data: unknown): Place[] {
  const topology = data as Topology<{ [name: string]: GeometryCollection }>;
  const object = Object.values(topology.objects)[0];
  if (!object) return [];
  return (feature(topology, object) as FeatureCollection<Geometry, Place["properties"]>).features;
}
const countries = decode(world);
const graticule = geoGraticule10();
const regionFiles = import.meta.glob("../assets/geography/regions/*.json");
type View = { rotation: [number, number, number]; scale: number };
const INITIAL_VIEW: View = { rotation: [30, -15, 0], scale: 146 };

export default function OnboardingGlobe({ selection, onSelect }: {
  selection: GlobeSelection;
  onSelect: (value: GlobeSelection) => void;
}) {
  const [view, setView] = useState<View>(INITIAL_VIEW);
  const [regions, setRegions] = useState<Place[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);
  const frame = useRef(0);
  const loadVersion = useRef(0);
  const gesture = useRef<{ id: number; start: [number, number]; rotation: View["rotation"]; distance: number } | null>(null);
  const projection = useMemo(() => geoOrthographic().translate([150, 150]).scale(view.scale)
    .rotate(view.rotation).clipAngle(90).clipExtent([[0, 0], [300, 300]]), [view]);
  const path = geoPath(projection);

  useEffect(() => () => { cancelAnimationFrame(frame.current); loadVersion.current++; }, []);

  function focusCountry(country: Place) {
    cancelAnimationFrame(frame.current);
    const center = geoCentroid(country);
    const targetRotation: View["rotation"] = [-center[0], -center[1], 0];
    const fitted = geoOrthographic().translate([150, 150]).scale(146).rotate(targetRotation);
    const bounds = geoPath(fitted).bounds(country);
    const radius = Math.max(...bounds.flat().map(value => Math.abs(value - 150)));
    const targetScale = Number.isFinite(radius) && radius > 0 ? 146 * 135 / radius : 146;
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

  async function selectAt(point: [number, number]) {
    const lonLat = projection.invert?.(point);
    // Orthographic inversion outside the ocean disk is not a valid tap.
    if (!lonLat || !lonLat.every(Number.isFinite) || Math.hypot(point[0] - 150, point[1] - 150) > view.scale) return;
    const region = regions.find(item => geoContains(item, lonLat));
    if (region) {
      onSelect({ country_code: region.properties.country_code, region_code: region.properties.region_code ?? null });
      return;
    }
    const country = countries.find(item => geoContains(item, lonLat));
    if (!country?.properties.country_code) return;
    const code = country.properties.country_code;
    onSelect({ country_code: code, region_code: null });
    setRegions([]);
    const version = ++loadVersion.current;
    if (!REGIONAL_COUNTRIES.has(code)) return;
    focusCountry(country);
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

  return <svg ref={svgRef} width="300" height="300" viewBox="0 0 300 300"
    className="onboarding-globe" role="application" aria-label="Select a country or region on the globe"
    aria-describedby="globe-selection" tabIndex={0}
    data-country-code={selection.country_code ?? ""} data-region-code={selection.region_code ?? ""}
    onPointerDown={event => {
      if (gesture.current || (event.pointerType === "mouse" && event.button !== 0)) return;
      cancelAnimationFrame(frame.current);
      gesture.current = { id: event.pointerId, start: pointAt(event), rotation: view.rotation, distance: 0 };
      event.currentTarget.setPointerCapture(event.pointerId);
    }}
    onPointerMove={event => {
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
      const current = gesture.current;
      if (!current || current.id !== event.pointerId) return;
      const point = pointAt(event);
      current.distance = Math.max(current.distance, Math.hypot(point[0] - current.start[0], point[1] - current.start[1]));
      gesture.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
      if (isGlobeTap(current.distance)) void selectAt(point);
    }}
    onPointerCancel={() => { gesture.current = null; }}
    onKeyDown={event => {
      const moves: Record<string, [number, number]> = { ArrowLeft: [-10, 0], ArrowRight: [10, 0], ArrowUp: [0, 10], ArrowDown: [0, -10] };
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); void selectAt([150, 150]); }
      const move = moves[event.key];
      if (!move) return;
      event.preventDefault(); cancelAnimationFrame(frame.current);
      setView(v => ({ ...v, rotation: [v.rotation[0] + move[0], Math.max(-89, Math.min(89, v.rotation[1] + move[1])), 0] }));
    }}>
    <path className="globe-ocean" d={path({ type: "Sphere" }) ?? ""} />
    <path className="globe-graticule" d={path(graticule) ?? ""} />
    {countries.map((country, index) => <path key={country.id ?? index}
      data-country={country.properties.country_code}
      className={`globe-country${country.properties.country_code === selection.country_code ? " globe-selected" : ""}`}
      d={path(country) ?? ""}><title>{country.properties.name}</title></path>)}
    {regions.map((region, index) => <path key={`${region.properties.region_code}-${index}`}
      data-region={region.properties.region_code}
      className={`globe-region${region.properties.region_code === selection.region_code ? " globe-selected" : ""}`}
      d={path(region) ?? ""}><title>{region.properties.name}</title></path>)}
  </svg>;
}