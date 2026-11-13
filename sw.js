/* Card Binder service worker v3.6 — cache the app shell so it opens offline; runtime-cache card images and the number reader.
   v3.5: only answers for this site and the hosts below. Everything else (Scrydex pictures of Japanese promos) goes straight
   to the network: passing those opaque no-cors image loads through the worker left them blank in Safari on the iPhone. */
const SHELL="cb-shell-v3.9";
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
  if(url.host==="assets.tcgdex.net"){
    e.respondWith(caches.open(IMG).then(async c=>{
      const hit=await c.match(req); if(hit)return hit;
      try{const res=await fetch(req);if(res.ok)c.put(req,res.clone());return res;}catch(err){return hit||Response.error();}
    }));
    return;
  }
  // card data + FX: network-first (prices need the net)
  if(url.host==="api.tcgdex.net"||url.host==="api.frankfurter.dev"){
    e.respondWith(fetch(req).then(res=>{if(res.ok){const cp=res.clone();caches.open(IMG).then(c=>c.put(req,cp));}return res;}).catch(()=>caches.match(req).then(h=>h||Response.error())));
    return;
  }
  const own=url.origin===location.origin;
  if(!own&&url.host!=="cdn.jsdelivr.net")return; // not ours (Scrydex etc.): the browser fetches it as normal
  // app page: network-first so a new version shows straight away
  if(own&&(req.mode==="navigate"||url.pathname.endsWith("/index.html"))){
    e.respondWith(fetch(req).then(res=>{if(res.ok){const cp=res.clone();caches.open(SHELL).then(c=>c.put(req,cp));}return res;}).catch(()=>caches.match(req).then(h=>h||caches.match("./index.html"))));
    return;
  }
  // icons + number reader (jsdelivr): cache-first, fill in background
  e.respondWith(caches.match(req).then(hit=>{
    const net=fetch(req).then(res=>{if(res.ok){const cp=res.clone();caches.open(SHELL).then(c=>c.put(req,cp));}return res;}).catch(()=>hit||Response.error());
    return hit||net;
  }));
});
