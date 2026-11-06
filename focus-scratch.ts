import { countryGlobeFocus, mainlandGeometry, GLOBE_FOCUS_WIDTH_RATIO, GLOBE_FOCUS_HEIGHT_RATIO } from "./src/lib/globeLocation";
import { feature } from "topojson-client";
import { geoPath, geoOrthographic, geoCentroid } from "d3-geo";
import world from "./src/assets/geography/countries-110m.json";

const fc = feature(world as any, (world as any).objects.countries) as any;
const by = (code: string) => fc.features.find((f: any) => f.properties?.country_code === code);

for (const code of ["US", "ID", "CL", "FR", "CA", "AU", "RU", "IN"]) {
  const c = by(code);
  const focus = countryGlobeFocus(c, 300);
  const proj = geoOrthographic().translate([150, 150]).rotate(focus.rotation).scale(focus.scale);
  const main = mainlandGeometry(c.geometry);
  const mb = geoPath(proj).bounds(main);
  const wb = geoPath(proj).bounds(c.geometry);
  console.log(code,
    "type", main.type,
    "| rotation", focus.rotation.map((n) => +n.toFixed(2)).join(","),
    "| scale", +focus.scale.toFixed(1),
    "| mainlandW", +(mb[1][0] - mb[0][0]).toFixed(1),
    "| mainlandH", +(mb[1][1] - mb[0][1]).toFixed(1),
    "| wholeW", +(wb[1][0] - wb[0][0]).toFixed(1),
    "| centroid", geoCentroid(main).map((n) => +n.toFixed(1)).join(","));
}
console.log("ratios", GLOBE_FOCUS_WIDTH_RATIO, GLOBE_FOCUS_HEIGHT_RATIO, "target width 300 ->", 300 * GLOBE_FOCUS_WIDTH_RATIO, "420 ->", 420 * GLOBE_FOCUS_WIDTH_RATIO);
