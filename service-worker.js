const CACHE='shiftrelay-v7';
const ASSETS=['/','/index.html','/styles.css','/portal.css','/approval.css','/worker.css','/assistant.css','/app.js','/navigation-fix.js','/profile.js','/profile.css','/calendar-experience.js','/calendar-experience.css','/notification-experience.js','/notification-experience.css','/community-experience.js','/community-experience.css','/manifest.webmanifest','/icon.svg'];
self.addEventListener('install',(event)=>event.waitUntil(caches.open(CACHE).then((cache)=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',(event)=>event.waitUntil(caches.keys().then((keys)=>Promise.all(keys.filter((key)=>key!==CACHE).map((key)=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',(event)=>{
  if(event.request.method!=='GET'||event.request.url.includes('/api/'))return;
  event.respondWith(caches.match(event.request).then((cached)=>cached||fetch(event.request).then((response)=>{
    const copy=response.clone();
    caches.open(CACHE).then((cache)=>cache.put(event.request,copy));
    return response;
  })));
});
