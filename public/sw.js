/* ═══════════════════════════════════════════════════════════════
   EVEREST SOĞUTMA — Service Worker
   Statik dosyaları cache'le, tekrar ziyarette anında yükle
   ═══════════════════════════════════════════════════════════════ */

const CACHE_NAME = 'everest-v3';
const CACHE_STATIC = 'everest-static-v3';
const CACHE_PAGES  = 'everest-pages-v3';

// Hemen cache'lenecek kritik küçük kaynaklar (GLB yok — 42MB SW cache'e koymak kötü)
const PRECACHE = [
  '/',
  '/css/style.css',
  '/js/main.js',
  '/js/frost.js',
  '/images/logo.png',
];

// ─── Install ────────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_STATIC).then(cache => {
      return cache.addAll(PRECACHE).catch(() => {});
    }).then(() => self.skipWaiting())
  );
});

// ─── Activate ───────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_STATIC && k !== CACHE_PAGES)
            .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ─── Fetch ──────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // API isteklerini cache'leme
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/admin/')) {
    return;
  }

  // GLB model: Cache'leme — 42MB çok büyük, SW cache'e koyma
  // Sunucu Cache-Control: max-age=2592000 (30 gün) zaten HTTP cache'i halleder
  if (url.pathname.endsWith('.glb') || url.pathname.endsWith('.gltf')) {
    return; // SW müdahale etmez, tarayıcının normal HTTP cache'i çalışır
  }

  // Statik dosyalar (css, js, images, fonts): Stale-while-revalidate
  if (request.destination === 'style' || request.destination === 'script' ||
      request.destination === 'image' || request.destination === 'font' ||
      url.pathname.match(/\.(css|js|png|jpg|jpeg|svg|ico|webp|woff2?)$/)) {
    event.respondWith(
      caches.open(CACHE_STATIC).then(cache =>
        cache.match(request).then(cached => {
          const fetchPromise = fetch(request).then(res => {
            if (res.ok) cache.put(request, res.clone());
            return res;
          }).catch(() => cached);
          return cached || fetchPromise;
        })
      )
    );
    return;
  }

  // HTML sayfalar: Network-first, offline'da cache'ten sun
  if (request.destination === 'document' || request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_PAGES).then(cache => cache.put(request, clone));
          }
          return res;
        })
        .catch(() =>
          caches.match(request).then(cached => cached || caches.match('/'))
        )
    );
    return;
  }
});

// ─── Push Notification (ileride kullanılabilir) ──────────────────
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
