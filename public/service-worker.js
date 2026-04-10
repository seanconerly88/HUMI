const BUILD_VERSION = '2026.04.09-5';
const STATIC_CACHE = 'humi-static-' + BUILD_VERSION;
const IMAGE_CACHE = 'humi-images-' + BUILD_VERSION;

const TRUSTED_IMAGE_ORIGINS = [
  'firebasestorage.googleapis.com',
  'storage.googleapis.com'
];

self.addEventListener('install', (event) => {
  console.log('HUMI Service Worker installing, version:', BUILD_VERSION);
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('HUMI Service Worker activating, purging old caches');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            return name.startsWith('humi-') && 
                   name !== STATIC_CACHE && 
                   name !== IMAGE_CACHE;
          })
          .map((name) => {
            console.log('Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);
  
  if (url.pathname.startsWith('/api/')) return;
  
  const isHtmlPage = url.origin === location.origin && 
                     (url.pathname === '/' || url.pathname === '/index.html');
  
  if (isHtmlPage) {
    event.respondWith(
      fetch(event.request, { cache: 'reload' }).catch(() => {
        return caches.match(event.request);
      })
    );
    return;
  }
  
  const isExternalImage = TRUSTED_IMAGE_ORIGINS.some(origin => url.hostname.includes(origin));
  const isLocalImage = url.origin === location.origin && 
                       url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i);
  const isImage = isExternalImage || isLocalImage;
  
  const isStaticAsset = url.origin === location.origin && (
    url.pathname.match(/\.(js|css|woff|woff2|ttf|eot)$/i) ||
    url.pathname === '/manifest.json' ||
    url.pathname.includes('/bundles/') ||
    url.pathname.includes('/_expo/')
  );

  if (isImage) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            fetch(event.request).then((networkResponse) => {
              if (networkResponse.ok) {
                cache.put(event.request, networkResponse.clone());
              }
            }).catch(() => {});
            return cachedResponse;
          }
          
          return fetch(event.request).then((networkResponse) => {
            if (networkResponse.ok) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => {
            return caches.match(event.request);
          });
        });
      })
    );
    return;
  }

  if (isStaticAsset) {
    event.respondWith(
      fetch(event.request).then((networkResponse) => {
        if (networkResponse.ok) {
          const responseClone = networkResponse.clone();
          caches.open(STATIC_CACHE).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        return caches.match(event.request);
      })
    );
    return;
  }
});
