const CACHE = 'shiftrelay-v63';
const ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
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
  '/shiftrelay-v3.css',
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
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) return;
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
});
