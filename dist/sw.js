const CACHE = 'mallway-v2.2.1';
const BASE = [
  './',
  './index.html',
  './styles.css',
  './bootstrap.js',
  './app.mjs',
  './camera.mjs',
  './navigation.mjs',
  './core.mjs',
  './plan-network.mjs',
  './geometry.json',
  './directory.json',
  './icon.svg',
  './manifest.webmanifest',
  './assets/qrcode.js',
  './assets/jsQR.js',
  './assets/tesseract.min.js',
  './assets/plan-B.png',
  './assets/plan-LG.png',
  './assets/plan-G1.png',
  './assets/plan-G2.png',
  './assets/plan-G3.png',
];
self.addEventListener('install', (e) =>
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(BASE))
      .then(() => self.skipWaiting()),
  ),
);
self.addEventListener('activate', (e) =>
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k.startsWith('mallway-') && k !== CACHE).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  ),
);
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches
            .open(CACHE)
            .then((c) => c.put(e.request, copy))
            .catch(() => {});
        }
        return res;
      })
      .catch(
        async () =>
          (await caches.match(e.request)) ||
          (e.request.mode === 'navigate'
            ? await caches.match('./index.html')
            : new Response('Offline asset not cached', { status: 503 })),
      ),
  );
});
