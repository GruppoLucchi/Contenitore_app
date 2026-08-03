// Service worker minimo: rende l'app installabile e disponibile offline
// per la sola shell statica (HTML/CSS/JS/icone). Le chiamate al web
// service (POST verso lucchi.com) vanno sempre in rete e non sono mai
// gestite dalla cache.

const CACHE_NAME = "primanota-cassa-v11";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./gla_logo_color.jpg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Solo richieste GET sulla stessa origine (la shell dell'app) passano
  // dalla cache. Tutto il resto (in particolare le chiamate SOAP verso
  // lucchi.com) va sempre in rete.
  if (req.method !== "GET" || url.origin !== self.location.origin){
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return response;
      }).catch(() => cached);
    })
  );
});
