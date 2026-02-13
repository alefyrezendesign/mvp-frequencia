const CACHE_NAME = 'church-app-v8';
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
            return caches.delete(cacheName); // Limpa caches antigos
          }
        })
      );
    }).then(() => self.clients.claim()) // Assume o controle de todas as abas abertas
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. HTML: Network First (Sempre tenta pegar a versão nova do site)
  if (request.headers.get('accept').includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Check if we received a valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseToCache);
          });
          return response;
        })
        .catch(() => caches.match(request)) // Offline fallback
    );
    return;
  }

  // 2. Assets Estáticos (JS, CSS, Imagens, Fontes): Stale-While-Revalidate
  // Só faz cache se for do MESMO domínio e tiver extensão conhecida
  if (url.origin === self.location.origin &&
    (url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|json|woff2)$/) ||
      request.destination === 'script' ||
      request.destination === 'style' ||
      request.destination === 'image')) {

    event.respondWith(
      caches.match(request).then(cachedResponse => {
        const fetchPromise = fetch(request).then(networkResponse => {
          // Check if we received a valid response
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }

          try {
            // Clone only if not used
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseToCache);
            });
          } catch (e) {
            console.warn('Failed to cache resource:', request.url, e);
          }
          return networkResponse;
        });
        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // 3. API Calls (Supabase) e Outros: Network Only
  // NÃO FAZ CACHE DE NADA QUE NÃO SEJA O PRÓPRIO SITE OU ASSETS LISTADOS ACIMA
  event.respondWith(fetch(request));
});
