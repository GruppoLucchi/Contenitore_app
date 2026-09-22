// Service worker: rende l'app installabile e disponibile offline per la shell
// statica. Le chiamate al web service (POST verso lucchi.com) vanno SEMPRE in
// rete e non sono mai gestite dalla cache.
//
// IMPORTANTE: la CACHE_NAME va incrementata a OGNI modifica dei file in cache
// (la incrementa Claude, non serve farlo a mano). Cambiando il nome, la nuova
// versione si installa, cancella la vecchia e - grazie a skipWaiting +
// controllerchange nell'index - l'app si aggiorna DA SOLA alla riapertura,
// senza reinstallare e senza manovre da parte dell'utente.

const CACHE_NAME = "primanota-cassa-v31";
const APP_SHELL = [
  "./",
  "./index.html",
  "./config.json",
  "./manifest.json",
  "./gla_logo_color.jpg"
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Installazione TOLLERANTE: se un singolo file non è raggiungibile non
    // blocca l'installazione. Con cache.addAll (tutto-o-niente) bastava un file
    // mancante per far fallire l'attivazione della nuova versione, lasciando al
    // comando quella vecchia a tempo indeterminato.
    await Promise.allSettled(APP_SHELL.map((url) => cache.add(url)));
    await self.skipWaiting();
  })());
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

  // Solo richieste GET sulla stessa origine (la shell dell'app) passano dal
  // service worker. Tutto il resto - in particolare le chiamate SOAP verso
  // lucchi.com (POST, cross-origin) - va sempre in rete, mai in cache.
  if (req.method !== "GET" || url.origin !== self.location.origin){
    return;
  }

  const isNavigation = req.mode === "navigate";
  const isConfig = url.pathname.endsWith("config.json");

  // index.html / navigazioni e config.json: NETWORK-FIRST.
  // Così le modifiche si vedono subito alla riapertura; se offline, si ripiega
  // sulla cache. (Il vecchio sw era cache-first sulla shell: se non si cambiava
  // la CACHE_NAME continuava a servire la versione vecchia all'infinito - era
  // la causa del "vede ancora il vecchio" un giorno dopo.)
  if (isNavigation || isConfig){
    event.respondWith(
      fetch(req)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {});
          return resp;
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match("./index.html")))
    );
    return;
  }

  // Altri asset statici (logo, icone, eventuali css/js della shell):
  // cache-first con aggiornamento in background.
  event.respondWith(
    caches.match(req).then((cached) => {
      const rete = fetch(req)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {});
          return resp;
        })
        .catch(() => cached);
      return cached || rete;
    })
  );
});
