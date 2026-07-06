const CACHE="assessor-wrong-quiz-v4";
const ASSETS=["./","index.html","styles.css?v=4","questions.js?v=2","app.js?v=2","manifest.json","icon.svg","robots.txt"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener("fetch",e=>e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request))));
