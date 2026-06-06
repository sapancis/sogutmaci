/* ═══════════════════════════════════════════════════════════════
   EVEREST SOĞUTMA — Main JavaScript
   ═══════════════════════════════════════════════════════════════ */

// ─── State ───────────────────────────────────────────────────────
let siteContent = null;
let siteSettings = null;

// ─── Init ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await loadSiteData();
  initLoader();
  initHeader();
  initMobileNav();
  renderServices();        // hizmet kartlarını doldur
  renderServiceDetail();   // hizmet detay sayfasını doldur
  initRevealAnimations();
  initPageTransitions();
  initWhatsappFab();
  applyDynamicContent();
});

// ─── Hizmet İkonları ──────────────────────────────────────────────
const SERVICE_ICONS = {
  wind:     '<rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>',
  tool:     '<path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>',
  box:      '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14"/><path d="M15.54 8.46a5 5 0 010 7.07M8.46 8.46a5 5 0 000 7.07"/>',
  cpu:      '<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/>',
  zap:      '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  default:  '<path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z"/>'
};
function serviceIconSvg(icon) {
  const path = SERVICE_ICONS[icon] || SERVICE_ICONS.default;
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">${path}</svg>`;
}

// ─── Hizmet Kartlarını Render Et (anasayfa + hizmetler sayfası) ───
function renderServices() {
  const services = siteContent?.services || [];
  if (!services.length) return;

  // Anasayfa: ilk 3 hizmet
  const homeGrid = document.getElementById('services-grid');
  if (homeGrid) {
    homeGrid.innerHTML = services.slice(0, 3).map((s, i) => serviceCardHTML(s, i, 'h3')).join('');
  }

  // Hizmetler sayfası: tüm hizmetler
  const allGrid = document.getElementById('all-services-grid');
  if (allGrid) {
    allGrid.innerHTML = services.map((s, i) => serviceCardHTML(s, i, 'h2')).join('');
  }
}

function serviceCardHTML(s, i, titleTag) {
  return `
    <div class="service-card" data-reveal data-reveal-delay="${(i % 6) + 1}">
      <div class="service-icon">${serviceIconSvg(s.icon)}</div>
      <${titleTag} class="service-title">${s.title || ''}</${titleTag}>
      <p class="service-desc">${s.short_desc || ''}</p>
      <a href="/hizmet.html?id=${encodeURIComponent(s.id)}" class="service-link">
        Detaylı İncele
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </a>
    </div>`;
}

// ─── Hizmet Detay Sayfasını Render Et (/hizmet.html?id=xxx) ───────
function renderServiceDetail() {
  const root = document.getElementById('service-detail-root');
  if (!root) return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const services = siteContent?.services || [];
  const service = services.find(s => s.id === id) || services[0];

  if (!service) {
    root.innerHTML = '<div class="container" style="padding:80px 24px;text-align:center;"><h1>Hizmet bulunamadı</h1><a href="/hizmetler.html" class="btn-primary" style="margin-top:24px;">Tüm Hizmetler</a></div>';
    return;
  }

  // Başlık / SEO
  document.title = `${service.title} | Everest Soğutma Niğde`;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute('content', service.short_desc || service.title);

  const features = service.features || [];
  const featuresHTML = features.map(f =>
    `<div class="feature-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>${f}</div>`
  ).join('');

  const otherServices = services.map(s =>
    `<a href="/hizmet.html?id=${encodeURIComponent(s.id)}" class="service-list-link${s.id === service.id ? ' active' : ''}">${s.title}</a>`
  ).join('');

  const imageHTML = service.image
    ? `<div style="margin-bottom:32px;border-radius:18px;overflow:hidden;"><img src="${service.image}" alt="${service.title}" style="width:100%;display:block;" loading="lazy"></div>`
    : '';

  root.innerHTML = `
    <section class="page-hero"><div class="page-hero-inner">
      <p class="page-hero-label">Hizmetlerimiz</p>
      <h1 class="page-hero-title">${service.title}</h1>
      <p class="page-hero-subtitle">${service.short_desc || ''}</p>
      <nav class="breadcrumb">
        <a href="/">Anasayfa</a><span class="sep">›</span>
        <a href="/hizmetler.html">Hizmetler</a><span class="sep">›</span>
        <span>${service.title}</span>
      </nav>
    </div></section>

    <section class="section"><div class="container"><div class="service-detail-grid">
      <div>
        ${imageHTML}
        <div data-reveal>
          <h2 style="font-size:26px;font-weight:800;color:var(--gray-900);margin-bottom:18px;">${service.title}</h2>
          <div style="font-size:16px;color:var(--gray-500);line-height:1.8;">${(service.content || '').replace(/\n/g, '<br>')}</div>
        </div>
        ${features.length ? `<div class="service-features-list" data-reveal data-reveal-delay="2">${featuresHTML}</div>` : ''}
      </div>
      <div class="service-sidebar" data-reveal data-reveal-delay="3">
        <div class="contact-card">
          <h3>Hızlı Teklif Alın</h3>
          <p>Ücretsiz keşif ve fiyat teklifi için bize ulaşın.</p>
          <a href="/iletisim.html" style="display:block;text-align:center;margin-top:20px;padding:14px;border-radius:10px;font-size:15px;font-weight:700;background:rgba(255,255,255,.15);color:#fff;border:1.5px solid rgba(255,255,255,.3);">Teklif Formu →</a>
        </div>
        <div class="service-list-card">
          <h4>Tüm Hizmetler</h4>
          ${otherServices}
        </div>
      </div>
    </div></div></section>`;

  // Yeni eklenen reveal'leri tetikle
  root.querySelectorAll('[data-reveal]').forEach(el => el.classList.add('revealed'));
}

