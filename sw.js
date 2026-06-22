const CACHE_NAME = 'alabanza-imr4-v56';
const ASSETS = [
  './index.html',
  './manifest.json',
  './logo.png'
];

self.addEventListener('install', (e) => {
  // Forzar actualización inmediata para desatascar clientes con versiones rotas
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).catch(() => {
        // Ignorar errores si algún recurso aún no existe
      });
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Ignorar peticiones de Firebase y externas
  if (
    e.request.url.includes('firestore.googleapis.com') ||
    e.request.url.includes('firebaseapp.com') ||
    e.request.url.includes('gstatic.com') ||
    e.request.url.includes('googleapis.com')
  ) {
    return;
  }

  // Network-first para index.html para evitar que se queden atrapados en cachés rotos
  if (e.request.mode === 'navigate' || e.request.url.includes('index.html')) {
    e.respondWith(
      fetch(e.request)
        .then((response) => {
          // Si la red funciona, actualizamos el caché
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseClone);
          });
          return response;
        })
        .catch(() => caches.match(e.request)) // Si no hay internet, usar caché
    );
    return;
  }

  // Cache-first para assets estáticos (imágenes, manifest, etc)
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      return cachedResponse || fetch(e.request);
    })
  );
});
