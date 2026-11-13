const CACHE = 'shiftrelay-v151-live';
const CORE_SHELL_ASSETS = [
  '/',
  '/index.html',
  '/icon.svg?v=151'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(CORE_SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // 1. Strictly bypass API calls and cross-origin requests from Service Worker cache
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  // 2. Private uploads protection: NEVER cache private user uploads
  const isUpload = url.pathname.startsWith('/uploads/');
  const PUBLIC_DEMO_EXACT = new Set([
    '/uploads/hero-workplace.jpg',
    '/uploads/avatars/avatar-amina.jpg',
    '/uploads/avatars/avatar-carlos.jpg',
    '/uploads/avatars/avatar-david.jpg',
    '/uploads/avatars/avatar-elena.jpg',
    '/uploads/avatars/avatar-faith.jpg',
    '/uploads/avatars/avatar-jordan.jpg',
    '/uploads/avatars/avatar-kwame.jpg',
    '/uploads/avatars/avatar-marcus.jpg',
    '/uploads/avatars/avatar-maria.jpg',
    '/uploads/avatars/avatar-zainab.jpg',
    '/uploads/covers/cover-culinary.jpg',
    '/uploads/covers/cover-engineering.jpg',
    '/uploads/covers/cover-healthcare.jpg',
    '/uploads/covers/cover-logistics.jpg',
    '/uploads/covers/cover-operations.jpg',
    '/uploads/covers/cover-supervisor.jpg',
    '/uploads/feed/feed-kitchen-prep.jpg',
    '/uploads/feed/feed-plant-machinery.jpg',
    '/uploads/feed/feed-triage-handover.jpg',
    '/uploads/feed/feed-warehouse-safety.jpg'
  ]);
  if (isUpload && !PUBLIC_DEMO_EXACT.has(url.pathname)) return;

  // 3. HTML navigation: Network-first with fast cache fallback so updates arrive without hanging
  const isNavigation = event.request.mode === 'navigate' || url.pathname === '/' || url.pathname === '/index.html';
  if (isNavigation) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // 4. Code & Dynamic Application Logic (.js, .css, .html, .json): Always Network-First
  // Prevents outdated code flash on page refresh while providing instant offline fallback
  const isCodeAsset = ['.js', '.css', '.html', '.json'].some(ext => url.pathname.endsWith(ext) || url.pathname.includes(ext + '?'));
  if (isCodeAsset) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // 5. Static media/images/fonts: Stale-while-revalidate for instant visual load
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => cached);

      return cached || networkFetch;
    })
  );
});
