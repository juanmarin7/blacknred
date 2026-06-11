/* Service worker Black & Red — PWA instalable con shell cacheado.
   Estrategia: red primero (datos siempre frescos), cache como respaldo
   cuando no hay conexión. Las llamadas a /api nunca se cachean. */

const CACHE = "bnr-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copia = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copia));
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then(
          (cacheado) =>
            cacheado ||
            new Response("Sin conexión", {
              status: 503,
              headers: { "Content-Type": "text/plain; charset=utf-8" },
            }),
        ),
      ),
  );
});
