// --- Service Worker : Habit Tracker (cache-first + offline fallback) ---
const CACHE = "habits-cache-v2"; // ↑ incrémente la version si tu modifies des fichiers
const ASSETS = [
  "./",
  "./index.html",
  "./settings.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

// Installe et pré-cache les fichiers essentiels
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Nettoie les anciens caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Stratégie de fetch :
// 1) HTML/navigation → Network-first avec fallback cache puis offline (index.html)
// 2) Assets statiques (listés) → Cache-first
// 3) Autres requêtes → Cache d’abord, sinon réseau, sinon fallback index.html
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  const isHTML =
    req.mode === "navigate" ||
    (req.headers.get("accept") || "").includes("text/html");

  if (isHTML) {
    // Network-first pour les pages (meilleures mises à jour)
    event.respondWith(
      fetch(req)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return resp;
        })
        .catch(async () => {
          const cached = await caches.match(req);
          return cached || caches.match("./index.html");
        })
    );
    return;
  }

  // Assets statiques connus → cache-first
  if (ASSETS.some((p) => url.pathname.endsWith(p.replace("./", "/")))) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req))
    );
    return;
  }

  // Autres fichiers → cache d’abord, sinon réseau, sinon fallback index
  event.respondWith(
    caches.match(req).then((cached) => {
      return (
        cached ||
        fetch(req)
          .then((resp) => {
            // Optionnel : mettre en cache à la volée
            const copy = resp.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
            return resp;
          })
          .catch(() => caches.match("./index.html"))
      );
    })
  );
});
