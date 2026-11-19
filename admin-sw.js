const ADMIN_OS_CACHE = 'shiftrelay-os-v1';
const ADMIN_ICON_ASSETS = [
  '/admin-icon.svg',
  '/admin-icon-192.png',
  '/admin-icon-512.png',
  '/admin-manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(ADMIN_OS_CACHE)
      .then((cache) => cache.addAll(ADMIN_ICON_ASSETS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith('shiftrelay-os-') && key !== ADMIN_OS_CACHE)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Never intercept or cache API calls
  if (url.pathname.startsWith('/api/')) return;

  // Always fetch live admin.html from network (never serve stale admin console)
  if (event.request.mode === 'navigate' || url.pathname === '/admin.html' || url.pathname === '/admin') {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).catch(() =>
        new Response(
          '<!DOCTYPE html><html><body style="background:#07070a;color:#f4f4f5;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;"><div><h2 style="margin:0 0 8px;">ShiftRelay OS Offline</h2><p style="color:#a1a1aa;margin:0;">Please check your network connection and retry.</p></div></body></html>',
          { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        )
      )
    );
    return;
  }

  // Network-first for ShiftRelay OS icons & manifest
  if (ADMIN_ICON_ASSETS.includes(url.pathname)) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(ADMIN_OS_CACHE).then((c) => c.put(event.request, copy));
          }
          return res;
        })
        .catch(() => caches.match(event.request))
    );
  }
});
