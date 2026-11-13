/* Card Binder service worker v3.0 — cache the app shell so it opens offline; runtime-cache card images and the number reader. */
const SHELL="cb-shell-v3.0";
const IMG="cb-img-v1";
const CORE=["./","./index.html","./manifest.webmanifest","./icon-192.png","./icon-512.png"];
self.addEventListener("install",e=>{
  e.waitUntil(caches.open(SHELL).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()));
});
self.addEventListener("activate",e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==SHELL&&k!==IMG).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener("fetch",e=>{
  const req=e.request;
  if(req.method!=="GET")return;
  const url=new URL(req.url);
  // card images: cache-first
  if(/assets\.tcgdex\.net/.test(url.host)){
    e.respondWith(caches.open(IMG).then(async c=>{
      const hit=await c.match(req); if(hit)return hit;
      try{const res=await fetch(req);if(res.ok)c.put(req,res.clone());return res;}catch(err){return hit||Response.error();}
    }));
    return;
  }
  // card data + FX: network-first (prices need the net)
  if(/api\.tcgdex\.net|frankfurter\.dev/.test(url.host)){
    e.respondWith(fetch(req).then(res=>{if(res.ok){const cp=res.clone();caches.open(IMG).then(c=>c.put(req,cp));}return res;}).catch(()=>caches.match(req).then(h=>h||Response.error())));
    return;
  }
  // app page: network-first so a new version shows straight away
  if(url.origin===location.origin&&(req.mode==="navigate"||url.pathname.endsWith("/index.html"))){
    e.respondWith(fetch(req).then(res=>{if(res.ok){const cp=res.clone();caches.open(SHELL).then(c=>c.put(req,cp));}return res;}).catch(()=>caches.match(req).then(h=>h||caches.match("./index.html"))));
    return;
  }
  // icons + number reader (jsdelivr): cache-first, fill in background
  e.respondWith(caches.match(req).then(hit=>{
    const net=fetch(req).then(res=>{if(res.ok&&(url.origin===location.origin||/jsdelivr/.test(url.host))){const cp=res.clone();caches.open(SHELL).then(c=>c.put(req,cp));}return res;}).catch(()=>hit||Response.error());
    return hit||net;
  }));
});
