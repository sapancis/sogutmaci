/* ═══════════════════════════════════════════════════════════════
   EVEREST SOĞUTMA — Loader (Sıcaklık Sayacı)
   Sadece +24°C → -18°C animasyonu, kar/buz geçişi yok
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* Scroll engelle */
  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';

  const easeOut = t => 1 - Math.pow(1 - t, 3);

  /* ─── LOADER ─────────────────────────────────────────────────── */
  const loaderEl = document.getElementById('page-loader');
  if (!loaderEl) return;

  /* Loader içeriğini sıcaklık temalı yap */
  loaderEl.innerHTML = `
    <div class="frost-loader-content">
      <div class="frost-logo-wrap">
        <img class="loader-logo" src="/images/logo.png" alt="Everest Soğutma" data-logo>
        <div class="frost-ring"></div>
        <div class="frost-ring frost-ring-2"></div>
      </div>
      <div class="frost-company">Everest Soğutma</div>
      <div class="frost-temp-row">
        <span class="frost-temp-icon">❄</span>
        <span class="frost-temp-val" id="fl-temp">+24°C</span>
        <span class="frost-temp-icon">❄</span>
      </div>
      <div class="frost-bar-wrap">
        <div class="frost-bar-inner" id="fl-bar"></div>
        <div class="frost-bar-glow"></div>
      </div>
      <div class="frost-status" id="fl-status">Sistem Başlatılıyor...</div>
    </div>`;

  /* Logo ayarlardan güncelle */
  fetch('/api/settings')
    .then(r => r.json())
    .then(s => {
      if (s.logo) loaderEl.querySelectorAll('[data-logo]').forEach(i => i.src = s.logo);
    })
    .catch(() => {});

  /* Sıcaklık sayacı: +24°C → -18°C */
  const tempEl = loaderEl.querySelector('#fl-temp');
  const barEl  = loaderEl.querySelector('#fl-bar');
  const statEl = loaderEl.querySelector('#fl-status');
  const MSGS   = [
    'Sistem Başlatılıyor...',
    'Soğutma Döngüsü Kontrol Ediliyor...',
    'Kompresör Devreye Alınıyor...',
    'Hazır!'
  ];
  const t0  = Date.now();
  const DUR = 1600;

  (function tick() {
    if (!loaderEl || loaderEl.classList.contains('hidden')) return;
    const p  = Math.min((Date.now() - t0) / DUR, 1);
    const ep = easeOut(p);
    const temp = 24 + (-18 - 24) * ep;
    if (tempEl) tempEl.textContent = (temp >= 0 ? '+' : '') + Math.round(temp) + '°C';
    if (barEl)  barEl.style.width  = (ep * 100) + '%';
    if (statEl) statEl.textContent = MSGS[Math.floor(ep * (MSGS.length - 0.01))];
    if (p < 1)  requestAnimationFrame(tick);
  })();

  /* Loader kapat — window.load sonrası min 1800ms */
  const loaderStart = Date.now();
  const LOADER_MIN  = 1800;

  window.addEventListener('load', () => {
    const waited  = Date.now() - loaderStart;
    const delay   = Math.max(0, LOADER_MIN - waited);
    setTimeout(() => {
      loaderEl.classList.add('hidden');
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      setTimeout(() => { if (loaderEl.parentNode) loaderEl.remove(); }, 700);
    }, delay);
  });

})();
