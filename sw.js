const CACHE = "habits-cache-v5";
const ASSETS = [
  "./",
  "./index.html",
  "./stats.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener("activate", e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener("fetch", e=>{
  const req=e.request;
  const isHTML = req.mode==="navigate" || (req.headers.get("accept")||"").includes("text/html");
  if(isHTML){
    e.respondWith(fetch(req).then(r=>{ caches.open(CACHE).then(c=>c.put(req,r.clone())); return r; })
      .catch(()=>caches.match('./index.html')));
    return;
  }
  e.respondWith(caches.match(req).then(m=>m||fetch(req).then(r=>{ caches.open(CACHE).then(c=>c.put(req,r.clone())); return r; })));
});
