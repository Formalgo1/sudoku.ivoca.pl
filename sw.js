// Service worker gry Sudoku: zwykła gra działa bez internetu.
// Strategia: pliki z pamięci podręcznej od razu, w tle pobierana nowa wersja (stale-while-revalidate).
// Przy każdej zmianie plików gry podbij VERSION, żeby stara pamięć została usunięta.
const VERSION = 'sudoku-v5';
const FILES = [
  './',
  'manifest.webmanifest',
  'ivoca-wyniki.js',
  'pamiec-klient.js',
  'js/wyglad.js', 'js/zewnetrzne.js',
  'vendor/tailwind.css',
  'vendor/confetti.browser.js',
  'vendor/fontawesome/css/all.min.css',
  'vendor/fontawesome/webfonts/fa-solid-900.woff2',
  'vendor/fontawesome/webfonts/fa-regular-400.woff2',
  'fonts/fonts.css',
  'fonts/inter-latin-400-normal.woff2',
  'fonts/inter-latin-500-normal.woff2',
  'fonts/inter-latin-600-normal.woff2',
  'fonts/inter-latin-700-normal.woff2',
  'fonts/inter-latin-ext-400-normal.woff2',
  'fonts/inter-latin-ext-500-normal.woff2',
  'fonts/inter-latin-ext-600-normal.woff2',
  'fonts/inter-latin-ext-700-normal.woff2',
  'fonts/atkinson-hyperlegible-next-latin-ext-wght-normal.woff2',
  'fonts/atkinson-hyperlegible-next-latin-wght-normal.woff2',
  'favicon.ico',
  'img/icon.svg',
  'img/icon-192.png',
  'img/icon-512.png',
  'img/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  // Tylko własne pliki; statystyki, most „Zapamiętaj mnie” i formularz idą zwykłą drogą
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  // Wyzwanie dnia i ranking zawsze prosto z serwera, nigdy z pamięci podręcznej
  if (url.pathname.startsWith('/api/')) return;
  // Cloudflare przekierowuje /x.html na /x — przekierowanie obsługuje przeglądarka
  if (url.pathname.endsWith('.html')) return;

  event.respondWith(
    caches.open(VERSION).then(async (cache) => {
      const cached = await cache.match(req, { ignoreSearch: true });
      const network = fetch(req)
        .then((res) => {
          if (res.ok && res.type === 'basic' && !res.redirected) cache.put(req, res.clone());
          return res;
        })
        .catch(() => null);
      if (cached) {
        event.waitUntil(network);
        return cached;
      }
      const res = await network;
      if (res && !(res.redirected && req.mode === 'navigate')) return res;
      if (res) return Response.redirect(res.url, 302);
      if (req.mode === 'navigate') return (await cache.match('./')) || Response.error();
      return Response.error();
    })
  );
});