// ─── Load Data ────────────────────────────────────────────────────
async function loadSiteData() {
  try {
    const [contentRes, settingsRes] = await Promise.all([
      fetch('/api/content'),
      fetch('/api/settings')
    ]);
    siteContent = await contentRes.json();
    siteSettings = await settingsRes.json();
  } catch (e) {
    console.warn('Could not load site data:', e);
  }
}

// ─── Loader ───────────────────────────────────────────────────────
// frost.js tarafından tamamen yönetiliyor — burada sadece logo güncelle
function initLoader() {
  if (siteSettings?.logo) {
    document.querySelectorAll('[data-logo]').forEach(img => img.src = siteSettings.logo);
  }
}

// ─── Header ───────────────────────────────────────────────────────
function initHeader() {
  const header = document.getElementById('site-header');
  if (!header) return;

  // Apply logo
  if (siteSettings?.logo) {
    header.querySelectorAll('.header-logo img').forEach(img => img.src = siteSettings.logo);
  }
  if (siteSettings?.site_name) {
    header.querySelectorAll('.logo-text').forEach(el => el.textContent = siteSettings.site_name);
  }

  // Scroll behavior
  const isHero = document.querySelector('.hero');
  if (!isHero) header.classList.add('solid');

  const onScroll = () => {
    if (window.scrollY > 20) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Active nav
  const currentPath = window.location.pathname.replace(/\/$/, '') || '/';
  header.querySelectorAll('.nav-link').forEach(link => {
    const href = new URL(link.href).pathname.replace(/\/$/, '') || '/';
    if (href === currentPath || (href !== '/' && currentPath.startsWith(href))) {
      link.classList.add('active');
    }
  });
}

// ─── Mobile Nav ───────────────────────────────────────────────────
function initMobileNav() {
  const hamburger = document.querySelector('.hamburger');
  const overlay = document.querySelector('.mobile-nav-overlay');
  const mobileNav = document.querySelector('.mobile-nav');
  if (!hamburger) return;

  const toggle = (open) => {
    hamburger.classList.toggle('open', open);
    overlay?.classList.toggle('open', open);
    mobileNav?.classList.toggle('open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  };

  hamburger.addEventListener('click', () => toggle(!hamburger.classList.contains('open')));
  overlay?.addEventListener('click', () => toggle(false));
  mobileNav?.querySelectorAll('.mobile-nav-link').forEach(link => {
    link.addEventListener('click', () => toggle(false));
  });

  // Active state
  const currentPath = window.location.pathname.replace(/\/$/, '') || '/';
  mobileNav?.querySelectorAll('.mobile-nav-link').forEach(link => {
    const href = new URL(link.href).pathname.replace(/\/$/, '') || '/';
    if (href === currentPath || (href !== '/' && currentPath.startsWith(href))) {
      link.classList.add('active');
    }
  });
}

// ─── Page Transitions ─────────────────────────────────────────────
// Sade geçiş — frost overlay kaldırıldı
function initPageTransitions() {}

// ─── Scroll Reveal ────────────────────────────────────────────────
function initRevealAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('[data-reveal]').forEach(el => observer.observe(el));
}

// ─── WhatsApp FAB ─────────────────────────────────────────────────
function buildWhatsappLink() {
  const c = siteContent?.contact;
  if (!c?.whatsapp) return null;
  // Placeholder (X içeren) numaraları atla
  if (/[xX]/.test(c.whatsapp)) return null;
  const phone = c.whatsapp.replace(/\D/g, '');
  if (phone.length < 10) return null;
  const msg = c.whatsapp_message || 'Merhaba, bilgi almak istiyorum.';
  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
}

function initWhatsappFab() {
  const link = buildWhatsappLink();
  // Floating button
  const fab = document.querySelector('.whatsapp-fab');
  if (fab && link) {
    fab.href = link;
    fab.target = '_blank';
    fab.rel = 'noopener';
    fab.style.display = 'flex';
  }
  // Tüm whatsapp linkleri (footer, iletişim vs.)
  document.querySelectorAll('[data-whatsapp-link]').forEach(a => {
    if (link) { a.href = link; a.target = '_blank'; a.rel = 'noopener'; }
  });
}

// ─── Yardımcı: güvenli metin/HTML/görsel set ──────────────────────
function setText(sel, val, root = document) {
  if (val == null) return;
  root.querySelectorAll(sel).forEach(el => { el.textContent = val; });
}
function setHTML(sel, val, root = document) {
  if (val == null) return;
  root.querySelectorAll(sel).forEach(el => { el.innerHTML = val; });
}
function setImage(sel, url, root = document) {
  if (!url) return;
  root.querySelectorAll(sel).forEach(img => {
    img.src = url;
    img.style.display = 'block';
    // varsa placeholder'ı gizle
    const ph = img.parentElement?.querySelector('[data-img-placeholder]');
    if (ph) ph.style.display = 'none';
  });
}

// ─── Dynamic Content ──────────────────────────────────────────────
function applyDynamicContent() {
  if (!siteContent) return;
  const C = siteContent;

  // ═══ HER SAYFADA: Logo ═══
  if (siteSettings?.logo) {
    document.querySelectorAll('[data-logo]').forEach(img => img.src = siteSettings.logo);
    document.querySelectorAll('.footer-logo img').forEach(img => img.src = siteSettings.logo);
  }
  if (siteSettings?.site_name) {
    setText('[data-site-name]', siteSettings.site_name);
  }
  // Favicon
  if (siteSettings?.favicon) {
    document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]').forEach(l => {
      l.href = siteSettings.favicon + '?v=' + Date.now();
    });
  }

  // ═══ FOOTER ═══
  if (C.footer) {
    setText('.footer-tagline', C.footer.tagline);
    setText('.footer-copyright', C.footer.copyright);
  }
  if (C.contact) {
    setText('[data-footer-phone]', C.contact.phone);
    setText('[data-footer-email]', C.contact.email);
    setText('[data-footer-address]', C.contact.address);
  }

  // ═══ SOSYAL MEDYA ═══
  if (C.contact?.social) {
    const s = C.contact.social;
    const setSocial = (id, url) => {
      const el = document.getElementById(id);
      if (el && url) { el.href = url; el.target = '_blank'; el.rel = 'noopener'; el.style.display = 'flex'; }
    };
    setSocial('footer-facebook', s.facebook);
    setSocial('footer-instagram', s.instagram);
  }

  // ═══ ANASAYFA: HERO ═══
  if (C.home?.hero) {
    const h = C.home.hero;
    if (h.title) setHTML('[data-hero-title]', h.title);
    if (h.subtitle) setText('[data-hero-subtitle]', h.subtitle);
    if (h.cta_primary) setText('[data-hero-cta-primary]', h.cta_primary);
    if (h.cta_secondary) setText('[data-hero-cta-secondary]', h.cta_secondary);
  }

  // ═══ ANASAYFA: İSTATİSTİKLER ═══
  if (C.home?.stats?.length) {
    const statItems = document.querySelectorAll('.hero-stats .stat-item');
    C.home.stats.forEach((stat, i) => {
      if (statItems[i]) {
        const v = statItems[i].querySelector('.stat-value');
        const l = statItems[i].querySelector('.stat-label');
        if (v) v.textContent = stat.value;
        if (l) l.textContent = stat.label;
      }
    });
  }

  // ═══ ANASAYFA: HAKKIMIZDA TEASER ═══
  if (C.home?.about_teaser) {
    const a = C.home.about_teaser;
    setText('[data-about-label]', a.label);
    setHTML('[data-about-heading]', a.heading);
    setText('[data-about-text]', a.text);
    setText('[data-about-text2]', a.text2);
    setImage('[data-about-image]', a.image);
  }

  // ═══ HAKKIMIZDA SAYFASI ═══
  if (C.about) {
    const a = C.about;
    setText('[data-page-about-title]', a.title);
    setText('[data-page-about-subtitle]', a.subtitle);
    setHTML('[data-page-about-heading]', a.heading);
    setText('[data-page-about-story]', a.story);
    setText('[data-page-about-story2]', a.story2);
    setImage('[data-page-about-image]', a.image);
  }

  // ═══ YETKİLİ SERVİS SAYFASI ═══
  if (C.authorized_service) {
    const a = C.authorized_service;
    setText('[data-auth-title]', a.title);
    setText('[data-auth-subtitle]', a.subtitle);
    setText('[data-auth-intro]', a.intro);

    // Markaları dinamik render et
    const brandsGrid = document.getElementById('brands-grid');
    if (brandsGrid && a.brands?.length) {
      brandsGrid.innerHTML = a.brands.map((b, i) => `
        <div class="brand-card" data-reveal data-reveal-delay="${(i % 6) + 1}">
          <div class="brand-logo">
            ${b.logo
              ? `<img src="${b.logo}" alt="${b.name}" loading="lazy">`
              : `<div style="font-size:28px;font-weight:900;color:var(--blue-700);letter-spacing:-.02em;">${(b.name || '').toUpperCase()}</div>`}
          </div>
          <h3 class="brand-name">${b.name || ''}</h3>
          <p class="brand-desc">${b.desc || ''}</p>
        </div>
      `).join('');
      // Yeni eklenen kartlara reveal animasyonu uygula
      brandsGrid.querySelectorAll('[data-reveal]').forEach(el => el.classList.add('revealed'));
    }
  }

  // ═══ İLETİŞİM bilgileri (footer + her yerde) ═══
  if (C.contact) {
    setText('[data-contact-phone]', C.contact.phone);
    setText('[data-contact-email]', C.contact.email);
    setText('[data-contact-address]', C.contact.address);
    setText('[data-contact-mobile]', C.contact.mobile);
  }
}

