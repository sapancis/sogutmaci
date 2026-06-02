/* ═══════════════════════════════════════════════════════════════
   EVEREST SOĞUTMA — Frost Geçiş Motoru (Performanslı)
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* Sayfa içeriği loader kapanana kadar gizli kalsın */
  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';

  /* ─── Yardımcı ─────────────────────────────────────────────── */
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const easeOut5 = t => 1 - Math.pow(1 - t, 5);

  /* ─── Tek Kar Tanesi (sadece 1 tur dal, özyineleme yok) ──────── */
  function drawSnowflake(ctx, x, y, r, alpha, rot = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.strokeStyle = 'rgba(190, 225, 255, 1)';
    ctx.lineWidth = Math.max(0.5, r * 0.055);
    ctx.lineCap = 'round';

    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      const c = Math.cos(a), s = Math.sin(a);

      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(c * r, s * r); ctx.stroke();

      [0.38, 0.62].forEach(t => {
        const bx = c * r * t, by = s * r * t, bl = r * 0.22;
        [a + Math.PI / 3, a - Math.PI / 3].forEach(ba => {
          ctx.beginPath(); ctx.moveTo(bx, by);
          ctx.lineTo(bx + Math.cos(ba) * bl, by + Math.sin(ba) * bl); ctx.stroke();
        });
      });
    }
    ctx.restore();
  }

  /* ══════════════════════════════════════════════════════════
     1) LOADER — Kar Fırtınası Yükleme Ekranı
  ══════════════════════════════════════════════════════════ */
  const loaderEl = document.getElementById('page-loader');

  if (loaderEl) {
    /* Sayfa boyunca scroll engelle */
    document.body.style.overflow = 'hidden';

    /* Loader HTML'ini frost temasına dönüştür */
    loaderEl.innerHTML = `
      <canvas id="fl-canvas" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;"></canvas>
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

    /* Logo güncelle */
    fetch('/api/settings').then(r => r.json()).then(s => {
      if (s.logo) loaderEl.querySelectorAll('[data-logo]').forEach(i => i.src = s.logo);
    }).catch(() => {});

    /* Loader'ı window.load sonrası kapat (min 1800ms) */
    const LOADER_MIN = 1800;
    const loaderStart = Date.now();
    window.addEventListener('load', () => {
      const waited = Date.now() - loaderStart;
      const delay  = Math.max(0, LOADER_MIN - waited);
      setTimeout(() => {
        loaderEl.classList.add('hidden');
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
        setTimeout(() => { if (loaderEl.parentNode) loaderEl.remove(); }, 700);
      }, delay);
    });

    /* Sıcaklık sayacı */
    const tempEl = loaderEl.querySelector('#fl-temp');
    const barEl  = loaderEl.querySelector('#fl-bar');
    const statEl = loaderEl.querySelector('#fl-status');
    const msgs   = ['Sistem Başlatılıyor...', 'Soğutma Döngüsü Kontrol Ediliyor...', 'Kompresör Devreye Alınıyor...', 'Hazır!'];
    const t0 = Date.now();
    const DUR = 1600;

    (function tickTemp() {
      if (!loaderEl || loaderEl.classList.contains('hidden')) return;
      const p = Math.min((Date.now() - t0) / DUR, 1);
      const ep = easeOut(p);
      const temp = 24 + (-18 - 24) * ep;
      if (tempEl) tempEl.textContent = (temp >= 0 ? '+' : '') + Math.round(temp) + '°C';
      if (barEl)  barEl.style.width  = (ep * 100) + '%';
      if (statEl) statEl.textContent = msgs[Math.floor(ep * (msgs.length - 0.01))];
      if (p < 1) requestAnimationFrame(tickTemp);
    })();

    /* Kar tanecikleri — canvas, sınırlı sayıda */
    const fc = loaderEl.querySelector('#fl-canvas');
    if (fc) {
      const fctx = fc.getContext('2d');
      let fw, fh;
      function resizeFL() {
        fw = fc.width  = window.innerWidth;
        fh = fc.height = window.innerHeight;
      }
      resizeFL();
      window.addEventListener('resize', resizeFL, { passive: true });

      const FLAKES = Array.from({ length: 45 }, () => ({
        x: Math.random() * (fw || 800),
        y: Math.random() * (fh || 600) - 50,
        r: Math.random() * 10 + 4,
        vy: Math.random() * 1.0 + 0.35,
        vx: (Math.random() - 0.5) * 0.5,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.018,
        a: Math.random() * 0.35 + 0.1,
      }));

      (function loopFL() {
        if (!loaderEl || loaderEl.classList.contains('hidden')) return;
        fctx.clearRect(0, 0, fw, fh);
        FLAKES.forEach(f => {
          f.y += f.vy; f.x += f.vx; f.rot += f.vr;
          if (f.y > fh + 20) { f.y = -20; f.x = Math.random() * fw; }
          drawSnowflake(fctx, f.x, f.y, f.r, f.a, f.rot);
        });
        requestAnimationFrame(loopFL);
      })();
    }
  }

  /* ══════════════════════════════════════════════════════════
     2) SAYFA GEÇİŞ OVERLAY — Buz kristali dolgusu
  ══════════════════════════════════════════════════════════ */
  const OV = document.createElement('canvas');
  OV.style.cssText = 'position:fixed;inset:0;z-index:9998;pointer-events:none;opacity:0;width:100%;height:100%;';
  document.body.appendChild(OV);
  const OC = OV.getContext('2d');
  let OW = 0, OH = 0;

  function resizeOV() {
    OW = OV.width  = window.innerWidth;
    OH = OV.height = window.innerHeight;
  }
  resizeOV();
  window.addEventListener('resize', resizeOV, { passive: true });

  /* Kaç tane büyük kristal + konumları (sabit, seed'li) */
  const CRYSTAL_SEEDS = [
    { x: 0,    y: 0,    rot: Math.PI * 0.22  },
    { x: 1,    y: 0,    rot: Math.PI * 0.78  },
    { x: 0,    y: 1,    rot: -Math.PI * 0.22 },
    { x: 1,    y: 1,    rot: -Math.PI * 0.78 },
    { x: 0.5,  y: 0,    rot: Math.PI * 0.5   },
    { x: 0.5,  y: 1,    rot: -Math.PI * 0.5  },
    { x: 0,    y: 0.5,  rot: 0               },
    { x: 1,    y: 0.5,  rot: Math.PI         },
  ];

  /* Küçük dağılmış kar taneleri (sabit konumlar) */
  const MINI_FLAKES = Array.from({ length: 18 }, (_, i) => ({
    fx: ((Math.sin(i * 127.1 + 311.7) * 43758.5) % 1 + 1) % 1,
    fy: ((Math.sin(i * 269.5 + 183.3) * 43758.5) % 1 + 1) % 1,
    fr: 14 + (i * 13) % 20,
    frot: i * 0.52,
  }));

  function paintFrost(p, meltR = -1) {
    OC.clearRect(0, 0, OW, OH);

    /* Koyu mavi zemin */
    const bgA = Math.min(p * 1.5, 0.91);
    const bg = OC.createLinearGradient(0, 0, OW, OH);
    bg.addColorStop(0,   `rgba(4,12,32,${bgA})`);
    bg.addColorStop(0.5, `rgba(7,20,50,${bgA})`);
    bg.addColorStop(1,   `rgba(4,12,32,${bgA})`);
    OC.fillStyle = bg;
    OC.fillRect(0, 0, OW, OH);

    /* Köşe parlaması */
    const eg = OC.createRadialGradient(OW/2, OH/2, 0, OW/2, OH/2, Math.max(OW, OH) * 0.75);
    eg.addColorStop(0,   'rgba(150,210,255,0)');
    eg.addColorStop(0.7, 'rgba(150,210,255,0)');
    eg.addColorStop(1,   `rgba(200,235,255,${p * 0.18})`);
    OC.fillStyle = eg;
    OC.fillRect(0, 0, OW, OH);

    /* Büyük köşe kristalleri */
    const reach = Math.max(OW, OH) * 1.1 * p;
    CRYSTAL_SEEDS.forEach(s => {
      drawSnowflake(OC, s.x * OW, s.y * OH, reach * 0.52,
        Math.min(p * 1.2, 0.42), s.rot);
    });

    /* Dağılmış küçük kar taneleri */
    if (p > 0.3) {
      const show = Math.floor((p - 0.3) / 0.7 * MINI_FLAKES.length);
      MINI_FLAKES.slice(0, show).forEach(f => {
        drawSnowflake(OC, f.fx * OW, f.fy * OH, f.fr,
          Math.min((p - 0.3) * 0.9, 0.32), f.frot);
      });
    }

    /* Erime maskesi */
    if (meltR >= 0) {
      OC.globalCompositeOperation = 'destination-out';
      const mg = OC.createRadialGradient(OW/2, OH/2, 0, OW/2, OH/2, meltR);
      mg.addColorStop(0,    'rgba(0,0,0,1)');
      mg.addColorStop(0.78, 'rgba(0,0,0,1)');
      mg.addColorStop(1,    'rgba(0,0,0,0)');
      OC.fillStyle = mg;
      OC.fillRect(0, 0, OW, OH);
      OC.globalCompositeOperation = 'source-over';
    }
  }

  /* Dondurmak */
  function doFreeze(cb) {
    OV.style.opacity = '1';
    const DUR = 480, t0 = performance.now();
    (function step(now) {
      const p = easeOut(Math.min((now - t0) / DUR, 1));
      paintFrost(p);
      if (p < 1) requestAnimationFrame(step);
      else cb && cb();
    })(performance.now());
  }

  /* Eritmek */
  function doMelt() {
    const maxR = Math.hypot(OW, OH);
    const DUR = 600, t0 = performance.now();
    (function step(now) {
      const p = easeOut5(Math.min((now - t0) / DUR, 1));
      paintFrost(1, p * maxR * 1.1);
      if (p < 1) requestAnimationFrame(step);
      else { OV.style.opacity = '0'; OC.clearRect(0, 0, OW, OH); }
    })(performance.now());
  }

  /* Geçişten gelen sayfalarda erime */
  if (sessionStorage.getItem('frost-nav') === '1') {
    sessionStorage.removeItem('frost-nav');
    OV.style.opacity = '1';
    paintFrost(1);
    setTimeout(doMelt, 100);
  }

  /* Tüm iç linkler frost geçişi ile */
  document.querySelectorAll('a[href]').forEach(link => {
    const href = link.getAttribute('href');
    if (!href || href[0] === '#' || href.startsWith('mailto:') ||
        href.startsWith('tel:') || href.startsWith('http') || link.target === '_blank') return;
    link.addEventListener('click', e => {
      e.preventDefault();
      sessionStorage.setItem('frost-nav', '1');
      doFreeze(() => { window.location.href = link.href; });
    });
  });

  window.FrostFX = { freeze: doFreeze, melt: doMelt };

})();
