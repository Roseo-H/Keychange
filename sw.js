// KeyChanger service worker
// - houdt de app beschikbaar zonder internet (eerst het netwerk, daarna de bewaarde versie)
// - vangt bestanden op die je met "Delen" naar KeyChanger stuurt (Android, Chrome, Edge)
const VERSIE = "keychanger-v6";
const DEEL_CACHE = "kc-shared-v1";

self.addEventListener("install", function (e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(VERSIE).then(function (c) {
      return Promise.allSettled(["./", "./manifest.webmanifest", "./icon-192.png", "./apple-touch-icon.png"].map(function (u) { return c.add(u); }));
    })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil((async function () {
    const namen = await caches.keys();
    for (const n of namen) { if (n !== VERSIE && n !== DEEL_CACHE) await caches.delete(n); }
    await self.clients.claim();
  })());
});

// Een gedeeld bestand komt binnen als POST. We bewaren het kort en sturen de pagina door naar ./?shared=...
async function neemDelen(req) {
  try {
    const form = await req.formData();
    const bestanden = form.getAll("files").filter(function (f) { return f && typeof f !== "string"; });
    const cache = await caches.open(DEEL_CACHE);
    for (const oud of await cache.keys()) await cache.delete(oud);
    let i = 0;
    for (const f of bestanden) {
      await cache.put(
        new Request("./gedeeld/" + Date.now() + "-" + (i++)),
        new Response(f, { headers: { "Content-Type": f.type || "application/octet-stream", "X-File-Name": encodeURIComponent(f.name || "bestand") } })
      );
    }
    return Response.redirect(new URL("./?shared=" + bestanden.length, self.registration.scope).href, 303);
  } catch (fout) {
    return Response.redirect(new URL("./", self.registration.scope).href, 303);
  }
}

self.addEventListener("fetch", function (e) {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method === "POST" && url.origin === location.origin && url.searchParams.has("share-target")) {
    e.respondWith(neemDelen(req));
    return;
  }
  if (req.method !== "GET" || url.origin !== location.origin) return;
  e.respondWith(
    fetch(req).then(function (res) {
      if (res && res.ok) {
        const kopie = res.clone();
        caches.open(VERSIE).then(function (c) { c.put(req, kopie); });
      }
      return res;
    }).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (r) {
        return r || (req.mode === "navigate" ? caches.match("./", { ignoreSearch: true }) : undefined);
      });
    })
  );
});
