const CACHE_NAME = 'humi-cache-BUILD_VERSION';

self.addEventListener('install', (event) => {
  console.log('Service worker installing, version:', CACHE_NAME);
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service worker activating, version:', CACHE_NAME);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('humi-cache-') && name !== CACHE_NAME)
          .map((name) => {
            console.log('Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      return self.clients.claim();
    }).then(() => {
      return self.clients.matchAll({ type: 'window' });
    }).then((clients) => {
      clients.forEach((client) => {
        console.log('Sending reload message to client');
        client.postMessage({ type: 'SW_UPDATED', version: CACHE_NAME });
      });
    })
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);
  
  if (url.origin !== location.origin) return;
  
  if (url.pathname.startsWith('/api/')) return;
  
  const isCriticalAsset = 
    url.pathname.endsWith('.js') || 
    url.pathname.endsWith('.css') || 
    url.pathname === '/' || 
    url.pathname === '/index.html' ||
    url.pathname.includes('bundle');

  if (isCriticalAsset) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
