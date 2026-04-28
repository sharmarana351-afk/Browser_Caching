// Update this version number whenever you change your static files
const CACHE_VERSION = 'v1';
const CACHE_NAME = `my-app-cache-${CACHE_VERSION}`;

// The list of core assets we want to cache immediately upon installation
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  'https://via.placeholder.com/150' // Caching the external image too
];

// --- 1. INSTALL EVENT ---
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Pre-caching core assets');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting()) // Forces the SW to activate immediately
  );
});

// --- 2. ACTIVATE EVENT ---
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating...');
  
  // Clean up old caches from previous versions
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => self.clients.claim()) // Takes control of all open clients/tabs immediately
  );
});

// --- 3. FETCH EVENT (Stale-While-Revalidate Strategy) ---
self.addEventListener('fetch', event => {
  // We only want to intercept standard GET requests (skip POST, PUT, etc.)
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(event.request).then(cachedResponse => {
        
        // Background network fetch to update the cache
        const fetchPromise = fetch(event.request).then(networkResponse => {
          // Check if the network response is valid
          if (networkResponse && networkResponse.status === 200) {
            // Save the clone of the fresh response to the cache
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(error => {
          console.warn('[Service Worker] Network fetch failed, offline mode active.', error);
          // Optional: Return a custom "offline page" fallback here if caching fails entirely
        });

        // Return the cached response immediately if we have it,
        // otherwise wait for the network fetch to complete.
        return cachedResponse || fetchPromise;
      });
    })
  );
});
