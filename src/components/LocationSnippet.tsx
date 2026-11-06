import { useEffect, useRef } from "react";
import { MapPin } from "lucide-react";
import maplibregl from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { Protocol } from "pmtiles";
import { feature } from "topojson-client";
import type { Topology } from "topojson-specification";
import "maplibre-gl/dist/maplibre-gl.css";
import countries from "@/assets/geography/countries-110m.json";
import { openInMaps } from "@/lib/openInMaps";

maplibregl.setWorkerUrl(workerUrl);
let protocolAdded = false;

/** Self-hosted Protomaps archive served from this app (e.g. /tiles/basemap.pmtiles). */
const PMTILES_URL = import.meta.env.VITE_PROTOMAPS_PMTILES_URL as string | undefined;

const landGeoJson = () => {
  const topo = countries as unknown as Topology;
  return feature(topo, topo.objects.countries) as unknown as GeoJSON.FeatureCollection;
};

function buildStyle(): maplibregl.StyleSpecification {
  const css = getComputedStyle(document.documentElement);
  const hsl = (v: string, fb: string) => (css.getPropertyValue(v).trim() ? `hsl(${css.getPropertyValue(v).trim()})` : fb);
  const water = hsl("--globe-ocean", "#2C3E50");
  const land = hsl("--globe-land", "#E8E4D8");
  const line = hsl("--globe-line", "#9E9585");
  if (PMTILES_URL) {
    if (!protocolAdded) { maplibregl.addProtocol("pmtiles", new Protocol().tile); protocolAdded = true; }
    return {
      version: 8,
      sources: { pm: { type: "vector", url: `pmtiles://${PMTILES_URL}` } },
      layers: [
        { id: "bg", type: "background", paint: { "background-color": land } },
        { id: "water", type: "fill", source: "pm", "source-layer": "water", paint: { "fill-color": water } },
        { id: "roads", type: "line", source: "pm", "source-layer": "roads", paint: { "line-color": line, "line-width": 0.6 } },
        { id: "boundaries", type: "line", source: "pm", "source-layer": "boundaries", paint: { "line-color": line, "line-width": 0.8 } },
      ],
    };
  }
  return {
    version: 8,
    sources: { land: { type: "geojson", data: landGeoJson() } },
    layers: [
      { id: "bg", type: "background", paint: { "background-color": water } },
      { id: "land", type: "fill", source: "land", paint: { "fill-color": land } },
      { id: "borders", type: "line", source: "land", paint: { "line-color": line, "line-width": 0.8 } },
    ],
  };
}

interface Props { lat: number; lng: number; name?: string | null }

/** Location label + rectangular map with a pin. Tapping opens the person's own map app. */
const LocationSnippet = ({ lat, lng, name }: Props) => {
  const mapEl = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapEl.current) return;
    const map = new maplibregl.Map({
      container: mapEl.current, style: buildStyle(), center: [lng, lat], zoom: PMTILES_URL ? 11 : 4,
      interactive: false, attributionControl: false,
    });
    const pin = document.createElement("div");
    pin.className = "location-snippet-pin";
    new maplibregl.Marker({ element: pin, anchor: "bottom" }).setLngLat([lng, lat]).addTo(map);
    return () => map.remove();
  }, [lat, lng]);

  const open = () => openInMaps(lat, lng, name);
  const label = name?.trim() || "This place";

  return (
    <div className="location-snippet">
      <button type="button" className="location-snippet-label" onClick={open} aria-label={`Open ${label} in Maps`}>
        <MapPin size={16} aria-hidden="true" /> <span>{label}</span>
      </button>
      <button type="button" className="location-snippet-map" onClick={open} aria-label={`Open ${label} in Maps`}>
        <div ref={mapEl} className="location-snippet-canvas" aria-hidden="true" />
      </button>
      <button type="button" className="location-snippet-open" onClick={open}>Open in Maps</button>
    </div>
  );
};

export default LocationSnippet;
