const CACHE="assessor-wrong-quiz-v6";
const ASSETS=["./","index.html","styles.css?v=6","config.js?v=2","cloud.js?v=6","questions.js?v=2","app.js?v=6","manifest.json","icon.svg","robots.txt"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener("fetch",e=>e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request))));
