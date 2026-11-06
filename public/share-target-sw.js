// Share-target only: receives Android "Share to Touchstone" posts and hands
// them to /capture. It caches nothing and leaves every other request alone.
const DB = "ts-share", STORE = "pending", KEY = "current";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

function save(record) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const db = req.result;
      const t = db.transaction(STORE, "readwrite");
      t.objectStore(STORE).put(record, KEY);
      t.oncomplete = () => { db.close(); resolve(); };
      t.onerror = () => { db.close(); reject(t.error); };
    };
  });
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "POST" || url.origin !== self.location.origin || url.pathname !== "/capture") return;
  event.respondWith((async () => {
    try {
      const form = await event.request.formData();
      const image = form.getAll("image").find((f) => f && typeof f === "object" && f.size > 0) || null;
      await save({
        url: form.get("url") || null,
        title: form.get("title") || null,
        text: form.get("text") || null,
        file: image,
        fileName: image ? image.name : null,
      });
    } catch (_) { /* open plain capture */ }
    return Response.redirect("/capture?shared=1", 303);
  })());
});
