// 頁面與題庫資料（index.html、data/qb.json）走 network-first：有網路就拿新版，離線才用快取。
// 圖片等靜態檔 cache-first。改版時把 CACHE 版本號 +1。
const CACHE = "qbank-v1";
const CORE = ["./", "./index.html", "./manifest.webmanifest", "./icon.svg", "./data/qb.json"];

function isFresh(req, url) {
  return req.mode === "navigate" || /\/(index\.html)?$/.test(url.pathname) || /\/data\/qb\.json$/.test(url.pathname);
}

self.addEventListener("install", e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c =>
    Promise.all(CORE.map(u => fetch(new Request(u, { cache: "reload" }))
      .then(r => (r.ok ? c.put(u, r) : null)).catch(() => {})))
  ).catch(() => {}));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  if (isFresh(e.request, url)) {
    e.respondWith(
      fetch(e.request, { cache: "no-cache" }).then(resp => {
        if (resp && resp.ok) { const cp = resp.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)).catch(() => {}); }
        return resp;
      }).catch(() => caches.match(e.request).then(r => r || caches.match("./index.html")))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(resp => {
      if (resp && resp.ok) { const cp = resp.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)).catch(() => {}); }
      return resp;
    }))
  );
});
