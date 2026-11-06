/** Registers the share-target worker only on the published app, never in previews or dev. */
const SW_PATH = "/share-target-sw.js";

function isRefusedContext(): boolean {
  if (!import.meta.env.PROD) return true;
  try { if (window.self !== window.top) return true; } catch { return true; }
  const host = window.location.hostname.toLowerCase();
  if (/\.(lovable\.app|gpt-eng\.com|gptengineer\.run)$/.test(host)) {
    const label = host.split(".")[0];
    if (/^(?:id-preview|preview)(?:-[a-z0-9]+)?--.+$/.test(label)) return true;
    if (/^project--.+-dev$/.test(label)) return true;
  }
  if (host === "lovableproject.com" || host.endsWith(".lovableproject.com")) return true;
  if (host === "lovableproject-dev.com" || host.endsWith(".lovableproject-dev.com")) return true;
  if (host === "beta.lovable.dev" || host.endsWith(".beta.lovable.dev")) return true;
  if (new URLSearchParams(window.location.search).get("sw") === "off") return true;
  return false;
}

export function registerShareTarget(): void {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  if (isRefusedContext()) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.filter((r) => r.active?.scriptURL.endsWith(SW_PATH)).forEach((r) => r.unregister());
    }).catch(() => {});
    return;
  }
  window.addEventListener("load", () => { navigator.serviceWorker.register(SW_PATH).catch(() => {}); });
}
