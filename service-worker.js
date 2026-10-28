const CACHE = 'shiftrelay-v89-dual-attendance';
const ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/phase1-shell.css',
  '/phase1-shell.js',
  '/splash.css',
  '/splash.js',
  '/offline-queue.css',
  '/offline-queue.js',
  '/signature-pad.css',
  '/signature-pad.js',
  '/chat-engine.css',
  '/chat-engine.js',
  '/gesture-hints.css',
  '/gesture-hints.js',
  '/shift-calendar.css',
  '/shift-calendar.js',
  '/safety-incident.css',
  '/safety-incident.js',
  '/worker-passport.css',
  '/worker-passport.js',
  '/facility-zones.css',
  '/facility-zones.js',
  '/theme.css',
  '/theme.js',
  '/alarm-engine.js',
  '/bento-ui.css',
  '/portal.css',
  '/approval.css',
  '/worker.css',
  '/assistant.css',
  '/frontline-social.css',
  '/shiftrelay-v76.css',
  '/app.js',
  '/icons.js',
  '/frontline-social.js',
  '/tour-experience.js',
  '/navigation-fix.js',
  '/language.js',
  '/language-pack.js',
  '/profile.js',
  '/profile.css',
  '/calendar-experience.js',
  '/calendar-experience.css',
  '/schedule-polish.css',
  '/notification-experience.js',
  '/notification-experience.css',
  '/community-experience.js',
  '/community-experience.css',
  '/community-overrides.css',
  '/team-realtime.js',
  '/manifest.webmanifest',
  '/icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
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

  // 1. Strictly bypass API calls from Service Worker cache
  if (url.pathname.startsWith('/api/')) return;

  // 2. Private uploads protection: NEVER cache user uploads in Service Worker
  const isUpload = url.pathname.startsWith('/uploads/');
  const PUBLIC_DEMO_EXACT = new Set(['/uploads/hero-workplace.jpg','/uploads/avatars/avatar-amina.jpg','/uploads/avatars/avatar-carlos.jpg','/uploads/avatars/avatar-david.jpg','/uploads/avatars/avatar-elena.jpg','/uploads/avatars/avatar-faith.jpg','/uploads/avatars/avatar-jordan.jpg','/uploads/avatars/avatar-kwame.jpg','/uploads/avatars/avatar-marcus.jpg','/uploads/avatars/avatar-maria.jpg','/uploads/avatars/avatar-zainab.jpg','/uploads/covers/cover-culinary.jpg','/uploads/covers/cover-engineering.jpg','/uploads/covers/cover-healthcare.jpg','/uploads/covers/cover-logistics.jpg','/uploads/covers/cover-operations.jpg','/uploads/covers/cover-supervisor.jpg','/uploads/feed/feed-kitchen-prep.jpg','/uploads/feed/feed-plant-machinery.jpg','/uploads/feed/feed-triage-handover.jpg','/uploads/feed/feed-warehouse-safety.jpg']); const isPublicDemoAsset = PUBLIC_DEMO_EXACT.has(url.pathname);
  if (isUpload && !isPublicDemoAsset) {
    // Private file: pass directly to network; never cache
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 3. Cache-Control check: NEVER cache if response is marked no-store or private
        const cc = (response.headers.get('cache-control') || '').toLowerCase();
        if (response.ok && !cc.includes('no-store') && !cc.includes('private')) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});