// ─── Utility: fetch JSON ──────────────────────────────────────────
async function apiFetch(url, options = {}) {
  const token = localStorage.getItem('admin_token');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) throw new Error((await res.json()).error || 'Hata oluştu');
  return res.json();
}

// ─── Counter Animation ────────────────────────────────────────────
function animateCounter(el, target, duration = 1500) {
  const isPlus = target.endsWith('+');
  const num = parseInt(target.replace(/\D/g, ''));
  const start = performance.now();
  const update = (now) => {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(eased * num);
    el.textContent = current + (isPlus ? '+' : target.includes('/') ? target.substring(target.indexOf('/')) : '');
    if (progress < 1) requestAnimationFrame(update);
    else el.textContent = target;
  };
  requestAnimationFrame(update);
}

// Trigger counters when visible
document.addEventListener('DOMContentLoaded', () => {
  const stats = document.querySelectorAll('.stat-value');
  if (!stats.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target, entry.target.dataset.value || entry.target.textContent);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  stats.forEach(el => {
    el.dataset.value = el.textContent;
    observer.observe(el);
  });
});

// ─── Gallery Lightbox ─────────────────────────────────────────────
function initLightbox() {
  const lightbox = document.getElementById('lightbox');
  if (!lightbox) return;

  const img = lightbox.querySelector('.lightbox-img');
  let items = [];
  let currentIndex = 0;

  document.querySelectorAll('.gallery-item').forEach((item, i) => {
    if (item._lightboxBound) return; // tekrar bağlamayı önle
    item._lightboxBound = true;
    item.addEventListener('click', () => {
      items = Array.from(document.querySelectorAll('.gallery-item img'));
      currentIndex = i;
      openLightbox(items[i].src);
    });
  });

  function openLightbox(src) {
    img.src = src;
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  lightbox.querySelector('.lightbox-close')?.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });
  lightbox.querySelector('.lightbox-prev')?.addEventListener('click', () => navigate(-1));
  lightbox.querySelector('.lightbox-next')?.addEventListener('click', () => navigate(1));

  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') navigate(-1);
    if (e.key === 'ArrowRight') navigate(1);
  });

  function closeLightbox() {
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
  }

  function navigate(dir) {
    currentIndex = (currentIndex + dir + items.length) % items.length;
    img.src = items[currentIndex].src;
  }
}

window.initLightbox = initLightbox;
document.addEventListener('DOMContentLoaded', initLightbox);
