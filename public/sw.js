/* ═══════════════════════════════════════════════════════════════
   EVEREST SOĞUTMA — Service Worker DEVRE DIŞI
   İçerik yönetimli site olduğu için cache sorun çıkarıyordu.
   Bu dosya eski SW'leri ve cache'leri temizler.
   ═══════════════════════════════════════════════════════════════ */

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      // Tüm cache'leri sil
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
      // Kontrolü al
      await self.clients.claim();
      // Tüm sekmeleri yenile
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach(client => client.navigate(client.url));
    })()
  );
});

// Hiçbir isteği cache'leme — her şey ağdan
self.addEventListener('fetch', () => {});
