/*
 * ASF GROUP — ilovani telefon xotirasidan bir zumda ochish.
 *
 * Ilova to'liq yopilib qayta ochilganda brauzer hamma narsani internetdan
 * qayta so'raydi va shu orada ekran oq turadi. Bu yerda ilova "qobig'i"
 * (index.html, JS/CSS, logo, Telegram skripti) saqlanadi va darhol beriladi,
 * yangisi esa fonda olinib keyingi ochilishda ko'rinadi.
 */

const SHELL = 'asf-shell-v1';
const ASSETS = 'asf-assets-v1';
const TG_SCRIPT = 'https://telegram.org/js/telegram-web-app.js';
const STATIC = ['/logo.png', '/mode-box.webp', '/mode-shoe.webp', '/icon-shoe.png', '/offer-upper.webp'];

// index.html ichidagi /assets/ fayllarini topadi
const assetsOf = (html) => [...new Set(html.match(/\/assets\/[^"'\s)]+/g) || [])];

async function cacheShell(html) {
  const shell = await caches.open(SHELL);
  await shell.put('/', new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } }));
  const assets = await caches.open(ASSETS);
  await Promise.all(
    assetsOf(html).map(async (url) => {
      if (await assets.match(url)) return;
      const res = await fetch(url);
      if (res.ok) await assets.put(url, res);
    })
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const res = await fetch('/', { cache: 'no-store' });
      if (res.ok) await cacheShell(await res.text());
      const shell = await caches.open(SHELL);
      await Promise.all(STATIC.map((url) => shell.add(url).catch(() => {})));
      try {
        await shell.put(TG_SCRIPT, await fetch(TG_SCRIPT, { mode: 'no-cors' }));
      } catch (_) { /* keyingi safar */ }
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keep = [SHELL, ASSETS];
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => !keep.includes(k)).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

/** Yangi index.html'ni fonda olib saqlaydi */
async function refreshShell() {
  const res = await fetch('/', { cache: 'no-store' });
  if (!res.ok) return null;
  const html = await res.text();
  await cacheShell(html);
  return html;
}

// Eski versiya fayllari keshda cheksiz yig'ilmasin
async function pruneAssets(html) {
  const keep = new Set(assetsOf(html));
  const assets = await caches.open(ASSETS);
  const keys = await assets.keys();
  // Joriy versiyadan tashqari faqat oxirgi ~60 ta fayl qoladi
  const old = keys.filter((req) => !keep.has(new URL(req.url).pathname));
  await Promise.all(old.slice(0, Math.max(0, old.length - 60)).map((req) => assets.delete(req)));
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Sahifaning o'zi: keshdagini darhol beramiz, yangisini fonda olamiz
  if (request.mode === 'navigate' && url.origin === location.origin) {
    event.respondWith(
      (async () => {
        const cached = await caches.match('/', { cacheName: SHELL });
        const update = refreshShell()
          .then((html) => html && pruneAssets(html))
          .catch(() => null);
        if (cached) {
          event.waitUntil(update);
          return cached;
        }
        try {
          return await fetch(request);
        } catch (_) {
          return Response.error();
        }
      })()
    );
    return;
  }

  // Versiyali JS/CSS fayllar hech qachon o'zgarmaydi — keshdan
  if (url.origin === location.origin && url.pathname.startsWith('/assets/')) {
    event.respondWith(
      (async () => {
        const assets = await caches.open(ASSETS);
        const cached = await assets.match(request);
        if (cached) return cached;
        const res = await fetch(request);
        if (res.ok) assets.put(request, res.clone());
        return res;
      })()
    );
    return;
  }

  // Logo, rasmlar va Telegram skripti: keshdagini darhol, yangisini fonda
  if ((url.origin === location.origin && STATIC.includes(url.pathname)) || url.href === TG_SCRIPT) {
    event.respondWith(
      (async () => {
        const shell = await caches.open(SHELL);
        const cached = await shell.match(request);
        const network = fetch(request)
          .then((res) => {
            if (res.ok || res.type === 'opaque') shell.put(request, res.clone());
            return res;
          })
          .catch(() => null);
        if (cached) {
          event.waitUntil(network);
          return cached;
        }
        return (await network) || Response.error();
      })()
    );
  }
});

// Ilova yangi versiyani topganda — keshni darhol yangilab, keyin sahifani qayta yuklaydi
self.addEventListener('message', (event) => {
  if (event.data === 'refresh-shell') {
    event.waitUntil(
      refreshShell()
        .catch(() => null)
        .then(() => event.source && event.source.postMessage('shell-refreshed'))
    );
  }
});
