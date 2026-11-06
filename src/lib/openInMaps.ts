/** Builds the URL that opens a location in the person's own map app. Nothing is fetched here. */
export type MapsPlatform = "ios" | "android" | "desktop";

type CapacitorLike = { isNativePlatform?: () => boolean; getPlatform?: () => string };

export function detectMapsPlatform(nav: { userAgent: string; platform?: string; maxTouchPoints?: number } = navigator,
  cap: CapacitorLike | undefined = (globalThis as { Capacitor?: CapacitorLike }).Capacitor): MapsPlatform {
  if (cap?.isNativePlatform?.()) {
    const p = cap.getPlatform?.();
    if (p === "ios") return "ios";
    if (p === "android") return "android";
  }
  const ua = nav.userAgent;
  if (/android/i.test(ua)) return "android";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  // iPadOS reports itself as a Mac; touch support gives it away.
  if (nav.platform === "MacIntel" && (nav.maxTouchPoints ?? 0) > 1) return "ios";
  return "desktop";
}

export function mapsUrl(platform: MapsPlatform, lat: number, lng: number, name: string | null | undefined) {
  const label = (name ?? "").trim();
  if (platform === "android") {
    return `geo:${lat},${lng}?q=${lat},${lng}${label ? `(${encodeURIComponent(label)})` : ""}`;
  }
  return `https://maps.apple.com/?ll=${lat},${lng}&q=${encodeURIComponent(label || `${lat},${lng}`)}`;
}

export function isNativeApp(cap: CapacitorLike | undefined = (globalThis as { Capacitor?: CapacitorLike }).Capacitor) {
  return Boolean(cap?.isNativePlatform?.());
}

/** Opens the location with the system handler; desktop gets a new tab. */
export function openInMaps(lat: number, lng: number, name: string | null | undefined) {
  const platform = detectMapsPlatform();
  const url = mapsUrl(platform, lat, lng, name);
  if (platform === "desktop") {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }
  // In the Capacitor apps, `_system` hands the URL to the OS (Maps app) instead of an in-app webview;
  // mobile browsers hand geo: and maps.apple.com links to the map app the same way.
  if (isNativeApp()) window.open(url, "_system");
  else window.location.href = url;
}
