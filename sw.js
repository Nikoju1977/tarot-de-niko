/* Tarot de Niko — service worker dédié au sous-chemin GitHub Pages. */
const CACHE_NAME = 'tarot-de-niko-v2';
const APP_BASE = new URL('./', self.registration.scope);
const INDEX_URL = new URL('index.html', APP_BASE).href;
const STATIC_ASSETS = [
  APP_BASE.href,
  INDEX_URL,
  new URL('manifest.json', APP_BASE).href,
  new URL('icons/icon-192.png', APP_BASE).href,
  new URL('icons/icon-512.png', APP_BASE).href
];
const CACHEABLE = new Set(STATIC_ASSETS);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key.startsWith('tarot-de-niko-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Ne jamais intercepter les appels externes, notamment ceux à Mistral AI.
  if (url.origin !== self.location.origin || !url.pathname.startsWith(APP_BASE.pathname)) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            event.waitUntil(
              caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()))
            );
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match(INDEX_URL)))
    );
    return;
  }

  // N'enregistrer que les ressources publiques connues ; jamais les requêtes API.
  if (!CACHEABLE.has(url.href)) return;
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          event.waitUntil(
            caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()))
          );
        }
        return response;
      });
    })
  );
});
