const CACHE = 'wow-v6';   // v6: drops error pages and opaque cross-origin entries cached by v5
const SHELL = [
  '/', '/css/style.css', '/js/events-data.js', '/js/script.js',
  '/icons/icon-192.png', '/icons/icon-512.png', '/icons/apple-touch-icon.png',
  '/icons/ruin-gin.png',
  '/sections/food.html', '/sections/walks.html', '/sections/parks.html',
  '/sections/activities.html', '/sections/markets.html'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  // Use cache:'no-cache' so install always fetches the current files, not HTTP-cached stale copies
  e.waitUntil(
    caches.open(CACHE).then(c =>
      Promise.all(SHELL.map(url =>
        fetch(url, { cache: 'no-cache' })
          .then(res => res.ok ? c.put(url, res) : undefined)
          .catch(() => {})
      ))
    )
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

// Network-first: bypass HTTP cache so pushes are reflected immediately; fall back to SW cache offline
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // Same-origin only. Cross-origin requests (Wikimedia images, analytics, Firebase,
  // the weather API) go straight to the network: <img> loads are no-cors, so their
  // responses are opaque — unreadable, and heavily padded against storage quota.
  if (new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' })
      .then(res => {
        // Only cache successes, or offline would replay a 404/500 as if it were the page
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
