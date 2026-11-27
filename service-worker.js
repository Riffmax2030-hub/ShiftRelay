const CACHE = 'shiftrelay-v226-live';
const CORE_SHELL_ASSETS = [
  '/',
  '/index.html',
  '/website.html',
  '/pricing.html',
  '/onboard.html',
  '/trust.html',
  '/calculator.html',
  '/status.html',
  '/icon.svg?v=177',
  '/styles.css?v=226',
  '/theme.css?v=226',
  '/bento-ui.css?v=226',
  '/dark-mode.css?v=226',
  '/splash.css?v=226',
  '/sr-premium.css?v=226',
  '/phase1-shell.css?v=226',
  '/me-profile.css?v=226',
  '/offline-queue.css?v=226',
  '/mobile-bridge.js?v=221',
  '/icons.js?v=212',
  '/language.js?v=212',
  '/app.js?v=212',
  '/biometrics.js?v=212',
  '/qr-svg-generator.js?v=212',
  '/attendance-exceptions-ui.js?v=212',
  '/phase1-shell.js?v=226',
  '/handover-chat.js?v=226',
  '/compliance-law-guide.js?v=226',
  '/signin-motion.js?v=222',
  '/splash.js?v=222',
  '/notifications.js?v=212',
  '/profile.js?v=212',
  '/checklists.js?v=212',
  '/account-menu.js?v=212',
  '/calendar-experience.js?v=212',
  '/notification-experience.js?v=212',
  '/community-experience.js?v=212',
  '/team-realtime.js?v=212',
  '/frontline-social.js?v=212',
  '/me-profile.js?v=219',
  '/navigation-fix.js?v=212',
  '/offline-queue.js?v=212',
  '/shift-calendar.js?v=221',
  '/sr-timepicker-ui.js?v=212',
  '/gps-guard.js?v=212'
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

  // 1. Strictly bypass API calls, Admin OS console, and cross-origin requests from Service Worker cache
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/admin')) return;

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
