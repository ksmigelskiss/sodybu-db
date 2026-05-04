// Minimal service worker — required for PWA install + Share Target
const CACHE = 'sodybu-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(clients.claim()));

// Share Target: GET / with ?share_url= — pass through to app
self.addEventListener('fetch', e => {
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
