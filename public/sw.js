const CACHE_NAME = 'church-app-v6';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json?v=3',
  '/icon-app.png?v=3'
];

self.addEventListener('install', event => {
  self.skipWaiting(); // Força o novo SW a assumir imediatamente
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName); // Limpa caches antigos (v4, v5...)
          }
        })
      );
    }).then(() => self.clients.claim()) // Assume o controle de todas as abas abertas
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;

  // Estratégia "Network First" para HTML (garante sempre a versão nova do site)
  if (request.headers.get('accept').includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const clonedResponse = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, clonedResponse);
          });
          return response;
        })
        .catch(() => caches.match(request)) // Se offline, usa o cache
    );
    return;
  }

  // Estratégia "Stale-While-Revalidate" para JS e CSS e Imagens
  // (Usa o cache rápido, mas atualiza em segundo plano para a próxima vez)
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      const fetchPromise = fetch(request).then(networkResponse => {
        caches.open(CACHE_NAME).then(cache => {
          cache.put(request, networkResponse.clone());
        });
        return networkResponse;
      });
      return cachedResponse || fetchPromise;
    })
  );
});
