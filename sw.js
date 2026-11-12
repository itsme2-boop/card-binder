/* Card Binder service worker v1.0 — cache the app shell so it opens offline; runtime-cache card images. */
const SHELL="cb-shell-v1";
const IMG="cb-img-v1";
const CORE=[
  "./","./index.html","./manifest.webmanifest","./icon-192.png","./icon-512.png",
  "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js"
];
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
  // card images: cache-first, fill cache as they load
  if(/assets\.tcgdex\.net/.test(url.host)){
    e.respondWith(caches.open(IMG).then(async c=>{
      const hit=await c.match(req); if(hit)return hit;
      try{const res=await fetch(req);if(res.ok)c.put(req,res.clone());return res;}catch(err){return hit||Response.error();}
    }));
    return;
  }
  // card data + FX: network-first, no offline guarantee (prices need the net)
  if(/api\.tcgdex\.net|frankfurter\.dev/.test(url.host)){
    e.respondWith(fetch(req).catch(()=>caches.match(req)));
    return;
  }
  // app shell + tesseract: cache-first, update in background
  e.respondWith(caches.match(req).then(hit=>{
    const net=fetch(req).then(res=>{if(res.ok&&(url.origin===location.origin||/jsdelivr/.test(url.host)))caches.open(SHELL).then(c=>c.put(req,res.clone()));return res;}).catch(()=>hit);
    return hit||net;
  }));
});
